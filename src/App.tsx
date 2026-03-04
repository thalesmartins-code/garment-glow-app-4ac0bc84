import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { SellerProvider } from "@/contexts/SellerContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { SalesDataProvider } from "@/contexts/SalesDataContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { RoleRoute } from "@/components/auth/RoleRoute";
import Index from "./pages/Index";
import DailySales from "./pages/DailySales";
import Import from "./pages/Import";
import Settings from "./pages/Settings";
import Sellers from "./pages/Sellers";
import UserManagement from "./pages/UserManagement";
import Profile from "./pages/Profile";
import TVMode from "./pages/TVMode";
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
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route element={<ProtectedRoute />}>
                    <Route element={<AppLayout />}>
                      <Route path="/" element={<Index />} />
                      <Route path="/vendas-diarias" element={<DailySales />} />
                      <Route path="/importacao" element={<RoleRoute><Import /></RoleRoute>} />
                      <Route path="/configuracoes" element={<RoleRoute><Settings /></RoleRoute>} />
                      <Route path="/sellers" element={<RoleRoute><Sellers /></RoleRoute>} />
                      <Route path="/usuarios" element={<RoleRoute><UserManagement /></RoleRoute>} />
                      <Route path="/perfil" element={<Profile />} />
                    </Route>
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </SalesDataProvider>
          </SettingsProvider>
        </SellerProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
