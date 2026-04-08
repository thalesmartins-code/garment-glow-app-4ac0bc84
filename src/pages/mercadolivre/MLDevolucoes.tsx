import { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
} from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  PackageX, AlertCircle, CheckCircle2, Clock, Plug,
  RefreshCw, Info, ShieldAlert,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { KPICard } from "@/components/dashboard/KPICard";
import { MLPageHeader } from "@/components/mercadolivre/MLPageHeader";
import { useMLStore } from "@/contexts/MLStoreContext";
import {
  getMockDevolucoeSummary,
  getMockDevolucoesDailyStats,
  getMockClaimEntries,
  type ClaimStatus,
} from "@/data/devolucoesMockData";

const currFmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const STATUS_CONFIG: Record<ClaimStatus, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  opened:                { label: "Aberta",             color: "text-red-600",     bg: "bg-red-500/15",     border: "border-red-500/30",     icon: <AlertCircle className="w-3 h-3" />    },
  under_review:          { label: "Em análise",         color: "text-amber-600",   bg: "bg-amber-500/15",   border: "border-amber-500/30",   icon: <Clock className="w-3 h-3" />          },
  closed_with_refund:    { label: "Resolvida c/ reemb.", color: "text-emerald-600", bg: "bg-emerald-500/15", border: "border-emerald-500/30", icon: <CheckCircle2 className="w-3 h-3" />   },
  closed_without_refund: { label: "Encerrada",          color: "text-gray-500",    bg: "bg-gray-500/15",    border: "border-gray-500/30",    icon: <CheckCircle2 className="w-3 h-3" />   },
};

function statusBadge(s: ClaimStatus) {
  const cfg = STATUS_CONFIG[s];
  return (
    <Badge className={`${cfg.bg} ${cfg.color} ${cfg.border} gap-1 whitespace-nowrap`}>
      {cfg.icon} {cfg.label}
    </Badge>
  );
}

function NotConnected() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Plug className="w-16 h-16 text-muted-foreground/40" />
        <h2 className="text-xl font-semibold">Mercado Livre não conectado</h2>
        <p className="text-muted-foreground text-sm">Conecte sua conta para acessar as devoluções e reclamações.</p>
        <Button asChild><Link to="/api/integracoes">Conectar conta</Link></Button>
      </div>
    </div>
  );
}

export default function MLDevolucoes() {
  const { stores, selectedStore } = useMLStore();
  const [syncing, setSyncing] = useState(false);

  const connected = stores.length > 0;
  const storeId = selectedStore !== "all" && selectedStore ? selectedStore : stores[0]?.ml_user_id ?? "default";

  const summary = useMemo(() => getMockDevolucoeSummary(storeId), [storeId]);
  const dailyStats = useMemo(() => getMockDevolucoesDailyStats(storeId, 30), [storeId]);
  const claims = useMemo(() => getMockClaimEntries(storeId, 20), [storeId]);

  const chartData = dailyStats.map((d) => ({
    date: format(parseISO(d.date), "dd/MM", { locale: ptBR }),
    Abertas: d.opened,
    Resolvidas: d.resolved,
  }));

  // Reason breakdown
  const reasonCounts = useMemo(() => {
    const map: Record<string, { label: string; count: number }> = {};
    for (const c of claims) {
      if (!map[c.reason]) map[c.reason] = { label: c.reason_label, count: 0 };
      map[c.reason].count++;
    }
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [claims]);

  if (!connected) return <NotConnected />;

  return (
    <div className="space-y-6 -mt-8">

      <div className="flex items-center justify-between flex-wrap gap-2">
        <MLPageHeader title="Devoluções" lastUpdated={null} />
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="text-xs gap-1.5 text-muted-foreground cursor-help">
                <Info className="w-3 h-3" /> Dados simulados
              </Badge>
            </TooltipTrigger>
            <TooltipContent>Integração com a API de reclamações em breve</TooltipContent>
          </Tooltip>
          <Button
            variant="outline"
            size="sm"
            disabled={syncing}
            onClick={() => { setSyncing(true); setTimeout(() => setSyncing(false), 1200); }}
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${syncing ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Reclamações abertas"
          value={String(summary.open_claims)}
          variant="minimal"
          iconClassName={summary.open_claims === 0 ? "bg-success/10 text-success" : summary.open_claims <= 5 ? "bg-[hsl(25,95%,53%)]/10 text-[hsl(25,95%,53%)]" : "bg-destructive/10 text-destructive"}
          size="compact"
          icon={<AlertCircle className="w-4 h-4" />}
          subtitle={`${summary.total_claims} total (últimos 60 dias)`}
        />
        <KPICard
          title="Taxa de resolução"
          value={`${summary.resolution_rate.toFixed(1)}%`}
          variant="minimal"
          iconClassName={summary.resolution_rate >= 90 ? "bg-success/10 text-success" : "bg-[hsl(25,95%,53%)]/10 text-[hsl(25,95%,53%)]"}
          size="compact"
          icon={<CheckCircle2 className="w-4 h-4" />}
          subtitle="Reclamações resolvidas"
        />
        <KPICard
          title="Tempo médio resolução"
          value={`${summary.avg_resolution_days}d`}
          variant="minimal"
          iconClassName={summary.avg_resolution_days <= 5 ? "bg-success/10 text-success" : "bg-[hsl(25,95%,53%)]/10 text-[hsl(25,95%,53%)]"}
          size="compact"
          icon={<Clock className="w-4 h-4" />}
          subtitle="Em dias úteis"
        />
        <KPICard
          title="Taxa de reclamações"
          value={`${summary.claims_rate_pct.toFixed(1)}%`}
          variant="minimal"
          iconClassName={summary.claims_rate_pct < 1 ? "bg-success/10 text-success" : "bg-[hsl(25,95%,53%)]/10 text-[hsl(25,95%,53%)]"}
          size="compact"
          icon={<ShieldAlert className="w-4 h-4" />}
          subtitle="Meta ML: abaixo de 1%"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <div className="px-4 pt-4 pb-3">
              <span className="text-sm font-medium text-foreground">Reclamações — últimos 30 dias</span>
            </div>
            <CardContent className="px-4 pb-2 pt-0">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} barSize={10}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <RechartsTooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  />
                  
                  <Bar dataKey="Abertas" fill="hsl(var(--destructive))" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="Resolvidas" fill="hsl(var(--success))" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Reason breakdown */}
        <Card>
          <div className="px-4 pt-4 pb-3">
            <span className="text-sm font-medium text-foreground">Motivos</span>
          </div>
          <CardContent className="space-y-3">
            {reasonCounts.map(({ label, count }) => {
              const pct = Math.round((count / claims.length) * 100);
              return (
                <div key={label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-foreground truncate pr-2">{label}</span>
                    <span className="text-muted-foreground flex-shrink-0">{count} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-destructive/60" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Claims table */}
      <Card>
        <div className="px-4 pt-4 pb-3">
          <span className="text-sm font-medium text-foreground">Reclamações recentes</span>
        </div>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-6 py-3 text-xs text-muted-foreground font-medium">Data</th>
                  <th className="text-left px-3 py-3 text-xs text-muted-foreground font-medium">Produto</th>
                  <th className="text-left px-3 py-3 text-xs text-muted-foreground font-medium">Motivo</th>
                  <th className="text-right px-3 py-3 text-xs text-muted-foreground font-medium">Valor</th>
                  <th className="text-left px-3 py-3 text-xs text-muted-foreground font-medium">Status</th>
                  <th className="text-right px-6 py-3 text-xs text-muted-foreground font-medium">Resolução</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {claims.slice(0, 12).map((claim) => (
                  <tr key={claim.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-3 text-muted-foreground whitespace-nowrap">
                      {format(parseISO(claim.date), "dd/MM/yy")}
                    </td>
                    <td className="px-3 py-3 max-w-[180px] truncate">{claim.item_title}</td>
                    <td className="px-3 py-3 text-muted-foreground">{claim.reason_label}</td>
                    <td className="px-3 py-3 text-right font-mono">{currFmt(claim.amount)}</td>
                    <td className="px-3 py-3">{statusBadge(claim.status)}</td>
                    <td className="px-6 py-3 text-right text-muted-foreground">
                      {claim.resolution_days ? `${claim.resolution_days}d` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
