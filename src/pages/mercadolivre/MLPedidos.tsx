import { useMemo, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
} from "recharts";
import { format, parseISO, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ClipboardList, DollarSign, TrendingDown, Package,
  Truck, RefreshCw, Info, Plug, Search, ChevronDown, ChevronUp,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { KPICard } from "@/components/dashboard/KPICard";
import { MLPageHeader } from "@/components/mercadolivre/MLPageHeader";
import { useMLStore } from "@/contexts/MLStoreContext";
import {
  getMockOrders,
  computePedidosSummary,
  type OrderStatus,
  type ListingType,
} from "@/data/pedidosMockData";

const currFmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pctFmt = (v: number) => `${v.toFixed(1)}%`;

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string; border: string }> = {
  paid:      { label: "Pago",      color: "text-blue-600",    bg: "bg-blue-500/15",    border: "border-blue-500/30"    },
  shipped:   { label: "Enviado",   color: "text-violet-600",  bg: "bg-violet-500/15",  border: "border-violet-500/30"  },
  delivered: { label: "Entregue",  color: "text-emerald-600", bg: "bg-emerald-500/15", border: "border-emerald-500/30" },
  cancelled: { label: "Cancelado", color: "text-red-600",     bg: "bg-red-500/15",     border: "border-red-500/30"     },
  returned:  { label: "Devolvido", color: "text-orange-600",  bg: "bg-orange-500/15",  border: "border-orange-500/30"  },
  pending:   { label: "Pendente",  color: "text-amber-600",   bg: "bg-amber-500/15",   border: "border-amber-500/30"   },
};

const LISTING_LABELS: Record<ListingType, string> = {
  classic: "Clássico",
  premium: "Premium",
  free:    "Grátis",
};

function statusBadge(s: OrderStatus) {
  const cfg = STATUS_CONFIG[s];
  return <Badge className={`${cfg.bg} ${cfg.color} ${cfg.border} whitespace-nowrap text-xs`}>{cfg.label}</Badge>;
}

function marginColor(pct: number) {
  if (pct >= 60) return "text-emerald-600";
  if (pct >= 40) return "text-amber-600";
  return "text-red-600";
}

type SortKey = "date" | "gross" | "net" | "margin" | "commission";
type SortDir = "asc" | "desc";
type StatusFilter = "all" | OrderStatus;

function NotConnected() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Plug className="w-16 h-16 text-muted-foreground/40" />
        <h2 className="text-xl font-semibold">Mercado Livre não conectado</h2>
        <p className="text-muted-foreground text-sm">Conecte sua conta para acessar os pedidos.</p>
        <Button asChild><Link to="/api/integracoes">Conectar conta</Link></Button>
      </div>
    </div>
  );
}

export default function MLPedidos() {
  const { stores, selectedStore } = useMLStore();
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const connected = stores.length > 0;
  const storeId = selectedStore !== "all" && selectedStore ? selectedStore : stores[0]?.ml_user_id ?? "default";

  const allOrders = useMemo(() => getMockOrders(storeId, 60), [storeId]);
  const summary = useMemo(() => computePedidosSummary(allOrders), [allOrders]);

  const chartData = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 30 }, (_, i) => {
      const date = format(subDays(today, 29 - i), "yyyy-MM-dd");
      const dayOrders = allOrders.filter(
        (o) => o.date === date && o.status !== "cancelled" && o.status !== "returned"
      );
      return {
        date: format(parseISO(date), "dd/MM", { locale: ptBR }),
        "Receita Bruta": Math.round(dayOrders.reduce((s, o) => s + o.gross_revenue, 0) * 100) / 100,
        "Receita Líquida": Math.round(dayOrders.reduce((s, o) => s + o.net_revenue, 0) * 100) / 100,
      };
    });
  }, [allOrders]);

  const filtered = useMemo(() => {
    let result = allOrders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !o.id.toLowerCase().includes(q) &&
          !o.item.title.toLowerCase().includes(q) &&
          !o.buyer_nickname.toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });

    result = [...result].sort((a, b) => {
      let diff = 0;
      if (sortKey === "date")       diff = a.date.localeCompare(b.date);
      if (sortKey === "gross")      diff = a.gross_revenue - b.gross_revenue;
      if (sortKey === "net")        diff = a.net_revenue - b.net_revenue;
      if (sortKey === "margin")     diff = a.net_margin_pct - b.net_margin_pct;
      if (sortKey === "commission") diff = a.commission_rate - b.commission_rate;
      return sortDir === "desc" ? -diff : diff;
    });

    return result;
  }, [allOrders, search, statusFilter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return null;
    return sortDir === "desc"
      ? <ChevronDown className="w-3 h-3 inline ml-0.5" />
      : <ChevronUp className="w-3 h-3 inline ml-0.5" />;
  };

  if (!connected) return <NotConnected />;

  return (
    <div className="space-y-6 -mt-8">

      <div className="sticky top-0 z-20 -mx-8 px-8 pb-3 pt-4 bg-background/95 backdrop-blur-sm border-b border-border/40">
        <div className="flex items-center justify-between gap-4">
          <MLPageHeader title="Pedidos" lastUpdated={null} />
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="text-xs gap-1.5 text-muted-foreground cursor-help">
                  <Info className="w-3 h-3" /> Dados simulados
                </Badge>
              </TooltipTrigger>
              <TooltipContent>Integração com a API de pedidos em breve</TooltipContent>
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
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Pedidos ativos"
          value={String(summary.total_orders)}
          variant="minimal"
          iconClassName="bg-primary/10 text-primary"
          size="compact"
          icon={<ClipboardList className="w-4 h-4" />}
          subtitle={`${summary.cancelled_orders} cancelados/devolvidos`}
        />
        <KPICard
          title="Receita bruta"
          value={currFmt(summary.gross_revenue)}
          variant="minimal"
          iconClassName="bg-accent/10 text-accent"
          size="compact"
          icon={<DollarSign className="w-4 h-4" />}
          subtitle="Últimos 60 dias"
        />
        <KPICard
          title="Receita líquida"
          value={currFmt(summary.net_revenue)}
          variant="minimal"
          iconClassName="bg-success/10 text-success"
          size="compact"
          icon={<TrendingDown className="w-4 h-4" />}
          subtitle={`Margem média ${pctFmt(summary.net_margin_pct)}`}
        />
        <KPICard
          title="Ticket médio"
          value={currFmt(summary.avg_ticket)}
          variant="minimal"
          iconClassName="bg-[hsl(25,95%,53%)]/10 text-[hsl(25,95%,53%)]"
          size="compact"
          icon={<Package className="w-4 h-4" />}
          subtitle="Por pedido ativo"
        />
      </div>

      {/* Fee breakdown */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground font-medium">Comissão ML</p>
            <p className="text-2xl font-bold mt-1 text-destructive">{currFmt(summary.ml_commission)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {pctFmt(summary.gross_revenue > 0 ? (summary.ml_commission / summary.gross_revenue) * 100 : 0)} da receita bruta
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              <Truck className="w-3.5 h-3.5" /> Frete grátis (custo)
            </p>
            <p className="text-2xl font-bold mt-1 text-orange-600">{currFmt(summary.shipping_cost)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {pctFmt(summary.gross_revenue > 0 ? (summary.shipping_cost / summary.gross_revenue) * 100 : 0)} da receita bruta
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground font-medium">Margem líquida média</p>
            <p className={`text-2xl font-bold mt-1 ${marginColor(summary.net_margin_pct)}`}>{pctFmt(summary.net_margin_pct)}</p>
            <p className="text-xs text-muted-foreground mt-1">Bruto − Comissão − Frete</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <div className="px-4 pt-4 pb-3">
          <span className="text-sm font-medium text-foreground">Receita — últimos 30 dias</span>
        </div>
        <CardContent className="px-4 pb-2 pt-0">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="gradBruta" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradLiquida" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(1)}k`} />
              <RechartsTooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                formatter={(v: number) => currFmt(v)}
              />
              <Area dataKey="Receita Bruta"   stroke="hsl(var(--accent))"  fill="url(#gradBruta)"   strokeWidth={1.5} />
              <Area dataKey="Receita Líquida" stroke="hsl(var(--success))" fill="url(#gradLiquida)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Orders table */}
      <Card>
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <span className="text-sm font-medium text-foreground">Pedidos ({filtered.length})</span>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative w-52">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Pedido, produto ou comprador..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-8 text-xs"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  {(Object.keys(STATUS_CONFIG) as OrderStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card border-b border-border z-10">
                <tr>
                  <th className="text-left px-6 py-3 text-xs text-muted-foreground font-medium">
                    <button onClick={() => toggleSort("date")} className="hover:text-foreground transition-colors">
                      Data <SortIcon k="date" />
                    </button>
                  </th>
                  <th className="text-left px-3 py-3 text-xs text-muted-foreground font-medium">Pedido / Produto</th>
                  <th className="text-left px-3 py-3 text-xs text-muted-foreground font-medium">Tipo</th>
                  <th className="text-left px-3 py-3 text-xs text-muted-foreground font-medium">Status</th>
                  <th className="text-right px-3 py-3 text-xs text-muted-foreground font-medium">
                    <button onClick={() => toggleSort("gross")} className="hover:text-foreground transition-colors">
                      Bruto <SortIcon k="gross" />
                    </button>
                  </th>
                  <th className="text-right px-3 py-3 text-xs text-muted-foreground font-medium">
                    <button onClick={() => toggleSort("commission")} className="hover:text-foreground transition-colors">
                      Comissão <SortIcon k="commission" />
                    </button>
                  </th>
                  <th className="text-right px-3 py-3 text-xs text-muted-foreground font-medium">Frete</th>
                  <th className="text-right px-3 py-3 text-xs text-muted-foreground font-medium">
                    <button onClick={() => toggleSort("net")} className="hover:text-foreground transition-colors">
                      Líquido <SortIcon k="net" />
                    </button>
                  </th>
                  <th className="text-right px-6 py-3 text-xs text-muted-foreground font-medium">
                    <button onClick={() => toggleSort("margin")} className="hover:text-foreground transition-colors">
                      Margem <SortIcon k="margin" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-muted-foreground text-sm">
                      Nenhum pedido encontrado
                    </td>
                  </tr>
                ) : (
                  filtered.map((order) => (
                    <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-3 text-muted-foreground text-xs whitespace-nowrap">
                        {format(parseISO(order.date), "dd/MM/yy")}
                      </td>
                      <td className="px-3 py-3 max-w-[220px]">
                        <p className="font-medium text-xs truncate">{order.id}</p>
                        <p className="text-xs text-muted-foreground truncate">{order.item.title}</p>
                        <p className="text-[10px] text-muted-foreground/60">{order.buyer_nickname} · {order.item.quantity}x</p>
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">{LISTING_LABELS[order.item.listing_type]}</td>
                      <td className="px-3 py-3">{statusBadge(order.status)}</td>
                      <td className="px-3 py-3 text-right font-mono text-xs">{currFmt(order.gross_revenue)}</td>
                      <td className="px-3 py-3 text-right text-xs">
                        <span className="text-destructive font-mono">−{currFmt(order.ml_commission)}</span>
                        <span className="text-[10px] text-muted-foreground ml-1">({pctFmt(order.commission_rate * 100)})</span>
                      </td>
                      <td className="px-3 py-3 text-right text-xs">
                        {order.free_shipping
                          ? <span className="text-orange-600 font-mono">−{currFmt(order.shipping_cost)}</span>
                          : <span className="text-muted-foreground">—</span>
                        }
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-xs font-semibold">{currFmt(order.net_revenue)}</td>
                      <td className="px-6 py-3 text-right">
                        <span className={`text-sm font-bold ${marginColor(order.net_margin_pct)}`}>
                          {pctFmt(order.net_margin_pct)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {filtered.length > 0 && (
            <div className="px-6 py-3 border-t text-xs text-muted-foreground">
              {filtered.length} pedidos · Líquido total:{" "}
              <span className="font-semibold text-foreground">
                {currFmt(filtered.reduce((s, o) => s + o.net_revenue, 0))}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
