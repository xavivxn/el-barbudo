"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { usePointerVars } from "@/lib/hooks/usePointerVars";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";

const WORD = "EL BARBUDO";

/**
 * "EL BARBUDO" gigante que cierra la página: contorno fino en serif y, encima, una copia rellena de
 * bronce que se revela de dos maneras (el CSS elige una según el dispositivo, ver globals.css):
 *  - mouse: una máscara radial sigue al cursor (`--mx`/`--my`, ver usePointerVars);
 *  - touch / sin hover: el relleno sube de abajo hacia arriba con el scroll. Solo se animan
 *    transforms: la capa que recorta sube con `y` y su contenido baja lo mismo, así el texto no se mueve.
 * Con reduced motion queda un relleno suave y estático. Sin JS, solo el contorno.
 * Es decorativo (`aria-hidden`): la marca ya está en el logo.
 */
export function FooterWordmark() {
  const reduced = usePrefersReducedMotion();
  const trackRef = useRef<HTMLSpanElement>(null);
  const { onPointerMove } = usePointerVars<HTMLDivElement>();
  const { scrollYProgress } = useScroll({ target: trackRef, offset: ["start end", "end end"] });
  const clipY = useTransform(scrollYProgress, [0, 1], ["100%", "0%"]);
  const textY = useTransform(scrollYProgress, [0, 1], ["-100%", "0%"]);

  return (
    <div
      aria-hidden="true"
      data-variant={reduced ? "static" : "live"}
      className="wordmark"
      onPointerMove={reduced ? undefined : onPointerMove}
    >
      {/* Pista de scroll: la palabra más el borde y el copyright de abajo, así el relleno termina al llegar al final de la página. */}
      <span ref={trackRef} className="wordmark__track" />
      <span className="wordmark__line">{WORD}</span>
      {reduced ? (
        <span className="wordmark__fill wordmark__fill--static">
          <span className="wordmark__text">{WORD}</span>
        </span>
      ) : (
        <>
          <span className="wordmark__fill wordmark__fill--hover">
            <span className="wordmark__text">{WORD}</span>
          </span>
          <motion.span className="wordmark__fill wordmark__fill--scroll" style={{ y: clipY }}>
            <motion.span className="wordmark__wipe" style={{ y: textY }}>
              <span className="wordmark__text">{WORD}</span>
            </motion.span>
          </motion.span>
        </>
      )}
    </div>
  );
}
