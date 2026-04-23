import { useEffect, useState } from "react";
import { Settings2, PackageX, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  defaultThresholds,
  type CoveragePeriod,
  type CoverageThresholds,
} from "@/hooks/useMLCoverage";

interface Props {
  period: CoveragePeriod;
  thresholds: CoverageThresholds;
  onChange: (next: CoverageThresholds) => void;
}

export function CoverageSettingsPopover({ period, thresholds, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [critico, setCritico] = useState(String(thresholds.criticoMax));
  const [alerta, setAlerta] = useState(String(thresholds.alertaMax));

  // Re-sync local form state whenever the popover opens or external thresholds change
  useEffect(() => {
    setCritico(String(thresholds.criticoMax));
    setAlerta(String(thresholds.alertaMax));
  }, [thresholds, open]);

  const criticoNum = Number(critico);
  const alertaNum = Number(alerta);
  const valid =
    Number.isInteger(criticoNum) &&
    Number.isInteger(alertaNum) &&
    criticoNum >= 1 &&
    alertaNum <= 365 &&
    criticoNum < alertaNum;

  const handleSave = () => {
    if (!valid) return;
    onChange({ criticoMax: criticoNum, alertaMax: alertaNum });
    setOpen(false);
  };

  const handleReset = () => {
    const def = defaultThresholds(period);
    setCritico(String(def.criticoMax));
    setAlerta(String(def.alertaMax));
    onChange(def);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && valid) {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5">
          <Settings2 className="w-3.5 h-3.5" />
          Cobertura
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-3">
        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-medium text-foreground">Configurar cobertura</h4>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Limiares em dias para classificação de SKUs
            </p>
          </div>

          <div className="space-y-2">
            {/* Ruptura — fixed */}
            <div className="flex items-center justify-between rounded-md bg-muted/40 px-2.5 py-1.5">
              <div className="flex items-center gap-2">
                <PackageX className="w-3.5 h-3.5 text-destructive" />
                <span className="text-xs font-medium">Ruptura</span>
              </div>
              <span className="text-[11px] text-muted-foreground">Estoque = 0</span>
            </div>

            {/* Crítico */}
            <div className="flex items-center justify-between gap-2">
              <Label
                htmlFor="critico-max"
                className="flex items-center gap-2 text-xs font-medium cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
                Crítico
              </Label>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground">abaixo de</span>
                <Input
                  id="critico-max"
                  type="number"
                  min={1}
                  max={364}
                  value={critico}
                  onChange={(e) => setCritico(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="h-7 w-14 text-xs text-center px-1 tabular-nums"
                />
                <span className="text-[11px] text-muted-foreground">dias</span>
              </div>
            </div>

            {/* Alerta */}
            <div className="flex items-center justify-between gap-2">
              <Label
                htmlFor="alerta-max"
                className="flex items-center gap-2 text-xs font-medium cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                Alerta
              </Label>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground">abaixo de</span>
                <Input
                  id="alerta-max"
                  type="number"
                  min={2}
                  max={365}
                  value={alerta}
                  onChange={(e) => setAlerta(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="h-7 w-14 text-xs text-center px-1 tabular-nums"
                />
                <span className="text-[11px] text-muted-foreground">dias</span>
              </div>
            </div>

            {/* OK — derived */}
            <div className="flex items-center justify-between rounded-md bg-muted/40 px-2.5 py-1.5">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                <span className="text-xs font-medium">OK</span>
              </div>
              <span className="text-[11px] text-muted-foreground">
                a partir de {valid ? alertaNum : thresholds.alertaMax} dias
              </span>
            </div>
          </div>

          {!valid && (
            <p className="text-[11px] text-destructive">
              Crítico deve ser menor que Alerta (1–365).
            </p>
          )}

          <div className="flex items-center justify-between gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-7 text-xs px-2"
            >
              Restaurar padrão
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={!valid}
              className="h-7 text-xs px-3"
            >
              Salvar
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}