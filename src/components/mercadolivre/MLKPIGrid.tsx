import { KPICard } from "@/components/dashboard/KPICard";
import { DollarSign, ShoppingCart, Tag, Eye, Percent } from "lucide-react";

const currencyFmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Metrics {
  total_revenue: number;
  units_sold: number;
  avg_ticket: number;
  unique_visits: number;
  conversion_rate: number;
  total_orders: number;
  unique_buyers: number;
}

interface MLKPIGridProps {
  metrics: Metrics | null;
  previousMetrics: Metrics | null;
  loading: boolean;
  syncing: boolean;
  hasSyncProgress: boolean;
}

function calcDelta(current: number, previous: number | undefined) {
  if (previous === undefined || previous === 0) return undefined;
  return ((current - previous) / previous) * 100;
}

export function MLKPIGrid({ metrics, previousMetrics, loading, syncing, hasSyncProgress }: MLKPIGridProps) {
  const refreshing = syncing && !hasSyncProgress;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      <KPICard
        title="Receita Total"
        value={metrics ? currencyFmt(metrics.total_revenue) : "—"}
        icon={<DollarSign className="w-4 h-4" />}
        variant="minimal"
        iconClassName="bg-accent/10 text-accent"
        size="compact"
        loading={loading}
        refreshing={refreshing}
        delta={metrics && previousMetrics ? calcDelta(metrics.total_revenue, previousMetrics.total_revenue) : undefined}
      />
      <KPICard
        title="Pedidos"
        value={metrics ? String(metrics.units_sold) : "—"}
        icon={<ShoppingCart className="w-4 h-4" />}
        variant="minimal"
        iconClassName="bg-[hsl(270,70%,50%)]/10 text-[hsl(270,70%,50%)]"
        size="compact"
        loading={loading}
        refreshing={refreshing}
        delta={metrics && previousMetrics ? calcDelta(metrics.units_sold, previousMetrics.units_sold) : undefined}
      />
      <KPICard
        title="Ticket Médio"
        value={
          metrics
            ? metrics.avg_ticket.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })
            : "—"
        }
        icon={<Tag className="w-4 h-4" />}
        variant="minimal"
        iconClassName="bg-[hsl(25,95%,53%)]/10 text-[hsl(25,95%,53%)]"
        size="compact"
        loading={loading}
        refreshing={refreshing}
        delta={metrics && previousMetrics ? calcDelta(metrics.avg_ticket, previousMetrics.avg_ticket) : undefined}
      />
      <KPICard
        title="Visitas"
        value={metrics ? metrics.unique_visits.toLocaleString("pt-BR") : "—"}
        icon={<Eye className="w-4 h-4" />}
        variant="minimal"
        iconClassName="bg-accent/10 text-accent"
        size="compact"
        loading={loading}
        refreshing={refreshing}
        delta={metrics && previousMetrics ? calcDelta(metrics.unique_visits, previousMetrics.unique_visits) : undefined}
      />
      <KPICard
        title="Conversão"
        value={metrics ? `${metrics.conversion_rate.toFixed(2)}%` : "—"}
        icon={<Percent className="w-4 h-4" />}
        variant="minimal"
        iconClassName="bg-success/10 text-success"
        size="compact"
        loading={loading}
        refreshing={refreshing}
        delta={metrics && previousMetrics ? calcDelta(metrics.conversion_rate, previousMetrics.conversion_rate) : undefined}
      />
    </div>
  );
}
