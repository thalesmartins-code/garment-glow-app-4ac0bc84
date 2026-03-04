import { Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const UserManagement = () => {
  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-primary shadow-glow">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Gestão de Usuários</h1>
          <p className="text-muted-foreground text-sm">Gerencie usuários e permissões do sistema</p>
        </div>
      </div>

      <Card className="border border-border/50 shadow-md">
        <CardContent className="p-10 text-center">
          <div className="text-6xl mb-4">🔐</div>
          <h3 className="text-xl font-semibold mb-2">Usuários</h3>
          <p className="text-muted-foreground">
            Convide usuários, defina papéis (admin, editor, viewer) e gerencie acessos.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManagement;
