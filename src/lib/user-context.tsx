"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { Role, User } from "./data";

interface Auth {
  loading: boolean;
  session: Session | null;
  /** signed in and given a role by the admin; null otherwise */
  user: User | null;
  email: string;
  mustChangePassword: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<Auth>({ loading: true, session: null, user: null, email: "", mustChangePassword: false, signOut: async () => {} });

export function UserProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [isSuper, setIsSuper] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- sync React state with the Supabase session */
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (!s) {
        setRole(null);
        setIsSuper(false);
        setLoading(false);
      }
    });
    /* eslint-enable react-hooks/set-state-in-effect */
    return () => sub.subscription.unsubscribe();
  }, []);

  const uid = session?.user.id;
  useEffect(() => {
    if (!uid) return;
    let alive = true;
    supabase
      .from("profiles")
      .select("role, full_name, email, active")
      .eq("id", uid)
      .maybeSingle()
      .then(({ data }) => {
        if (!alive) return;
        const r = data?.active === false ? null : data?.role;
        setRole(r === "superadmin" ? "admin" : ((r as Role | null | undefined) ?? null));
        setIsSuper(r === "superadmin");
        setName(data?.full_name || data?.email?.split("@")[0] || "User");
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [uid]);

  const user: User | null = session && role ? { id: session.user.id, name, role, isSuper } : null;
  return (
    <Ctx.Provider value={{ loading, session, user, email: session?.user.email ?? "", mustChangePassword: session?.user.user_metadata?.must_change_password === true, signOut: async () => void (await supabase.auth.signOut()) }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);

/** For pages shown only after sign-in: the signed-in user always exists there. */
export function useUser() {
  const { user, signOut } = useContext(Ctx);
  return { user: user as User, signOut };
}
