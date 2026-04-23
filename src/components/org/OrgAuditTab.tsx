import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface AuditEntry {
  id: string;
  action: string;
  actor_id: string;
  target_user_id: string | null;
  details: any;
  created_at: string | null;
}

export function OrgAuditTab({ orgId }: { orgId: string }) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("audit_log")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(100);
      setEntries((data as AuditEntry[]) ?? []);
      setLoading(false);
    })();
  }, [orgId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">Atividade recente</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma atividade registrada.</p>
        ) : (
          <div className="space-y-1">
            {entries.map((e) => (
              <div key={e.id} className="flex items-start gap-3 py-2 border-b border-border/40 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{e.action}</p>
                  {e.details && (
                    <p className="text-xs text-muted-foreground truncate">
                      {JSON.stringify(e.details)}
                    </p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {e.created_at ? new Date(e.created_at).toLocaleString("pt-BR") : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}