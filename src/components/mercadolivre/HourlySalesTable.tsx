import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpDown } from "lucide-react";
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
}

const currencyFmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function HourlySalesTable({ hourly }: Props) {
  const [sortByRevenue, setSortByRevenue] = useState(false);

  const hourRows = Array.from({ length: 24 }, (_, h) => {
    const hourData = hourly.filter((d) => d.hour === h);
    return {
      h,
      revenue: hourData.reduce((s, d) => s + d.total, 0),
      sales: hourData.reduce((s, d) => s + d.qty, 0),
    };
  });

  const peakHour = hourRows.reduce(
    (best, cur) => (cur.revenue > best.revenue ? cur : best),
    { h: 0, revenue: 0, sales: 0 }
  );

  const maxRevenue = peakHour.revenue;

  const displayRows = sortByRevenue
    ? [...hourRows].sort((a, b) => b.revenue - a.revenue)
    : hourRows;

  const totalRevenue = hourly.reduce((s, d) => s + d.total, 0);
  const totalSales = hourly.reduce((s, d) => s + d.qty, 0);

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">
              Venda por Hora
            </CardTitle>
            {peakHour.revenue > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                🔥 Pico{" "}
                <span className="font-semibold text-foreground">
                  {String(peakHour.h).padStart(2, "0")}h–
                  {String(peakHour.h + 1).padStart(2, "0")}h
                </span>{" "}
                ·{" "}
                <span className="font-semibold text-foreground">
                  {currencyFmt(peakHour.revenue)}
                </span>
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
              <th className="text-left py-2 px-2 font-medium text-muted-foreground" style={{ width: 100 }}>
                Hora
              </th>
              <th className="text-right py-2 px-2 font-medium text-muted-foreground">
                Receita
              </th>
              <th
                className="text-right py-2 px-2 font-medium text-muted-foreground cursor-pointer select-none"
                onClick={() => setSortByRevenue((p) => !p)}
              >
                <span className="inline-flex items-center gap-1">
                  Vendas <ArrowUpDown className="w-3 h-3" />
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map(({ h, revenue, sales }) => {
              const isEmpty = revenue === 0 && sales === 0;
              const isPeak = h === peakHour.h && peakHour.revenue > 0;
              const barWidth = maxRevenue > 0 ? (revenue / maxRevenue) * 100 : 0;

              return (
                <tr
                  key={h}
                  className={`border-b border-border/50 ${isPeak ? "bg-primary/5" : ""}`}
                >
                  <td className="py-1.5 px-2 tabular-nums" style={{ width: 100 }}>
                    {String(h).padStart(2, "0")}:00
                  </td>
                  <td className="py-1.5 px-2 text-right">
                    {isEmpty ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary/60"
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                        <span className="tabular-nums font-medium">
                          {currencyFmt(revenue)}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="py-1.5 px-2 text-right">
                    {isEmpty ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <span className="tabular-nums font-medium">
                        {sales}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t-2 border-border bg-muted/50">
            <tr className="font-semibold">
              <td className="py-2 px-2">
                Total
              </td>
              <td className="py-2 px-2 text-right">
                {currencyFmt(totalRevenue)}
              </td>
              <td className="py-2 px-2 text-right">
                {totalSales}
              </td>
            </tr>
          </tfoot>
        </table>
      </CardContent>
    </Card>
  );
}
