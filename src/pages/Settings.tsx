import { useState, useEffect } from "react";
import { getMarketplaceBrand } from "@/config/marketplaceConfig";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Save, Settings as SettingsIcon, Store, Calendar, ShoppingBag } from "lucide-react";
import { TargetForm } from "@/components/settings/TargetForm";
import { PMTTable } from "@/components/settings/PMTTable";
import { useSettings } from "@/contexts/SettingsContext";
import { useSeller } from "@/contexts/SellerContext";
import {
  MonthlyTarget,
  generateTargetId,
  generateDefaultPMTDistribution,
  monthLabels,
} from "@/types/settings";
import { useToast } from "@/hooks/use-toast";
import { ALL_MARKETPLACES } from "@/types/seller";

const currentYear = 2026;
const years = [2024, 2025, 2026, 2027];
const months = Array.from({ length: 12 }, (_, i) => i + 1);

export default function Settings() {
  const { toast } = useToast();
  const { getTarget, saveTarget } = useSettings();
  const { activeSellers, selectedSeller: globalSelectedSeller, getActiveMarketplaces } = useSeller();

  // Get active marketplaces for the selected seller
  const activeMarketplaces = getActiveMarketplaces();
  const [selectedSeller, setSelectedSeller] = useState(globalSelectedSeller?.id ?? "");
  const [selectedMarketplace, setSelectedMarketplace] = useState<string>(activeMarketplaces[0]?.id || "ml");
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(1);

  // Target state
  const [currentTarget, setCurrentTarget] = useState<MonthlyTarget>(() => {
    const id = generateTargetId(selectedSeller, selectedMarketplace, selectedYear, selectedMonth);
    const existing = getTarget(selectedSeller, selectedMarketplace, selectedYear, selectedMonth);
    if (existing) return existing;
    
    return {
      id,
      sellerId: selectedSeller,
      marketplaceId: selectedMarketplace,
      year: selectedYear,
      month: selectedMonth,
      targetValue: 0,
      pmtDistribution: generateDefaultPMTDistribution(selectedYear, selectedMonth),
    };
  });

  // Update current target when filters change
  useEffect(() => {
    const id = generateTargetId(selectedSeller, selectedMarketplace, selectedYear, selectedMonth);
    const existing = getTarget(selectedSeller, selectedMarketplace, selectedYear, selectedMonth);
    
    if (existing) {
      setCurrentTarget(existing);
    } else {
      setCurrentTarget({
        id,
        sellerId: selectedSeller,
        marketplaceId: selectedMarketplace,
        year: selectedYear,
        month: selectedMonth,
        targetValue: 0,
        pmtDistribution: generateDefaultPMTDistribution(selectedYear, selectedMonth),
      });
    }
  }, [selectedSeller, selectedMarketplace, selectedYear, selectedMonth, getTarget]);

  const handleTargetValueChange = (value: number) => {
    setCurrentTarget((prev) => ({ ...prev, targetValue: value }));
  };

  const handleDistributionChange = (distribution: typeof currentTarget.pmtDistribution) => {
    setCurrentTarget((prev) => ({ ...prev, pmtDistribution: distribution }));
  };

  const handleSave = () => {
    const totalPMT = currentTarget.pmtDistribution.reduce((sum, d) => sum + d.pmt, 0);
    
    if (Math.abs(totalPMT - 100) >= 0.01) {
      toast({
        title: "Erro de validação",
        description: `A soma dos PMTs deve ser 100%. Atualmente: ${totalPMT.toFixed(2)}%`,
        variant: "destructive",
      });
      return;
    }

    saveTarget(currentTarget);
    toast({
      title: "Configurações salvas",
      description: `Meta e PMT de ${monthLabels[selectedMonth]} ${selectedYear} salvos com sucesso.`,
    });
  };

  const selectedMarketplaceData = ALL_MARKETPLACES.find((m) => m.id === selectedMarketplace);

  return (
    <div className="space-y-6">
        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            Salvar Configurações
          </Button>
        </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Seller */}
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
                      {seller.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Marketplace */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                Marketplace
              </Label>
              <Select value={selectedMarketplace} onValueChange={setSelectedMarketplace}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                {activeMarketplaces.map((mp) => (
                    <SelectItem key={mp.id} value={mp.id}>
                      <div className="flex items-center gap-2">
                        {(() => {
                          const brand = getMarketplaceBrand(mp.id);
                          if (brand) {
                            const BIcon = brand.icon;
                            return (
                              <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded bg-gradient-to-br ${brand.gradient}`}>
                                <BIcon className="h-2.5 w-2.5 text-white" />
                              </div>
                            );
                          }
                          return null;
                        })()}
                        {mp.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Year */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Ano
              </Label>
              <Select
                value={selectedYear.toString()}
                onValueChange={(v) => setSelectedYear(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Month */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Mês
              </Label>
              <Select
                value={selectedMonth.toString()}
                onValueChange={(v) => setSelectedMonth(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month} value={month.toString()}>
                      {monthLabels[month]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Target Form and PMT Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <TargetForm
            targetValue={currentTarget.targetValue}
            onTargetValueChange={handleTargetValueChange}
          />
        </div>
        <div className="lg:col-span-2">
          <PMTTable
            year={selectedYear}
            month={selectedMonth}
            distribution={currentTarget.pmtDistribution}
            targetValue={currentTarget.targetValue}
            onDistributionChange={handleDistributionChange}
          />
        </div>
        </div>
    </div>
  );
}
