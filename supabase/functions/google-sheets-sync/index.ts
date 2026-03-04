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

async function getAccessToken(clientEmail: string, privateKeyPem: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  // Base64url encode helper
  const b64url = (data: Uint8Array | string) => {
    const str = typeof data === "string" ? btoa(data) : btoa(String.fromCharCode(...data));
    return str.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };

  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(JSON.stringify({
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  }));

  const unsignedToken = `${header}.${claim}`;

  // Parse private key PEM - keep only valid base64 characters
  const pemB64 = privateKeyPem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/[^A-Za-z0-9+/=]/g, "");

  // Manual base64 decode
  const lookup = new Uint8Array(256);
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  for (let i = 0; i < chars.length; i++) lookup[chars.charCodeAt(i)] = i;

  // Remove trailing = for length calc
  const stripped = pemB64.replace(/=+$/, "");
  const bufLen = Math.floor((stripped.length * 3) / 4);
  const padded = stripped + "=".repeat((4 - (stripped.length % 4)) % 4);

  const binaryKey = new Uint8Array(bufLen);
  let p = 0;
  for (let i = 0; i < padded.length; i += 4) {
    const a = lookup[padded.charCodeAt(i)];
    const b = lookup[padded.charCodeAt(i + 1)];
    const c = lookup[padded.charCodeAt(i + 2)];
    const d = lookup[padded.charCodeAt(i + 3)];
    binaryKey[p++] = (a << 2) | (b >> 4);
    if (p < bufLen) binaryKey[p++] = ((b & 15) << 4) | (c >> 2);
    if (p < bufLen) binaryKey[p++] = ((c & 3) << 6) | d;
  }

  console.log("Key bytes:", binaryKey.length, "b64 len:", stripped.length);

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

  const signatureB64 = b64url(new Uint8Array(signature));
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
  _sellerId: string
): SheetRow[] {
  if (rows.length < 3) return [];

  const results: SheetRow[] = [];
  
  // Find the seller row and header row dynamically
  // The seller row contains seller names like "SANDRINI", "BUYCLOCK"
  // The header row contains "Dia", "PMT", etc.
  let sellerRowIdx = -1;
  let headerRowIdx = -1;
  
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const row = rows[i];
    if (!row) continue;
    const joined = row.join(" ").toLowerCase();
    if (joined.includes("dia") && joined.includes("pmt") && joined.includes("venda")) {
      headerRowIdx = i;
      // Seller row is typically the one before
      if (i > 0) sellerRowIdx = i - 1;
      break;
    }
  }
  
  if (headerRowIdx < 0) {
    console.log("Could not find header row in first 10 rows");
    return [];
  }
  
  const sellerRow = sellerRowIdx >= 0 ? rows[sellerRowIdx] : [];
  const headerRow = rows[headerRowIdx];
  const dataStartRow = headerRowIdx + 1;
  
  console.log(`Found header at row ${headerRowIdx}, seller at row ${sellerRowIdx}, data starts at row ${dataStartRow}`);
  console.log("Seller row:", JSON.stringify(sellerRow?.slice(0, 20)));
  console.log("Header row:", JSON.stringify(headerRow?.slice(0, 20)));
  if (rows.length > dataStartRow) console.log("First data row:", JSON.stringify(rows[dataStartRow]?.slice(0, 20)));

  // Detect seller column groups
  const sellerSections: Array<{ sellerId: string; startCol: number; endCol: number }> = [];
  const sellerStarts: Array<{ sellerId: string; startCol: number }> = [];
  
  for (let i = 0; i < sellerRow.length; i++) {
    const cell = sellerRow[i]?.toString().trim();
    if (cell) {
      sellerStarts.push({ sellerId: cell.toLowerCase(), startCol: i });
    }
  }
  
  // Calculate endCol for each seller (extends to next seller's start - 1, or end of headerRow)
  for (let i = 0; i < sellerStarts.length; i++) {
    const endCol = i < sellerStarts.length - 1 
      ? sellerStarts[i + 1].startCol - 1 
      : Math.max(headerRow.length - 1, sellerRow.length - 1);
    sellerSections.push({ ...sellerStarts[i], endCol });
  }

  console.log("Seller sections:", JSON.stringify(sellerSections));

  // For each seller section, map columns by header names
  for (const section of sellerSections) {
    const colMap: Record<string, number> = {};
    
    for (let i = section.startCol; i <= section.endCol && i < headerRow.length; i++) {
      const h = headerRow[i]?.toString().trim().toLowerCase().replace(/\n/g, ' ') || "";
      if (h.includes("dia")) colMap["dia"] = i;
      else if (h.includes("pmt") && !h.includes("acum")) colMap["pmt"] = i;
      else if (h.includes("pmt acum")) colMap["pmt_acum"] = i;
      else if (h.includes("meta venda") || h === "meta") colMap["meta"] = i;
      else if (h.includes("venda aprovada real")) colMap["venda_aprovada_real"] = i;
      else if (h.includes("venda bruta")) colMap["venda_bruta"] = i;
      else if (h.includes("venda 2025") || h.includes("venda ano anterior")) {
        // Could appear twice - first one is "VENDA 2025" before meta, second is after
        if (!colMap["venda_ano_anterior_1"]) colMap["venda_ano_anterior_1"] = i;
        else colMap["venda_ano_anterior_2"] = i;
      }
    }
    
    console.log(`Seller ${section.sellerId} colMap:`, JSON.stringify(colMap));
    
    if (!colMap["dia"]) continue;

    // Parse data rows
    let parsedCount = 0;
    let skippedCount = 0;
    for (let i = dataStartRow; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length <= section.startCol) continue;

      const rawDia = row[colMap["dia"]];
      const diaVal = parseNumber(rawDia);
      if (diaVal < 1 || diaVal > 31) {
        if (i < dataStartRow + 3) console.log(`${section.sellerId} row ${i}: skipped dia="${rawDia}" -> ${diaVal}`);
        skippedCount++;
        continue;
      }
      parsedCount++;

      results.push({
        sellerId: section.sellerId,
        marketplace: "Total", // This sheet has total/consolidated data
        ano: year,
        mes: month,
        dia: diaVal,
        pmt: parseNumber(row[colMap["pmt"]]),
        metaVendas: parseNumber(row[colMap["meta"]]),
        vendaTotal: parseNumber(row[colMap["venda_bruta"]]),
        vendaAprovadaReal: parseNumber(row[colMap["venda_aprovada_real"]]),
        vendaAnoAnterior: parseNumber(row[colMap["venda_ano_anterior_2"] ?? colMap["venda_ano_anterior_1"]]),
      });
    }
    console.log(`${section.sellerId}: ${parsedCount} parsed, ${skippedCount} skipped`);
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

    // Use separate env vars for client email and private key
    const clientEmail = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_EMAIL") || Deno.env.get("GOOGLE_CLIENT_EMAIL");
    const privateKey = Deno.env.get("GOOGLE_PRIVATE_KEY");
    
    if (!clientEmail || !privateKey) {
      // Fallback: try GOOGLE_SERVICE_ACCOUNT_JSON
      const saJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
      if (!saJson) {
        return new Response(
          JSON.stringify({ success: false, error: "Google Service Account not configured. Set GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY or GOOGLE_SERVICE_ACCOUNT_JSON" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      // Try parsing the JSON
      try {
        const sa = JSON.parse(saJson);
        var accessToken = await getAccessToken(sa.client_email, sa.private_key);
      } catch (e) {
        return new Response(
          JSON.stringify({ success: false, error: `Failed to parse service account JSON: ${(e as Error).message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      // Fix private key: replace literal \n with actual newlines
      const fixedKey = privateKey.replace(/\\n/g, '\n');
      var accessToken = await getAccessToken(clientEmail, fixedKey);
    }
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
