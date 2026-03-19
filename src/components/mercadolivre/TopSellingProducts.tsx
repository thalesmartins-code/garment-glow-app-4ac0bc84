import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Trophy, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import * as React from "react";

export interface ProductSalesRow {
  item_id: string;
  title: string;
  thumbnail: string | null;
  qty_sold: number;
  revenue: number;
  available_quantity?: number;
}

interface Props {
  products: ProductSalesRow[];
  loading?: boolean;
}

const currencyFmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function TopSellingProducts({ products, loading }: Props) {
  const [isLarge, setIsLarge] = React.useState(false);
  React.useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    const onChange = () => setIsLarge(mql.matches);
    mql.addEventListener("change", onChange);
    setIsLarge(mql.matches);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  const maxItems = isLarge ? 12 : 10;
  const visibleProducts = products.slice(0, maxItems);
  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="w-4 h-4 text-[hsl(45,93%,47%)]" />
            Produtos mais vendidos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-4 bg-muted rounded animate-pulse" />
                <div className="w-10 h-10 bg-muted rounded-lg animate-pulse" />
                <div className="flex-1 space-y-1">
                  <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
                  <div className="h-3 bg-muted rounded w-1/2 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-auto">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy className="w-4 h-4 text-[hsl(45,93%,47%)]" />
          Produtos mais vendidos
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-sm">
            <Package className="w-8 h-8 mb-2 opacity-50" />
            Nenhum produto encontrado
          </div>
        ) : (
          <div className="divide-y divide-border">
            {visibleProducts.map((product, idx) => (
              <div key={product.item_id} className="flex items-center gap-3 px-4 py-4">
                <span className="text-sm font-bold text-muted-foreground w-5 text-center shrink-0">{idx + 1}</span>
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted shrink-0">
                  {product.thumbnail ? (
                    <img
                      src={product.thumbnail.replace("http://", "https://")}
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-tight line-clamp-2">{product.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">{product.qty_sold} vendidos</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs font-semibold text-primary">{currencyFmt(product.revenue)}</span>
                  </div>
                </div>
                <a
                  href={`https://produto.mercadolivre.com.br/${product.item_id.replace(/^(MLB)(\d+)$/, '$1-$2')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-muted-foreground/30 hover:text-primary transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                {product.available_quantity !== undefined && (
                  <div className="flex flex-col items-end shrink-0">
                    <span className="text-[10px] text-muted-foreground mb-0.5">Estoque</span>
                    <Badge
                      variant={
                        product.available_quantity === 0
                          ? "destructive"
                          : product.available_quantity <= 5
                            ? "secondary"
                            : "outline"
                      }
                      className="text-xs"
                    >
                      {product.available_quantity} un.
                    </Badge>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
