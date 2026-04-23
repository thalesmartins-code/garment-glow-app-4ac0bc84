import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useOrganization, type Organization } from "@/contexts/OrganizationContext";

export function OrgGeneralTab({ org, canEdit }: { org: Organization; canEdit: boolean }) {
  const { refreshOrgs } = useOrganization();
  const { toast } = useToast();
  const [name, setName] = useState(org.name);
  const [slug, setSlug] = useState(org.slug);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("organizations")
      .update({ name: name.trim(), slug: slug.trim() })
      .eq("id", org.id);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Organização atualizada" });
      await refreshOrgs();
    }
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">Dados da organização</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 max-w-lg">
        <div className="space-y-2">
          <Label htmlFor="org-name">Nome</Label>
          <Input id="org-name" value={name} onChange={(e) => setName(e.target.value)} disabled={!canEdit} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="org-slug">Slug</Label>
          <Input id="org-slug" value={slug} onChange={(e) => setSlug(e.target.value)} disabled={!canEdit} />
          <p className="text-xs text-muted-foreground">Identificador único usado em URLs e referências internas.</p>
        </div>
        {canEdit && (
          <Button onClick={handleSave} disabled={saving || !name.trim() || !slug.trim()}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar alterações
          </Button>
        )}
        {!canEdit && (
          <p className="text-xs text-muted-foreground">Apenas o Owner pode editar dados da organização.</p>
        )}
      </CardContent>
    </Card>
  );
}