"use client";

import { motion, type Variants } from "motion/react";
import { type CSSProperties, useId } from "react";
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
const LAYERS = [
  {
    key: "top",
    label: "Salida",
    custom: 2,
    // La barra más angosta y clara. Los tres anchos suman la forma de pirámide.
    bar: "w-[45%] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--glow)_28%,transparent),color-mix(in_oklab,var(--glow)_42%,transparent))]",
  },
  {
    key: "heart",
    label: "Corazón",
    custom: 1,
    bar: "w-[70%] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--glow)_52%,transparent),color-mix(in_oklab,var(--glow)_68%,transparent))]",
  },
  {
    key: "base",
    label: "Fondo",
    custom: 0,
    bar: "w-full bg-[linear-gradient(180deg,color-mix(in_oklab,var(--glow)_78%,transparent),color-mix(in_oklab,var(--glow)_92%,transparent))]",
  },
] as const;

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
 * Pirámide olfativa: salida, corazón y fondo como tres barras que se ensanchan hacia la base.
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
      <h2 id={headingId} className="mb-6 font-serif text-3xl font-medium md:text-4xl">
        Pirámide olfativa
      </h2>
      <motion.dl
        // Al armarse se monta de nuevo con el estado inicial escondido (`initial` solo cuenta al montar).
        key={armed ? "armed" : "static"}
        initial={armed ? "hidden" : false}
        whileInView="shown"
        viewport={{ once: true, amount: 0.4 }}
        className="flex flex-col gap-6"
      >
        {LAYERS.map((layer) => (
          <motion.div key={layer.key} variants={layerVariants} custom={layer.custom}>
            <div
              aria-hidden="true"
              className={`mx-auto h-9 rounded-full shadow-[inset_0_1px_0_rgb(255_255_255/0.4),inset_0_-1px_0_rgb(0_0_0/0.06)] md:h-10 ${layer.bar}`}
            />
            <dt className="mt-3 text-center text-xs font-medium tracking-[0.16em] text-muted uppercase">
              {layer.label}
            </dt>
            <dd className="mx-auto mt-1 max-w-sm text-center text-balance">{notes[layer.key]}</dd>
          </motion.div>
        ))}
      </motion.dl>
    </section>
  );
}
