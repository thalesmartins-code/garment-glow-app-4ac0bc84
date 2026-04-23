import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ApiLayout } from "@/components/layout/ApiLayout";
import { SellerProvider } from "@/contexts/SellerContext";
import { MLInventoryProvider } from "@/contexts/MLInventoryContext";
import { MLStoreProvider } from "@/contexts/MLStoreContext";
import { HeaderScopeProvider } from "@/contexts/HeaderScopeContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { OrganizationProvider } from "@/contexts/OrganizationContext";
import { MenuVisibilityProvider } from "@/contexts/MenuVisibilityContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { RoleRoute } from "@/components/auth/RoleRoute";
import { TVRoleGuard } from "@/components/auth/TVRoleGuard";
import { OAuthCodeRedirect } from "@/components/auth/OAuthCodeRedirect";
import { PageLoader } from "@/components/ui/PageLoader";
import Sellers from "./pages/Sellers";
import Profile from "./pages/Profile";
import Integrations from "./pages/Integrations";
import AdminMonitoring from "./pages/AdminMonitoring";
import OrgSettings from "./pages/org/OrgSettings";
import AcceptInvite from "./pages/AcceptInvite";
import React, { Suspense } from "react";

const MercadoLivre = React.lazy(() => import("./pages/MercadoLivre"));
const MLEstoque = React.lazy(() => import("./pages/mercadolivre/MLEstoque"));
const MLProdutos = React.lazy(() => import("./pages/mercadolivre/MLProdutos"));
const MLPedidos = React.lazy(() => import("./pages/mercadolivre/MLPedidos"));
const MLAnuncios = React.lazy(() => import("./pages/mercadolivre/MLAnuncios"));
const MLFinanceiro = React.lazy(() => import("./pages/mercadolivre/MLFinanceiro"));
const MLReputacao = React.lazy(() => import("./pages/mercadolivre/MLReputacao"));
const MLDevolucoes = React.lazy(() => import("./pages/mercadolivre/MLDevolucoes"));
const MLPerguntas = React.lazy(() => import("./pages/mercadolivre/MLPerguntas"));
const MLMetas = React.lazy(() => import("./pages/mercadolivre/MLMetas"));
const MLPrecosCustos = React.lazy(() => import("./pages/mercadolivre/MLPrecosCustos"));
const TVModeVendas = React.lazy(() => import("./pages/TVModeVendas"));

import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <OrganizationProvider>
        <MenuVisibilityProvider>
        <SellerProvider>
          <SettingsProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <OAuthCodeRedirect>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/aceitar-convite" element={<AcceptInvite />} />
                  <Route element={<ProtectedRoute />}>
                    {/* Modo TV — acesso autenticado, sem sidebar/header */}
                    <Route path="/tv" element={<TVRoleGuard><ErrorBoundary fallbackTitle="Erro no Modo TV"><TVModeVendas /></ErrorBoundary></TVRoleGuard>} />

                    {/* Marketplaces via API (única experiência do app) */}
                    <Route element={<HeaderScopeProvider><MLStoreProvider><MLInventoryProvider><ApiLayout /></MLInventoryProvider></MLStoreProvider></HeaderScopeProvider>}>
                      <Route path="/perfil" element={<Profile />} />
                      <Route
                        path="/"
                        element={<RoleRoute><ErrorBoundary fallbackTitle="Erro na página de Vendas"><MercadoLivre /></ErrorBoundary></RoleRoute>}
                      />
                      <Route
                        path="/estoque"
                        element={<RoleRoute><ErrorBoundary fallbackTitle="Erro na página de Estoque"><MLEstoque /></ErrorBoundary></RoleRoute>}
                      />
                      <Route
                        path="/anuncios"
                        element={<RoleRoute><ErrorBoundary fallbackTitle="Erro na página de Anúncios"><MLProdutos /></ErrorBoundary></RoleRoute>}
                      />
                      <Route
                        path="/pedidos"
                        element={<RoleRoute><ErrorBoundary fallbackTitle="Erro na página de Pedidos"><MLPedidos /></ErrorBoundary></RoleRoute>}
                      />
                      <Route
                        path="/publicidade"
                        element={<RoleRoute><ErrorBoundary fallbackTitle="Erro na página de Publicidade"><MLAnuncios /></ErrorBoundary></RoleRoute>}
                      />
                      <Route
                        path="/financeiro"
                        element={<RoleRoute><ErrorBoundary fallbackTitle="Erro na página Financeiro"><MLFinanceiro /></ErrorBoundary></RoleRoute>}
                      />
                      <Route
                        path="/reputacao"
                        element={<RoleRoute><ErrorBoundary fallbackTitle="Erro na página de Reputação"><MLReputacao /></ErrorBoundary></RoleRoute>}
                      />
                      <Route
                        path="/devolucoes"
                        element={<RoleRoute><ErrorBoundary fallbackTitle="Erro na página de Devoluções"><MLDevolucoes /></ErrorBoundary></RoleRoute>}
                      />
                      <Route
                        path="/perguntas"
                        element={<RoleRoute><ErrorBoundary fallbackTitle="Erro na página de Perguntas"><MLPerguntas /></ErrorBoundary></RoleRoute>}
                      />
                      <Route
                        path="/metas"
                        element={<RoleRoute><ErrorBoundary fallbackTitle="Erro na página de Metas"><MLMetas /></ErrorBoundary></RoleRoute>}
                      />
                      <Route
                         path="/precos-custos"
                         element={<RoleRoute><ErrorBoundary fallbackTitle="Erro na página de Preços e Custos"><MLPrecosCustos /></ErrorBoundary></RoleRoute>}
                      />
                      <Route
                        path="/sellers"
                        element={<RoleRoute><Sellers /></RoleRoute>}
                      />
                      <Route
                        path="/integracoes"
                        element={<RoleRoute><Integrations /></RoleRoute>}
                      />
                      <Route
                        path="/organizacao"
                        element={<RoleRoute><OrgSettings /></RoleRoute>}
                      />
                      <Route path="/usuarios" element={<Navigate to="/organizacao" replace />} />
                      <Route
                        path="/monitoramento"
                        element={<RoleRoute><ErrorBoundary fallbackTitle="Erro no Monitoramento"><AdminMonitoring /></ErrorBoundary></RoleRoute>}
                      />
                    </Route>
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
              </OAuthCodeRedirect>
            </BrowserRouter>
          </SettingsProvider>
        </SellerProvider>
        </MenuVisibilityProvider>
        </OrganizationProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
