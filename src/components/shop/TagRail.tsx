"use client";

import { type ReactNode, useEffect, useRef } from "react";

/**
 * Riel de etiquetas de la barra de filtros (desktop): una sola línea desplazable con el borde
 * derecho fundido, que avisa que sigue. Los chips siguen alcanzables con Tab: al enfocar uno que
 * asoma a medias se lo trae a la vista (el navegador no lo hace solo).
 */
export function TagRail({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLUListElement>(null);

  // La etiqueta activa puede quedar fuera del riel: al montar se la trae a la vista (sin animar).
  useEffect(() => {
    const rail = ref.current;
    const active = rail?.querySelector<HTMLElement>("[aria-current]");
    if (!rail || !active) return;
    rail.scrollLeft = Math.max(0, active.offsetLeft - rail.offsetLeft - 8);
  }, []);

  return (
    <ul
      ref={ref}
      className="flex gap-2 overflow-x-auto py-1 pr-10 [scrollbar-width:none] [mask-image:linear-gradient(to_right,#000_calc(100%-2.5rem),transparent)] [&::-webkit-scrollbar]:hidden"
      onFocus={(event) => event.target.scrollIntoView({ inline: "nearest", block: "nearest" })}
    >
      {children}
    </ul>
  );
}
