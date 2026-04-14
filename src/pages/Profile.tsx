import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMenuVisibility, MENU_SECTIONS, MenuVisibilityConfig, AppRole } from "@/contexts/MenuVisibilityContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Camera, Loader2, Save, LayoutDashboard, ShieldCheck, Eye, Pencil, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UserRow {
  user_id: string;
  role: AppRole;
  email: string;
  full_name: string | null;
}

const roleBadgeVariant: Record<AppRole, "default" | "secondary" | "outline"> = {
  admin: "default",
  editor: "secondary",
  viewer: "outline",
};

const ROLE_TABS: { value: AppRole; label: string; icon: React.ElementType; description: string }[] = [
  { value: "admin",  label: "Admin",  icon: ShieldCheck, description: "Administradores sempre veem todos os itens." },
  { value: "editor", label: "Editor", icon: Pencil,      description: "Configuração de visibilidade para editores." },
  { value: "viewer", label: "Viewer", icon: Eye,         description: "Configuração de visibilidade para visualizadores." },
];

export default function Profile() {
  const { user, profile, role } = useAuth();
  const { config, saveConfig } = useMenuVisibility();
  const { toast } = useToast();

  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Deep copy of menu config for editing — avoids shared array references
  const deepCopy = (c: MenuVisibilityConfig): MenuVisibilityConfig => ({
    admin:  [...c.admin],
    editor: [...c.editor],
    viewer: [...c.viewer],
  });
  const [localConfig, setLocalConfig] = useState<MenuVisibilityConfig>(() => deepCopy(config));
  const [savingMenu, setSavingMenu] = useState(false);

  // Sync localConfig whenever the persisted context config changes (e.g. after save or reload)
  useEffect(() => {
    setLocalConfig(deepCopy(config));
  }, [config]);

  // ── User role assignment ──
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      if (!roles) return;

      const userIds = roles.map((r) => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);
      const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);

      const { data: usersData } = await supabase.functions.invoke("admin-list-users");
      const emailMap = new Map<string, string>();
      if (usersData?.users) {
        for (const u of usersData.users) emailMap.set(u.id, u.email);
      }

      setUsers(
        roles.map((r) => ({
          user_id: r.user_id,
          role: r.role as AppRole,
          email: emailMap.get(r.user_id) ?? "—",
          full_name: profileMap.get(r.user_id)?.full_name ?? null,
        }))
      );
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    if (role === "admin") fetchUsers();
  }, [role, fetchUsers]);

  const handleRoleChange = async (userId: string, newRole: AppRole) => {
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
      setUsers((prev) => prev.map((u) => (u.user_id === userId ? { ...u, role: newRole } : u)));
    }
  };

  const initials = (fullName || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    const fileExt = file.name.split(".").pop();
    const filePath = `${user.id}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast({ title: "Erro ao enviar imagem", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    setAvatarUrl("");
    await supabase.from("profiles").update({ avatar_url: filePath }).eq("id", user.id);

    const { data: signedData } = await supabase.storage
      .from("avatars")
      .createSignedUrl(filePath, 3600);
    setAvatarUrl(signedData?.signedUrl ?? "");
    toast({ title: "Foto atualizada" });
    setUploading(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim() })
      .eq("id", user.id);

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Perfil atualizado com sucesso" });
    }
    setSaving(false);
  };

  const toggleItem = (roleKey: AppRole, path: string, visible: boolean) => {
    setLocalConfig((prev) => ({
      ...prev,
      [roleKey]: visible
        ? prev[roleKey].filter((r) => r !== path)
        : [...prev[roleKey], path],
    }));
  };

  const handleSaveMenu = () => {
    setSavingMenu(true);
    saveConfig(localConfig);
    toast({ title: "Configurações de menu salvas" });
    setSavingMenu(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* ── Profile Card ── */}
      <Card>
        <CardHeader>
          <CardTitle>Meu Perfil</CardTitle>
          <CardDescription>Atualize suas informações pessoais.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative group">
              <Avatar className="w-24 h-24">
                <AvatarImage src={avatarUrl || undefined} />
                <AvatarFallback className="text-2xl bg-accent text-accent-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <button
                className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                ) : (
                  <Camera className="w-6 h-6 text-white" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>
            <p className="text-xs text-muted-foreground">Clique na foto para alterar</p>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="full-name">Nome completo</Label>
            <Input
              id="full-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Seu nome"
            />
          </div>

          {/* Email (read-only) */}
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user?.email ?? ""} disabled className="bg-muted" />
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Salvar Alterações
          </Button>
        </CardContent>
      </Card>

      {/* ── User Role Assignment Card (admin only) ── */}
      {role === "admin" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Atribuição de Perfis
            </CardTitle>
            <CardDescription>
              Defina qual perfil (Admin, Editor ou Viewer) cada usuário possui no sistema.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingUsers ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Perfil atual</TableHead>
                    <TableHead className="w-[160px]">Alterar perfil</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.user_id}>
                      <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                      <TableCell>
                        <Badge variant={roleBadgeVariant[u.role]}>
                          {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={u.role}
                          onValueChange={(v) => handleRoleChange(u.user_id, v as AppRole)}
                        >
                          <SelectTrigger className="h-8 text-xs">
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
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Menu Visibility Card (admin only) ── */}
      {role === "admin" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5" />
              Visibilidade do Menu por Perfil
            </CardTitle>
            <CardDescription>
              Escolha quais itens do menu cada perfil de usuário poderá visualizar.
              Administradores sempre têm acesso total.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="editor">
              <TabsList className="mb-5 h-9">
                {ROLE_TABS.map(({ value, label, icon: Icon }) => (
                  <TabsTrigger key={value} value={value} className="gap-1.5 text-xs px-3">
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>

              {ROLE_TABS.map(({ value: roleKey, description }) => (
                <TabsContent key={roleKey} value={roleKey} className="space-y-5 mt-0">
                  <p className="text-xs text-muted-foreground">{description}</p>

                  <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                      {MENU_SECTIONS.map((section) => (
                        <div key={section.label} className="space-y-2">
                          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                            {section.label}
                          </p>
                          <div className="space-y-1.5">
                            {section.items.map((item) => {
                              const isVisible = !localConfig[roleKey].includes(item.path);
                              return (
                                <div key={item.path} className="flex items-center gap-2">
                                  <Checkbox
                                    id={`${roleKey}-${item.path}`}
                                    checked={isVisible}
                                    onCheckedChange={(checked) =>
                                      toggleItem(roleKey, item.path, !!checked)
                                    }
                                  />
                                  <label
                                    htmlFor={`${roleKey}-${item.path}`}
                                    className="text-sm cursor-pointer select-none"
                                  >
                                    {item.label}
                                  </label>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                </TabsContent>
              ))}
            </Tabs>

            <Button
              onClick={handleSaveMenu}
              disabled={savingMenu}
              className="w-full mt-2"
              variant="outline"
            >
              {savingMenu ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salvar Configurações de Menu
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
