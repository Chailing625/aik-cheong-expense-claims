"use client";
import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/app-shell";
import { StoreProvider } from "@/lib/store";
import { useAuth } from "@/lib/user-context";
import { ChangePasswordForm } from "@/components/change-password";

function Centered({ children }: { children: ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6 text-center text-gray-600">{children}</div>;
}

/** Shows the sign-in page, a "waiting for access" notice, or the app, depending on who is signed in. */
export function AuthGate({ children }: { children: ReactNode }) {
  const { loading, session, user, username, mustChangePassword, signOut } = useAuth();
  const path = usePathname();
  const router = useRouter();
  const onLogin = path === "/login";

  useEffect(() => {
    if (!loading && !session && !onLogin) router.replace("/login");
  }, [loading, session, onLogin, router]);

  if (onLogin) return <>{children}</>;
  if (loading || !session) return <Centered>Loading…</Centered>;
  if (!user)
    return (
      <Centered>
        <div className="max-w-sm space-y-3">
          <h1 className="text-xl font-bold text-gray-900">No access</h1>
          <p className="text-sm">
            You are signed in as <b>{username}</b>, but this account is switched off or has no role. Please contact the Super Admin.
          </p>
          <Button variant="outline" onClick={() => void signOut()}>Sign out</Button>
        </div>
      </Centered>
    );
  if (mustChangePassword)
    return (
      <Centered>
        <div className="w-full max-w-sm space-y-4 rounded-2xl border bg-white p-6 text-left shadow-sm">
          <h1 className="text-xl font-bold text-gray-900">Choose your own password</h1>
          <p className="text-sm text-gray-600">This is your first sign-in (or your password was reset). Please choose a new password to continue.</p>
          <ChangePasswordForm onDone={() => window.location.assign("/dashboard")} />
          <button className="w-full text-sm text-gray-500 underline" onClick={() => void signOut()}>Sign out</button>
        </div>
      </Centered>
    );
  return (
    <StoreProvider>
      <AppShell>{children}</AppShell>
    </StoreProvider>
  );
}
