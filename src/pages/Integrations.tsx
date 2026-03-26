import { useState, useEffect, useRef } from "react";
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
import createMagaluClient from "@magalucloud/sdk-idmagalu-js";
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
  Store,
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
    id: "magalu",
    name: "Magazine Luiza",
    logo: "🔵",
    description: "Conecte via ID Magalu (OAuth2) para importar pedidos e vendas do Magalu Marketplace.",
    status: "disconnected",
    authType: "oauth",
    docsUrl: "https://docs.magalu.cloud",
    features: ["Pedidos", "Vendas", "Entregas", "Métricas"],
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
  const [disconnectTarget, setDisconnectTarget] = useState<string | null>(null);
  const [disconnectPassword, setDisconnectPassword] = useState("");
  const [disconnecting, setDisconnecting] = useState(false);
  const [disconnectError, setDisconnectError] = useState("");
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

  // Helper: save ML tokens to both localStorage and Supabase (upsert per ml_user_id)
  const saveMLTokens = async (tokenData: { access_token: string; refresh_token: string; expires_in: number; user_id: string }) => {
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
    const localPayload = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: Date.now() + tokenData.expires_in * 1000,
      user_id: tokenData.user_id,
    };
    localStorage.removeItem("ml_pkce_code_verifier");
    localStorage.setItem("ml_tokens", JSON.stringify(localPayload));

    // Upsert to Supabase ml_tokens table using (user_id, ml_user_id) constraint
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || null;

      await supabase.from("ml_tokens").upsert(
        {
          user_id: userId,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: expiresAt,
          ml_user_id: String(tokenData.user_id),
          token_type: "bearer",
        },
        { onConflict: "user_id,ml_user_id" },
      );
    } catch (e) {
      console.error("Failed to save ML tokens to DB:", e);
    }
  };

  // Helper: refresh token via ml-oauth and update DB + localStorage
  const refreshMLToken = async (refreshToken: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke("ml-oauth", {
        body: { action: "refresh_token", refresh_token: refreshToken },
      });
      if (error || !data?.success) {
        console.error("ML token refresh failed:", data?.error || error?.message);
        return false;
      }
      await saveMLTokens(data);
      updateIntegrationStatus("ml", "connected");
      return true;
    } catch (e) {
      console.error("ML token refresh error:", e);
      return false;
    }
  };

  // Check for existing ML tokens on mount (localStorage + DB fallback + auto-refresh)
  useEffect(() => {
    const checkTokens = async () => {
      let tokens: { access_token?: string; refresh_token?: string; expires_at?: number; user_id?: string } | null = null;

      // First check localStorage
      const mlTokens = localStorage.getItem("ml_tokens");
      if (mlTokens) {
        try { tokens = JSON.parse(mlTokens); } catch (e) { /* ignore */ }
      }

      // Fallback: check DB for ANY token
      if (!tokens?.access_token) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;
          const { data: dbTokens } = await supabase
            .from("ml_tokens")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1);

          const firstToken = dbTokens?.[0];
          if (firstToken?.access_token) {
            const expiresAt = firstToken.expires_at ? new Date(firstToken.expires_at).getTime() : 0;
            tokens = {
              access_token: firstToken.access_token,
              refresh_token: firstToken.refresh_token || undefined,
              expires_at: expiresAt,
              user_id: firstToken.ml_user_id || undefined,
            };
            localStorage.setItem("ml_tokens", JSON.stringify(tokens));
          }
        } catch (e) { /* ignore */ }
      }

      if (!tokens?.access_token) return;

      const expiresAt = tokens.expires_at || 0;
      const thirtyMinutes = 30 * 60 * 1000;

      // If expiring within 30 minutes, auto-refresh
      if (expiresAt > 0 && expiresAt - Date.now() < thirtyMinutes && tokens.refresh_token) {
        console.log("ML token expiring soon, auto-refreshing...");
        const success = await refreshMLToken(tokens.refresh_token);
        if (!success) {
          updateIntegrationStatus("ml", "expired");
        }
        return;
      }

      if (expiresAt > Date.now()) {
        updateIntegrationStatus("ml", "connected");
      } else {
        // Already expired, try refresh
        if (tokens.refresh_token) {
          const success = await refreshMLToken(tokens.refresh_token);
          if (!success) updateIntegrationStatus("ml", "expired");
        } else {
          updateIntegrationStatus("ml", "expired");
        }
      }
    };
    checkTokens();
  }, []);

  // Handle ML OAuth callback
  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) return;

    setMlCodeInput(code);
    setMlCodeDialog(true);

    const exchangeCode = async () => {
      setConnecting(true);
      const redirectUri = "https://analytics.alcavie.com/integracoes";
      const codeVerifier = localStorage.getItem("ml_pkce_code_verifier") || undefined;

      const { data, error } = await supabase.functions.invoke("ml-oauth", {
        body: { action: "exchange_code", code, redirect_uri: redirectUri, code_verifier: codeVerifier },
      });

      if (error || !data?.success) {
        toast({
          title: "Erro ao conectar Mercado Livre",
          description: data?.error || error?.message || "Falha na troca do código.",
          variant: "destructive",
        });
        setConnecting(false);
        return;
      }

      await saveMLTokens(data);
      updateIntegrationStatus("ml", "connected");
      toast({ title: "Mercado Livre conectado!", description: `Conta conectada com sucesso (User ID: ${data.user_id}).` });
      setSearchParams({}, { replace: true });
      setMlCodeDialog(false);
      setMlCodeInput("");
      setConnecting(false);
    };

    exchangeCode();
  }, [searchParams, setSearchParams, toast]);

  const handleConnect = async (integration: MarketplaceIntegration) => {
    if (integration.id === "ml") {
      const redirectUri = "https://analytics.alcavie.com/integracoes";
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

      if (data.code_verifier) {
        localStorage.setItem("ml_pkce_code_verifier", data.code_verifier);
      }

      window.location.href = data.auth_url;
      return;
    }


    if (integration.id === "magalu") {
      // Magalu OAuth2 PKCE via SDK popup
      setConnecting(true);
      try {
        const magaluClient = await createMagaluClient({
          client_id: "BhbJFTFdYejGKGzhxIvv36p4YCeikcjvF5XGCz6y-4k",
          redirect_uri: "https://analytics.alcavie.com/integracoes",
        });

        const response = await magaluClient.loginWithPopup() as any;

        if (response?.access_token) {
          localStorage.setItem("magalu_tokens", JSON.stringify({
            access_token: response.access_token,
            refresh_token: response.refresh_token,
            expires_at: Date.now() + (response.expires_in || 1800) * 1000,
            id_token: response.id_token,
          }));

          // Test connection with the obtained token
          const { data, error } = await supabase.functions.invoke("magalu-integration", {
            body: { action: "test_connection", access_token: (response as any).access_token },
          });

          if (error || !data?.success) {
            toast({
              title: "Autenticação OK, mas falha ao testar API",
              description: data?.error || error?.message || "Token válido, mas a API retornou erro.",
              variant: "destructive",
            });
          }

          updateIntegrationStatus("magalu", "connected");
          toast({
            title: "Magazine Luiza conectada!",
            description: "Autenticação via ID Magalu realizada com sucesso.",
          });
        } else {
          toast({
            title: "Login cancelado",
            description: "O login com ID Magalu foi cancelado ou falhou.",
            variant: "destructive",
          });
        }
      } catch (err: any) {
        console.error("Magalu OAuth error:", err);
        toast({
          title: "Erro ao conectar Magazine Luiza",
          description: err?.message || "Falha na autenticação via ID Magalu.",
          variant: "destructive",
        });
      } finally {
        setConnecting(false);
      }
      return;
    }

    // Other marketplaces: show dialog
    setConnectDialog(integration);
    setApiKeyInput("");
  };

  const handleDisconnect = async (integrationId: string) => {
    if (integrationId === "ml") {
      // Delete ALL ML tokens from DB for this user
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("ml_tokens").delete().eq("user_id", user.id);
          await supabase.from("ml_user_cache").delete().eq("user_id", user.id);
        }
      } catch (e) {
        console.error("Failed to delete ML tokens from DB:", e);
      }
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
    updateIntegrationStatus(integrationId, "disconnected");
    toast({
      title: "Marketplace desconectado",
      description: "A integração foi removida com sucesso.",
    });
  };

  const handleConfirmDisconnect = async () => {
    if (!disconnectTarget || !disconnectPassword.trim()) return;
    setDisconnecting(true);
    setDisconnectError("");

    try {
      // Verify password by re-authenticating
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        setDisconnectError("Não foi possível verificar o usuário.");
        setDisconnecting(false);
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: disconnectPassword,
      });

      if (error) {
        setDisconnectError("Senha incorreta. Tente novamente.");
        setDisconnecting(false);
        return;
      }

      // Password verified, proceed with disconnect
      await handleDisconnect(disconnectTarget);
      setDisconnectTarget(null);
      setDisconnectPassword("");
    } catch (e) {
      setDisconnectError("Erro ao verificar senha.");
    } finally {
      setDisconnecting(false);
    }

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

      const today = new Date().toISOString().substring(0, 10);
      const { data, error } = await supabase.functions.invoke("mercado-libre-integration", {
        body: { access_token, date_from: today, date_to: today },
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
    const redirectUri = "https://analytics.alcavie.com/integracoes";
    const codeVerifier = localStorage.getItem("ml_pkce_code_verifier") || undefined;

    const { data, error } = await supabase.functions.invoke("ml-oauth", {
      body: { action: "exchange_code", code: mlCodeInput.trim(), redirect_uri: redirectUri, code_verifier: codeVerifier },
    });

    if (error || !data?.success) {
      toast({
        title: "Erro ao trocar código",
        description: data?.error || error?.message || "Falha na troca do código de autorização.",
        variant: "destructive",
      });
    } else {
      await saveMLTokens(data);
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

  const handleSyncMagalu = async () => {
    setSyncing(true);
    try {
      const tokens = localStorage.getItem("magalu_tokens");
      if (!tokens) {
        toast({
          title: "Erro",
          description: "Nenhum token da Magalu encontrado. Conecte-se primeiro.",
          variant: "destructive",
        });
        setSyncing(false);
        return;
      }
      const { access_token } = JSON.parse(tokens);

      const { data, error } = await supabase.functions.invoke("magalu-integration", {
        body: { action: "get_orders", access_token },
      });

      if (error || !data?.success) {
        toast({
          title: "Erro ao sincronizar Magalu",
          description: data?.error || error?.message || "Falha ao buscar dados da Magazine Luiza.",
          variant: "destructive",
        });
      } else {
        setMagaluMetrics(data.metrics);
        localStorage.setItem("magalu_metrics", JSON.stringify(data.metrics));
        toast({
          title: "Sincronização concluída!",
          description: "Dados da Magazine Luiza importados com sucesso.",
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


      {/* Magalu Metrics */}
      {magaluMetrics && integrations.find((i) => i.id === "magalu")?.status === "connected" && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                🔵 Métricas da Magazine Luiza
              </CardTitle>
              <span className="text-xs text-muted-foreground">{magaluMetrics.period}</span>
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
                        onClick={() => { setDisconnectTarget(integration.id); setDisconnectPassword(""); setDisconnectError(""); }}
                      >
                        <Link2Off className="w-4 h-4 mr-1.5" />
                        Desconectar
                      </Button>
                      {integration.id === "ml" && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => handleConnect(integration)} title="Adicionar outra loja ML">
                            <Store className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={handleSyncML} disabled={syncing} title="Sincronizar pedidos e vendas">
                            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
                          </Button>
                        </>
                      )}
                      {integration.id === "magalu" && (
                        <Button variant="ghost" size="sm" onClick={handleSyncMagalu} disabled={syncing} title="Sincronizar pedidos e vendas">
                          <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
                        </Button>
                      )}
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => handleConnect(integration)}
                      >
                        <Link2 className="w-4 h-4 mr-1.5" />
                        Conectar
                      </Button>
                      {(integration.id === "ml") && (
                        <Button variant="outline" size="sm" onClick={() => setMlCodeDialog(true)} title="Colar código manualmente">
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

      {/* Disconnect Confirmation Dialog */}
      <Dialog open={!!disconnectTarget} onOpenChange={(open) => { if (!open) { setDisconnectTarget(null); setDisconnectPassword(""); setDisconnectError(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              Confirmar desconexão
            </DialogTitle>
            <DialogDescription>
              Para desconectar esta integração, digite sua senha para confirmar. Todos os tokens e dados de cache serão removidos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="disconnect-password">Senha</Label>
              <Input
                id="disconnect-password"
                type="password"
                placeholder="Digite sua senha..."
                value={disconnectPassword}
                onChange={(e) => { setDisconnectPassword(e.target.value); setDisconnectError(""); }}
                onKeyDown={(e) => { if (e.key === "Enter" && disconnectPassword.trim()) handleConfirmDisconnect(); }}
              />
              {disconnectError && (
                <p className="text-xs text-destructive">{disconnectError}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisconnectTarget(null)} disabled={disconnecting}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDisconnect}
              disabled={disconnecting || !disconnectPassword.trim()}
            >
              {disconnecting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <Link2Off className="w-4 h-4 mr-1.5" />
                  Desconectar
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

    </div>
  );
}
