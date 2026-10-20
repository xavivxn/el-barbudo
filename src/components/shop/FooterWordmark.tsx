"use client";

import { animate, motion, useInView, useMotionValue, useScroll, useTransform } from "motion/react";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { usePointerVars } from "@/lib/hooks/usePointerVars";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";
import { type WordmarkFillMode, wordmarkFillMode } from "@/lib/wordmark";

const WORD = "EL BARBUDO";
/** Revelado de una vez (touch, sin recorrido de scroll): sube en 900 ms, ease-out. */
const REVEAL = { duration: 0.9, ease: "easeOut" } as const;

/**
 * "EL BARBUDO" gigante que cierra la página: contorno fino en serif y, encima, una copia rellena de
 * bronce que se revela de dos maneras (el CSS elige una según el dispositivo, ver globals.css):
 *  - mouse: una máscara radial sigue al cursor (`--mx`/`--my`, ver usePointerVars);
 *  - touch / sin hover: el relleno sube de abajo hacia arriba con el scroll. Si el scroll no puede
 *    contarlo (la palabra ya se ve al aparecer, p. ej. al cargar una página corta, o casi no hay
 *    recorrido; ver `wordmarkFillMode`), sube una sola vez al entrar en pantalla. Solo se animan
 *    transforms: la capa que recorta sube con `y` y su contenido baja lo mismo, así el texto no se
 *    mueve.
 * Con reduced motion queda un relleno suave y estático. Sin JS, solo el contorno.
 * Es decorativo (`aria-hidden`): la marca ya está en el logo.
 */
export function FooterWordmark() {
  // El pie no se desmonta al navegar: cada página mide de nuevo si el relleno sigue al scroll.
  const pathname = usePathname();
  return <Wordmark key={pathname} />;
}

function Wordmark() {
  const reduced = usePrefersReducedMotion();
  const trackRef = useRef<HTMLSpanElement>(null);
  const modeRef = useRef<WordmarkFillMode | null>(null);
  const { onPointerMove } = usePointerVars<HTMLDivElement>();
  const { scrollYProgress } = useScroll({ target: trackRef, offset: ["start end", "end end"] });
  const inView = useInView(trackRef, { once: true });
  // 0 → solo el contorno; 1 → lleno. Lo mueve el scroll o el revelado de una vez.
  const fill = useMotionValue(0);
  const clipY = useTransform(fill, [0, 1], ["100%", "0%"]);
  const textY = useTransform(fill, [0, 1], ["-100%", "0%"]);

  useEffect(() => {
    const track = trackRef.current;
    // Antes de que la pista entre en pantalla el relleno queda en 0 (en los dos modos).
    if (reduced || !track || !inView) return;
    if (modeRef.current === null) {
      // Se decide una vez, al aparecer, con las medidas de ese momento (ver `wordmarkFillMode`).
      const rect = track.getBoundingClientRect();
      const root = document.documentElement;
      modeRef.current = wordmarkFillMode({
        trackTop: rect.top,
        trackHeight: rect.height,
        viewportHeight: window.innerHeight,
        remainingScroll: root.scrollHeight - window.innerHeight - window.scrollY,
      });
    }
    if (modeRef.current === "scroll") {
      fill.set(scrollYProgress.get());
      return scrollYProgress.on("change", (value) => fill.set(value));
    }
    const controls = animate(fill, 1, REVEAL);
    return () => controls.stop();
  }, [reduced, inView, fill, scrollYProgress]);

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
