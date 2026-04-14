import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  useMenuVisibility,
  MENU_SECTIONS,
  type AppRole,
  type MenuVisibilityConfig,
} from "@/contexts/MenuVisibilityContext";

const ROLES: AppRole[] = ["admin", "editor", "viewer"];

export function MenuVisibilityCard() {
  const { config, saveConfig } = useMenuVisibility();
  const { toast } = useToast();
  const [draft, setDraft] = useState<MenuVisibilityConfig>({ ...config });
  const [saving, setSaving] = useState(false);

  const toggle = (role: AppRole, path: string) => {
    setDraft((prev) => {
      const hidden = prev[role];
      const next = hidden.includes(path)
        ? hidden.filter((p) => p !== path)
        : [...hidden, path];
      return { ...prev, [role]: next };
    });
  };

  const handleSave = () => {
    setSaving(true);
    saveConfig(draft);
    toast({ title: "Visibilidade do menu salva" });
    setTimeout(() => setSaving(false), 400);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Visibilidade do Menu</CardTitle>
        <CardDescription>
          Configure quais itens do menu cada cargo pode visualizar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="admin">
          <TabsList className="mb-4">
            {ROLES.map((r) => (
              <TabsTrigger key={r} value={r} className="capitalize">
                {r}
              </TabsTrigger>
            ))}
          </TabsList>

          {ROLES.map((role) => (
            <TabsContent key={role} value={role} className="space-y-4">
              {MENU_SECTIONS.map((section) => (
                <div key={section.label}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    {section.label}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {section.items.map((item) => {
                      const visible = !draft[role].includes(item.path);
                      return (
                        <label
                          key={item.path}
                          className="flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer hover:bg-accent/40 transition-colors"
                        >
                          <Checkbox
                            checked={visible}
                            onCheckedChange={() => toggle(role, item.path)}
                          />
                          <span className="text-sm">{item.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </TabsContent>
          ))}
        </Tabs>

        <Button onClick={handleSave} disabled={saving} className="mt-4 w-full">
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Salvar Visibilidade
        </Button>
      </CardContent>
    </Card>
  );
}
