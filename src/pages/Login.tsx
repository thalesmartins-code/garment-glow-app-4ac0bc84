import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AreaChart, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const { user, loading, signIn } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Forgot password state
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
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-primary shadow-glow">
            <AreaChart className="w-6 h-6 text-white" />
          </div>
          <CardTitle className="text-xl">Analytics Pro</CardTitle>
          <CardDescription>Entre com suas credenciais para acessar o sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Entrar
            </Button>
          </form>
          <div className="mt-3 text-center">
            <button
              type="button"
              className="text-sm text-muted-foreground hover:text-primary underline-offset-4 hover:underline transition-colors"
              onClick={() => setForgotOpen(true)}
            >
              Esqueci minha senha
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Forgot Password Dialog */}
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
