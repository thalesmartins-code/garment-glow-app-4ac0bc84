import { useState, useCallback } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { getFileType } from "@/utils/csvParser";
import {
  parseMarketplaceFile,
  parseShopeeOrdersFile,
  type MarketplaceType,
  type ShopeeFileType,
  type ParsedImportRow,
  type ParsedOrderRow,
} from "@/utils/marketplaceParsers";
import { MarketplaceSelector } from "@/components/import/marketplace/MarketplaceSelector";
import { FileUploadCard } from "@/components/import/marketplace/FileUploadCard";
import { ImportPreviewTable } from "@/components/import/marketplace/ImportPreviewTable";
import { ImportOrdersPreviewTable } from "@/components/import/marketplace/ImportOrdersPreviewTable";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MARKETPLACE_BRANDS } from "@/config/marketplaceConfig";
import { SellerMarketplaceBar } from "@/components/layout/SellerMarketplaceBar";

const marketplaces: { id: MarketplaceType; label: string; icon: React.ElementType; color: string }[] =
  MARKETPLACE_BRANDS
    .filter((b) => ["shopee", "amazon", "magalu", "dafiti", "netshoes"].includes(b.id))
    .map((b) => ({ id: b.id as MarketplaceType, label: b.name, icon: b.icon, color: b.badge }));

export default function MLImportacao() {
  const [selectedMarketplace, setSelectedMarketplace] = useState<MarketplaceType | null>(null);
  const [shopeeFileType, setShopeeFileType] = useState<ShopeeFileType>("produto_pago");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedImportRow[]>([]);
  const [parsedOrders, setParsedOrders] = useState<ParsedOrderRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);

  const handleFile = useCallback((file: File) => {
    const fileType = getFileType(file.name);
    if (fileType === "unknown") {
      setParseError("Formato de arquivo não suportado. Use CSV ou Excel.");
      return;
    }

    setSelectedFile(file);
    setParseError(null);
    setParsedData([]);
    setParsedOrders([]);

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (!result || !selectedMarketplace) return;

      try {
        if (selectedMarketplace === "shopee" && shopeeFileType === "produtos") {
          const data = parseShopeeOrdersFile(result, fileType as "csv" | "excel");
          setParsedOrders(data);
        } else {
          const data = parseMarketplaceFile(selectedMarketplace, result, fileType as "csv" | "excel");
          setParsedData(data);
        }
      } catch (err: any) {
        setParseError(err.message || "Erro ao processar arquivo.");
      }
    };

    if (fileType === "csv") {
      reader.readAsText(file, "UTF-8");
    } else {
      reader.readAsArrayBuffer(file);
    }
  }, [selectedMarketplace, shopeeFileType]);

  const clearFile = () => {
    setSelectedFile(null);
    setParsedData([]);
    setParsedOrders([]);
    setParseError(null);
  };

  const mp = marketplaces.find(m => m.id === selectedMarketplace);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 pt-1 pb-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Importação
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Importe dados de vendas da Shopee, Amazon, Magalu, Dafiti e Netshoes a partir dos relatórios nativos.
          </p>
        </div>
      </div>

      <SellerMarketplaceBar showStores={false} />

      <MarketplaceSelector
        marketplaces={marketplaces}
        selected={selectedMarketplace}
        onSelect={(id) => { setSelectedMarketplace(id); clearFile(); }}
      />

      {selectedMarketplace === "shopee" && (
        <Tabs
          value={shopeeFileType}
          onValueChange={(v) => { setShopeeFileType(v as ShopeeFileType); clearFile(); }}
        >
          <TabsList>
            <TabsTrigger value="produto_pago">Vendas</TabsTrigger>
            <TabsTrigger value="produtos">Produtos</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {selectedMarketplace && (
        <FileUploadCard
          marketplaceLabel={
            selectedMarketplace === "shopee"
              ? `Shopee — ${shopeeFileType === "produto_pago" ? "Vendas" : "Produtos"}`
              : mp?.label || ""
          }
          selectedFile={selectedFile}
          parseError={parseError}
          onFile={handleFile}
          onClear={clearFile}
        />
      )}

      {parsedData.length > 0 && selectedMarketplace && (
        <ImportPreviewTable
          data={parsedData}
          marketplace={selectedMarketplace}
          onImportComplete={clearFile}
        />
      )}

      {parsedOrders.length > 0 && (
        <ImportOrdersPreviewTable
          data={parsedOrders}
          onImportComplete={clearFile}
        />
      )}
    </div>
  );
}
