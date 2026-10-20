import {
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  useEffect,
  useId,
  useState,
  useSyncExternalStore,
} from "react";
import {
  armMorph,
  getMorph,
  isMorphNamed,
  morphName,
  releaseMorph,
  subscribeMorph,
} from "@/lib/morph";

/** Clic o toque que navega en esta pestaña: botón principal y sin modificadores (Cmd/Ctrl/Shift/Alt abren otra). */
function navigatesHere(event: MouseEvent | PointerEvent) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

/**
 * Nombre de View Transition de la foto de un producto (ver `src/lib/morph.ts`). Devuelve:
 * - `name`: `producto-<slug>` solo en la instancia activada; en las demás, `undefined`.
 * - `generation`: `key` del `<ViewTransition>`. Cambia cuando la instancia pierde el nombre sin
 *   desmontarse (se activó otra): React no olvida un nombre que se quita en caliente y avisaría de
 *   un duplicado falso, así que ese `<ViewTransition>` se remonta.
 * - `handlers`: van en cada enlace que navega a la ficha (pointerdown, click, Enter). El nombre
 *   queda confirmado en el DOM antes de que el router arranque la transición.
 */
export function useProductMorph(slug: string) {
  const id = useId();
  // Cada instancia se suscribe a "¿llevo yo el nombre?" (un booleano), no al estado entero: armar una
  // tarjeta re-renderiza solo esa y la que lo suelta, no todas las de la página.
  const named = useSyncExternalStore(
    subscribeMorph,
    () => isMorphNamed(getMorph(), id, slug),
    () => false,
  );

  const [wasNamed, setWasNamed] = useState(named);
  const [generation, setGeneration] = useState(0);
  if (wasNamed !== named) {
    setWasNamed(named);
    if (!named) setGeneration((value) => value + 1);
  }

  useEffect(() => () => releaseMorph(id), [id]);

  const activate = () => armMorph(slug, id);
  const handlers = {
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      if (navigatesHere(event)) activate();
    },
    onClick: (event: MouseEvent<HTMLElement>) => {
      if (navigatesHere(event)) activate();
    },
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (event.key === "Enter") activate();
    },
  };

  return { name: named ? morphName(slug) : undefined, generation, handlers };
}
