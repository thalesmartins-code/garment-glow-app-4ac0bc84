import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AreaChart,
  Loader2,
  TrendingUp,
  ShoppingCart,
  DollarSign,
  Users,
  BarChart3,
  ArrowUpRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

/* ── Mini KPI card for the showcase panel ── */
function MiniKPI({
  icon: Icon,
  label,
  value,
  delta,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  delta: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/[0.07] backdrop-blur-sm border border-white/10 px-4 py-3 overflow-hidden">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
        <Icon className="h-4 w-4 text-white/80" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-white/50 truncate">{label}</p>
        <p className="text-sm font-semibold text-white tracking-tight whitespace-nowrap">{value}</p>
      </div>
      <span className="text-[11px] font-medium text-emerald-400 flex items-center gap-0.5 shrink-0 whitespace-nowrap">
        <ArrowUpRight className="h-3 w-3" />
        {delta}
      </span>
    </div>
  );
}

/* ── Animated mini bar chart ── */
function MiniChart() {
  const bars = [35, 55, 42, 68, 52, 75, 60, 82, 70, 90, 65, 78];
  return (
    <div className="flex items-end gap-1 h-16">
      {bars.map((h, i) => (
        <motion.div
          key={i}
          className="flex-1 rounded-t-sm bg-gradient-to-t from-white/20 to-white/40"
          initial={{ height: 0 }}
          animate={{ height: `${h}%` }}
          transition={{ duration: 0.6, delay: 0.8 + i * 0.05, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

/* ── Framer-motion variants ── */
const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 0.15 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
} as const;

const fadeScale = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.45 } },
} as const;

const kpiContainerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.4 },
  },
} as const;

const kpiItem = {
  hidden: { opacity: 0, x: -16 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4 } },
} as const;

export default function Login() {
  const { user, loading, signIn } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await signIn(email, password);
    if (error) {
      toast({
        title: "Erro ao entrar",
        description: "Email ou senha incorretos.",
        variant: "destructive",
      });
    }
    setSubmitting(false);
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail) {
      toast({ title: "Digite seu email", variant: "destructive" });
      return;
    }
    setForgotLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast({
        title: "Erro ao enviar email",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Email enviado!", description: "Verifique sua caixa de entrada." });
      setForgotOpen(false);
      setForgotEmail("");
    }
    setForgotLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* ─── Left: Showcase panel ─── */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden" style={{ background: "var(--gradient-dark)" }}>
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Glow orbs */}
        <motion.div
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[hsl(217,70%,45%)]/20 blur-[120px]"
          animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.35, 0.2] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-48 -right-48 w-[500px] h-[500px] rounded-full bg-[hsl(217,80%,55%)]/10 blur-[150px]"
          animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />

        <motion.div
          className="relative z-10 flex flex-col justify-between w-full p-12 xl:p-16"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Top: Brand */}
          <motion.div className="flex items-center gap-3" variants={fadeUp}>
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
              <AreaChart className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-semibold text-white tracking-tight">Analytics Pro</span>
          </motion.div>

          {/* Middle: Dashboard preview */}
          <div className="space-y-5 max-w-md">
            <motion.div variants={fadeUp}>
              <h2 className="text-3xl xl:text-4xl font-bold text-white leading-tight tracking-tight">
                Seus dados de vendas em um só lugar
              </h2>
              <p className="mt-3 text-base text-white/50 leading-relaxed">
                Acompanhe faturamento, metas, estoque e reputação de todos os seus marketplaces em tempo real.
              </p>
            </motion.div>

            {/* Mini KPIs */}
            <motion.div className="grid grid-cols-2 gap-3" variants={kpiContainerVariants} initial="hidden" animate="visible">
              <motion.div variants={kpiItem}>
                <MiniKPI icon={DollarSign} label="Faturamento" value="R$ 124.850" delta="+12,4%" />
              </motion.div>
              <motion.div variants={kpiItem}>
                <MiniKPI icon={ShoppingCart} label="Pedidos" value="1.283" delta="+8,2%" />
              </motion.div>
              <motion.div variants={kpiItem}>
                <MiniKPI icon={Users} label="Compradores" value="947" delta="+5,7%" />
              </motion.div>
              <motion.div variants={kpiItem}>
                <MiniKPI icon={TrendingUp} label="Conversão" value="3,8%" delta="+0,4%" />
              </motion.div>
            </motion.div>

            {/* Mini chart */}
            <motion.div
              className="rounded-xl bg-white/[0.05] backdrop-blur-sm border border-white/10 p-4"
              variants={fadeScale}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-white/40" />
                  <span className="text-xs text-white/40 font-medium">Receita por hora — Hoje</span>
                </div>
                <span className="text-xs text-emerald-400 font-medium">+18,3%</span>
              </div>
              <MiniChart />
            </motion.div>
          </div>

          {/* Bottom: Social proof */}
          <motion.p className="text-xs text-white/30" variants={fadeUp}>
            Integração com Mercado Livre, Shopee, Magalu e mais.
          </motion.p>
        </motion.div>
      </div>

      {/* ─── Right: Login form ─── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-background">
        <motion.div
          className="w-full max-w-sm space-y-8"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
        >
          {/* Mobile-only brand */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-2">
            <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-primary shadow-glow">
              <AreaChart className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold text-foreground tracking-tight">Analytics Pro</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Bem-vindo de volta</h1>
            <p className="text-sm text-muted-foreground">Entre com suas credenciais para acessar o sistema.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">Senha</Label>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-accent underline-offset-4 hover:underline transition-colors"
                  onClick={() => setForgotOpen(true)}
                >
                  Esqueci minha senha
                </button>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11"
              />
            </div>
            <Button type="submit" className="w-full h-11 text-sm font-medium" disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Entrar
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground/60">
            Acesso restrito a usuários autorizados.
          </p>
        </motion.div>
      </div>

      {/* ─── Forgot Password Dialog ─── */}
      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Recuperar Senha</DialogTitle>
            <DialogDescription>
              Digite seu email para receber um link de redefinição de senha.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="forgot-email">Email</Label>
            <Input
              id="forgot-email"
              type="email"
              placeholder="seu@email.com"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setForgotOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleForgotPassword} disabled={forgotLoading}>
              {forgotLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
