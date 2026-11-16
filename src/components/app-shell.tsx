"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { CheckSquare, FilePlus2, LayoutDashboard, Menu, Receipt, UserRound, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ROLE_LABEL, type Role } from "@/lib/data";
import { useUser } from "@/lib/user-context";
import { useStore } from "@/lib/store";
import { RoastStrip } from "@/components/roast-strip";

const NAV: { href: string; label: string; icon: typeof Receipt; roles: Role[]; superOnly?: boolean }[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "hod", "salesman"] },
  { href: "/claims/new", label: "New Claim", icon: FilePlus2, roles: ["admin", "hod", "salesman"] },
  { href: "/claims", label: "Claims", icon: Receipt, roles: ["admin", "hod", "salesman"] },
  { href: "/approvals", label: "Approvals", icon: CheckSquare, roles: ["hod"] },
  { href: "/salespeople", label: "Sales Person", icon: UserRound, roles: ["admin"] },
  { href: "/users", label: "Staff Accounts", icon: Users, roles: ["admin"], superOnly: true },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const { error } = useStore();
  const path = usePathname();
  const router = useRouter();
  // salespeople only get Dashboard, New Claim and Claims (their own claims); send them back from any other page
  const blocked = user.role === "salesman" && !(path === "/dashboard" || path === "/claims" || path.startsWith("/claims/") || path === "/account");
  useEffect(() => {
    if (blocked) router.replace("/dashboard");
  }, [blocked, router]);
  const [open, setOpen] = useState(false);
  const items = NAV.filter(
    (n) =>
      (n.roles.includes(user.role) || (n.href === "/approvals" && user.isSuper)) &&
      (!n.superOnly || user.isSuper) &&
      (n.href !== "/claims/new" || user.canEdit)
  );
  const active = (href: string) =>
    href === "/claims"
      ? path === "/claims" || (path.startsWith("/claims/") && !path.startsWith("/claims/new"))
      : path === href || path.startsWith(href + "/");

  const nav = (
    <nav className="flex flex-col gap-1">
      {items.map((n) => (
        <Link
          key={n.href}
          href={n.href}
          onClick={() => setOpen(false)}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            active(n.href) ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100"
          )}
        >
          <n.icon className="size-4" /> {n.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col gap-6 border-r bg-white p-4 lg:flex">
        <Brand />
        {nav}
        <div className="mt-auto">
          <UserChip />
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-white px-4 py-3 lg:hidden">
        <Brand small />
        <button aria-label="Menu" onClick={() => setOpen(true)} className="rounded-md p-2 hover:bg-gray-100">
          <Menu className="size-5" />
        </button>
      </header>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col gap-6 bg-white p-4">
            <div className="flex items-center justify-between">
              <Brand />
              <button aria-label="Close" onClick={() => setOpen(false)}>
                <X className="size-5" />
              </button>
            </div>
            {nav}
            <div className="mt-auto">
              <UserChip />
            </div>
          </div>
        </div>
      )}

      <main className="px-4 pb-24 pt-5 sm:px-6 lg:ml-60 lg:px-6 lg:pb-10 lg:pt-8">
        <div className="mx-auto max-w-[1500px]">
          {error && <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">Could not load data: {error}</div>}
          {blocked ? null : children}
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t bg-white lg:hidden">
        {items.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={cn("flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px]", active(n.href) ? "font-semibold text-primary" : "text-gray-500")}
          >
            <n.icon className="size-5" />
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

function Brand({ small }: { small?: boolean }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-roast-dark font-heading text-sm font-bold text-white">AC</div>
        <div className="leading-tight">
          <div className="font-heading text-sm font-semibold text-gray-900">Aik Cheong Coffee Roaster Sdn Bhd</div>
          {!small && <div className="text-xs text-gray-500">Salesman Expense Claims</div>}
        </div>
      </div>
      {!small && <RoastStrip />}
    </div>
  );
}

function UserChip() {
  const { user, signOut } = useUser();
  return (
    <div className="border-t pt-3">
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-primary">
          {user.role === "admin" ? "AD" : user.role === "salesman" ? "SP" : "HD"}
        </div>
        <div className="min-w-0 text-sm leading-tight">
          <div className="truncate font-medium text-gray-900">{user.name}</div>
          <div className="text-xs text-gray-500">{user.isSuper ? "Super Admin" : ROLE_LABEL[user.role]}</div>
        </div>
      </div>
      <div className="mt-2 flex gap-3 text-xs text-gray-500">
        <Link href="/account" className="underline hover:text-primary">Change password</Link>
        <button onClick={() => void signOut()} className="underline hover:text-primary">Sign out</button>
      </div>
    </div>
  );
}
