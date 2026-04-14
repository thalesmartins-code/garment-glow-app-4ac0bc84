import { Card, CardContent } from "@/components/ui/card";
import { STORE_STROKE_COLORS as STORE_STROKE } from "@/config/storeColors";
import {
  ComposedChart, Area, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
} from "recharts";

const currencyFmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface MLRevenueChartProps {
  chartTitle: string;
  showHourlyChart: boolean;
  hasHourlyData: boolean;
  syncing: boolean;
  chartData: any[];
  isAll: boolean;
  overlaidHourlyData: any[] | null;
  perMarketplaceHourly: { id: string; name: string }[] | null;
}

export function MLRevenueChart({
  chartTitle,
  showHourlyChart,
  hasHourlyData,
  syncing,
  chartData,
  isAll,
  overlaidHourlyData,
  perMarketplaceHourly,
}: MLRevenueChartProps) {
  if (isAll && overlaidHourlyData && perMarketplaceHourly) {
    return (
      <Card>
        <div className="px-4 pt-4 pb-3">
          <span className="text-sm font-medium text-foreground">Receita por Hora — Todas as Lojas</span>
        </div>
        <CardContent className="px-4 pb-2 pt-0">
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={overlaidHourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--muted-foreground))" interval={2} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <RechartsTooltip
                formatter={(value: number, name: string) => [currencyFmt(Number(value)), name]}
                contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--card))", color: "hsl(var(--card-foreground))", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
              />
              {perMarketplaceHourly.map((mp, idx) => (
                <Line key={mp.id} type="monotone" dataKey={mp.name} stroke={STORE_STROKE[idx % STORE_STROKE.length]} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0 && !showHourlyChart) return <div />;

  return (
    <Card>
      <div className="px-4 pt-4 pb-3">
        <span className="text-sm font-medium text-foreground">{chartTitle}</span>
      </div>
      <CardContent className="px-4 pb-2 pt-0">
        {showHourlyChart && !hasHourlyData && !syncing ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-6 text-center">
            <p className="text-sm font-medium text-foreground">Sem dados horários</p>
            <p className="mt-1 text-xs text-muted-foreground">Sincronize para carregar.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={chartData}>
              <defs>
                <linearGradient id="mlTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--muted-foreground))" interval={2} />
              <YAxis yAxisId="revenue" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              {showHourlyChart && (
                <YAxis yAxisId="orders" orientation="right" allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--muted-foreground))" />
              )}
              <RechartsTooltip
                formatter={(value: number, name: string) => name === "Pedidos" ? [value, name] : [currencyFmt(Number(value)), name]}
                contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--card))", color: "hsl(var(--card-foreground))", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
              />
              {showHourlyChart ? (
                <>
                  <Bar yAxisId="orders" dataKey="Pedidos" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} maxBarSize={24} />
                  <Area yAxisId="revenue" type="monotone" dataKey="Receita Total" stroke="hsl(var(--accent))" fill="url(#mlTotal)" strokeWidth={2} />
                </>
              ) : (
                <Area yAxisId="revenue" type="monotone" dataKey="Receita Total" stroke="hsl(var(--accent))" fill="url(#mlTotal)" strokeWidth={2} />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
