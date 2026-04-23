import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "admin" | "editor" | "viewer";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: AppRole | null;
  profile: { full_name: string | null; avatar_url: string | null } | null;
  signIn: (email: string, password: string, options?: { allowWithoutOrganization?: boolean }) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<AppRole | null>(null);
  const [profile, setProfile] = useState<{ full_name: string | null; avatar_url: string | null } | null>(null);

  const fetchUserData = async (userId: string) => {
    // Fetch role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();
    setRole((roleData?.role as AppRole) ?? "viewer");

    // Fetch profile
    const { data: profileData } = await supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", userId)
      .maybeSingle();

    // If avatar_url is a storage path (not a full URL), generate a signed URL
    let resolvedProfile = profileData ? { ...profileData } : null;
    if (resolvedProfile?.avatar_url && !resolvedProfile.avatar_url.startsWith("http")) {
      const { data: signedData } = await supabase.storage
        .from("avatars")
        .createSignedUrl(resolvedProfile.avatar_url, 3600);
      resolvedProfile.avatar_url = signedData?.signedUrl ?? null;
    }
    setProfile(resolvedProfile ?? null);
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          // Use setTimeout to avoid Supabase deadlock
          setTimeout(() => fetchUserData(session.user.id), 0);
        } else {
          setRole(null);
          setProfile(null);
        }
        setLoading(false);
      }
    );

    // THEN check existing session
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      // If the stored session is invalid (e.g. user was removed), purge it
      // so the app doesn't get stuck waiting for data that never arrives.
      if (error || (session && !session.user)) {
        await supabase.auth.signOut().catch(() => {});
        setSession(null);
        setUser(null);
        setRole(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      if (session?.user) {
        // Validate the session is still acceptable to the server.
        const { error: userErr } = await supabase.auth.getUser();
        if (userErr) {
          await supabase.auth.signOut().catch(() => {});
          setSession(null);
          setUser(null);
          setRole(null);
          setProfile(null);
          setLoading(false);
          return;
        }
        setSession(session);
        setUser(session.user);
        fetchUserData(session.user.id);
      } else {
        setSession(null);
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string, options?: { allowWithoutOrganization?: boolean }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return { error: error as Error | null };
    }

    if (!options?.allowWithoutOrganization && data.user) {
      const { data: memberships, error: membershipError } = await supabase
        .from("organization_members")
        .select("id")
        .eq("user_id", data.user.id)
        .limit(1);

      if (membershipError || !memberships?.length) {
        await supabase.auth.signOut().catch(() => {});
        return {
          error: new Error(
            membershipError?.message ?? "Seu acesso foi removido. Entre em contato com um administrador."
          ),
        };
      }
    }

    return { error: error as Error | null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchUserData(user.id);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, session, loading, role, profile, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
