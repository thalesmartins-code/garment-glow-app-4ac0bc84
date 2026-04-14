import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { MainAppLayout } from "@/components/layout/MainAppLayout";
import { ApiLayout } from "@/components/layout/ApiLayout";
import { SellerProvider } from "@/contexts/SellerContext";
import { MLInventoryProvider } from "@/contexts/MLInventoryContext";
import { MLStoreProvider } from "@/contexts/MLStoreContext";
import { HeaderScopeProvider } from "@/contexts/HeaderScopeContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { SalesDataProvider } from "@/contexts/SalesDataContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { MenuVisibilityProvider } from "@/contexts/MenuVisibilityContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { RoleRoute } from "@/components/auth/RoleRoute";
import { OAuthCodeRedirect } from "@/components/auth/OAuthCodeRedirect";
import AppSelector from "./pages/AppSelector";
import Index from "./pages/Index";
import DailySales from "./pages/DailySales";
import Import from "./pages/Import";
import Settings from "./pages/Settings";
import Sellers from "./pages/Sellers";
import UserManagement from "./pages/UserManagement";
import Profile from "./pages/Profile";
import TVMode from "./pages/TVMode";
import Integrations from "./pages/Integrations";
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
const MLSincronizacoes = React.lazy(() => import("./pages/mercadolivre/MLSincronizacoes"));
const MLImportacao = React.lazy(() => import("./pages/mercadolivre/MLImportacao"));
const MLMetas = React.lazy(() => import("./pages/mercadolivre/MLMetas"));
const TVModeVendas = React.lazy(() => import("./pages/TVModeVendas"));

import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 min
      gcTime: 30 * 60 * 1000, // 30 min
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <MenuVisibilityProvider>
        <SellerProvider>
          <SettingsProvider>
            <SalesDataProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <OAuthCodeRedirect>
                <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
                  <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/tv" element={<ProtectedRoute />}>
                      <Route index element={<TVMode />} />
                    </Route>
                    <Route path="/api/tv" element={<ProtectedRoute />}>
                      <Route index element={<TVModeVendas />} />
                    </Route>
                    <Route element={<ProtectedRoute />}>
                      {/* Hub - Environment selector */}
                      <Route path="/" element={<AppSelector />} />

                      {/* Google Sheets environment */}
                      <Route element={<MainAppLayout />}>
                        <Route path="/sheets" element={<Index />} />
                        <Route path="/sheets/vendas-diarias" element={<DailySales />} />
                        <Route
                          path="/sheets/importacao"
                          element={<RoleRoute><Import /></RoleRoute>}
                        />
                        <Route
                          path="/sheets/configuracoes"
                          element={<RoleRoute><Settings /></RoleRoute>}
                        />
                        <Route
                          path="/sheets/sellers"
                          element={<RoleRoute><Sellers /></RoleRoute>}
                        />
                        <Route
                          path="/sheets/usuarios"
                          element={<RoleRoute><UserManagement /></RoleRoute>}
                        />
                        <Route path="/perfil" element={<Profile />} />
                        <Route
                          path="/sheets/integracoes"
                          element={<RoleRoute><Integrations /></RoleRoute>}
                        />
                      </Route>

                      {/* Marketplaces via API */}
                      <Route element={<HeaderScopeProvider><MLStoreProvider><MLInventoryProvider><ApiLayout /></MLInventoryProvider></MLStoreProvider></HeaderScopeProvider>}>
                        <Route path="/api/perfil" element={<Profile />} />
                        <Route
                          path="/api"
                          element={<RoleRoute><MercadoLivre /></RoleRoute>}
                        />
                        <Route
                          path="/api/estoque"
                          element={<RoleRoute><MLEstoque /></RoleRoute>}
                        />
                        <Route
                          path="/api/anuncios"
                          element={<RoleRoute><MLProdutos /></RoleRoute>}
                        />
                        <Route
                          path="/api/pedidos"
                          element={<RoleRoute><MLPedidos /></RoleRoute>}
                        />
                        <Route
                          path="/api/publicidade"
                          element={<RoleRoute><MLAnuncios /></RoleRoute>}
                        />
                        <Route
                          path="/api/financeiro"
                          element={<RoleRoute><MLFinanceiro /></RoleRoute>}
                        />
                        <Route
                          path="/api/reputacao"
                          element={<RoleRoute><MLReputacao /></RoleRoute>}
                        />
                        <Route
                          path="/api/devolucoes"
                          element={<RoleRoute><MLDevolucoes /></RoleRoute>}
                        />
                        <Route
                          path="/api/perguntas"
                          element={<RoleRoute><MLPerguntas /></RoleRoute>}
                        />
                        <Route
                          path="/api/sincronizacoes"
                          element={<RoleRoute><MLSincronizacoes /></RoleRoute>}
                        />
                        <Route
                          path="/api/importacao"
                          element={<RoleRoute><MLImportacao /></RoleRoute>}
                        />
                        <Route
                          path="/api/metas"
                          element={<RoleRoute><MLMetas /></RoleRoute>}
                        />
                        <Route
                          path="/api/sellers"
                          element={<RoleRoute><Sellers /></RoleRoute>}
                        />
                        <Route
                          path="/api/integracoes"
                          element={<RoleRoute><Integrations /></RoleRoute>}
                        />
                        <Route
                          path="/api/usuarios"
                          element={<RoleRoute><UserManagement /></RoleRoute>}
                        />
                      </Route>
                    </Route>
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
                </OAuthCodeRedirect>
              </BrowserRouter>
            </SalesDataProvider>
          </SettingsProvider>
        </SellerProvider>
        </MenuVisibilityProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
