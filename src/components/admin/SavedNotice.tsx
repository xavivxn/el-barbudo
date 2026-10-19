"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Aviso "Producto guardado" tras `redirect("/admin?guardado=1")`.
 *
 * Vive en el layout del panel para que la región `role="status"` ya exista cuando se navega desde
 * el formulario: un `status` que aparece junto con su texto no se anuncia. Cerrarlo es un enlace
 * que quita `guardado` y conserva el resto de la URL (por ejemplo el filtro de categoría).
 */
export function SavedNotice() {
  const pathname = usePathname();
  const params = useSearchParams();
  const saved = params.get("guardado") === "1";

  const rest = new URLSearchParams(params.toString());
  rest.delete("guardado");
  const query = rest.toString();
  const closeHref = query ? `${pathname}?${query}` : pathname;

  return (
    <div role="status">
      {saved ? (
        <div className="mb-6 flex items-center justify-between gap-3 border border-ok bg-surface py-1 pl-4 pr-1 text-ok">
          <p className="font-medium">Producto guardado</p>
          <Link
            href={closeHref}
            replace
            aria-label="Cerrar aviso"
            className="inline-flex size-11 items-center justify-center rounded-lg hover:bg-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <X size={20} aria-hidden="true" />
          </Link>
        </div>
      ) : null}
    </div>
  );
}
