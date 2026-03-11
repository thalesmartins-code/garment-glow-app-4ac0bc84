import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { KPICard } from "@/components/dashboard/KPICard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  DollarSign, ShoppingCart, TrendingUp, Tag, Megaphone, PackageCheck, PackageX, RefreshCw, ExternalLink, Plug,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
} from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

interface MLMetrics {
  total_revenue: number;
  approved_revenue: number;
  total_orders: number;
  cancelled_orders: number;
  shipped_orders: number;
  active_listings: number;
  avg_ticket: number;
  period: string;
}

interface MLUser {
  id: number;
  nickname: string;
  country: string;
  permalink: string;
}

interface DailyBreakdown {
  date: string;
  total: number;
  approved: number;
  qty: number;
}

const currencyFmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const PERIOD_OPTIONS = [
  { label: "7 dias", value: 7 },
  { label: "15 dias", value: 15 },
  { label: "30 dias", value: 30 },
] as const;

export default function MercadoLivre() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [connected, setConnected] = useState(false);
  const [metrics, setMetrics] = useState<MLMetrics | null>(null);
  const [mlUser, setMlUser] = useState<MLUser | null>(null);
  const [daily, setDaily] = useState<DailyBreakdown[]>([]);
  const [period, setPeriod] = useState(30);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setSyncing(true);
    try {
      // 1. Get token from DB
      const { data: tokenRow } = await supabase
        .from("ml_tokens")
        .select("access_token, expires_at, refresh_token")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!tokenRow?.access_token) {
        setConnected(false);
        setLoading(false);
        setSyncing(false);
        return;
      }

      // Check expiry — try refresh if needed
      let accessToken = tokenRow.access_token;
      const expiresAt = tokenRow.expires_at ? new Date(tokenRow.expires_at).getTime() : 0;
      if (expiresAt > 0 && expiresAt - Date.now() < 5 * 60 * 1000 && tokenRow.refresh_token) {
        const { data: refreshed } = await supabase.functions.invoke("ml-token-refresh", {
          body: { refresh_token: tokenRow.refresh_token, user_id: user.id },
        });
        if (refreshed?.access_token) accessToken = refreshed.access_token;
      }

      setConnected(true);

      // 2. Call edge function
      const { data, error } = await supabase.functions.invoke("mercado-libre-integration", {
        body: { access_token: accessToken, days: period },
      });

      setMetrics(data.metrics);
      setMlUser(data.user);
      setDaily(data.daily_breakdown || []);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSyncing(false);
      setLoading(false);
    }
  }, [user, toast, period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Empty state
  if (!loading && !connected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Plug className="w-16 h-16 text-muted-foreground/40" />
        <h2 className="text-xl font-semibold text-foreground">Mercado Livre não conectado</h2>
        <p className="text-muted-foreground text-sm">Conecte sua conta para visualizar os dashboards.</p>
        <Button asChild>
          <Link to="/integracoes">Ir para Integrações</Link>
        </Button>
      </div>
    );
  }

  const chartData = [...daily].reverse().map((d) => ({
    date: format(parseISO(d.date), "dd/MM", { locale: ptBR }),
    "Venda Total": d.total,
    "Venda Aprovada": d.approved,
    qty: d.qty,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mercado Livre</h1>
          <p className="text-sm text-muted-foreground">
            {mlUser ? `Vendedor: ${mlUser.nickname}` : "Dashboard de vendas"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-border bg-muted/30 p-0.5">
            {PERIOD_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant={period === opt.value ? "default" : "ghost"}
                size="sm"
                className="h-7 px-3 text-xs"
                onClick={() => setPeriod(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
          {mlUser?.permalink && (
            <Button variant="outline" size="sm" asChild>
              <a href={mlUser.permalink} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-1" /> Perfil ML
              </a>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={fetchData} disabled={syncing}>
            <RefreshCw className={`w-4 h-4 mr-1 ${syncing ? "animate-spin" : ""}`} /> Sincronizar
          </Button>
        </div>
      </div>

      {/* KPIs - Row 1: 3 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard
          title="Receita Total"
          value={metrics ? currencyFmt(metrics.total_revenue) : "—"}
          icon={<DollarSign className="w-5 h-5" />}
          variant="info"
          loading={loading}
          subtitle={`Últimos ${period} dias`}
        />
        <KPICard
          title="Receita Aprovada"
          value={metrics ? currencyFmt(metrics.approved_revenue) : "—"}
          icon={<TrendingUp className="w-5 h-5" />}
          variant="success"
          loading={loading}
          subtitle={`Últimos ${period} dias`}
        />
        <KPICard
          title="Ticket Médio"
          value={metrics ? currencyFmt(metrics.avg_ticket) : "—"}
          icon={<Tag className="w-5 h-5" />}
          variant="orange"
          loading={loading}
        />
      </div>

      {/* KPIs - Row 2: 4 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total de Pedidos"
          value={metrics ? String(metrics.total_orders) : "—"}
          icon={<ShoppingCart className="w-5 h-5" />}
          variant="purple"
          loading={loading}
        />
        <KPICard
          title="Anúncios Ativos"
          value={metrics ? String(metrics.active_listings) : "—"}
          icon={<Megaphone className="w-5 h-5" />}
          variant="neutral"
          loading={loading}
        />
        <KPICard
          title="Pedidos Enviados"
          value={metrics ? String(metrics.shipped_orders) : "—"}
          icon={<PackageCheck className="w-5 h-5" />}
          variant="success"
          loading={loading}
        />
        <KPICard
          title="Pedidos Cancelados"
          value={metrics ? String(metrics.cancelled_orders) : "—"}
          icon={<PackageX className="w-5 h-5" />}
          variant="danger"
          loading={loading}
        />
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vendas Diárias — Últimos {period} dias</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="mlTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(217,70%,45%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(217,70%,45%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="mlApproved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142,70%,45%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(142,70%,45%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(210,10%,90%)" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(217,5%,45%)" />
                <YAxis
                  tick={{ fontSize: 12 }}
                  stroke="hsl(217,5%,45%)"
                  tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                />
                <RechartsTooltip
                  formatter={(value: number) => currencyFmt(value)}
                  contentStyle={{
                    borderRadius: 12,
                    border: "none",
                    boxShadow: "0 4px 20px rgba(0,0,0,.1)",
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="Venda Total"
                  stroke="hsl(217,70%,45%)"
                  fill="url(#mlTotal)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="Venda Aprovada"
                  stroke="hsl(142,70%,45%)"
                  fill="url(#mlApproved)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      {daily.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detalhamento Diário</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Pedidos</TableHead>
                  <TableHead className="text-right">Venda Total</TableHead>
                  <TableHead className="text-right">Venda Aprovada</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {daily.map((d) => (
                  <TableRow key={d.date}>
                    <TableCell>
                      {format(parseISO(d.date), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">{d.qty}</TableCell>
                    <TableCell className="text-right">{currencyFmt(d.total)}</TableCell>
                    <TableCell className="text-right">{currencyFmt(d.approved)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
