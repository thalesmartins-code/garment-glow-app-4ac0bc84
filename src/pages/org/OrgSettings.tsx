import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOrganization } from "@/contexts/OrganizationContext";
import { OrgGeneralTab } from "@/components/org/OrgGeneralTab";
import { OrgMembersTab } from "@/components/org/OrgMembersTab";
import { OrgInvitesTab } from "@/components/org/OrgInvitesTab";
import { OrgAuditTab } from "@/components/org/OrgAuditTab";
import { Building2 } from "lucide-react";

export default function OrgSettings() {
  const { currentOrg, orgRole } = useOrganization();
  const [tab, setTab] = useState("geral");

  if (!currentOrg) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Nenhuma organização selecionada.</div>
    );
  }

  const isOwner = orgRole === "owner";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="sticky top-0 z-10 bg-card border-b border-border px-6 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">{currentOrg.name}</h1>
            <p className="text-xs text-muted-foreground">Gerencie sua organização, membros e convites</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="geral">Geral</TabsTrigger>
            <TabsTrigger value="membros">Membros</TabsTrigger>
            <TabsTrigger value="convites">Convites</TabsTrigger>
            <TabsTrigger value="audit">Audit log</TabsTrigger>
          </TabsList>

          <TabsContent value="geral">
            <OrgGeneralTab org={currentOrg} canEdit={isOwner} />
          </TabsContent>
          <TabsContent value="membros">
            <OrgMembersTab orgId={currentOrg.id} myRole={orgRole!} />
          </TabsContent>
          <TabsContent value="convites">
            <OrgInvitesTab orgId={currentOrg.id} />
          </TabsContent>
          <TabsContent value="audit">
            <OrgAuditTab orgId={currentOrg.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}