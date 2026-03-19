import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { KPICard } from "@/components/dashboard/KPICard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ShoppingBag, RefreshCw, Search, ExternalLink, Plug, DollarSign, Tag, TrendingUp, Package,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { MLPageHeader } from "@/components/mercadolivre/MLPageHeader";

interface ProductItem {
  id: string;
  title: string;
  available_quantity: number;
  sold_quantity: number;
  price: number;
  currency_id: string;
  thumbnail: string | null;
  status: string;
  category_id: string | null;
  listing_type_id: string | null;
  health: number | null;
  visits: number;
}

const currencyFmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const listingTypeLabel: Record<string, string> = {
  gold_special: "Clássico",
  gold_pro: "Premium",
  gold: "Ouro",
  silver: "Prata",
  bronze: "Bronze",
  free: "Grátis",
};

type StockFilter = "all" | "in_stock" | "low" | "out";

export default function MLProdutos() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [items, setItems] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasToken, setHasToken] = useState<boolean | null>(null);
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [sortBy, setSortBy] = useState<"price_desc" | "price_asc" | "sold" | "title">("sold");

  const checkToken = useCallback(async () => {
    if (!user) return null;
    const { data } = await supabase
      .from("ml_tokens")
      .select("access_token")
      .eq("user_id", user.id)
      .maybeSingle();
    setHasToken(!!data?.access_token);
    return data?.access_token || null;
  }, [user]);

  const fetchProducts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await checkToken();
      if (!token) { setHasToken(false); return; }

      const { data, error } = await supabase.functions.invoke("ml-inventory", {
        body: { access_token: token },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setItems(data.items || []);
    } catch (err: any) {
      console.error("Products fetch error:", err);
      toast({ title: "Erro ao carregar produtos", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [user, checkToken, toast]);

  useEffect(() => { checkToken(); }, [checkToken]);
  useEffect(() => { if (hasToken) fetchProducts(); }, [hasToken, fetchProducts]);

  // Derived stats
  const totalRevenuePotential = items.reduce((s, i) => s + i.price * i.available_quantity, 0);
  const avgPrice = items.length > 0 ? items.reduce((s, i) => s + i.price, 0) / items.length : 0;
  const totalSold = items.reduce((s, i) => s + i.sold_quantity, 0);
  const totalSoldRevenue = items.reduce((s, i) => s + i.sold_quantity * i.price, 0);

  // Filter + sort
  const filtered = items
    .filter((item) => {
      const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase()) || item.id.toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;
      if (stockFilter === "out") return item.available_quantity === 0;
      if (stockFilter === "low") return item.available_quantity > 0 && item.available_quantity <= 5;
      if (stockFilter === "in_stock") return item.available_quantity > 0;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "price_desc") return b.price - a.price;
      if (sortBy === "price_asc") return a.price - b.price;
      if (sortBy === "sold") return b.sold_quantity - a.sold_quantity;
      return a.title.localeCompare(b.title);
    });

  const healthBadge = (health: number | null) => {
    if (health === null) return <span className="text-xs text-muted-foreground">—</span>;
    if (health >= 0.8) return <Badge variant="outline" className="text-xs border-emerald-500 text-emerald-600">Ótima</Badge>;
    if (health >= 0.5) return <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">Regular</Badge>;
    return <Badge variant="destructive" className="text-xs">Baixa</Badge>;
  };

  if (hasToken === false) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Plug className="w-12 h-12 mb-4 text-muted-foreground/40" />
            <h3 className="text-lg font-semibold mb-2">Conta não conectada</h3>
            <p className="text-sm text-muted-foreground mb-4">Conecte sua conta do Mercado Livre para visualizar os produtos.</p>
            <Button asChild><Link to="/integracoes">Ir para Integrações</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <MLPageHeader title="Produtos">
        <Button onClick={fetchProducts} disabled={loading} size="sm" variant="outline">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </MLPageHeader>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading && items.length === 0 ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))
        ) : (
          <>
            <KPICard title="Total de Produtos" value={String(items.length)} icon={<ShoppingBag className="w-5 h-5" />} subtitle="Anúncios ativos" />
            <KPICard title="Ticket Médio" value={currencyFmt(avgPrice)} icon={<Tag className="w-5 h-5" />} subtitle="Preço médio dos anúncios" />
            <KPICard title="Unidades Vendidas" value={String(totalSold)} icon={<TrendingUp className="w-5 h-5" />} subtitle="Total histórico" />
            <KPICard title="Receita Potencial" value={currencyFmt(totalRevenuePotential)} icon={<DollarSign className="w-5 h-5" />} subtitle="Estoque × Preço" />
          </>
        )}
      </div>

      {/* Filters + Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <CardTitle className="text-base">Catálogo de Produtos</CardTitle>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
              </div>
              <Select value={stockFilter} onValueChange={(v) => setStockFilter(v as StockFilter)}>
                <SelectTrigger className="w-32 h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="in_stock">Com estoque</SelectItem>
                  <SelectItem value="low">Estoque baixo</SelectItem>
                  <SelectItem value="out">Sem estoque</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                <SelectTrigger className="w-36 h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sold">Mais vendidos</SelectItem>
                  <SelectItem value="price_desc">Maior preço</SelectItem>
                  <SelectItem value="price_asc">Menor preço</SelectItem>
                  <SelectItem value="title">A–Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading && items.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p className="text-sm">Carregando produtos...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">{search || stockFilter !== "all" ? "Nenhum produto encontrado" : "Nenhum produto ativo"}</p>
            </div>
          ) : (
            <div className="max-h-[500px] overflow-auto">
              <Table>
                 <TableHeader>
                   <TableRow>
                     <TableHead className="w-12"></TableHead>
                     <TableHead>Produto</TableHead>
                     <TableHead className="text-right w-24">Preço</TableHead>
                     <TableHead className="text-center w-20">Estoque</TableHead>
                     <TableHead className="text-center w-20">Vendidos</TableHead>
                     <TableHead className="text-right w-28">Vendidos R$</TableHead>
                     <TableHead className="text-center w-20">% Part.</TableHead>
                     <TableHead className="text-center w-20">Visitas</TableHead>
                     <TableHead className="text-center w-20">Conv.</TableHead>
                     
                     <TableHead className="text-center w-20">Saúde</TableHead>
                     <TableHead className="w-10"></TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {filtered.map((item) => {
                     const soldRevenue = item.sold_quantity * item.price;
                     const participation = totalSoldRevenue > 0 ? (soldRevenue / totalSoldRevenue) * 100 : 0;
                     const conversion = item.visits > 0 ? (item.sold_quantity / item.visits) * 100 : 0;
                     return (
                       <TableRow key={item.id}>
                         <TableCell className="p-2">
                           {item.thumbnail ? (
                             <img src={item.thumbnail.replace("http://", "https://")} alt="" className="w-10 h-10 rounded object-cover" loading="lazy" />
                           ) : (
                             <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                               <Package className="w-4 h-4 text-muted-foreground" />
                             </div>
                           )}
                         </TableCell>
                         <TableCell>
                           <p className="text-sm font-medium line-clamp-2 leading-tight">{item.title}</p>
                           <p className="text-xs text-muted-foreground mt-0.5">{item.id}</p>
                         </TableCell>
                         <TableCell className="text-right text-sm font-medium">{currencyFmt(item.price)}</TableCell>
                         <TableCell className="text-center">
                           <span className={`text-sm font-semibold ${item.available_quantity === 0 ? "text-destructive" : "text-foreground"}`}>
                             {item.available_quantity}
                           </span>
                         </TableCell>
                         <TableCell className="text-center text-sm text-muted-foreground">{item.sold_quantity}</TableCell>
                         <TableCell className="text-right text-sm font-medium">{currencyFmt(soldRevenue)}</TableCell>
                         <TableCell className="text-center text-sm text-muted-foreground">{participation.toFixed(1)}%</TableCell>
                         <TableCell className="text-center text-sm text-muted-foreground">{item.visits.toLocaleString("pt-BR")}</TableCell>
                         <TableCell className="text-center text-sm text-muted-foreground">{conversion.toFixed(1)}%</TableCell>
                         <TableCell className="text-center">{healthBadge(item.health)}</TableCell>
                         <TableCell>
                           <a href={`https://produto.mercadolivre.com.br/${item.id.replace(/^(MLB)(\d+)$/, '$1-$2')}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                             <ExternalLink className="w-4 h-4" />
                           </a>
                         </TableCell>
                       </TableRow>
                     );
                   })}
                 </TableBody>
              </Table>
            </div>
          )}
          {filtered.length > 0 && (
            <div className="px-4 py-3 border-t text-xs text-muted-foreground">
              Exibindo {filtered.length} de {items.length} produtos
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
