import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Loader2, Shield, UserCheck, Eye, Ban, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PasswordStrengthIndicator } from "@/components/auth/PasswordStrengthIndicator";
import { validatePassword } from "@/utils/passwordValidation";
import { MenuVisibilityCard } from "@/components/admin/MenuVisibilityCard";
import { AuditLogCard } from "@/components/admin/AuditLogCard";

type AppRole = "admin" | "editor" | "viewer";

interface UserRow {
  user_id: string;
  role: AppRole;
  email: string;
  full_name: string | null;
  banned: boolean;
}

const roleBadge: Record<AppRole, { label: string; variant: "default" | "secondary" | "outline" }> = {
  admin: { label: "Admin", variant: "default" },
  editor: { label: "Editor", variant: "secondary" },
  viewer: { label: "Viewer", variant: "outline" },
};

const roleIcon: Record<AppRole, typeof Shield> = {
  admin: Shield,
  editor: UserCheck,
  viewer: Eye,
};

export default function UserManagement() {
  const { role, user: currentUser } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<AppRole>("viewer");
  const [creating, setCreating] = useState(false);

  // Confirmation states
  const [roleConfirm, setRoleConfirm] = useState<{ userId: string; newRole: AppRole } | null>(null);
  const [toggleConfirm, setToggleConfirm] = useState<{ userId: string; email: string; banned: boolean } | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role");

    if (!roles) {
      setLoading(false);
      return;
    }

    const userIds = roles.map((r) => r.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);

    const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);

    const { data: usersData } = await supabase.functions.invoke("admin-list-users");

    const emailMap = new Map<string, string>();
    const bannedMap = new Map<string, boolean>();
    if (usersData?.users) {
      for (const u of usersData.users) {
        emailMap.set(u.id, u.email);
        bannedMap.set(u.id, !!u.banned_until && new Date(u.banned_until) > new Date());
      }
    }

    const merged: UserRow[] = roles.map((r) => ({
      user_id: r.user_id,
      role: r.role as AppRole,
      email: emailMap.get(r.user_id) ?? "—",
      full_name: profileMap.get(r.user_id)?.full_name ?? null,
      banned: bannedMap.get(r.user_id) ?? false,
    }));

    setUsers(merged);
    setLoading(false);
  };

  useEffect(() => {
    if (role === "admin") fetchUsers();
  }, [role]);

  const handleCreateUser = async () => {
    if (!newEmail || !newPassword) {
      toast({ title: "Preencha email e senha", variant: "destructive" });
      return;
    }

    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
      toast({
        title: "Senha inválida",
        description: validation.errors.join(", "),
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    const { data, error } = await supabase.functions.invoke("admin-create-user", {
      body: { email: newEmail, password: newPassword, full_name: newName, role: newRole },
    });
    if (error || data?.error) {
      toast({
        title: "Erro ao criar usuário",
        description: data?.error || error?.message || "Tente novamente.",
        variant: "destructive",
      });
    } else {
      toast({ title: "Usuário criado com sucesso" });
      setIsAddOpen(false);
      setNewEmail("");
      setNewPassword("");
      setNewName("");
      setNewRole("viewer");
      fetchUsers();
    }
    setCreating(false);
  };

  const handleRoleChange = async (userId: string, newRole: AppRole) => {
    // Prevent admin from removing their own admin role
    if (userId === currentUser?.id && newRole !== "admin") {
      toast({
        title: "Ação bloqueada",
        description: "Você não pode remover seu próprio cargo de admin.",
        variant: "destructive",
      });
      return;
    }

    setRoleConfirm({ userId, newRole });
  };

  const confirmRoleChange = async () => {
    if (!roleConfirm) return;
    const { userId, newRole } = roleConfirm;
    setRoleConfirm(null);

    const { data, error } = await supabase.functions.invoke("admin-update-role", {
      body: { user_id: userId, role: newRole },
    });

    if (error || data?.error) {
      toast({
        title: "Erro ao atualizar perfil",
        description: data?.error ?? error?.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Perfil atualizado" });
      setUsers((prev) =>
        prev.map((u) => (u.user_id === userId ? { ...u, role: newRole } : u))
      );
    }
  };

  const handleToggleUser = (userId: string, email: string, currentlyBanned: boolean) => {
    setToggleConfirm({ userId, email, banned: currentlyBanned });
  };

  const confirmToggleUser = async () => {
    if (!toggleConfirm) return;
    const { userId, banned } = toggleConfirm;
    setToggleConfirm(null);

    const { data, error } = await supabase.functions.invoke("admin-toggle-user", {
      body: { user_id: userId, banned: !banned },
    });

    if (error || data?.error) {
      toast({
        title: "Erro",
        description: data?.error ?? error?.message,
        variant: "destructive",
      });
    } else {
      toast({ title: !banned ? "Usuário desativado" : "Usuário reativado" });
      setUsers((prev) =>
        prev.map((u) => (u.user_id === userId ? { ...u, banned: !banned } : u))
      );
    }
  };

  if (role !== "admin") {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Acesso restrito a administradores.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="sticky -top-4 md:-top-6 lg:-top-8 z-20 -mx-4 md:-mx-6 lg:-mx-8 -mt-4 md:-mt-6 lg:-mt-8 px-4 md:px-6 lg:px-8 pb-4 pt-4 bg-background/95 backdrop-blur-sm border-b border-border/40">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Gestão de Usuários</h1>
            <p className="text-[11px] text-muted-foreground/60 mt-0.5">
              {users.length} {users.length === 1 ? "usuário" : "usuários"}
            </p>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8 text-sm">
              <Plus className="h-4 w-4 mr-1.5" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Usuário</DialogTitle>
              <DialogDescription>
                Crie uma nova conta de acesso ao sistema.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome completo" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="usuario@email.com" required />
              </div>
              <div className="space-y-2">
                <Label>Senha</Label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 8 caracteres" required />
                <PasswordStrengthIndicator password={newPassword} />
              </div>
              <div className="space-y-2">
                <Label>Permissão</Label>
                <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateUser} disabled={creating}>
                {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Criar
              </Button>
            </DialogFooter>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usuários do Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Permissão</TableHead>
                  <TableHead className="w-[180px]">Alterar Permissão</TableHead>
                  <TableHead className="w-[100px]">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => {
                  const Icon = roleIcon[u.role];
                  const isSelf = u.user_id === currentUser?.id;
                  return (
                    <TableRow key={u.user_id} className={u.banned ? "opacity-60" : ""}>
                      <TableCell>{u.full_name || "—"}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>
                        <Badge variant={u.banned ? "destructive" : "outline"} className="gap-1">
                          {u.banned ? (
                            <>
                              <Ban className="w-3 h-3" />
                              Inativo
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-3 h-3" />
                              Ativo
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={roleBadge[u.role].variant} className="gap-1">
                          <Icon className="w-3 h-3" />
                          {roleBadge[u.role].label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select value={u.role} onValueChange={(v) => handleRoleChange(u.user_id, v as AppRole)}>
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="editor">Editor</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {!isSelf && (
                          <Button
                            variant={u.banned ? "outline" : "destructive"}
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => handleToggleUser(u.user_id, u.email, u.banned)}
                          >
                            {u.banned ? "Ativar" : "Desativar"}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Role change confirmation */}
      <AlertDialog open={!!roleConfirm} onOpenChange={(open) => !open && setRoleConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar alteração de permissão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja alterar a permissão deste usuário para{" "}
              <strong>{roleConfirm?.newRole}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRoleChange}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Toggle user confirmation */}
      <AlertDialog open={!!toggleConfirm} onOpenChange={(open) => !open && setToggleConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toggleConfirm?.banned ? "Reativar usuário" : "Desativar usuário"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toggleConfirm?.banned
                ? `Tem certeza que deseja reativar o acesso de ${toggleConfirm?.email}?`
                : `Tem certeza que deseja desativar o acesso de ${toggleConfirm?.email}? O usuário não conseguirá fazer login.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmToggleUser}>
              {toggleConfirm?.banned ? "Reativar" : "Desativar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MenuVisibilityCard />
      <AuditLogCard />
    </div>
  );
}
