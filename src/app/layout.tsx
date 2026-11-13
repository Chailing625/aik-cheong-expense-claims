import { Suspense } from "react";
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { UserProvider } from "@/lib/user-context";
import { AuthGate } from "@/components/auth-gate";

const geist = Geist({ variable: "--font-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Aik Cheong Expense Claims",
  description: "Salesman expense claim system for Aik Cheong Coffee Roaster Sdn Bhd",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full bg-gray-50 font-sans text-gray-800">
        <UserProvider>
          <Suspense>
            <AuthGate>{children}</AuthGate>
          </Suspense>
        </UserProvider>
      </body>
    </html>
  );
}
