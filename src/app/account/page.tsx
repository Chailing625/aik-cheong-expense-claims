"use client";
import { ChangePasswordForm } from "@/components/change-password";
import { useAuth } from "@/lib/user-context";

export default function AccountPage() {
  const { email } = useAuth();
  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-bold text-gray-900">My account</h1>
      <p className="mt-1 text-sm text-gray-500">Signed in as {email}</p>
      <section className="mt-6 rounded-xl border bg-white p-5">
        <h2 className="mb-3 font-semibold">Change password</h2>
        <ChangePasswordForm />
      </section>
    </div>
  );
}
