import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, Trash2, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import type { OrgRole } from "@/contexts/OrganizationContext";

interface Member {
  id: string;
  user_id: string;
  role: OrgRole;
  joined_at: string;
  full_name: string | null;
  email: string | null;
}

const ROLE_OPTIONS: OrgRole[] = ["admin", "member", "viewer"];

export function OrgMembersTab({ orgId, myRole }: { orgId: string; myRole: OrgRole }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const canManage = myRole === "owner" || myRole === "admin";
  const isOwner = myRole === "owner";

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("organization_members")
      .select("id, user_id, role, joined_at, profiles:user_id(full_name)")
      .eq("organization_id", orgId);
    const list: Member[] = (data ?? []).map((m: any) => ({
      id: m.id,
      user_id: m.user_id,
      role: m.role,
      joined_at: m.joined_at,
      full_name: m.profiles?.full_name ?? null,
      email: null,
    }));
    setMembers(list);
    setLoading(false);
  };

  useEffect(() => { load(); }, [orgId]);

  const handleRoleChange = async (memberUserId: string, newRole: OrgRole) => {
    setBusyId(memberUserId);
    const { error } = await supabase.functions.invoke("org-member-update-role", {
      body: { organization_id: orgId, user_id: memberUserId, role: newRole },
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Cargo atualizado" });
      await load();
    }
    setBusyId(null);
  };

  const handleRemove = async (memberUserId: string) => {
    setBusyId(memberUserId);
    const { error } = await supabase.functions.invoke("org-member-remove", {
      body: { organization_id: orgId, user_id: memberUserId },
    });
    if (error) {
      toast({ title: "Erro ao remover", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Membro removido" });
      await load();
    }
    setBusyId(null);
  };

  const handleTransfer = async (memberUserId: string) => {
    setBusyId(memberUserId);
    const { error } = await supabase.functions.invoke("org-transfer-ownership", {
      body: { organization_id: orgId, new_owner_id: memberUserId },
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Propriedade transferida" });
      await load();
    }
    setBusyId(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">Membros ({members.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-2">
            {members.map((m) => {
              const isSelf = m.user_id === user?.id;
              const isMemberOwner = m.role === "owner";
              const initials = (m.full_name ?? "U").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
              return (
                <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {m.full_name ?? "Sem nome"} {isSelf && <span className="text-xs text-muted-foreground">(você)</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">Membro desde {new Date(m.joined_at).toLocaleDateString("pt-BR")}</p>
                  </div>

                  {isMemberOwner ? (
                    <span className="text-xs font-medium text-primary flex items-center gap-1">
                      <Crown className="w-3.5 h-3.5" /> Owner
                    </span>
                  ) : canManage && !isSelf ? (
                    <Select value={m.role} onValueChange={(v) => handleRoleChange(m.user_id, v as OrgRole)} disabled={busyId === m.user_id}>
                      <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-xs text-muted-foreground capitalize">{m.role}</span>
                  )}

                  {isOwner && !isSelf && !isMemberOwner && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
                          <Crown className="w-3.5 h-3.5 mr-1" /> Transferir
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Transferir propriedade?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Você deixará de ser Owner e passará a ser Admin. {m.full_name ?? "Este membro"} se tornará o novo Owner.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleTransfer(m.user_id)}>Transferir</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}

                  {canManage && !isSelf && !isMemberOwner && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover membro?</AlertDialogTitle>
                          <AlertDialogDescription>
                            {m.full_name ?? "Este membro"} perderá acesso à organização.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleRemove(m.user_id)} className="bg-destructive hover:bg-destructive/90">
                            Remover
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}