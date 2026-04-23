import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { getMarketplaceHourlyData } from "@/data/marketplaceMockData";

interface Props {
  date?: string;
}

const CHART_MARKETPLACES = [
  { key: "mercado-livre", color: "#e6b422", name: "Mercado Livre" },
  { key: "amazon", color: "#131A22", name: "Amazon" },
  { key: "shopee", color: "#d4532a", name: "Shopee" },
  { key: "netshoes", color: "#7a4db5", name: "Netshoes" },
  { key: "dafiti", color: "#2a9d8f", name: "Dafiti" },
  { key: "americanas", color: "#c44040", name: "Americanas" },
  { key: "casasbahia", color: "#3a7cc4", name: "Casas Bahia" },
];

const currencyFmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function HourlyRadar({ date }: Props) {
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
        <CardTitle className="text-base">Radar — Distribuição por Hora</CardTitle>
        <p className="text-xs text-muted-foreground">
          Formato radial mostrando a distribuição de receita ao longo das 24h
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={450}>
          <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
            <PolarGrid className="stroke-border" />
            <PolarAngleAxis dataKey="hour" tick={{ fontSize: 10 }} />
            <PolarRadiusAxis
              tick={{ fontSize: 9 }}
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
                CHART_MARKETPLACES.find((m) => m.key === value)?.name ?? value
              }
            />
            {CHART_MARKETPLACES.map((mp) => (
              <Radar
                key={mp.key}
                name={mp.key}
                dataKey={mp.key}
                stroke={mp.color}
                fill={mp.color}
                fillOpacity={0.15}
                strokeWidth={2}
              />
            ))}
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
