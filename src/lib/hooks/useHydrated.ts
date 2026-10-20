import { useSyncExternalStore } from "react";

const subscribeNothing = () => () => {};

/**
 * `false` en el HTML del servidor y durante la hidratación; `true` una vez que hay JS. Sirve para lo
 * que depende del cliente (localStorage, `inert`, animaciones que esconden contenido) sin desajustes
 * de hidratación.
 */
export function useHydrated() {
  return useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );
}
