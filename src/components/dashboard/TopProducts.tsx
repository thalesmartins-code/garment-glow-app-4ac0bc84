import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const products = [
  { name: "Vestidos", stock: 45, total: 100, color: "bg-accent" },
  { name: "Camisas", stock: 78, total: 100, color: "bg-success" },
  { name: "Calças", stock: 23, total: 100, color: "bg-warning" },
  { name: "Acessórios", stock: 92, total: 100, color: "bg-primary" },
  { name: "Sapatos", stock: 15, total: 100, color: "bg-destructive" },
];

export function TopProducts() {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold">
          Estoque por Categoria
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Nível de estoque das principais categorias
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {products.map((product) => (
          <div key={product.name} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{product.name}</span>
              <span className="text-muted-foreground">
                {product.stock} itens
              </span>
            </div>
            <div className="relative">
              <Progress
                value={product.stock}
                className="h-2 bg-secondary"
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
