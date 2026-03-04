import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SheetRow {
  sellerId: string;
  marketplace: string;
  ano: number;
  mes: number;
  dia: number;
  pmt: number;
  metaVendas: number;
  vendaTotal: number;
  vendaAprovadaReal: number;
  vendaAnoAnterior: number;
}

const MONTH_NAMES: Record<string, number> = {
  "JANEIRO": 1, "FEVEREIRO": 2, "MARÇO": 3, "ABRIL": 4,
  "MAIO": 5, "JUNHO": 6, "JULHO": 7, "AGOSTO": 8,
  "SETEMBRO": 9, "OUTUBRO": 10, "NOVEMBRO": 11, "DEZEMBRO": 12,
};

async function getAccessToken(serviceAccountJsonRaw: string): Promise<string> {
  // Debug: log around the problematic position
  console.log("JSON length:", serviceAccountJsonRaw.length);
  console.log("Chars around pos 1440:", JSON.stringify(serviceAccountJsonRaw.substring(1435, 1455)));
  
  // Try parsing as-is first
  let sa: Record<string, string>;
  try {
    sa = JSON.parse(serviceAccountJsonRaw);
  } catch (e1) {
    console.log("First parse failed:", (e1 as Error).message);
    // Replace actual newlines with \n escape
    const fixedJson = serviceAccountJsonRaw.replace(/\r?\n/g, '\\n');
    console.log("Fixed chars around pos 1440:", JSON.stringify(fixedJson.substring(1435, 1455)));
    try {
      sa = JSON.parse(fixedJson);
    } catch (e2) {
      console.log("Second parse failed:", (e2 as Error).message);
      // Use a very permissive approach: extract fields individually using regex
      // The raw string has invalid JSON escapes (like \v) because the private_key
      // contains \n that Supabase secrets store literally
      const clientEmail = serviceAccountJsonRaw.match(/"client_email"\s*:\s*"([^"]+)"/)?.[1];
      // Extract everything between "private_key" : " and the closing "
      // The private key is between -----BEGIN PRIVATE KEY----- and -----END PRIVATE KEY-----
      const pkMatch = serviceAccountJsonRaw.match(/-----BEGIN PRIVATE KEY-----([^-]+)-----END PRIVATE KEY-----/);
      
      if (!clientEmail || !pkMatch) {
        throw new Error(`Could not extract credentials from service account JSON. Parse error: ${(e2 as Error).message}`);
      }
      
      // The extracted PEM content between the markers - clean it
      const pemContent = pkMatch[1].replace(/\\n/g, '').replace(/\n/g, '').replace(/\s/g, '');
      
      sa = {
        client_email: clientEmail,
        private_key: `-----BEGIN PRIVATE KEY-----\n${pemContent}\n-----END PRIVATE KEY-----\n`,
      };
    }
  }
  const now = Math.floor(Date.now() / 1000);

  const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = btoa(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  }));

  const unsignedToken = `${header}.${claim}`;

  // Import the private key
  const pemContents = sa.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\\n/g, "")
    .replace(/\n/g, "")
    .replace(/\r/g, "")
    .replace(/\s/g, "")
    .trim();

  console.log("PEM length:", pemContents.length, "first 20 chars:", pemContents.substring(0, 20));
  
  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const jwt = `${header}.${claim}.${signatureB64}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    throw new Error(`Failed to get access token: ${JSON.stringify(tokenData)}`);
  }
  return tokenData.access_token;
}

async function fetchSheetData(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string
): Promise<string[][]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch sheet ${sheetName}: ${res.status} ${text}`);
  }

  const data = await res.json();
  return data.values || [];
}

function parseNumber(val: string | undefined): number {
  if (!val || val.trim() === "" || val === "-") return 0;
  // Handle Brazilian number format: 1.234,56 -> 1234.56
  const cleaned = val.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function parseTabData(
  rows: string[][],
  month: number,
  year: number,
  sellerId: string
): SheetRow[] {
  if (rows.length < 2) return [];

  const results: SheetRow[] = [];
  const headers = rows[0].map((h) => h?.toString().trim().toLowerCase() || "");

  // Try to find column indices by header name
  const colMap: Record<string, number> = {};
  const knownHeaders = [
    "dia", "marketplace", "pmt", "meta", "meta vendas", "venda total",
    "venda aprovada", "venda aprovada real", "venda ano anterior",
  ];

  headers.forEach((h, i) => {
    for (const known of knownHeaders) {
      if (h.includes(known)) {
        colMap[known] = i;
        break;
      }
    }
  });

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 2) continue;

    const diaVal = parseNumber(row[colMap["dia"] ?? 0]);
    if (diaVal < 1 || diaVal > 31) continue;

    const marketplace = row[colMap["marketplace"] ?? 1]?.toString().trim();
    if (!marketplace) continue;

    results.push({
      sellerId,
      marketplace,
      ano: year,
      mes: month,
      dia: diaVal,
      pmt: parseNumber(row[colMap["pmt"] ?? 2]),
      metaVendas: parseNumber(row[colMap["meta vendas"] ?? colMap["meta"] ?? 3]),
      vendaTotal: parseNumber(row[colMap["venda total"] ?? 4]),
      vendaAprovadaReal: parseNumber(row[colMap["venda aprovada real"] ?? colMap["venda aprovada"] ?? 5]),
      vendaAnoAnterior: parseNumber(row[colMap["venda ano anterior"] ?? 6]),
    });
  }

  return results;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { spreadsheetId, sellerId, year, tabs } = await req.json();

    if (!spreadsheetId || !sellerId) {
      return new Response(
        JSON.stringify({ success: false, error: "spreadsheetId and sellerId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const serviceAccountJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    if (!serviceAccountJson) {
      return new Response(
        JSON.stringify({ success: false, error: "Google Service Account not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const accessToken = await getAccessToken(serviceAccountJson);
    const targetYear = year || new Date().getFullYear();

    const tabsToSync: string[] = tabs || [
      "DIARIZAÇÃO JANEIRO", "DIARIZAÇÃO FEVEREIRO", "DIARIZAÇÃO MARÇO",
      "DIARIZAÇÃO ABRIL", "DIARIZAÇÃO MAIO", "DIARIZAÇÃO JUNHO",
      "DIARIZAÇÃO JULHO", "DIARIZAÇÃO AGOSTO", "DIARIZAÇÃO SETEMBRO",
      "DIARIZAÇÃO OUTUBRO", "DIARIZAÇÃO NOVEMBRO", "DIARIZAÇÃO DEZEMBRO",
    ];

    const allSales: SheetRow[] = [];
    const tabResults: Record<string, { month: number; recordCount: number; error?: string }> = {};

    for (const tab of tabsToSync) {
      const monthName = tab.replace("DIARIZAÇÃO ", "").trim();
      const month = MONTH_NAMES[monthName];
      if (!month) {
        tabResults[tab] = { month: 0, recordCount: 0, error: "Unknown month" };
        continue;
      }

      try {
        const rows = await fetchSheetData(accessToken, spreadsheetId, tab);
        const parsed = parseTabData(rows, month, targetYear, sellerId);
        allSales.push(...parsed);
        tabResults[tab] = { month, recordCount: parsed.length };
      } catch (e) {
        tabResults[tab] = { month, recordCount: 0, error: (e as Error).message };
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sales: allSales,
        totalRecords: allSales.length,
        tabs: tabResults,
        mode: "sync",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Sync error:", error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
