/**
 * "La foto vuela a la ficha": qué instancia de la foto de un producto lleva el nombre de View
 * Transition. Un mismo producto puede estar varias veces en pantalla (vitrina, pestañas, buscador,
 * relacionados) y dos `view-transition-name` iguales rompen la transición, así que el nombre se
 * arma solo en la instancia que el usuario activa (`owner`, un `useId`), justo antes de navegar, y
 * se suelta cuando esa instancia se desmonta (la navegación terminó).
 *
 * La vuelta con "atrás" no se anima: React confirma el render de un popstate de forma síncrona
 * (para restaurar el scroll) y una actualización síncrona no arranca View Transitions.
 */

export type MorphArm = {
  slug: string;
  /** Instancia activada (un `useId`): la única con nombre. */
  owner: string;
};

export function morphName(slug: string) {
  return `producto-${slug}`;
}

/** ¿Esta instancia lleva el nombre con este estado? Pura: la usan el hook y los tests. */
export function isMorphNamed(arm: MorphArm | null, id: string, slug: string): boolean {
  return arm !== null && arm.owner === id && arm.slug === slug;
}

// --- Store (useSyncExternalStore) -------------------------------------------------------------

let arm: MorphArm | null = null;
const listeners = new Set<() => void>();

function set(next: MorphArm | null) {
  if (next === arm) return;
  arm = next;
  for (const listener of listeners) listener();
}

export function subscribeMorph(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getMorph() {
  return arm;
}

export function getServerMorph(): MorphArm | null {
  return null;
}

/** El usuario activó esta instancia: pasa a ser la única con nombre. */
export function armMorph(slug: string, owner: string) {
  if (arm?.owner === owner && arm.slug === slug) return;
  set({ slug, owner });
}

/** La instancia activada se desmonta (se navegó a la ficha): nadie más hereda el nombre. */
export function releaseMorph(owner: string) {
  if (arm?.owner === owner) set(null);
}

/** Solo para tests. */
export function resetMorph() {
  set(null);
}
