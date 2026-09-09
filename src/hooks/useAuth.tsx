import { createContext, useContext, useEffect, useState, useRef, useCallback, useMemo, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

/**
 * Profile is sourced directly from the generated database types so that any
 * schema change surfaces as a compile error instead of an `as any` cast.
 */
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];


interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role?: "landlord" | "tenant",
    dateOfBirth?: string,
  ) => Promise<{ error: Error | null; needsEmailConfirmation: boolean }>;
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

  // Identity of the user whose profile/roles are currently loaded, plus the
  // in-flight request for it. Together these de-duplicate the concurrent
  // getSession() + onAuthStateChange bootstrap and skip refetching on token
  // refresh / tab focus events, which re-emit the same user.
  const loadedUserIdRef = useRef<string | null>(null);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const mountedRef = useRef(true);

  const loadIdentity = useCallback(async (userId: string, force = false) => {
    if (!force && loadedUserIdRef.current === userId) return;
    if (!force && inFlightRef.current) return inFlightRef.current;

    const request = (async () => {
      const [profileResult, rolesResult] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId),
      ]);
      if (!mountedRef.current) return;
      loadedUserIdRef.current = userId;
      setProfile((profileResult.data as Profile | null) ?? null);
      setRoles((rolesResult.data ?? []).map((r) => r.role as AppRole));
    })();

    inFlightRef.current = request;
    try {
      await request;
    } finally {
      if (inFlightRef.current === request) inFlightRef.current = null;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        // Never await Supabase calls inside the callback itself (deadlock);
        // run them as a detached promise instead of a setTimeout hack.
        void loadIdentity(newSession.user.id).finally(() => {
          if (mountedRef.current) setLoading(false);
        });
      } else {
        loadedUserIdRef.current = null;
        setProfile(null);
        setRoles([]);
        setLoading(false);
      }
    });

    // THEN check initial session
    void supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      if (!mountedRef.current) return;
      setSession(initialSession);
      setUser(initialSession?.user ?? null);

      if (initialSession?.user) {
        await loadIdentity(initialSession.user.id);
      }
      if (mountedRef.current) setLoading(false);
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [loadIdentity]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? new Error(error.message) : null };
  }, []);

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      fullName: string,
      role?: "landlord" | "tenant",
      dateOfBirth?: string,
    ) => {
      const metadata: Record<string, string> = { full_name: fullName };
      if (role) metadata.role = role;
      if (dateOfBirth) metadata.date_of_birth = dateOfBirth;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: metadata,
        },
      });

      if (error) return { error: new Error(error.message), needsEmailConfirmation: false };
      return { error: null, needsEmailConfirmation: !data.session };
    },
    []
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    loadedUserIdRef.current = null;
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
  }, []);

  const hasRole = useCallback((role: AppRole) => roles.includes(role), [roles]);

  const refreshRoles = useCallback(async () => {
    if (!user?.id) return;
    await loadIdentity(user.id, true);
  }, [user?.id, loadIdentity]);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      session,
      profile,
      roles,
      loading,
      signIn,
      signUp,
      signOut,
      hasRole,
      refreshRoles,
      isAdmin: roles.includes("admin"),
      isConsultant: roles.includes("consultant"),
      isLandlord: roles.includes("landlord"),
      isTenant: roles.includes("tenant"),
      isMaintenance: roles.includes("maintenance"),
      isVendor: roles.includes("vendor"),
    }),
    [user, session, profile, roles, loading, signIn, signUp, signOut, hasRole, refreshRoles]
  );


  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
