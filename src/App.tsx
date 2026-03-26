import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { MainAppLayout } from "@/components/layout/MainAppLayout";
import { MercadoLivreLayout } from "@/components/layout/MercadoLivreLayout";
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

                      {/* Mercado Livre environment */}
                      {/* Mercado Livre environment */}
                      <Route element={<MLStoreProvider><MLInventoryProvider><MercadoLivreLayout /></MLInventoryProvider></MLStoreProvider>}>
                        <Route path="/mercado-livre/perfil" element={<Profile />} />
                        <Route
                          path="/mercado-livre"
                          element={<RoleRoute><MercadoLivre /></RoleRoute>}
                        />
                        <Route
                          path="/mercado-livre/estoque"
                          element={<RoleRoute><MLEstoque /></RoleRoute>}
                        />
                        <Route
                          path="/mercado-livre/produtos"
                          element={<RoleRoute><MLProdutos /></RoleRoute>}
                        />
                        <Route
                          path="/mercado-livre/pedidos"
                          element={<RoleRoute><MLPedidos /></RoleRoute>}
                        />
                        <Route
                          path="/mercado-livre/anuncios"
                          element={<RoleRoute><MLAnuncios /></RoleRoute>}
                        />
                        <Route
                          path="/mercado-livre/integracoes"
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
