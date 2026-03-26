import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { FileSpreadsheet, Store, LogOut, AreaChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const environments = [
  {
    id: "sheets",
    title: "Marketplaces via Planilha",
    description: "Dashboard, Vendas, Importação, Sellers e Usuários — dados sincronizados via Google Sheets",
    icon: FileSpreadsheet,
    path: "/sheets",
    gradient: "from-emerald-600 to-teal-500",
    shadow: "hover:shadow-[0_8px_30px_hsl(142_70%_45%/0.15)]",
  },
  {
    id: "api",
    title: "Marketplaces via API",
    description: "Vendas, Estoque, Anúncios, Pedidos, Publicidade e Integrações — dados em tempo real via API",
    icon: Store,
    path: "/api",
    gradient: "from-sky-500 to-blue-600",
    shadow: "hover:shadow-[0_8px_30px_hsl(217_70%_45%/0.15)]",
  },
];

const ease = [0.4, 0, 0.2, 1] as const;

export default function AppSelector() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease }}
        className="flex items-center justify-between px-6 py-4 border-b border-border"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
            <AreaChart className="h-4.5 w-4.5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Analytics Pro</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground hidden sm:inline">
            {user?.email}
          </span>
          <Button variant="ghost" size="sm" onClick={signOut} className="gap-2">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>
      </motion.header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-3xl space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease }}
            className="text-center space-y-2"
          >
            <h1 className="text-3xl font-bold tracking-tight">Selecione o ambiente</h1>
            <p className="text-muted-foreground">
              Escolha a origem dos dados do marketplace
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {environments.map((env, index) => {
              const Icon = env.icon;
              return (
                <motion.button
                  key={env.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 + index * 0.1, ease }}
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(env.path)}
                  className={`group relative flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center transition-shadow duration-300 ${env.shadow}`}
                >
                  <div
                    className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${env.gradient} shadow-lg transition-transform duration-300 group-hover:scale-105`}
                  >
                    <Icon className="h-8 w-8 text-white" />
                  </div>
                  <div className="space-y-1.5">
                    <h2 className="text-xl font-semibold">{env.title}</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {env.description}
                    </p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
