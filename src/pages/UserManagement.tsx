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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Loader2, Shield, UserCheck, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type AppRole = "admin" | "editor" | "viewer";

interface UserRow {
  user_id: string;
  role: AppRole;
  email: string;
  full_name: string | null;
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
  const { role } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<AppRole>("viewer");
  const [creating, setCreating] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    // Fetch roles + profiles (admin can see all)
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

    // We don't have access to auth.users emails from client, so we'll use the edge function
    const { data: usersData } = await supabase.functions.invoke("admin-list-users");

    const emailMap = new Map<string, string>();
    if (usersData?.users) {
      for (const u of usersData.users) {
        emailMap.set(u.id, u.email);
      }
    }

    const merged: UserRow[] = roles.map((r) => ({
      user_id: r.user_id,
      role: r.role as AppRole,
      email: emailMap.get(r.user_id) ?? "—",
      full_name: profileMap.get(r.user_id)?.full_name ?? null,
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
    const { error } = await supabase
      .from("user_roles")
      .update({ role: newRole })
      .eq("user_id", userId);

    if (error) {
      toast({ title: "Erro ao atualizar role", variant: "destructive" });
    } else {
      toast({ title: "Role atualizado" });
      setUsers((prev) =>
        prev.map((u) => (u.user_id === userId ? { ...u, role: newRole } : u))
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
      <div className="flex justify-end">
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
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
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required />
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
                  <TableHead>Permissão</TableHead>
                  <TableHead className="w-[180px]">Alterar Permissão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => {
                  const Icon = roleIcon[u.role];
                  return (
                    <TableRow key={u.user_id}>
                      <TableCell>{u.full_name || "—"}</TableCell>
                      <TableCell>{u.email}</TableCell>
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
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
