import { useState, useCallback } from "react";
import { Upload, ShoppingBag, Package, Store, Footprints, ShoppingCart } from "lucide-react";
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

const marketplaces: { id: MarketplaceType; label: string; icon: React.ElementType; color: string }[] = [
  { id: "shopee", label: "Shopee", icon: ShoppingBag, color: "bg-orange-500/10 text-orange-600 border-orange-500/30" },
  { id: "amazon", label: "Amazon", icon: Package, color: "bg-yellow-500/10 text-yellow-700 border-yellow-500/30" },
  { id: "magalu", label: "Magalu", icon: Store, color: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
  { id: "dafiti", label: "Dafiti", icon: ShoppingCart, color: "bg-gray-100 text-gray-900 border-gray-300 dark:bg-gray-800/50 dark:text-gray-100 dark:border-gray-600" },
  { id: "netshoes", label: "Netshoes", icon: Footprints, color: "bg-purple-500/10 text-purple-700 border-purple-500/30" },
];

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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Importação</h1>
        <p className="text-muted-foreground">Importe dados de vendas da Shopee, Amazon e Magalu a partir dos relatórios nativos.</p>
      </div>

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
