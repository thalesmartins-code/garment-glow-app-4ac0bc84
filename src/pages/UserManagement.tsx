import { Shield } from "lucide-react";

const UserManagement = () => {
  return (
    <div className="dashboard-container">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-primary-foreground">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Gestão de Usuários</h1>
            <p className="text-muted-foreground text-sm">Gerencie usuários e permissões do sistema</p>
          </div>
        </div>

        <div className="dashboard-section p-10 text-center">
          <div className="text-6xl mb-4">🔐</div>
          <h3 className="text-xl font-semibold mb-2">Usuários</h3>
          <p className="text-muted-foreground">
            Convide usuários, defina papéis (admin, editor, viewer) e gerencie acessos.
          </p>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
