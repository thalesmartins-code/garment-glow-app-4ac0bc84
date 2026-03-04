import React, { useState } from "react";
import { Upload, Database, Store, History, FileUp, AlertTriangle, RefreshCw, Sheet, Eye } from "lucide-react";
import { FileUploader } from "@/components/import/FileUploader";
import { DataPreview } from "@/components/import/DataPreview";
import { CSVTemplate } from "@/components/import/CSVTemplate";
import { ImportHistory } from "@/components/import/ImportHistory";
import { parseCSV, parseExcel } from "@/utils/csvParser";
import { useSalesData, DuplicateCheckResult } from "@/contexts/SalesDataContext";
import { useSeller } from "@/contexts/SellerContext";
import { useSettings } from "@/contexts/SettingsContext";
import { ImportResult, ImportedSale } from "@/types/import";
import { generateTargetId } from "@/types/settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGoogleSheetsSync } from "@/hooks/useGoogleSheetsSync";

export default function Import() {
  const [parseResult, setParseResult] = useState<ImportResult | null>(null);
  const { activeSellers, sellers } = useSeller();
  const [selectedSeller, setSelectedSeller] = useState(activeSellers[0]?.id || sellers[0]?.id);
  const { 
    appendSales, 
    deleteSale,
    hasImportedDataForSeller, 
    getImportedDataForSeller,
    findDuplicates 
  } = useSalesData();
  const { saveTarget } = useSettings();
  const { toast } = useToast();
  const { loading: syncLoading, syncResult, inspect, sync, toImportedSales } = useGoogleSheetsSync();
  
  // State for duplicate detection dialog
  const [duplicateInfo, setDuplicateInfo] = useState<DuplicateCheckResult | null>(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);

  const sellerData = getImportedDataForSeller(selectedSeller);
  const hasDataForSeller = hasImportedDataForSeller(selectedSeller);
  const selectedSellerObj = sellers.find(s => s.id === selectedSeller);

  const handleFileSelect = (content: string | ArrayBuffer, fileType: "csv" | "excel") => {
    let result: ImportResult;
    
    if (fileType === "csv") {
      result = parseCSV(content as string);
    } else {
      result = parseExcel(content as ArrayBuffer);
    }
    
    setParseResult(result);
  };

  const handleImportClick = () => {
    if (!parseResult || parseResult.validRows === 0) return;
    
    // Check for duplicates
    const result = findDuplicates(selectedSeller, parseResult.data);
    
    if (result.hasDuplicates) {
      setDuplicateInfo(result);
      setShowDuplicateDialog(true);
    } else {
      // No duplicates - import directly
      appendSales(parseResult.data, selectedSeller);
      toast({
        title: "Dados importados com sucesso!",
        description: `${parseResult.validRows} registros foram importados para ${selectedSellerObj?.name}.`,
      });
      setParseResult(null);
    }
  };

  const handleImportWithDuplicates = (replaceExisting: boolean) => {
    if (!parseResult || !duplicateInfo) return;
    
    const selectedSellerName = selectedSellerObj?.name || selectedSeller;
    
    if (replaceExisting) {
      // Import all data (appendSales will replace duplicates)
      appendSales(parseResult.data, selectedSeller);
      toast({
        title: "Dados importados com sucesso!",
        description: `${parseResult.validRows} registros importados (${duplicateInfo.duplicateCount} substituídos) para ${selectedSellerName}.`,
      });
    } else {
      // Import only new records
      if (duplicateInfo.newRecordsOnly.length > 0) {
        appendSales(duplicateInfo.newRecordsOnly, selectedSeller);
        toast({
          title: "Dados importados com sucesso!",
          description: `${duplicateInfo.newRecordsOnly.length} novos registros importados para ${selectedSellerName}. ${duplicateInfo.duplicateCount} duplicados ignorados.`,
        });
      } else {
        toast({
          title: "Nenhum registro importado",
          description: "Todos os registros já existem.",
          variant: "destructive",
        });
      }
    }
    
    setShowDuplicateDialog(false);
    setDuplicateInfo(null);
    setParseResult(null);
  };

  const handleDeleteRecord = (record: ImportedSale) => {
    deleteSale(record.sellerId, record.marketplace, record.ano, record.mes, record.dia);
    toast({
      title: "Registro excluído",
      description: `Registro de ${record.marketplace} do dia ${record.dia}/${record.mes}/${record.ano} foi excluído.`,
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">

        {/* Seller Selector Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Selecionar Seller</CardTitle>
            <CardDescription>
              Escolha para qual seller os dados serão importados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Store className="h-4 w-4 text-muted-foreground" />
                Seller
              </Label>
              <Select value={selectedSeller} onValueChange={setSelectedSeller}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                {activeSellers.map((seller) => (
                    <SelectItem key={seller.id} value={seller.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
                          <span className="text-xs font-bold text-primary">{seller.initials}</span>
                        </div>
                        {seller.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Status Card for Selected Seller */}
        {hasDataForSeller && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="flex items-center gap-3 py-4">
              <Database className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-medium">
                  {sellerData.length} registros para {selectedSellerObj?.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  Dados disponíveis no Dashboard e Vendas Diárias
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs for Import / History */}
        <Tabs defaultValue="import" className="space-y-4">
          <TabsList>
            <TabsTrigger value="import" className="flex items-center gap-2">
              <FileUp className="h-4 w-4" />
              Importar
            </TabsTrigger>
            <TabsTrigger value="google-sheets" className="flex items-center gap-2">
              <Sheet className="h-4 w-4" />
              Google Sheets
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="google-sheets" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sheet className="h-5 w-5" />
                  Sincronizar Google Sheets
                </CardTitle>
                <CardDescription>
                  Importe dados diretamente da planilha de diarização (Sandrini e BuyClock)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    onClick={() => inspect()}
                    disabled={syncLoading}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    {syncLoading ? "Carregando..." : "Inspecionar"}
                  </Button>
                  <Button
                    onClick={async () => {
                      try {
                        const result = await sync();
                        if (result.success && result.sales.length > 0) {
                          const importedSales = toImportedSales(result.sales);
                          
                          // Group by sellerId and import
                          const bySeller = importedSales.reduce((acc, sale) => {
                            if (!acc[sale.sellerId]) acc[sale.sellerId] = [];
                            acc[sale.sellerId].push(sale);
                            return acc;
                          }, {} as Record<string, typeof importedSales>);
                          
                          let totalImported = 0;
                          for (const [sellerId, sales] of Object.entries(bySeller)) {
                            appendSales(sales, sellerId);
                            totalImported += sales.length;
                            
                            // Auto-populate PMT and Meta in SettingsContext
                            const byMonth = sales.reduce((acc, s) => {
                              if (!acc[s.mes]) acc[s.mes] = [];
                              acc[s.mes].push(s);
                              return acc;
                            }, {} as Record<number, typeof sales>);
                            
                            for (const [monthStr, monthSales] of Object.entries(byMonth)) {
                              const month = parseInt(monthStr);
                              const year = monthSales[0].ano;
                              const marketplaceId = "total";
                              const id = generateTargetId(sellerId, marketplaceId, year, month);
                              
                              const totalMeta = monthSales.reduce((sum, s) => sum + (s.metaVendas || 0), 0);
                              const pmtDistribution = monthSales
                                .filter(s => s.dia >= 1 && s.dia <= 31)
                                .map(s => ({ day: s.dia, pmt: s.pmt || 0 }));
                              
                              if (totalMeta > 0 || pmtDistribution.some(d => d.pmt > 0)) {
                                saveTarget({
                                  id,
                                  sellerId,
                                  marketplaceId,
                                  year,
                                  month,
                                  targetValue: totalMeta,
                                  pmtDistribution,
                                });
                              }
                            }
                          }
                          
                          toast({
                            title: "Dados sincronizados!",
                            description: `${totalImported} registros importados com PMT e Metas de ${Object.keys(bySeller).length} seller(s).`,
                          });
                        } else {
                          toast({
                            title: "Nenhum dado encontrado",
                            description: "A planilha não contém dados de vendas para sincronizar.",
                            variant: "destructive",
                          });
                        }
                      } catch {
                        // Error already handled in hook
                      }
                    }}
                    disabled={syncLoading}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${syncLoading ? "animate-spin" : ""}`} />
                    {syncLoading ? "Sincronizando..." : "Sincronizar e Importar"}
                  </Button>
                </div>

                {syncResult && (
                  <div className="space-y-3">
                    <div className="bg-muted rounded-lg p-4 space-y-2">
                      <p className="text-sm font-medium">
                        ✅ {syncResult.totalRecords} registros sincronizados
                      </p>
                      {Object.entries(syncResult.tabs).map(([tab, info]) => (
                        <p key={tab} className="text-xs text-muted-foreground">
                          {tab}: {info.recordCount} registros (mês {info.month})
                          {info.error && <span className="text-destructive ml-2">⚠ {info.error}</span>}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="import" className="space-y-4">
            {/* Main Content */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Left Column - Template and Instructions */}
              <div className="space-y-4">
                <CSVTemplate />

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Como funciona</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                      <li>Baixe o template (CSV ou Excel)</li>
                      <li>Preencha com seus dados de vendas</li>
                      <li>Faça upload do arquivo preenchido</li>
                      <li>Verifique o preview e corrija erros</li>
                      <li>Confirme a importação</li>
                    </ol>
                    <p className="text-xs text-muted-foreground/70 pt-2 border-t">
                      As metas e distribuição de PMT são configuradas na página de
                      Configurações.
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Upload and Preview */}
              <div className="lg:col-span-2 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Upload de Arquivo</CardTitle>
                    <CardDescription>
                      Selecione ou arraste um arquivo CSV ou Excel com seus dados de vendas
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FileUploader onFileSelect={handleFileSelect} />
                  </CardContent>
                </Card>

                {parseResult && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Preview dos Dados</CardTitle>
                      <CardDescription>
                        Verifique os dados antes de confirmar a importação
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <DataPreview result={parseResult} />

                      {parseResult.validRows > 0 && (
                        <div className="flex flex-wrap gap-3 pt-4 border-t">
                          <Button onClick={handleImportClick}>
                            Importar {parseResult.validRows} Registros para {selectedSellerObj?.name}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history">
            <ImportHistory
              sellerId={selectedSeller}
              sellerName={selectedSellerObj?.name || selectedSeller}
              data={sellerData}
              onDeleteRecord={handleDeleteRecord}
            />
          </TabsContent>
        </Tabs>

        {/* Duplicate Detection Dialog */}
        <AlertDialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Registros duplicados encontrados
              </AlertDialogTitle>
            </AlertDialogHeader>
            
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                Foram encontrados <strong className="text-foreground">{duplicateInfo?.duplicateCount}</strong> registros que já existem para este seller (mesmo marketplace, ano, mês e dia).
              </p>
              
              {duplicateInfo && duplicateInfo.duplicatesByMarketplace.length > 0 && (
                <div className="bg-muted rounded-lg p-3 space-y-2">
                  <p className="text-sm font-medium">Duplicados por marketplace:</p>
                  <ul className="text-sm space-y-1">
                    {duplicateInfo.duplicatesByMarketplace.map((mp) => (
                      <li key={mp.marketplace} className="flex items-center gap-2 text-muted-foreground">
                        <span className="w-2 h-2 rounded-full bg-yellow-500 flex-shrink-0"></span>
                        {mp.marketplace}: {mp.count} registros
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {duplicateInfo && duplicateInfo.newRecordsOnly.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">{duplicateInfo.newRecordsOnly.length}</strong> registros novos serão importados em ambas as opções.
                </p>
              )}
            </div>

            <AlertDialogFooter className="gap-2 sm:gap-0">
              <AlertDialogCancel onClick={() => {
                setShowDuplicateDialog(false);
                setDuplicateInfo(null);
              }}>
                Cancelar
              </AlertDialogCancel>
              <Button
                variant="outline"
                onClick={() => handleImportWithDuplicates(false)}
              >
                Apenas Novos
              </Button>
              <Button onClick={() => handleImportWithDuplicates(true)}>
                Substituir
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}