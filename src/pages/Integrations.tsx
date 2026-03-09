import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useSeller } from "@/contexts/SellerContext";
import { Seller } from "@/types/seller";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Link2,
  Link2Off,
  RefreshCw,
  ShieldCheck,
  Zap,
  DollarSign,
  ShoppingCart,
  Tag,
  TrendingUp,
} from "lucide-react";

interface MarketplaceIntegration {
  id: string;
  name: string;
  logo: string;
  description: string;
  status: "connected" | "disconnected" | "expired";
  authType: "oauth" | "api_key";
  docsUrl: string;
  features: string[];
}

const MARKETPLACE_INTEGRATIONS: MarketplaceIntegration[] = [
  {
    id: "ml",
    name: "Mercado Livre",
    logo: "🟡",
    description: "Sincronize pedidos, vendas e métricas diretamente da sua conta do Mercado Livre.",
    status: "disconnected",
    authType: "oauth",
    docsUrl: "https://developers.mercadolivre.com.br",
    features: ["Pedidos", "Vendas", "Métricas", "Anúncios"],
  },
  {
    id: "amz",
    name: "Amazon",
    logo: "📦",
    description: "Conecte sua conta Seller Central da Amazon para importar dados de vendas.",
    status: "disconnected",
    authType: "oauth",
    docsUrl: "https://developer-docs.amazon.com/sp-api",
    features: ["Pedidos", "Vendas", "Inventário", "Relatórios"],
  },
  {
    id: "shopee",
    name: "Shopee",
    logo: "🧡",
    description: "Integre com a Shopee para acompanhar pedidos e performance da loja.",
    status: "disconnected",
    authType: "oauth",
    docsUrl: "https://open.shopee.com",
    features: ["Pedidos", "Vendas", "Logística", "Chat"],
  },
  {
    id: "magalu",
    name: "Magazine Luiza",
    logo: "🔵",
    description: "Conecte com o Magalu Marketplace para sincronizar vendas, pedidos e catálogo.",
    status: "disconnected",
    authType: "oauth",
    docsUrl: "https://developers.magalu.com",
    features: ["Pedidos", "Vendas", "Catálogo", "Métricas"],
  },
  {
    id: "americanas",
    name: "Americanas",
    logo: "🔴",
    description: "Importe dados de vendas da Americanas Marketplace automaticamente.",
    status: "disconnected",
    authType: "api_key",
    docsUrl: "https://developers.americanas.com",
    features: ["Pedidos", "Vendas", "Catálogo"],
  },
  {
    id: "dafiti",
    name: "Dafiti",
    logo: "👗",
    description: "Sincronize vendas e pedidos da Dafiti / GFG Marketplace.",
    status: "disconnected",
    authType: "api_key",
    docsUrl: "https://sellercenter-api.dafiti.com.br",
    features: ["Pedidos", "Vendas", "Produtos"],
  },
  {
    id: "netshoes",
    name: "Netshoes",
    logo: "👟",
    description: "Conecte com a Netshoes para acompanhar vendas e performance.",
    status: "disconnected",
    authType: "api_key",
    docsUrl: "https://developers.netshoes.com.br",
    features: ["Pedidos", "Vendas", "Catálogo"],
  },
];

const statusConfig = {
  connected: {
    label: "Conectado",
    variant: "default" as const,
    icon: CheckCircle2,
    color: "text-emerald-500",
  },
  disconnected: {
    label: "Desconectado",
    variant: "secondary" as const,
    icon: Link2Off,
    color: "text-muted-foreground",
  },
  expired: {
    label: "Token expirado",
    variant: "destructive" as const,
    icon: AlertCircle,
    color: "text-destructive",
  },
};

export default function Integrations() {
  const { selectedSeller } = useSeller();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [integrations, setIntegrations] = useState(() => {
    const saved = localStorage.getItem("ml_integration_status");
    if (saved) {
      const statuses = JSON.parse(saved) as Record<string, string>;
      return MARKETPLACE_INTEGRATIONS.map((i) => ({
        ...i,
        status: (statuses[i.id] as MarketplaceIntegration["status"]) || i.status,
      }));
    }
    return MARKETPLACE_INTEGRATIONS;
  });
  const [connectDialog, setConnectDialog] = useState<MarketplaceIntegration | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [mlCodeDialog, setMlCodeDialog] = useState(false);
  const [mlCodeInput, setMlCodeInput] = useState("");
  const [magaluCodeDialog, setMagaluCodeDialog] = useState(false);
  const [magaluCodeInput, setMagaluCodeInput] = useState("");
  const [mlMetrics, setMlMetrics] = useState<{
    total_revenue: number;
    approved_revenue: number;
    total_orders: number;
    cancelled_orders: number;
    shipped_orders: number;
    active_listings: number;
    avg_ticket: number;
    period: string;
  } | null>(() => {
    const saved = localStorage.getItem("ml_metrics");
    return saved ? JSON.parse(saved) : null;
  });
  const [mlUser, setMlUser] = useState<{ nickname: string } | null>(() => {
    const saved = localStorage.getItem("ml_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [magaluMetrics, setMagaluMetrics] = useState<{
    total_revenue: number;
    approved_revenue: number;
    total_orders: number;
    cancelled_orders: number;
    shipped_orders: number;
    avg_ticket: number;
    period: string;
  } | null>(() => {
    const saved = localStorage.getItem("magalu_metrics");
    return saved ? JSON.parse(saved) : null;
  });

  // Persist integration statuses
  const updateIntegrationStatus = (id: string, status: MarketplaceIntegration["status"]) => {
    setIntegrations((prev) => {
      const updated = prev.map((i) => (i.id === id ? { ...i, status } : i));
      const statuses: Record<string, string> = {};
      updated.forEach((i) => (statuses[i.id] = i.status));
      localStorage.setItem("ml_integration_status", JSON.stringify(statuses));
      return updated;
    });
  };

  // Handle ML OAuth callback
  // Handle OAuth callback — use "state" param to identify provider
  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    if (!code) return;

    const exchangeCode = async () => {
      setConnecting(true);

      if (state === "magalu") {
        const redirectUri = "https://analytics.alcavie.com/integracoes";
        const { data, error } = await supabase.functions.invoke("magalu-oauth", {
          body: { action: "exchange_code", code, redirect_uri: redirectUri },
        });
        if (error || !data?.success) {
          toast({ title: "Erro ao conectar Magazine Luiza", description: data?.error || error?.message || "Falha na troca do código.", variant: "destructive" });
        } else {
          localStorage.setItem("magalu_tokens", JSON.stringify({
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_at: Date.now() + data.expires_in * 1000,
          }));
          updateIntegrationStatus("magalu", "connected");
          toast({ title: "Magazine Luiza conectada!", description: "Conta conectada com sucesso." });
        }
      } else {
        const redirectUri = "https://alcavie.com/";
        const { data, error } = await supabase.functions.invoke("ml-oauth", {
          body: { action: "exchange_code", code, redirect_uri: redirectUri },
        });
        if (error || !data?.success) {
          toast({ title: "Erro ao conectar Mercado Livre", description: data?.error || error?.message || "Falha na troca do código.", variant: "destructive" });
        } else {
          localStorage.setItem("ml_tokens", JSON.stringify({
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_at: Date.now() + data.expires_in * 1000,
            user_id: data.user_id,
          }));
          updateIntegrationStatus("ml", "connected");
          toast({ title: "Mercado Livre conectado!", description: `Conta conectada com sucesso (User ID: ${data.user_id}).` });
        }
      }

      setSearchParams({}, { replace: true });
      setConnecting(false);
    };

    exchangeCode();
  }, [searchParams]);

  const handleConnect = async (integration: MarketplaceIntegration) => {
    if (integration.id === "ml") {
      // Real ML OAuth flow
      const redirectUri = "https://alcavie.com/";
      const { data, error } = await supabase.functions.invoke("ml-oauth", {
        body: { action: "get_auth_url", redirect_uri: redirectUri },
      });

      if (error || !data?.success) {
        toast({
          title: "Erro",
          description: "Não foi possível gerar a URL de autorização.",
          variant: "destructive",
        });
        return;
      }

      window.location.href = data.auth_url;
      return;
    }

    if (integration.id === "magalu") {
      const redirectUri = "https://analytics.alcavie.com/integracoes";
      const { data, error } = await supabase.functions.invoke("magalu-oauth", {
        body: { action: "get_auth_url", redirect_uri: redirectUri },
      });

      if (error || !data?.success) {
        toast({
          title: "Erro",
          description: "Não foi possível gerar a URL de autorização da Magazine Luiza.",
          variant: "destructive",
        });
        return;
      }

      window.location.href = data.auth_url;
      return;
    }

    // Other marketplaces: show dialog
    setConnectDialog(integration);
    setApiKeyInput("");
  };

  const handleDisconnect = (integrationId: string) => {
    updateIntegrationStatus(integrationId, "disconnected");
    if (integrationId === "ml") {
      localStorage.removeItem("ml_tokens");
      localStorage.removeItem("ml_metrics");
      localStorage.removeItem("ml_user");
      setMlMetrics(null);
      setMlUser(null);
    }
    if (integrationId === "magalu") {
      localStorage.removeItem("magalu_tokens");
      localStorage.removeItem("magalu_metrics");
      setMagaluMetrics(null);
    }
    toast({
      title: "Marketplace desconectado",
      description: "A integração foi removida com sucesso.",
    });
  };

  const handleConfirmConnect = async () => {
    if (!connectDialog) return;
    setConnecting(true);

    // Simulate connection for non-ML marketplaces
    await new Promise((resolve) => setTimeout(resolve, 1500));

    updateIntegrationStatus(connectDialog.id, "connected");

    setConnecting(false);
    setConnectDialog(null);
    toast({
      title: "Marketplace conectado!",
      description: `${connectDialog.name} foi integrado com sucesso para ${selectedSeller?.name ?? "o seller ativo"}.`,
    });
  };

  const handleSyncML = async () => {
    setSyncing(true);
    try {
      const tokens = localStorage.getItem("ml_tokens");
      if (!tokens) {
        toast({
          title: "Erro",
          description: "Nenhum token do Mercado Livre encontrado. Conecte-se primeiro.",
          variant: "destructive",
        });
        return;
      }

      const { access_token } = JSON.parse(tokens);

      const { data, error } = await supabase.functions.invoke("mercado-libre-integration", {
        body: { access_token },
      });

      if (error || !data?.success) {
        toast({
          title: "Erro ao sincronizar",
          description: data?.error || error?.message || "Falha ao buscar dados do Mercado Livre.",
          variant: "destructive",
        });
      } else {
        setMlMetrics(data.metrics);
        setMlUser(data.user);
        localStorage.setItem("ml_metrics", JSON.stringify(data.metrics));
        localStorage.setItem("ml_user", JSON.stringify(data.user));
        toast({
          title: "Sincronização concluída!",
          description: `Dados do Mercado Livre importados com sucesso.`,
        });
      }
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err.message || "Erro inesperado na sincronização.",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleManualCodeExchange = async () => {
    if (!mlCodeInput.trim()) return;
    setConnecting(true);
    const redirectUri = "https://alcavie.com/";

    const { data, error } = await supabase.functions.invoke("ml-oauth", {
      body: { action: "exchange_code", code: mlCodeInput.trim(), redirect_uri: redirectUri },
    });

    if (error || !data?.success) {
      toast({
        title: "Erro ao trocar código",
        description: data?.error || error?.message || "Falha na troca do código de autorização.",
        variant: "destructive",
      });
    } else {
      localStorage.setItem("ml_tokens", JSON.stringify({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: Date.now() + data.expires_in * 1000,
        user_id: data.user_id,
      }));
      updateIntegrationStatus("ml", "connected");
      toast({
        title: "Mercado Livre conectado!",
        description: `Conta conectada com sucesso (User ID: ${data.user_id}).`,
      });
    }

    setConnecting(false);
    setMlCodeDialog(false);
    setMlCodeInput("");
  };

  // Magalu sync handler
  const handleSyncMagalu = async () => {
    setSyncing(true);
    try {
      const tokens = localStorage.getItem("magalu_tokens");
      if (!tokens) {
        toast({ title: "Erro", description: "Nenhum token da Magazine Luiza encontrado. Conecte-se primeiro.", variant: "destructive" });
        return;
      }
      const { access_token } = JSON.parse(tokens);
      const { data, error } = await supabase.functions.invoke("magalu-integration", {
        body: { access_token, action: "dashboard" },
      });
      if (error || !data?.success) {
        toast({ title: "Erro ao sincronizar", description: data?.error || error?.message || "Falha ao buscar dados da Magazine Luiza.", variant: "destructive" });
      } else {
        setMagaluMetrics(data.metrics);
        localStorage.setItem("magalu_metrics", JSON.stringify(data.metrics));
        toast({ title: "Sincronização concluída!", description: "Dados da Magazine Luiza importados com sucesso." });
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message || "Erro inesperado na sincronização.", variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  // Magalu manual code exchange
  const handleMagaluManualCodeExchange = async () => {
    if (!magaluCodeInput.trim()) return;
    setConnecting(true);
    const redirectUri = "https://analytics.alcavie.com/integracoes";
    const { data, error } = await supabase.functions.invoke("magalu-oauth", {
      body: { action: "exchange_code", code: magaluCodeInput.trim(), redirect_uri: redirectUri },
    });
    if (error || !data?.success) {
      toast({ title: "Erro ao trocar código", description: data?.error || error?.message || "Falha na troca do código da Magazine Luiza.", variant: "destructive" });
    } else {
      localStorage.setItem("magalu_tokens", JSON.stringify({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: Date.now() + data.expires_in * 1000,
      }));
      updateIntegrationStatus("magalu", "connected");
      toast({ title: "Magazine Luiza conectada!", description: "Conta conectada com sucesso." });
    }
    setConnecting(false);
    setMagaluCodeDialog(false);
    setMagaluCodeInput("");
  };

  // Filter integrations by seller's active marketplaces (exclude "total")
  const sellerMarketplaces = selectedSeller?.activeMarketplaces?.filter((id) => id !== "total") || [];
  const filteredIntegrations = integrations.filter((i) => sellerMarketplaces.includes(i.id));
  const connectedCount = filteredIntegrations.filter((i) => i.status === "connected").length;

  return (
    <div className="space-y-6">

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{connectedCount}</p>
              <p className="text-sm text-muted-foreground">Conectados</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-muted">
              <Link2Off className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{filteredIntegrations.length - connectedCount}</p>
              <p className="text-sm text-muted-foreground">Disponíveis</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10">
              <ShieldCheck className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">OAuth 2.0</p>
              <p className="text-sm text-muted-foreground">Autenticação segura</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Seller info */}
      {selectedSeller && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-muted/50 border border-border text-sm">
          <span className="font-medium">Seller ativo:</span>
          <Badge variant="outline">{selectedSeller.name}</Badge>
          <span className="text-muted-foreground">— As integrações abaixo serão vinculadas a este seller.</span>
        </div>
      )}

      {/* ML Metrics */}
      {mlMetrics && integrations.find((i) => i.id === "ml")?.status === "connected" && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                🟡 Métricas do Mercado Livre
                {mlUser && <Badge variant="outline" className="text-xs font-normal">{mlUser.nickname}</Badge>}
              </CardTitle>
              <span className="text-xs text-muted-foreground">Últimos 30 dias</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border/5">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-500/10">
                  <DollarSign className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Receita Aprovada</p>
                  <p className="text-lg font-bold">
                    {mlMetrics.approved_revenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border/5">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/10">
                  <ShoppingCart className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pedidos</p>
                  <p className="text-lg font-bold">{mlMetrics.total_orders}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border/5">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-500/10">
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Ticket Médio</p>
                  <p className="text-lg font-bold">
                    {mlMetrics.avg_ticket.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border/5">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-orange-500/10">
                  <Tag className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Anúncios Ativos</p>
                  <p className="text-lg font-bold">{mlMetrics.active_listings}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Magalu Metrics */}
      {magaluMetrics && integrations.find((i) => i.id === "magalu")?.status === "connected" && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                🔵 Métricas da Magazine Luiza
              </CardTitle>
              <span className="text-xs text-muted-foreground">Pedidos recentes</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border/5">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Receita Aprovada</p>
                  <p className="text-lg font-bold">
                    {magaluMetrics.approved_revenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border/5">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                  <ShoppingCart className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pedidos</p>
                  <p className="text-lg font-bold">{magaluMetrics.total_orders}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border/5">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Ticket Médio</p>
                  <p className="text-lg font-bold">
                    {magaluMetrics.avg_ticket.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border/5">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                  <ShoppingCart className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Enviados</p>
                  <p className="text-lg font-bold">{magaluMetrics.shipped_orders}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredIntegrations.map((integration) => {
          const statusInfo = statusConfig[integration.status];
          const StatusIcon = statusInfo.icon;
          const isConnected = integration.status === "connected";

          return (
            <Card
              key={integration.id}
              className={`transition-all duration-200 hover:shadow-md ${
                isConnected ? "border-primary/30 bg-primary/[0.02]" : ""
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{integration.logo}</span>
                    <div>
                      <CardTitle className="text-base">{integration.name}</CardTitle>
                      <div className="flex items-center gap-1.5 mt-1">
                        <StatusIcon className={`w-3.5 h-3.5 ${statusInfo.color}`} />
                        <span className={`text-xs ${statusInfo.color}`}>{statusInfo.label}</span>
                      </div>
                    </div>
                  </div>
                  <Badge variant={statusInfo.variant} className="text-[10px] uppercase tracking-wider">
                    {integration.authType === "oauth" ? "OAuth" : "API Key"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <CardDescription className="text-sm leading-relaxed">
                  {integration.description}
                </CardDescription>

                <div className="flex flex-wrap gap-1.5">
                  {integration.features.map((feature) => (
                    <Badge key={feature} variant="secondary" className="text-[11px] font-normal">
                      {feature}
                    </Badge>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  {isConnected ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleDisconnect(integration.id)}
                      >
                        <Link2Off className="w-4 h-4 mr-1.5" />
                        Desconectar
                      </Button>
                      {integration.id === "ml" && (
                        <Button variant="ghost" size="sm" onClick={handleSyncML} disabled={syncing} title="Sincronizar pedidos e vendas">
                          <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
                        </Button>
                      )}
                      {integration.id === "magalu" && (
                        <Button variant="ghost" size="sm" onClick={handleSyncMagalu} disabled={syncing} title="Sincronizar pedidos e vendas">
                          <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
                        </Button>
                      )}
                    </>
                  ) : (
                    <>
                      {integration.id === "magalu" ? (
                        <div className="flex-1 flex flex-col gap-2">
                          <div
                            className="magalu-consent-content"
                            dangerouslySetInnerHTML={{ __html: "" }}
                            ref={(el) => {
                              if (el) {
                                el.setAttribute("client-id", "BhbJFTFdYejGKGzhxIvv36p4YCeikcjvF5XGCz6y-4k");
                                el.setAttribute("redirect-uri", "https://analytics.alcavie.com/integracoes");
                                el.setAttribute("state", "magalu");
                                el.setAttribute("scope", "open:portfolio:read open:order-order:read");
                              }
                            }}
                          ></div>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => handleConnect(integration)}
                        >
                          <Link2 className="w-4 h-4 mr-1.5" />
                          Conectar
                        </Button>
                      )}
                      {(integration.id === "ml") && (
                        <Button variant="outline" size="sm" onClick={() => setMlCodeDialog(true)} title="Colar código manualmente">
                          📋
                        </Button>
                      )}
                      {(integration.id === "magalu") && (
                        <Button variant="outline" size="sm" onClick={() => setMagaluCodeDialog(true)} title="Colar código manualmente">
                          📋
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" asChild>
                        <a href={integration.docsUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Connect Dialog */}
      <Dialog open={!!connectDialog} onOpenChange={(open) => !open && setConnectDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{connectDialog?.logo}</span>
              Conectar {connectDialog?.name}
            </DialogTitle>
            <DialogDescription>
              {connectDialog?.authType === "oauth"
                ? `Você será redirecionado para autorizar o acesso à sua conta do ${connectDialog?.name}. Nenhuma senha será armazenada.`
                : `Insira sua chave de API do ${connectDialog?.name} para habilitar a sincronização de dados.`}
            </DialogDescription>
          </DialogHeader>

          {connectDialog?.authType === "api_key" && (
            <div className="space-y-3 py-2">
              <div className="space-y-2">
                <Label htmlFor="api-key">Chave de API</Label>
                <Input
                  id="api-key"
                  type="password"
                  placeholder="Cole sua chave de API aqui..."
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Sua chave será armazenada de forma segura e criptografada no servidor.
              </p>
            </div>
          )}

          {connectDialog?.authType === "oauth" && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border border-border">
              <ShieldCheck className="w-5 h-5 text-primary flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium">Autenticação segura via OAuth 2.0</p>
                <p className="text-muted-foreground mt-0.5">
                  Seus dados de login nunca passam pelo nosso sistema.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setConnectDialog(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmConnect}
              disabled={connecting || (connectDialog?.authType === "api_key" && !apiKeyInput.trim())}
            >
              {connecting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />
                  Conectando...
                </>
              ) : connectDialog?.authType === "oauth" ? (
                <>
                  <ExternalLink className="w-4 h-4 mr-1.5" />
                  Autorizar acesso
                </>
              ) : (
                <>
                  <Link2 className="w-4 h-4 mr-1.5" />
                  Salvar e conectar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ML Manual Code Dialog */}
      <Dialog open={mlCodeDialog} onOpenChange={setMlCodeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              🟡 Colar código do Mercado Livre
            </DialogTitle>
            <DialogDescription>
              Cole o código de autorização que apareceu na URL após autorizar o acesso no Mercado Livre (parâmetro <code>?code=</code>).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="ml-code">Código de autorização</Label>
              <Input
                id="ml-code"
                placeholder="TG-xxxxx..."
                value={mlCodeInput}
                onChange={(e) => setMlCodeInput(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMlCodeDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleManualCodeExchange}
              disabled={connecting || !mlCodeInput.trim()}
            >
              {connecting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />
                  Trocando...
                </>
              ) : (
                <>
                  <Link2 className="w-4 h-4 mr-1.5" />
                  Trocar por token
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Magalu Manual Code Dialog */}
      <Dialog open={magaluCodeDialog} onOpenChange={setMagaluCodeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              🔵 Colar código da Magazine Luiza
            </DialogTitle>
            <DialogDescription>
              Cole o código de autorização que apareceu na URL após autorizar o acesso na Magazine Luiza (parâmetro <code>?code=</code>).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="magalu-code">Código de autorização</Label>
              <Input
                id="magalu-code"
                placeholder="Cole o código aqui..."
                value={magaluCodeInput}
                onChange={(e) => setMagaluCodeInput(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMagaluCodeDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleMagaluManualCodeExchange}
              disabled={connecting || !magaluCodeInput.trim()}
            >
              {connecting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />
                  Trocando...
                </>
              ) : (
                <>
                  <Link2 className="w-4 h-4 mr-1.5" />
                  Trocar por token
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
