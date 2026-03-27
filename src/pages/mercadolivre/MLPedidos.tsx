import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMLStore } from "@/contexts/MLStoreContext";
import { MLPageHeader } from "@/components/mercadolivre/MLPageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClipboardList, Calendar, Package, Database, Clock, ArrowUpDown } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SyncLogEntry {
  id: string;
  date_from: string;
  date_to: string;
  source: string;
  synced_at: string;
  days_synced: number;
  orders_fetched: number;
  ml_user_id: string;
}

export default function MLPedidos() {
  const { user } = useAuth();
  const { selectedStore } = useMLStore();
  const [syncLogs, setSyncLogs] = useState<SyncLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    let query = supabase
      .from("ml_sync_log")
      .select("id, date_from, date_to, source, synced_at, days_synced, orders_fetched, ml_user_id")
      .eq("user_id", user.id)
      .order("synced_at", { ascending: false })
      .limit(200);

    if (selectedStore !== "all") {
      query = query.eq("ml_user_id", selectedStore);
    }

    query.then(({ data }) => {
      setSyncLogs(data ?? []);
      setLoading(false);
    });
  }, [user, selectedStore]);

  const sorted = useMemo(() => {
    const copy = [...syncLogs];
    copy.sort((a, b) => {
      const da = a.date_from;
      const db = b.date_from;
      return sortAsc ? da.localeCompare(db) : db.localeCompare(da);
    });
    return copy;
  }, [syncLogs, sortAsc]);

  const totalOrders = useMemo(() => syncLogs.reduce((s, l) => s + l.orders_fetched, 0), [syncLogs]);
  const totalDays = useMemo(() => {
    const uniqueDates = new Set<string>();
    syncLogs.forEach((l) => {
      const from = new Date(l.date_from + "T12:00:00");
      const to = new Date(l.date_to + "T12:00:00");
      for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
        uniqueDates.add(d.toISOString().substring(0, 10));
      }
    });
    return uniqueDates.size;
  }, [syncLogs]);

  const dateRange = useMemo(() => {
    if (syncLogs.length === 0) return null;
    const allDates = syncLogs.flatMap((l) => [l.date_from, l.date_to]).sort();
    return { from: allDates[0], to: allDates[allDates.length - 1] };
  }, [syncLogs]);

  function formatDate(dateStr: string) {
    return format(new Date(dateStr + "T12:00:00"), "dd/MM/yyyy");
  }

  function formatDateTime(dateStr: string) {
    return format(new Date(dateStr), "dd/MM/yyyy HH:mm", { locale: ptBR });
  }

  return (
    <div className="space-y-6">
      <MLPageHeader title="Pedidos" />

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sincronizações</p>
              <p className="text-2xl font-bold">{syncLogs.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total de pedidos</p>
              <p className="text-2xl font-bold">{totalOrders.toLocaleString("pt-BR")}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cobertura</p>
              <p className="text-2xl font-bold">
                {totalDays} {totalDays === 1 ? "dia" : "dias"}
              </p>
              {dateRange && (
                <p className="text-xs text-muted-foreground">
                  {formatDate(dateRange.from)} — {formatDate(dateRange.to)}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sync log table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardList className="h-5 w-5" />
            Histórico de sincronizações
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Clock className="h-5 w-5 animate-spin mr-2" />
              Carregando...
            </div>
          ) : sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <ClipboardList className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm">Nenhuma sincronização encontrada</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => setSortAsc(!sortAsc)}
                  >
                    <span className="flex items-center gap-1">
                      Período
                      <ArrowUpDown className="h-3.5 w-3.5" />
                    </span>
                  </TableHead>
                  <TableHead>Pedidos</TableHead>
                  <TableHead>Dias</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Sincronizado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((log) => {
                  const fromStr = formatDate(log.date_from);
                  const toStr = formatDate(log.date_to);
                  const range = fromStr === toStr ? fromStr : `${fromStr} — ${toStr}`;

                  return (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{range}</TableCell>
                      <TableCell>{log.orders_fetched.toLocaleString("pt-BR")}</TableCell>
                      <TableCell>{log.days_synced}</TableCell>
                      <TableCell>
                        <Badge
                          variant={log.source === "historical" ? "secondary" : "outline"}
                          className="text-xs"
                        >
                          {log.source === "historical" ? "Histórico" : "Auto"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDateTime(log.synced_at)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
