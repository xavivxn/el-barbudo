"use client";

import type { ReactNode } from "react";

/**
 * Móvil: una sola línea con scroll horizontal (sin barra visible; los enlaces siguen alcanzables con Tab).
 * Escritorio: los chips se acomodan en varias líneas. El padding vertical deja sitio al anillo de foco,
 * que el overflow recortaría.
 */
const row =
  "-mx-4 flex gap-2 overflow-x-auto scroll-px-4 px-4 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:flex-wrap md:overflow-visible md:px-0";

export function ChipRow({ children }: { children: ReactNode }) {
  return (
    <ul
      className={row}
      // El navegador no desplaza un chip que ya se ve en parte: con Tab quedaba cortado en el borde.
      onFocus={(event) =>
        event.target.scrollIntoView({ inline: "nearest", block: "nearest" })
      }
    >
      {children}
    </ul>
  );
}
