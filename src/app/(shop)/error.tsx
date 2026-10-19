"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { whatsappUrl } from "@/lib/whatsapp";

/**
 * Error inesperado en la tienda (por ejemplo, la base no responde). Va dentro del marco de la tienda
 * y deja WhatsApp a mano: aunque el catálogo no cargue, el cliente puede hacer su pedido.
 */
export default function ShopError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="mx-auto max-w-3xl px-6 py-24 md:py-36">
      <h1 className="font-serif text-4xl font-semibold leading-tight md:text-6xl">No pudimos cargar la tienda</h1>
      <p className="mt-6 max-w-prose text-lg text-muted">
        Probá de nuevo en un momento. Mientras tanto, podés hacer tu pedido por WhatsApp.
      </p>
      <div className="mt-10 flex flex-wrap gap-3">
        {/* retry vuelve a pedir los datos al servidor; reset solo volvería a dibujar lo mismo. */}
        <Button onClick={() => retry()}>Reintentar</Button>
        <Button variant="secondary" href={whatsappUrl("Hola El Barbudo")} target="_blank" rel="noopener noreferrer">
          <WhatsAppIcon />
          Escribinos por WhatsApp
        </Button>
      </div>
    </section>
  );
}
