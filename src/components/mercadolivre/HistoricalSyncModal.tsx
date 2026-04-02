import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { History, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";


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
  mlUserId?: string;
  sellerId?: string | null;
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

/** Format a local Date to "yyyy-MM-dd" without UTC conversion. */
function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Last day of month for a given year/month (0-indexed). */
function lastDayOfMonth(year: number, month: number): Date {
  return new Date(year, month + 1, 0);
}

export function HistoricalSyncModal({ accessToken, mlUserId, onSyncComplete }: Props) {
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
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth(); // 0-indexed

  // Preview of the effective date range (respecting today cap)
  const previewRange = (() => {
    if (!fromMonth || !toMonth) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const from = new Date(Number(fromYear), Number(fromMonth), 1);
    const rawTo = lastDayOfMonth(Number(toYear), Number(toMonth));
    const to = rawTo > today ? today : rawTo;
    if (from > to) return null;
    const fmt = (d: Date) =>
      `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    return `${fmt(from)} → ${fmt(to)}`;
  })();

  const resetState = () => {
    setSummary(null);
    setProgressPercent(0);
    setProgressLabel("");
    setHasError(false);
  };

  const handleSync = async () => {
    if (!fromMonth || !toMonth || !accessToken || !user) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const from = new Date(Number(fromYear), Number(fromMonth), 1);
    // Cap "to" at today so we never request future dates
    const rawTo = lastDayOfMonth(Number(toYear), Number(toMonth));
    const to = rawTo > today ? today : rawTo;

    if (from > to) {
      toast({ title: "Erro", description: "O período inicial deve ser anterior ao final.", variant: "destructive" });
      return;
    }


    setSyncing(true);
    resetState();

    const monthChunks: Array<{ date_from: string; date_to: string; label: string }> = [];
    let cursor = new Date(from.getFullYear(), from.getMonth(), 1);

    while (cursor <= to) {
      const chunkStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
      const chunkEnd = lastDayOfMonth(cursor.getFullYear(), cursor.getMonth());
      const finalEnd = chunkEnd > to ? to : chunkEnd;

      monthChunks.push({
        date_from: toDateStr(chunkStart),
        date_to: toDateStr(finalEnd),
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
            seller_id: sellerId || null,
          },
        });

        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || `Falha ao importar ${chunk.label}`);

        // ml_user_id: use edge function response first, then prop fallback
        const resolvedMlUserId = String(data.user?.id ?? mlUserId ?? "");
        const dailyData: any[] = data.daily_breakdown || [];
        const ordersCount = dailyData.reduce((s, d) => s + Number(d.qty ?? 0), 0);

        accumulated.monthsImported += 1;
        accumulated.totalDays += dailyData.length;
        accumulated.totalOrders += ordersCount;
        accumulated.totalRevenue += dailyData.reduce((s, d) => s + Number(d.total ?? 0), 0);
        accumulated.totalApproved += dailyData.reduce((s, d) => s + Number(d.approved ?? 0), 0);

        // Edge function already upserts cache tables.
        // Only record this sync in ml_sync_log.
        await supabase.from("ml_sync_log" as any).upsert(
          {
            user_id: user.id,
            ml_user_id: resolvedMlUserId,
            date_from: chunk.date_from,
            date_to: chunk.date_to,
            days_synced: dailyData.length,
            orders_fetched: ordersCount,
            source: "historical",
            synced_at: new Date().toISOString(),
          },
          { onConflict: "user_id,ml_user_id,date_from,date_to,source" },
        );
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
            <Select value={fromYear} onValueChange={setFromYear}>
              <SelectTrigger><SelectValue placeholder="Ano" /></SelectTrigger>
              <SelectContent>
                {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={fromMonth} onValueChange={setFromMonth}>
              <SelectTrigger><SelectValue placeholder="Mês" /></SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => {
                  const isFuture = Number(fromYear) === currentYear && i > currentMonth;
                  return <SelectItem key={i} value={String(i)} disabled={isFuture}>{m}</SelectItem>;
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Até</label>
            <Select value={toYear} onValueChange={setToYear}>
              <SelectTrigger><SelectValue placeholder="Ano" /></SelectTrigger>
              <SelectContent>
                {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={toMonth} onValueChange={setToMonth}>
              <SelectTrigger><SelectValue placeholder="Mês" /></SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => {
                  const isFuture = Number(toYear) === currentYear && i > currentMonth;
                  return <SelectItem key={i} value={String(i)} disabled={isFuture}>{m}</SelectItem>;
                })}
              </SelectContent>
            </Select>
          </div>

        </div>
        {previewRange && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Período a importar: <span className="font-medium text-foreground">{previewRange}</span>
          </p>
        )}

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
