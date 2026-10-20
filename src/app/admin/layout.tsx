import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { DEMO_MODE } from "@/lib/demo";

// El admin nunca se indexa. Solo usa el layout raíz (tema, fuentes), sin cabecera ni pie de la tienda.
export const metadata: Metadata = {
  title: { default: "Admin — El Barbudo", template: "%s — Admin El Barbudo" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className="font-sans">{DEMO_MODE ? <DemoNotice /> : children}</div>;
}

/** En modo demo no hay base ni sesión: el panel entero (login incluido) se reemplaza por este aviso. */
function DemoNotice() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <div className="flex w-full max-w-sm flex-col items-center gap-4 text-center">
        <Logo variant="full" />
        <h1 className="mt-4 text-xl font-semibold">Panel deshabilitado en la demo</h1>
        <p className="text-muted">
          Esta es una tienda de demostración: el panel de administración está apagado.
        </p>
        <Button href="/" className="mt-2">
          Volver a la tienda
        </Button>
      </div>
    </main>
  );
}
