import { useSyncExternalStore } from "react";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener?.("change", onChange);
  return () => query.removeEventListener?.("change", onChange);
}

/** `true` si el sistema pide menos movimiento; sigue los cambios en vivo. En el servidor, `false`. */
export function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}
