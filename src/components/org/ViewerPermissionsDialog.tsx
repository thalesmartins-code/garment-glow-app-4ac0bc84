import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { VIEWER_ELIGIBLE_ROUTES } from "@/config/roleAccess";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  memberUserId: string;
  memberName: string;
}

export function ViewerPermissionsDialog({
  open,
  onOpenChange,
  organizationId,
  memberUserId,
  memberName,
}: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [granted, setGranted] = useState<Set<string>>(new Set());
  const [initial, setInitial] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("member_route_permissions")
        .select("route")
        .eq("organization_id", organizationId)
        .eq("user_id", memberUserId);
      if (cancelled) return;
      const set = new Set((data ?? []).map((r: any) => r.route));
      setGranted(set);
      setInitial(new Set(set));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, organizationId, memberUserId]);

  const toggle = (path: string, value: boolean) => {
    setGranted((prev) => {
      const next = new Set(prev);
      if (value) next.add(path);
      else next.delete(path);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    const toAdd: string[] = [];
    const toRemove: string[] = [];
    for (const r of granted) if (!initial.has(r)) toAdd.push(r);
    for (const r of initial) if (!granted.has(r)) toRemove.push(r);

    try {
      if (toRemove.length > 0) {
        const { error } = await supabase
          .from("member_route_permissions")
          .delete()
          .eq("organization_id", organizationId)
          .eq("user_id", memberUserId)
          .in("route", toRemove);
        if (error) throw error;
      }
      if (toAdd.length > 0) {
        const rows = toAdd.map((route) => ({
          organization_id: organizationId,
          user_id: memberUserId,
          route,
          created_by: user?.id ?? null,
        }));
        const { error } = await supabase.from("member_route_permissions").insert(rows);
        if (error) throw error;
      }

      // Audit log (best-effort)
      if (toAdd.length > 0 || toRemove.length > 0) {
        await supabase.rpc("insert_audit_log", {
          _actor_id: user!.id,
          _action: "viewer_permissions_changed",
          _target_user_id: memberUserId,
          _details: {
            organization_id: organizationId,
            granted: toAdd,
            revoked: toRemove,
          } as any,
        });
      }

      toast({ title: "Permissões atualizadas" });
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Erro ao salvar",
        description: err.message ?? "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const dirty =
    granted.size !== initial.size ||
    [...granted].some((r) => !initial.has(r));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Personalizar acesso</DialogTitle>
          <DialogDescription>
            Escolha quais páginas <span className="font-medium text-foreground">{memberName}</span>{" "}
            pode visualizar. Sem nenhuma marcada, ele só verá o próprio perfil.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-1 max-h-[60vh] overflow-y-auto py-2">
            {VIEWER_ELIGIBLE_ROUTES.map((r) => (
              <label
                key={r.path}
                className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 hover:bg-muted/60 cursor-pointer"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{r.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{r.path}</p>
                </div>
                <Switch
                  checked={granted.has(r.path)}
                  onCheckedChange={(v) => toggle(r.path, v)}
                />
              </label>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || loading || !dirty}>
            {saving && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}