import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { getMarketplaceHourlyData } from "@/data/marketplaceMockData";
import { MARKETPLACE_BRANDS } from "@/config/marketplaceConfig";

interface Props {
  date?: string;
}

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

export function HourlyStackedBars({ date }: Props) {
  const data = Array.from({ length: 24 }, (_, h) => {
    const row: Record<string, any> = { hour: `${String(h).padStart(2, "0")}h` };
    for (const mp of CHART_MARKETPLACES) {
      const hourly = getMarketplaceHourlyData(mp.key, date);
      const found = hourly.find((d) => d.hour === h);
      row[mp.key] = found?.total ?? 0;
    }
    return row;
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Barras Empilhadas por Hora</CardTitle>
        <p className="text-xs text-muted-foreground">
          Volume de receita por hora, segmentado por marketplace
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={420}>
          <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
            <YAxis
              tick={{ fontSize: 11 }}
              tickFormatter={(v) =>
                v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
              }
            />
            <Tooltip
              formatter={(value: number, name: string) => {
                const mp = CHART_MARKETPLACES.find((m) => m.key === name);
                return [currencyFmt(value), mp?.name ?? name];
              }}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Legend
              formatter={(value: string) =>
                MARKETPLACE_BRANDS.find((b) => b.id === value)?.name ?? value
              }
            />
            {CHART_MARKETPLACES.map((mp) => (
              <Bar
                key={mp.key}
                dataKey={mp.key}
                stackId="a"
                fill={mp.color}
                radius={[0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
