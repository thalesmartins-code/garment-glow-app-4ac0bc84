import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { History, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface DailyBreakdown {
  date: string;
  total: number;
  approved: number;
  qty: number;
  cancelled: number;
  shipped: number;
  unique_visits: number;
  unique_buyers: number;
}

interface Props {
  accessToken: string | null;
  onSyncComplete: () => void;
  saveToCache?: (dailyData: DailyBreakdown[]) => Promise<void>;
}

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function getYearOptions() {
  const current = new Date().getFullYear();
  return [current, current - 1, current - 2];
}

export function HistoricalSyncModal({ accessToken, onSyncComplete, saveToCache }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState("");
  const [fromMonth, setFromMonth] = useState<string>("");
  const [fromYear, setFromYear] = useState<string>(String(new Date().getFullYear()));
  const [toMonth, setToMonth] = useState<string>("");
  const [toYear, setToYear] = useState<string>(String(new Date().getFullYear()));

  const years = getYearOptions();

  const handleSync = async () => {
    if (!fromMonth || !toMonth || !accessToken || !user) return;

    const from = new Date(Number(fromYear), Number(fromMonth), 1);
    const toMonthNum = Number(toMonth);
    const toYearNum = Number(toYear);
    const to = new Date(toYearNum, toMonthNum + 1, 0); // last day of month

    if (from > to) {
      toast({ title: "Erro", description: "O período inicial deve ser anterior ao final.", variant: "destructive" });
      return;
    }

    if (from > new Date()) {
      toast({ title: "Erro", description: "Não é possível importar dados futuros.", variant: "destructive" });
      return;
    }

    setSyncing(true);

    // Split into monthly chunks to avoid timeouts
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

    try {
      for (let i = 0; i < monthChunks.length; i++) {
        const chunk = monthChunks[i];
        setProgress(`Importando ${chunk.label} (${i + 1}/${monthChunks.length})...`);

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

        // Save to cache from frontend (edge function cache write may fail)
        if (saveToCache && data.daily_breakdown) {
          const dailyData: DailyBreakdown[] = data.daily_breakdown.map((d: any) => ({
            date: d.date,
            total: d.total,
            approved: d.approved,
            qty: d.qty,
            cancelled: d.cancelled || 0,
            shipped: d.shipped || 0,
          }));
          await saveToCache(dailyData);
        }
      }

      toast({ title: "Sucesso", description: `${monthChunks.length} mês(es) importados com sucesso!` });
      setOpen(false);
      onSyncComplete();
    } catch (err: any) {
      toast({ title: "Erro na importação", description: err.message, variant: "destructive" });
    } finally {
      setSyncing(false);
      setProgress("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <History className="w-4 h-4 mr-1" /> Histórico
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Importar Dados Históricos</DialogTitle>
          <DialogDescription>
            Selecione o período para importar dados retroativos do Mercado Livre. Os dados serão salvos no cache.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 mt-4">
          {/* From */}
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

          {/* To */}
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

        {progress && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            {progress}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={syncing}>
            Cancelar
          </Button>
          <Button onClick={handleSync} disabled={syncing || !fromMonth || !toMonth}>
            {syncing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <History className="w-4 h-4 mr-1" />}
            Importar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
