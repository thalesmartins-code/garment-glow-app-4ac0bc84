import { useLocation, Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

const routeNames: Record<string, string> = {
  "/": "Dashboard",
  "/vendas-diarias": "Vendas Diárias",
  "/importacao": "Importação",
  "/configuracoes": "Configurações",
  "/sellers": "Sellers",
  "/perfil": "Perfil",
  "/usuarios": "Usuários",
};

export function Breadcrumbs() {
  const location = useLocation();
  const currentPath = location.pathname;
  const currentName = routeNames[currentPath] || "Página";

  return (
    <nav className="flex items-center gap-1.5 text-sm">
      <Link
        to="/"
        className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors duration-200"
      >
        <Home className="w-4 h-4" />
      </Link>
      <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
      <span className="font-medium text-foreground">{currentName}</span>
    </nav>
  );
}
