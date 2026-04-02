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
import { SettingsProvider } from "@/contexts/SettingsContext";
import { SalesDataProvider } from "@/contexts/SalesDataContext";
import { AuthProvider } from "@/contexts/AuthContext";
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
import MercadoLivre from "./pages/MercadoLivre";
import MLEstoque from "./pages/mercadolivre/MLEstoque";
import MLProdutos from "./pages/mercadolivre/MLProdutos";
import MLPedidos from "./pages/mercadolivre/MLPedidos";
import MLAnuncios from "./pages/mercadolivre/MLAnuncios";
import MLFinanceiro from "./pages/mercadolivre/MLFinanceiro";
import MLReputacao from "./pages/mercadolivre/MLReputacao";
import MLDevolucoes from "./pages/mercadolivre/MLDevolucoes";
import MLPerguntas from "./pages/mercadolivre/MLPerguntas";
import MLSincronizacoes from "./pages/mercadolivre/MLSincronizacoes";
import MLImportacao from "./pages/mercadolivre/MLImportacao";

import MLRelatorios from "./pages/mercadolivre/MLRelatorios";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <SellerProvider>
          <SettingsProvider>
            <SalesDataProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <OAuthCodeRedirect>
                  <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/tv" element={<ProtectedRoute />}>
                      <Route index element={<TVMode />} />
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
                      <Route element={<MLStoreProvider><MLInventoryProvider><ApiLayout /></MLInventoryProvider></MLStoreProvider>}>
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
                          path="/api/produtos"
                          element={<RoleRoute><MLProdutos /></RoleRoute>}
                        />
                        <Route
                          path="/api/pedidos"
                          element={<RoleRoute><MLPedidos /></RoleRoute>}
                        />
                        <Route
                          path="/api/anuncios"
                          element={<RoleRoute><MLAnuncios /></RoleRoute>}
                        />
                        <Route
                          path="/api/vendas-hora"
                          element={<RoleRoute><VendasPorHora /></RoleRoute>}
                        />
                        <Route
                          path="/api/relatorios"
                          element={<RoleRoute><MLRelatorios /></RoleRoute>}
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
                          path="/api/sellers"
                          element={<RoleRoute><Sellers /></RoleRoute>}
                        />
                        <Route
                          path="/api/integracoes"
                          element={<RoleRoute><Integrations /></RoleRoute>}
                        />
                      </Route>
                    </Route>
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </OAuthCodeRedirect>
              </BrowserRouter>
            </SalesDataProvider>
          </SettingsProvider>
        </SellerProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
