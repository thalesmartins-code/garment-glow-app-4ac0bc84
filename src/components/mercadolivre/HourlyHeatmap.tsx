import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { format, subDays, parseISO, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getMarketplaceHourlyData, getAllMarketplaceMockHourly } from "@/data/marketplaceMockData";

interface Props {
  marketplace?: string; // "all" | marketplace id
  daysBack?: number;
}

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const currencyFmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function HourlyHeatmap({ marketplace = "all", daysBack = 7 }: Props) {
  const today = new Date();
  const dates = Array.from({ length: daysBack }, (_, i) =>
    format(subDays(today, daysBack - 1 - i), "yyyy-MM-dd")
  );

  // Build matrix[hour][dateIdx] = revenue
  const matrix: number[][] = Array.from({ length: 24 }, () =>
    new Array(dates.length).fill(0)
  );

  for (let di = 0; di < dates.length; di++) {
    const hourly =
      marketplace === "all"
        ? getAllMarketplaceMockHourly(dates[di])
        : getMarketplaceHourlyData(marketplace, dates[di]);
    for (const h of hourly) {
      matrix[h.hour][di] += h.total;
    }
  }

  const maxVal = Math.max(...matrix.flat(), 1);

  function cellColor(val: number): string {
    if (val === 0) return "hsl(var(--muted))";
    const intensity = Math.min(val / maxVal, 1);
    // primary color with variable opacity
    return `hsl(var(--primary) / ${(0.15 + intensity * 0.75).toFixed(2)})`;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Heatmap — Hora × Dia</CardTitle>
        <p className="text-xs text-muted-foreground">
          Intensidade da cor = volume de receita por hora e dia
        </p>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <div
          className="grid gap-[2px]"
          style={{
            gridTemplateColumns: `48px repeat(${dates.length}, minmax(48px, 1fr))`,
            gridTemplateRows: `28px repeat(24, 28px)`,
          }}
        >
          {/* Header row */}
          <div />
          {dates.map((d, i) => {
            const dayOfWeek = getDay(parseISO(d));
            return (
              <div
                key={d}
                className="flex flex-col items-center justify-center text-[10px] text-muted-foreground font-medium"
              >
                <span>{DAY_LABELS[dayOfWeek]}</span>
                <span>{format(parseISO(d), "dd/MM")}</span>
              </div>
            );
          })}

          {/* Data rows */}
          {Array.from({ length: 24 }, (_, hour) => (
            <>
              <div
                key={`label-${hour}`}
                className="flex items-center justify-end pr-2 text-xs text-muted-foreground tabular-nums font-medium"
              >
                {String(hour).padStart(2, "0")}h
              </div>
              {dates.map((d, di) => {
                const val = matrix[hour][di];
                return (
                  <Tooltip key={`${hour}-${di}`}>
                    <TooltipTrigger asChild>
                      <div
                        className="rounded-sm cursor-default transition-colors"
                        style={{ backgroundColor: cellColor(val) }}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <p className="font-semibold">
                        {DAY_LABELS[getDay(parseISO(d))]} {format(parseISO(d), "dd/MM")} — {String(hour).padStart(2, "0")}h
                      </p>
                      <p>{currencyFmt(val)}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 mt-4 justify-end">
          <span className="text-xs text-muted-foreground">Menor</span>
          {[0.15, 0.35, 0.55, 0.75, 0.9].map((op) => (
            <div
              key={op}
              className="w-4 h-4 rounded-sm"
              style={{ backgroundColor: `hsl(var(--primary) / ${op})` }}
            />
          ))}
          <span className="text-xs text-muted-foreground">Maior</span>
        </div>
      </CardContent>
    </Card>
  );
}
