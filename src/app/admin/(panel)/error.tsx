"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";

/**
 * Error inesperado dentro del panel (por ejemplo, la base no responde). Queda dentro del layout del
 * panel, así que la navegación del admin sigue a mano.
 */
export default function AdminError({ error, retry }: { error: unknown; retry: () => void }) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    console.error(error);
    headingRef.current?.focus();
  }, [error]);

  return (
    <section className="flex flex-col items-start gap-4 border border-line bg-surface p-6">
      <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold focus:outline-none">
        Algo salió mal
      </h1>
      <p className="max-w-prose text-muted">
        No pudimos cargar esta parte del panel. Lo que ya estaba guardado sigue intacto.
      </p>
      <div className="mt-2 flex flex-wrap gap-3">
        {/* retry vuelve a pedir los datos al servidor; reset solo volvería a dibujar lo mismo. */}
        <Button onClick={() => retry()}>Reintentar</Button>
        <Button href="/admin" variant="secondary">
          Volver al panel
        </Button>
      </div>
    </section>
  );
}
