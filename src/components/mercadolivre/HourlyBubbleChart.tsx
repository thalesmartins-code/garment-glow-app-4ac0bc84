import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { getMarketplaceHourlyData } from "@/data/marketplaceMockData";
import { format, subDays } from "date-fns";

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const CHART_MARKETPLACES = [
  { key: "amazon", color: "#131A22", name: "Amazon" },
  { key: "shopee", color: "#d4532a", name: "Shopee" },
  { key: "magalu", color: "#3b6dba", name: "Magalu" },
  { key: "netshoes", color: "#7a4db5", name: "Netshoes" },
  { key: "dafiti", color: "#2a9d8f", name: "Dafiti" },
  { key: "americanas", color: "#c44040", name: "Americanas" },
  { key: "casasbahia", color: "#3a7cc4", name: "Casas Bahia" },
];

const currencyFmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface BubblePoint {
  dayIndex: number;
  hour: number;
  revenue: number;
  marketplace: string;
}

function buildBubbleData() {
  const mpData: Record<string, BubblePoint[]> = {};

  for (const mp of CHART_MARKETPLACES) {
    const points: BubblePoint[] = [];
    // Aggregate last 28 days by day-of-week
    const agg: Record<string, { total: number; count: number }> = {};

    for (let i = 0; i < 28; i++) {
      const d = subDays(new Date(), i);
      const dateStr = format(d, "yyyy-MM-dd");
      const dow = d.getDay(); // 0=Sun
      const hourly = getMarketplaceHourlyData(mp.key, dateStr);

      for (const h of hourly) {
        const key = `${dow}-${h.hour}`;
        if (!agg[key]) agg[key] = { total: 0, count: 0 };
        agg[key].total += h.total;
        agg[key].count += 1;
      }
    }

    for (const [key, val] of Object.entries(agg)) {
      const [dow, hour] = key.split("-").map(Number);
      const avg = val.total / val.count;
      if (avg > 0) {
        // Small offset per marketplace to reduce overlap
        const mpIdx = CHART_MARKETPLACES.findIndex((m) => m.key === mp.key);
        const offset = (mpIdx - 3) * 0.08;
        points.push({
          dayIndex: dow + offset,
          hour,
          revenue: Math.round(avg),
          marketplace: mp.name,
        });
      }
    }

    mpData[mp.key] = points;
  }

  return mpData;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as BubblePoint;
  const dayName = DAYS[Math.round(d.dayIndex)];
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md text-sm space-y-1">
      <p className="font-semibold">{d.marketplace}</p>
      <p>{dayName} · {String(d.hour).padStart(2, "0")}h</p>
      <p className="text-primary font-medium">{currencyFmt(d.revenue)}</p>
    </div>
  );
};

export function HourlyBubbleChart() {
  const data = buildBubbleData();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Bubble Chart — Hora × Dia da Semana</CardTitle>
        <p className="text-xs text-muted-foreground">
          Tamanho da bolha = receita média (últimos 28 dias). Cor = marketplace.
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={520}>
          <ScatterChart margin={{ top: 10, right: 30, bottom: 10, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted/40" />
            <XAxis
              type="number"
              dataKey="dayIndex"
              name="Dia"
              domain={[-0.5, 6.5]}
              ticks={[0, 1, 2, 3, 4, 5, 6]}
              tickFormatter={(v: number) => DAYS[Math.round(v)] || ""}
              className="text-xs"
            />
            <YAxis
              type="number"
              dataKey="hour"
              name="Hora"
              reversed
              domain={[0, 23]}
              ticks={[0, 3, 6, 9, 12, 15, 18, 21]}
              tickFormatter={(v: number) => `${String(v).padStart(2, "0")}h`}
              className="text-xs"
              width={40}
            />
            <ZAxis
              type="number"
              dataKey="revenue"
              range={[30, 350]}
              name="Receita"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={(value: string) => (
                <span className="text-xs">{value}</span>
              )}
            />
            {CHART_MARKETPLACES.map((mp) => (
              <Scatter
                key={mp.key}
                name={mp.name}
                data={data[mp.key]}
                fill={mp.color}
                fillOpacity={0.7}
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
