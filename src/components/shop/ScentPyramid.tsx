"use client";

import { motion, type Variants } from "motion/react";
import { type CSSProperties, useId } from "react";
import { sectionHeading } from "@/components/shop/sectionHeading";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";
import type { Tone } from "@/lib/tone";
import type { Notes } from "@/lib/types";

type ScentPyramidProps = {
  /** `null` (barba, cabello): no se dibuja nada. */
  notes: Notes | null;
  /** El tono del producto (`toneFor(product).glow`): de ahí sale el color de las barras. */
  glow: Tone["glow"];
};

// Orden de lectura: de arriba (la salida, lo primero que se huele) a la base (lo que queda en la piel).
// `custom` es el turno de entrada: la animación sube desde la base, así que el fondo va primero.
// Cada barra es un trazo fino del tono, más intenso en el centro (`--bar-hi`) que en las puntas
// (`--bar-lo`). Los tres anchos dibujan la pirámide; la intensidad crece hacia la base.
const LAYERS = [
  {
    key: "top",
    label: "Salida",
    custom: 2,
    // La más angosta y clara. En oscuro, más fuerte: sobre carbón, el 28–42 % casi no se ve.
    bar: "w-[45%] [--bar-lo:28%] [--bar-hi:42%] dark:[--bar-lo:45%] dark:[--bar-hi:60%]",
  },
  {
    key: "heart",
    label: "Corazón",
    custom: 1,
    bar: "w-[70%] [--bar-lo:52%] [--bar-hi:68%] dark:[--bar-lo:58%] dark:[--bar-hi:74%]",
  },
  {
    key: "base",
    label: "Fondo",
    custom: 0,
    bar: "w-full [--bar-lo:78%] [--bar-hi:92%]",
  },
] as const;

const barBase =
  "mx-auto mb-3 block h-1.5 rounded-full bg-[linear-gradient(90deg,color-mix(in_oklab,var(--glow)_var(--bar-lo),transparent),color-mix(in_oklab,var(--glow)_var(--bar-hi),transparent),color-mix(in_oklab,var(--glow)_var(--bar-lo),transparent))]";

/** Cada capa aparece 250 ms; entre una y la siguiente pasan 120 ms. */
const STEP_S = 0.12;
const layerVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  shown: (turn: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: "easeOut", delay: turn * STEP_S },
  }),
};

/**
 * Pirámide olfativa: salida, corazón y fondo, cada una con un trazo fino del tono que se ensancha
 * hacia la base.
 *
 * El texto va siempre sobre la superficie de la página (nunca sobre el color), así el contraste no
 * depende del tono. Las barras son decorativas; la semántica es una lista de definiciones en orden de
 * lectura (Salida, Corazón, Fondo).
 *
 * Sin JS y durante la hidratación, todo se ve (sin `opacity: 0` en el HTML del servidor). Recién ya
 * montado las capas se esconden y quedan listas para entrar con `whileInView`.
 */
export function ScentPyramid({ notes, glow }: ScentPyramidProps) {
  const headingId = useId();
  const reducedMotion = usePrefersReducedMotion();
  // `false` en el servidor y al hidratar; `true` justo después, en un render síncrono previo al pintado.
  const mounted = useHydrated();

  if (!notes) return null;
  const armed = mounted && !reducedMotion;

  return (
    <section
      aria-labelledby={headingId}
      style={{ "--glow-light": glow.light, "--glow-dark": glow.dark } as CSSProperties}
      className="mt-10 [--glow:var(--glow-light)] dark:[--glow:var(--glow-dark)]"
    >
      <h2 id={headingId} className={sectionHeading}>
        Pirámide olfativa
      </h2>
      <motion.dl
        // Al armarse se monta de nuevo con el estado inicial escondido (`initial` solo cuenta al montar).
        key={armed ? "armed" : "static"}
        initial={armed ? "hidden" : false}
        whileInView="shown"
        viewport={{ once: true, amount: 0.4 }}
        className="flex flex-col gap-6 pt-2"
      >
        {LAYERS.map((layer) => (
          <motion.div key={layer.key} variants={layerVariants} custom={layer.custom}>
            {/* La barra va dentro del dt (un dl solo admite dt y dd en cada grupo). */}
            <dt className="text-center text-xs font-medium tracking-[0.16em] text-muted uppercase">
              <span aria-hidden="true" className={`${barBase} ${layer.bar}`} />
              {layer.label}
            </dt>
            <dd className="mx-auto mt-1 max-w-sm text-center text-balance">{notes[layer.key]}</dd>
          </motion.div>
        ))}
      </motion.dl>
    </section>
  );
}
