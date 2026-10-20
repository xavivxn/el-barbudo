/**
 * Tipografía gigante del pie (FooterWordmark): en touch, cómo se llena de bronce.
 *
 * - "scroll": el relleno sube con el scroll, de 0 (la pista asoma por abajo) a 1 (el final de la
 *   pista llega al borde inferior de la pantalla, o sea, al final de la página).
 * - "reveal": un único revelado. Se usa cuando el scroll no puede contarlo: la palabra ya se ve
 *   (o casi entera) en el momento en que aparece (página corta, carga a mitad de página, salto), o el
 *   recorrido que queda es mínimo. Sin esto el relleno aparecería lleno de golpe.
 *
 * Se decide cuando la pista entra en pantalla por primera vez, con las medidas de ese momento: al
 * montar, una página que todavía está llegando (streaming) puede medir mal.
 */
export type WordmarkFillMode = "scroll" | "reveal";

/** Progreso al aparecer desde el que se considera "ya a la vista": no entró scrolleando. */
export const WORDMARK_SEEN_AT = 0.5;
/** Con menos recorrido que esto, el relleno por scroll se lee como un salto: mejor revelarlo. */
export const WORDMARK_MIN_RANGE_PX = 64;

type Measure = {
  /** Borde superior de la pista de scroll, relativo a la pantalla (`getBoundingClientRect().top`). */
  trackTop: number;
  trackHeight: number;
  viewportHeight: number;
  /** Cuánto se puede scrollear todavía hacia abajo. */
  remainingScroll: number;
};

export function wordmarkFillMode({
  trackTop,
  trackHeight,
  viewportHeight,
  remainingScroll,
}: Measure): WordmarkFillMode {
  if (!(trackHeight > 0)) return "reveal";
  // Progreso del scroll en este momento (0: la pista asoma por abajo; 1: lleno). Incluye ≥ 0,95.
  const progress = (viewportHeight - trackTop) / trackHeight;
  if (progress >= WORDMARK_SEEN_AT) return "reveal";
  // Scroll que el relleno puede usar: hasta llenarse o hasta el final de la página, lo que llegue antes.
  const range = Math.min(remainingScroll, trackTop + trackHeight - viewportHeight);
  return range < WORDMARK_MIN_RANGE_PX ? "reveal" : "scroll";
}
