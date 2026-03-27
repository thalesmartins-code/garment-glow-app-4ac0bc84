import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { History, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface DailyBreakdown {
  date: string;
  total: number;
  approved: number;
  qty: number;
  units_sold: number;
  cancelled: number;
  shipped: number;
  unique_visits: number;
  unique_buyers: number;
}

interface HourlyBreakdown {
  date: string;
  hour: number;
  total: number;
  approved: number;
  qty: number;
}

interface ImportSummary {
  totalDays: number;
  totalOrders: number;
  totalRevenue: number;
  totalApproved: number;
  monthsImported: number;
}

interface Props {
  accessToken: string | null;
  onSyncComplete: () => void;
  saveToCache?: (dailyData: DailyBreakdown[], hourlyData?: HourlyBreakdown[]) => Promise<void>;
}

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function getYearOptions() {
  const current = new Date().getFullYear();
  return [current, current - 1, current - 2];
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function HistoricalSyncModal({ accessToken, onSyncComplete, saveToCache }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [progressLabel, setProgressLabel] = useState("");
  const [progressPercent, setProgressPercent] = useState(0);
  const [fromMonth, setFromMonth] = useState<string>("");
  const [fromYear, setFromYear] = useState<string>(String(new Date().getFullYear()));
  const [toMonth, setToMonth] = useState<string>("");
  const [toYear, setToYear] = useState<string>(String(new Date().getFullYear()));
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [hasError, setHasError] = useState(false);

  const years = getYearOptions();

  const resetState = () => {
    setSummary(null);
    setProgressPercent(0);
    setProgressLabel("");
    setHasError(false);
  };

  const handleSync = async () => {
    if (!fromMonth || !toMonth || !accessToken || !user) return;

    const from = new Date(Number(fromYear), Number(fromMonth), 1);
    const toMonthNum = Number(toMonth);
    const toYearNum = Number(toYear);
    const to = new Date(toYearNum, toMonthNum + 1, 0);

    if (from > to) {
      toast({ title: "Erro", description: "O período inicial deve ser anterior ao final.", variant: "destructive" });
      return;
    }

    if (from > new Date()) {
      toast({ title: "Erro", description: "Não é possível importar dados futuros.", variant: "destructive" });
      return;
    }

    setSyncing(true);
    resetState();

    const monthChunks: Array<{ date_from: string; date_to: string; label: string }> = [];
    let cursor = new Date(from);

    while (cursor <= to) {
      const chunkStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
      const chunkEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
      const finalEnd = chunkEnd > to ? to : chunkEnd;

      monthChunks.push({
        date_from: chunkStart.toISOString().substring(0, 10),
        date_to: finalEnd.toISOString().substring(0, 10),
        label: `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`,
      });

      cursor.setMonth(cursor.getMonth() + 1);
    }

    const accumulated: ImportSummary = {
      totalDays: 0,
      totalOrders: 0,
      totalRevenue: 0,
      totalApproved: 0,
      monthsImported: 0,
    };

    try {
      for (let i = 0; i < monthChunks.length; i++) {
        const chunk = monthChunks[i];
        const percent = Math.round(((i) / monthChunks.length) * 100);
        setProgressPercent(percent);
        setProgressLabel(`Importando ${chunk.label} (${i + 1}/${monthChunks.length})`);

        const { data, error } = await supabase.functions.invoke("mercado-libre-integration", {
          body: {
            access_token: accessToken,
            user_id: user.id,
            date_from: chunk.date_from,
            date_to: chunk.date_to,
          },
        });

        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || `Falha ao importar ${chunk.label}`);

        const dailyData: DailyBreakdown[] = (data.daily_breakdown || []).map((d: any) => ({
          date: d.date,
          total: Number(d.total ?? 0),
          approved: Number(d.approved ?? 0),
          qty: Number(d.qty ?? 0),
          units_sold: Number(d.units_sold ?? d.qty ?? 0),
          cancelled: Number(d.cancelled || 0),
          shipped: Number(d.shipped || 0),
          unique_visits: Number(d.unique_visits || 0),
          unique_buyers: Number(d.unique_buyers || 0),
        }));

        const hourlyData: HourlyBreakdown[] = (data.hourly_breakdown || []).map((d: any) => ({
          date: d.date,
          hour: Number(d.hour ?? 0),
          total: Number(d.total ?? 0),
          approved: Number(d.approved ?? 0),
          qty: Number(d.qty ?? 0),
        }));

        // Accumulate summary
        accumulated.monthsImported += 1;
        accumulated.totalDays += dailyData.length;
        accumulated.totalOrders += dailyData.reduce((s, d) => s + d.qty, 0);
        accumulated.totalRevenue += dailyData.reduce((s, d) => s + d.total, 0);
        accumulated.totalApproved += dailyData.reduce((s, d) => s + d.approved, 0);

        if (saveToCache && (dailyData.length > 0 || hourlyData.length > 0)) {
          await saveToCache(dailyData, hourlyData);
        }
      }

      setProgressPercent(100);
      setProgressLabel("Concluído!");
      setSummary(accumulated);

      toast({ title: "Sucesso", description: `${monthChunks.length} mês(es) importados com sucesso!` });
      onSyncComplete();
    } catch (err: any) {
      setHasError(true);
      setProgressLabel(`Erro: ${err.message}`);
      toast({ title: "Erro na importação", description: err.message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetState(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-sm">
          <History className="w-3.5 h-3.5 mr-1" /> Histórico
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Importar Dados Históricos</DialogTitle>
          <DialogDescription>
            Selecione o período para importar dados retroativos do Mercado Livre.
          </DialogDescription>
        </DialogHeader>

        {/* Period selectors */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">De</label>
            <Select value={fromMonth} onValueChange={setFromMonth}>
              <SelectTrigger><SelectValue placeholder="Mês" /></SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => (
                  <SelectItem key={i} value={String(i)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={fromYear} onValueChange={setFromYear}>
              <SelectTrigger><SelectValue placeholder="Ano" /></SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Até</label>
            <Select value={toMonth} onValueChange={setToMonth}>
              <SelectTrigger><SelectValue placeholder="Mês" /></SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => (
                  <SelectItem key={i} value={String(i)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={toYear} onValueChange={setToYear}>
              <SelectTrigger><SelectValue placeholder="Ano" /></SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Progress bar */}
        {(syncing || progressPercent > 0) && (
          <div className="space-y-2 mt-4">
            <div className="flex items-center gap-2 text-sm">
              {syncing ? (
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              ) : hasError ? (
                <AlertCircle className="w-4 h-4 text-destructive" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              )}
              <span className={hasError ? "text-destructive" : "text-muted-foreground"}>
                {progressLabel}
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
            <span className="text-xs text-muted-foreground">{progressPercent}%</span>
          </div>
        )}

        {/* Summary */}
        {summary && (
          <div className="mt-4 rounded-lg border bg-muted/50 p-4 space-y-2">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              Resumo da importação
            </h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <span className="text-muted-foreground">Meses importados</span>
              <span className="font-medium text-foreground">{summary.monthsImported}</span>
              <span className="text-muted-foreground">Dias com dados</span>
              <span className="font-medium text-foreground">{summary.totalDays}</span>
              <span className="text-muted-foreground">Total de pedidos</span>
              <span className="font-medium text-foreground">{summary.totalOrders.toLocaleString("pt-BR")}</span>
              <span className="text-muted-foreground">Faturamento bruto</span>
              <span className="font-medium text-foreground">{formatCurrency(summary.totalRevenue)}</span>
              <span className="text-muted-foreground">Faturamento aprovado</span>
              <span className="font-medium text-foreground">{formatCurrency(summary.totalApproved)}</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-4">
          {summary ? (
            <Button onClick={() => { setOpen(false); resetState(); }}>
              Fechar
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={syncing}>
                Cancelar
              </Button>
              <Button onClick={handleSync} disabled={syncing || !fromMonth || !toMonth}>
                {syncing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <History className="w-4 h-4 mr-1" />}
                Importar
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
