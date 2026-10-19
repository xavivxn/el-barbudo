import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/LoginForm";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export const metadata: Metadata = {
  title: "Acceso",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="flex w-full max-w-sm flex-col gap-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <Logo variant="full" />
          <h1 className="text-xl font-semibold">Acceso al panel</h1>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
