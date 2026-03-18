import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Package, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ProductItem {
  id: string;
  title: string;
  thumbnail: string | null;
  sold_quantity: number;
  price: number;
  available_quantity: number;
}

interface Props {
  accessToken: string | null;
  connected: boolean;
}

const currencyFmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function TopSellingProducts({ accessToken, connected }: Props) {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!accessToken || !connected || loaded) return;

    const fetchProducts = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("ml-inventory", {
          body: { access_token: accessToken },
        });

        if (error || !data?.items) return;

        const sorted = [...data.items]
          .sort((a: ProductItem, b: ProductItem) => b.sold_quantity - a.sold_quantity)
          .slice(0, 7);

        setProducts(sorted);
        setLoaded(true);
      } catch {
        // non-critical
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [accessToken, connected, loaded]);

  if (!connected) return null;

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy className="w-4 h-4 text-[hsl(45,93%,47%)]" />
          Produtos Mais Vendidos
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-sm">
            <Package className="w-8 h-8 mb-2 opacity-50" />
            Nenhum produto encontrado
          </div>
        ) : (
          <div className="divide-y divide-border">
            {products.map((product, idx) => (
              <div key={product.id} className="flex items-center gap-3 px-4 py-3">
                <span className="text-sm font-bold text-muted-foreground w-5 text-center shrink-0">
                  {idx + 1}
                </span>
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
                    <span className="text-xs text-muted-foreground">
                      {product.sold_quantity} vendidos
                    </span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs font-medium">{currencyFmt(product.price)}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs font-semibold text-primary">
                      {currencyFmt(product.sold_quantity * product.price)}
                    </span>
                  </div>
                </div>
                <Badge
                  variant={product.available_quantity === 0 ? "destructive" : product.available_quantity <= 5 ? "secondary" : "outline"}
                  className="shrink-0 text-xs"
                >
                  {product.available_quantity} un.
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
