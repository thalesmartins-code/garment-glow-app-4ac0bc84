import { useState } from "react";
import { AlertTriangle, ChevronUp, ChevronDown, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ProductItem } from "@/contexts/MLInventoryContext";
import type { CoverageData } from "@/hooks/useMLCoverage";

interface Props {
  items: ProductItem[];
  coverageMap: Map<string, CoverageData>;
}

export function CoverageAlerts({ items, coverageMap }: Props) {
  const [collapsed, setCollapsed] = useState(true);

  const critical = items
    .filter((i) => {
      const c = coverageMap.get(i.id);
      return c && (c.coverage_class === "ruptura" || c.coverage_class === "critico");
    })
    .map((i) => ({ item: i, coverage: coverageMap.get(i.id)! }))
    .sort((a, b) => (a.coverage.coverage_days ?? 0) - (b.coverage.coverage_days ?? 0));

  if (critical.length === 0) return null;

  return (
    <Card className="border-destructive/40 bg-destructive/5">
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <CardTitle className="text-sm text-destructive">
              {critical.length} produto{critical.length !== 1 ? "s" : ""} em risco de ruptura
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setCollapsed((p) => !p)}
          >
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </Button>
        </div>
      </CardHeader>

      {!collapsed && (
        <CardContent className="px-4 pb-3">
          <div className="space-y-1.5 max-h-56 overflow-auto pr-1">
            {critical.map(({ item, coverage }) => (
              <div
                key={item.id}
                className="flex items-center gap-3 px-2 py-1.5 rounded-md bg-background/70"
              >
                {/* Thumbnail */}
                {item.thumbnail ? (
                  <img
                    src={item.thumbnail.replace("http://", "https://")}
                    alt=""
                    className="w-8 h-8 rounded object-cover shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded bg-muted shrink-0" />
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{item.title}</p>
                  <p className="text-[10px] text-muted-foreground">
                    Estoque: <strong>{item.available_quantity}</strong> ·{" "}
                    {coverage.avg_daily_sales.toFixed(1)} unid/dia
                  </p>
                </div>

                {/* Badge + Link */}
                <div className="flex items-center gap-2 shrink-0">
                  {coverage.coverage_class === "ruptura" ? (
                    <Badge variant="destructive" className="text-[10px] px-1.5">
                      Ruptura
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 border-orange-500 text-orange-600"
                    >
                      {coverage.coverage_days}d restantes
                    </Badge>
                  )}
                  <a
                    href={`https://produto.mercadolivre.com.br/${item.id.replace(/^(MLB)(\d+)$/, "$1-$2")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
