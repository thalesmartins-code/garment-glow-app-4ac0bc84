export type MarketplaceType = "shopee" | "amazon" | "magalu" | "dafiti" | "netshoes";
export type ShopeeFileType = "produto_pago" | "produtos";

export interface ParsedImportRow {
  date: string;
  hour: number | null;
  revenue: number;
  revenueWithoutDiscounts: number;
  orders: number;
  avgOrderValue: number;
  clicks: number;
  visitors: number;
  conversionRate: number;
  cancelledOrders: number;
  cancelledRevenue: number;
  returnedOrders: number;
  returnedRevenue: number;
  buyers: number;
  newBuyers: number;
  existingBuyers: number;
  potentialBuyers: number;
  repeatPurchaseRate: number;
  raw: Record<string, string>;
}

export interface ParsedOrderRow {
  orderId: string;
  orderStatus: string;
  orderDate: string;
  sku: string;
  productName: string;
  variation: string;
  agreedPrice: number;
  quantity: number;
  subtotal: number;
}

export function parseMarketplaceFile(
  marketplace: MarketplaceType,
  content: string | ArrayBuffer,
  fileType: "csv" | "excel"
): ParsedImportRow[] {
  if (marketplace === "shopee") {
    if (fileType === "excel") {
      throw new Error("Shopee: use o arquivo CSV exportado da plataforma.");
    }
    return parseShopeeCSV(content as string);
  }
  throw new Error(`Parser para ${marketplace} ainda não implementado. Envie um arquivo de exemplo.`);
}

export function parseShopeeOrdersFile(
  content: string | ArrayBuffer,
  fileType: "csv" | "excel"
): ParsedOrderRow[] {
  if (fileType === "excel") {
    throw new Error("Shopee Produtos: use o arquivo CSV exportado da plataforma.");
  }
  return parseShopeeOrdersCSV(content as string);
}

// ─── Shopee CSV (Produto Pago) ─────────────────────────────────

function parseShopeeCSV(content: string): ParsedImportRow[] {
  const lines = content.split(/\r?\n/).filter(l => l.trim());

  let dataStartIdx = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].startsWith("Data,")) {
      dataStartIdx = i + 1;
      break;
    }
  }

  if (dataStartIdx === -1 || dataStartIdx >= lines.length) {
    throw new Error("Formato Shopee não reconhecido. Certifique-se de exportar o relatório 'Produto Pago'.");
  }

  const rows: ParsedImportRow[] = [];

  for (let i = dataStartIdx; i < lines.length; i++) {
    const values = splitCsvLine(lines[i]);
    if (values.length < 12 || !values[0]?.trim()) continue;

    const rawDate = values[0].trim();
    const { date, hour } = parseShopeeDate(rawDate);

    rows.push({
      date,
      hour,
      revenue: parseBRNumber(values[1]),
      revenueWithoutDiscounts: parseBRNumber(values[2]),
      orders: parseInt(values[3]) || 0,
      avgOrderValue: parseBRNumber(values[4]),
      clicks: parseInt(values[5]) || 0,
      visitors: parseInt(values[6]) || 0,
      conversionRate: parsePercent(values[7]),
      cancelledOrders: parseInt(values[8]) || 0,
      cancelledRevenue: parseBRNumber(values[9]),
      returnedOrders: parseInt(values[10]) || 0,
      returnedRevenue: parseBRNumber(values[11]),
      buyers: parseInt(values[12]) || 0,
      newBuyers: parseInt(values[13]) || 0,
      existingBuyers: parseInt(values[14]) || 0,
      potentialBuyers: parseInt(values[15]) || 0,
      repeatPurchaseRate: parsePercent(values[16]),
      raw: { _raw: lines[i] },
    });
  }

  if (rows.length === 0) throw new Error("Nenhuma linha válida encontrada no arquivo Shopee.");
  return rows;
}

// ─── Shopee CSV (Produtos) ──────────────────────────────────────

function parseShopeeOrdersCSV(content: string): ParsedOrderRow[] {
  const lines = content.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) throw new Error("Arquivo de pedidos Shopee vazio.");

  // Header is line 0, data starts at line 1
  // Find column indices from header
  const header = splitCsvLine(lines[0]);
  const colMap: Record<string, number> = {};
  header.forEach((h, i) => { colMap[h.trim()] = i; });

  const iOrderId = colMap["ID do pedido"] ?? 0;
  const iStatus = colMap["Status do pedido"] ?? 1;
  const iDate = colMap["Data de criação do pedido"] ?? 8;
  const iSku = colMap["Nº de referência do SKU principal"] ?? 16;
  const iName = colMap["Nome do Produto"] ?? 17;
  const iVariation = colMap["Nome da variação"] ?? 19;
  const iPrice = colMap["Preço acordado"] ?? 22;
  const iQty = colMap["Quantidade"] ?? 23;
  const iSubtotal = colMap["Subtotal do produto"] ?? 24;

  const rows: ParsedOrderRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = splitCsvLine(lines[i]);
    if (values.length < 10 || !values[iOrderId]?.trim()) continue;

    const rawDate = values[iDate]?.trim() || "";
    // Format: "2026-03-29 00:09" or "29/03/2026"
    let orderDate = rawDate.split(" ")[0];
    if (orderDate.includes("/")) {
      const [d, m, y] = orderDate.split("/");
      orderDate = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }

    rows.push({
      orderId: values[iOrderId]?.trim() || "",
      orderStatus: values[iStatus]?.trim() || "",
      orderDate,
      sku: values[iSku]?.trim() || "",
      productName: values[iName]?.trim() || "",
      variation: values[iVariation]?.trim() || "",
      agreedPrice: parseBRNumber(values[iPrice]),
      quantity: parseInt(values[iQty]) || 0,
      subtotal: parseBRNumber(values[iSubtotal]),
    });
  }

  if (rows.length === 0) throw new Error("Nenhuma linha válida encontrada no arquivo de produtos Shopee.");
  return rows;
}

// ─── Helpers ───────────────────────────────────────────────────

function parseShopeeDate(raw: string): { date: string; hour: number | null } {
  const parts = raw.split(" ");
  const [d, m, y] = parts[0].split("/");
  const date = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  let hour: number | null = null;
  if (parts[1]) {
    hour = parseInt(parts[1].split(":")[0]) ?? null;
  }
  return { date, hour };
}

function parseBRNumber(val: string | undefined): number {
  if (!val) return 0;
  const cleaned = val.replace(/"/g, "").replace(/[^\d.,-]/g, "");
  if (cleaned.includes(",")) {
    return parseFloat(cleaned.replace(/\./g, "").replace(",", ".")) || 0;
  }
  return parseFloat(cleaned) || 0;
}

function parsePercent(val: string | undefined): number {
  if (!val) return 0;
  const cleaned = val.replace(/"/g, "").replace("%", "").trim();
  return parseBRNumber(cleaned);
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}
