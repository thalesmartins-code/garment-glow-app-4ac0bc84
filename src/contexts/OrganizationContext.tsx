import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type OrgRole = "owner" | "admin" | "member" | "viewer";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  role: OrgRole;
}

interface OrganizationContextType {
  orgs: Organization[];
  currentOrg: Organization | null;
  orgRole: OrgRole | null;
  loading: boolean;
  switchOrg: (id: string) => void;
  refreshOrgs: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);
const STORAGE_KEY = "currentOrgId";

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  const loadOrgs = useCallback(async (uid: string) => {
    setLoading(true);
    const { data: members } = await supabase
      .from("organization_members")
      .select("role, organization_id, organizations(id, name, slug, owner_id)")
      .eq("user_id", uid);

    const list: Organization[] = (members ?? [])
      .filter((m: any) => m.organizations)
      .map((m: any) => ({
        id: m.organizations.id,
        name: m.organizations.name,
        slug: m.organizations.slug,
        owner_id: m.organizations.owner_id,
        role: m.role as OrgRole,
      }));

    setOrgs(list);

    const stored = localStorage.getItem(STORAGE_KEY);
    const found = list.find((o) => o.id === stored) ?? list[0] ?? null;
    setCurrentOrg(found);
    if (found) localStorage.setItem(STORAGE_KEY, found.id);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) {
      loadOrgs(user.id);
    } else {
      setOrgs([]);
      setCurrentOrg(null);
      setLoading(false);
    }
  }, [user, loadOrgs]);

  const switchOrg = useCallback((id: string) => {
    const found = orgs.find((o) => o.id === id);
    if (found) {
      setCurrentOrg(found);
      localStorage.setItem(STORAGE_KEY, id);
    }
  }, [orgs]);

  const refreshOrgs = useCallback(async () => {
    if (user) await loadOrgs(user.id);
  }, [user, loadOrgs]);

  return (
    <OrganizationContext.Provider
      value={{
        orgs,
        currentOrg,
        orgRole: currentOrg?.role ?? null,
        loading,
        switchOrg,
        refreshOrgs,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const ctx = useContext(OrganizationContext);
  if (!ctx) throw new Error("useOrganization must be used within OrganizationProvider");
  return ctx;
}