"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

/** Valor de `?guardado=` -> texto del aviso. `1` es el de productos. */
const MESSAGES: Record<string, string> = {
  "1": "Producto guardado",
  servicio: "Servicio guardado",
};

/**
 * Aviso "Producto guardado" tras `redirect("/admin?guardado=1")`, o "Servicio guardado" con
 * `?guardado=servicio`.
 *
 * Vive en el layout del panel para que la región `role="status"` ya exista cuando se navega desde
 * el formulario: un `status` que aparece junto con su texto no se anuncia. Cerrarlo es un enlace
 * que quita `guardado` y conserva el resto de la URL (por ejemplo el filtro de categoría).
 */
export function SavedNotice() {
  const pathname = usePathname();
  const params = useSearchParams();
  const flag = params.get("guardado");
  const message = flag !== null && Object.hasOwn(MESSAGES, flag) ? MESSAGES[flag] : null;

  const rest = new URLSearchParams(params.toString());
  rest.delete("guardado");
  const query = rest.toString();
  const closeHref = query ? `${pathname}?${query}` : pathname;

  return (
    // Pegajoso: con una lista larga el aviso sigue a la vista aunque el cambio se hizo más abajo.
    <div role="status" className="sticky top-2 z-10">
      {message ? (
        <div className="mb-6 flex items-center justify-between gap-3 border border-ok bg-surface py-1 pl-4 pr-1 text-ok">
          <p className="font-medium">{message}</p>
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
