import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminNav } from "@/components/admin/AdminNav";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { robots: { index: false, follow: false } };

// Depende de la cookie de sesión: nunca se genera de forma estática.
export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: ReactNode }) {
  await requireAdmin();
  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </>
  );
}
