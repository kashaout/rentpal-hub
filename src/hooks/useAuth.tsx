import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "admin" | "consultant" | "landlord" | "tenant" | "maintenance" | "vendor";

interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string, role?: "landlord" | "tenant") => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  /** Re-fetch the current user's profile + roles from the server. Use after onboarding/role changes. */
  refreshRoles: () => Promise<void>;
  /**
   * UI-ONLY FLAG: For conditional rendering of admin UI elements.
   * DO NOT use for authorization decisions - all data access is protected by RLS policies.
   * @security This flag is derived from server-validated roles but should never be trusted
   * for sensitive operations without server-side verification.
   */
  isAdmin: boolean;
  /**
   * UI-ONLY FLAG: For conditional rendering of consultant UI elements.
   * DO NOT use for authorization decisions - all data access is protected by RLS policies.
   */
  isConsultant: boolean;
  /**
   * UI-ONLY FLAG: For conditional rendering of landlord UI elements.
   * DO NOT use for authorization decisions - all data access is protected by RLS policies.
   */
  isLandlord: boolean;
  /**
   * UI-ONLY FLAG: For conditional rendering of tenant UI elements.
   * DO NOT use for authorization decisions - all data access is protected by RLS policies.
   */
  isTenant: boolean;
  /**
   * UI-ONLY FLAG: For conditional rendering of maintenance UI elements.
   * DO NOT use for authorization decisions - all data access is protected by RLS policies.
   */
  isMaintenance: boolean;
  /**
   * UI-ONLY FLAG: For conditional rendering of vendor UI elements.
   * DO NOT use for authorization decisions - all data access is protected by RLS policies.
   */
  isVendor: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    return data as Profile | null;
  };

  const fetchRoles = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    return (data?.map((r) => r.role as AppRole) || []);
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          // Defer profile/role fetch to avoid deadlock
          setTimeout(async () => {
            const [profileData, rolesData] = await Promise.all([
              fetchProfile(newSession.user.id),
              fetchRoles(newSession.user.id),
            ]);
            setProfile(profileData);
            setRoles(rolesData);
            setLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
          setLoading(false);
        }
      }
    );

    // THEN check initial session
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user ?? null);

      if (initialSession?.user) {
        const [profileData, rolesData] = await Promise.all([
          fetchProfile(initialSession.user.id),
          fetchRoles(initialSession.user.id),
        ]);
        setProfile(profileData);
        setRoles(rolesData);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? new Error(error.message) : null };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName },
      },
    });

    if (error) return { error: new Error(error.message) };

    // No role assignment at signup — roles are assigned after verification
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
  };

  const hasRole = (role: AppRole) => roles.includes(role);

  const value: AuthContextType = {
    user,
    session,
    profile,
    roles,
    loading,
    signIn,
    signUp,
    signOut,
    hasRole,
    isAdmin: hasRole("admin"),
    isConsultant: hasRole("consultant"),
    isLandlord: hasRole("landlord"),
    isTenant: hasRole("tenant"),
    isMaintenance: hasRole("maintenance"),
    isVendor: hasRole("vendor"),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
