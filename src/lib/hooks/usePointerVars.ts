import { useCallback, type PointerEvent } from "react";

/**
 * Escribe la posición del mouse como variables CSS (`--mx`/`--my`, en px relativos al elemento) para
 * efectos de luz que siguen al cursor (tarjetas, footer). Sin estado: no re-renderiza, solo toca
 * `style`. Solo cuenta el mouse: touch y lápiz no mueven la luz.
 */
export function usePointerVars<T extends HTMLElement = HTMLElement>() {
  const onPointerMove = useCallback((event: PointerEvent<T>) => {
    if (event.pointerType !== "mouse") return;
    const el = event.currentTarget;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${event.clientX - rect.left}px`);
    el.style.setProperty("--my", `${event.clientY - rect.top}px`);
  }, []);

  return { onPointerMove };
}
