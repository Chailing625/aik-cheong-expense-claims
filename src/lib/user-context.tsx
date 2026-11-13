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
  username: string;
  mustChangePassword: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<Auth>({ loading: true, session: null, user: null, username: "", mustChangePassword: false, signOut: async () => {} });

export function UserProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [isSuper, setIsSuper] = useState(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [perms, setPerms] = useState({ view: false, edit: false, del: false });
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
      .select("role, full_name, username, active, can_view, can_edit, can_delete")
      .eq("id", uid)
      .maybeSingle()
      .then(({ data }) => {
        if (!alive) return;
        const r = data?.active === false ? null : data?.role;
        setRole(r === "superadmin" ? "admin" : ((r as Role | null | undefined) ?? null));
        setIsSuper(r === "superadmin");
        const all = r === "superadmin";
        setPerms({ view: all || !!data?.can_view, edit: all || !!data?.can_edit, del: all || !!data?.can_delete });
        setUsername(data?.username ?? "");
        setName(data?.full_name || data?.username || "User");
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [uid]);

  const user: User | null = session && role ? { id: session.user.id, name, role, isSuper, canView: perms.view, canEdit: perms.edit, canDelete: perms.del } : null;
  return (
    <Ctx.Provider value={{ loading, session, user, username, mustChangePassword: session?.user.user_metadata?.must_change_password === true, signOut: async () => void (await supabase.auth.signOut()) }}>
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
