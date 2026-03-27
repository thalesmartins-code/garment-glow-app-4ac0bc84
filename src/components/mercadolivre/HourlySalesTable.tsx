import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { useState } from "react";

interface HourlyBreakdown {
  date: string;
  hour: number;
  total: number;
  approved: number;
  qty: number;
}

interface Props {
  hourly: HourlyBreakdown[];
  title?: string;
  titleIcon?: React.ReactNode;
  compact?: boolean;
}

type SortKey = "hour" | "revenue" | "sales";
type SortDir = "asc" | "desc";

const currencyFmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
  return dir === "desc" ? <ArrowDown className="w-3 h-3 text-primary" /> : <ArrowUp className="w-3 h-3 text-primary" />;
}

export function HourlySalesTable({ hourly, title, titleIcon, compact }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("hour");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const hourRows = Array.from({ length: 24 }, (_, h) => {
    const hourData = hourly.filter((d) => d.hour === h);
    return {
      h,
      revenue: hourData.reduce((s, d) => s + d.total, 0),
      sales: hourData.reduce((s, d) => s + d.qty, 0),
    };
  });

  const peakHour = hourRows.reduce((best, cur) => (cur.revenue > best.revenue ? cur : best), {
    h: 0,
    revenue: 0,
    sales: 0,
  });

  const maxRevenue = peakHour.revenue;

  const rankedByRevenue = [...hourRows].filter((r) => r.revenue > 0).sort((a, b) => b.revenue - a.revenue);
  const top12Set = new Set(rankedByRevenue.slice(0, 12).map((r) => r.h));
  const rankMap = new Map(rankedByRevenue.map((r, i) => [r.h, i]));

  function getCellBg(h: number, revenue: number): string {
    if (revenue === 0 || !top12Set.has(h)) return "";
    const rank = rankMap.get(h) ?? 12;
    const opacity = 0.45 - rank * (0.39 / 11);
    return `rgba(34, 197, 94, ${opacity.toFixed(3)})`;
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir(key === "hour" ? "asc" : "desc");
    }
  }

  const displayRows = [...hourRows].sort((a, b) => {
    const mul = sortDir === "desc" ? -1 : 1;
    if (sortKey === "hour") return mul * (a.h - b.h);
    if (sortKey === "revenue") return mul * (a.revenue - b.revenue);
    return mul * (a.sales - b.sales);
  });

  const totalRevenue = hourly.reduce((s, d) => s + d.total, 0);
  const totalSales = hourly.reduce((s, d) => s + d.qty, 0);

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className={compact ? "pb-2 px-3 pt-3" : "pb-3"}>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className={compact ? "text-sm" : "text-base"}>{title || "Venda por Hora"}</CardTitle>
            {peakHour.revenue > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                🔥 Pico{" "}
                <span className="font-semibold text-foreground">
                  {String(peakHour.h).padStart(2, "0")}h–
                  {String(peakHour.h + 1).padStart(2, "0")}h
                </span>{" "}
                · <span className="font-semibold text-foreground">{currencyFmt(peakHour.revenue)}</span>
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-sm font-semibold">{currencyFmt(totalRevenue)}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-auto pt-0">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-card z-10">
            <tr className="border-b border-border">
              <th
                className="text-left py-2 px-2 font-medium text-muted-foreground cursor-pointer select-none"
                style={{ width: 80 }}
                onClick={() => handleSort("hour")}
              >
                <span className="inline-flex items-center gap-1">
                  Hora <SortIcon active={sortKey === "hour"} dir={sortDir} />
                </span>
              </th>
              <th
                className="text-left py-2 px-2 font-medium text-muted-foreground cursor-pointer select-none"
                onClick={() => handleSort("revenue")}
              >
                <span className="inline-flex items-center gap-1">
                  Receita <SortIcon active={sortKey === "revenue"} dir={sortDir} />
                </span>
              </th>
              <th
                className="py-2 px-2 font-medium text-muted-foreground cursor-pointer select-none"
                style={{ width: 80 }}
                onClick={() => handleSort("sales")}
              >
                <span className="inline-flex items-center justify-end gap-1 w-full">
                  Vendas <SortIcon active={sortKey === "sales"} dir={sortDir} />
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map(({ h, revenue, sales }) => {
              const isEmpty = revenue === 0 && sales === 0;
              const barWidth = maxRevenue > 0 ? (revenue / maxRevenue) * 100 : 0;
              const cellBg = getCellBg(h, revenue);
              const cellStyle = cellBg ? { backgroundColor: cellBg } : undefined;

              return (
                <tr key={h} className="border-b border-border/50">
                  <td className="py-1.5 px-2 tabular-nums" style={{ width: 80, ...cellStyle }}>
                    {String(h).padStart(2, "0")}:00
                  </td>

                  <td className="py-1.5 px-2" style={cellStyle}>
                    {isEmpty ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="tabular-nums font-medium" style={{ minWidth: "7rem" }}>
                          {currencyFmt(revenue)}
                        </span>
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-primary/60" style={{ width: `${barWidth}%` }} />
                        </div>
                      </div>
                    )}
                  </td>

                  <td className="py-1.5 px-2 text-right" style={{ width: 80, ...cellStyle }}>
                    {isEmpty ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <span className="tabular-nums font-medium">{sales}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t-2 border-border bg-muted/50">
            <tr className="font-semibold">
              <td className="py-2 px-2">Total</td>
              <td className="py-2 px-2 text-left">{currencyFmt(totalRevenue)}</td>
              <td className="py-2 px-2 text-right">{totalSales}</td>
            </tr>
          </tfoot>
        </table>
      </CardContent>
    </Card>
  );
}
