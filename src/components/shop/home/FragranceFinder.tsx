"use client";

import { ArrowLeft, ArrowRight, Moon, RotateCcw, Sun } from "lucide-react";
import { motion } from "motion/react";
import { type ReactNode, useCallback, useEffect, useId, useRef, useState } from "react";
import { ProductCard } from "@/components/shop/ProductCard";
import { type FinderQuery, matchFragrances } from "@/lib/finder";
import type { ProductDTO } from "@/lib/types";

type Moment = NonNullable<FinderQuery["moment"]>;

const MOMENTS: { value: Moment; label: string; icon: ReactNode }[] = [
  { value: "día", label: "Día", icon: <Sun size={18} aria-hidden="true" /> },
  { value: "noche", label: "Noche", icon: <Moon size={18} aria-hidden="true" /> },
];

/** Etiqueta visible → tag del producto (en minúscula). */
const STYLES = ["Fresco", "Amaderado", "Dulce", "Especiado", "Intenso", "Suave"].map((label) => ({
  value: label.toLowerCase(),
  label,
}));

/** Separación entre tarjetas del riel (`gap-4`): las flechas avanzan una tarjeta más este hueco. */
const RAIL_GAP_PX = 16;
/** Cascada de entrada acotada: con 200 ms por tarjeta, todo termina antes de 400 ms. */
const STAGGER_S = 0.03;
const STAGGER_MAX = 5;

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
const chipBase = `inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-5 text-base transition-colors duration-200 ${focusRing}`;
const chipTone = (pressed: boolean) =>
  pressed ? "border-fg bg-fg text-bg" : "border-line text-fg hover:border-fg";
const arrowButton = `inline-flex h-11 w-11 items-center justify-center rounded-full border border-line text-fg transition-[color,background-color,border-color,opacity] duration-200 ${focusRing}`;

type FragranceFinderProps = {
  /** Solo perfumes activos: la página pasa `products.filter((p) => p.category === "perfume")`. */
  perfumes: ProductDTO[];
};

export function FragranceFinder({ perfumes }: FragranceFinderProps) {
  if (perfumes.length === 0) return null;
  return <Finder perfumes={perfumes} />;
}

function Finder({ perfumes }: FragranceFinderProps) {
  const uid = useId();
  const titleId = `${uid}-titulo`;
  const [moment, setMoment] = useState<Moment | undefined>(undefined);
  const [styles, setStyles] = useState<string[]>([]);
  // Hasta la primera elección las tarjetas no se animan: el HTML del servidor nunca parte de opacidad 0.
  const [touched, setTouched] = useState(false);
  const firstChipRef = useRef<HTMLButtonElement>(null);
  const railRef = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ prev: false, next: false });

  const { exact, results } = matchFragrances(perfumes, { moment, styles });
  const hasSelection = moment !== undefined || styles.length > 0;
  // Cambia con cada consulta: las tarjetas se vuelven a montar y entran con el fundido.
  const queryKey = `${moment ?? ""}|${styles.join(",")}`;

  const updateEdges = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    const prev = rail.scrollLeft > 1;
    const next = rail.scrollLeft + rail.clientWidth < rail.scrollWidth - 1;
    setEdges((current) => (current.prev === prev && current.next === next ? current : { prev, next }));
  }, []);

  // Resultados nuevos: el riel vuelve al principio y se recalcula qué flechas sirven.
  useEffect(() => {
    const rail = railRef.current;
    if (rail) rail.scrollLeft = 0;
    updateEdges();
  }, [queryKey, updateEdges]);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(updateEdges);
    observer.observe(rail);
    return () => observer.disconnect();
  }, [updateEdges]);

  function choose(update: () => void) {
    setTouched(true);
    update();
  }

  function toggleStyle(value: string) {
    choose(() =>
      setStyles((current) => (current.includes(value) ? current.filter((style) => style !== value) : [...current, value])),
    );
  }

  function clear() {
    choose(() => {
      setMoment(undefined);
      setStyles([]);
    });
    // El botón desaparece: el foco vuelve al comienzo de las opciones en vez de caer al <body>.
    firstChipRef.current?.focus();
  }

  function scrollRail(direction: 1 | -1) {
    const rail = railRef.current;
    if (!rail || !(direction === 1 ? edges.next : edges.prev)) return;
    const card = rail.firstElementChild as HTMLElement | null;
    const step = (card?.offsetWidth ?? rail.clientWidth) + RAIL_GAP_PX;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    rail.scrollBy({ left: direction * step, behavior: reduce ? "auto" : "smooth" });
  }

  const canScroll = edges.prev || edges.next;

  return (
    <section
      aria-labelledby={titleId}
      className="rounded-2xl border border-line bg-surface px-4 py-8 md:rounded-3xl md:px-10 md:py-12"
    >
      <h2 id={titleId} className="font-serif text-3xl leading-tight font-medium md:text-4xl">
        Encontrá tu fragancia
      </h2>
      <p className="mt-2 text-muted">Contanos cuándo y cómo te gusta, y te mostramos los indicados.</p>

      <div className="mt-6 grid gap-6 md:mt-8 md:grid-cols-[auto_1fr] md:gap-12">
        <fieldset>
          <legend className="mb-3 font-medium">¿Para cuándo?</legend>
          <div className="flex flex-wrap gap-2">
            {MOMENTS.map((option, index) => {
              const pressed = moment === option.value;
              return (
                <button
                  key={option.value}
                  ref={index === 0 ? firstChipRef : undefined}
                  type="button"
                  aria-pressed={pressed}
                  onClick={() => choose(() => setMoment(pressed ? undefined : option.value))}
                  className={`${chipBase} ${chipTone(pressed)}`}
                >
                  {option.icon}
                  {option.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-3 font-medium">
            ¿Qué estilo? <span className="font-normal text-muted">Podés elegir varios.</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {STYLES.map((option) => {
              const pressed = styles.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={pressed}
                  onClick={() => toggleStyle(option.value)}
                  className={`${chipBase} ${chipTone(pressed)}`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </fieldset>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-line pt-6 md:mt-10">
        <div role="status" className="min-h-11 content-center">
          <p className="font-medium">
            {results.length} {results.length === 1 ? "perfume" : "perfumes"} para vos
          </p>
          {exact ? null : <p className="text-muted">No hay uno exacto; estos se acercan.</p>}
        </div>

        <div className="flex items-center gap-2">
          {hasSelection ? (
            <button
              type="button"
              onClick={clear}
              className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-4 underline-offset-8 hover:underline ${focusRing}`}
            >
              <RotateCcw size={18} aria-hidden="true" />
              Limpiar
            </button>
          ) : null}
          {/* Solo escritorio y solo si el riel se desplaza; en un extremo la flecha queda inactiva sin perder el foco. */}
          <div hidden={!canScroll} className="hidden gap-2 md:flex">
            <button
              type="button"
              aria-label="Anterior"
              aria-controls={`${uid}-riel`}
              aria-disabled={!edges.prev}
              onClick={() => scrollRail(-1)}
              className={`${arrowButton} ${edges.prev ? "cursor-pointer hover:border-fg hover:bg-fg hover:text-bg" : "cursor-not-allowed opacity-40"}`}
            >
              <ArrowLeft size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Siguiente"
              aria-controls={`${uid}-riel`}
              aria-disabled={!edges.next}
              onClick={() => scrollRail(1)}
              className={`${arrowButton} ${edges.next ? "cursor-pointer hover:border-fg hover:bg-fg hover:text-bg" : "cursor-not-allowed opacity-40"}`}
            >
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* El riel se desplaza dentro de la tarjeta: la página nunca gana scroll horizontal. */}
      <ul
        ref={railRef}
        id={`${uid}-riel`}
        aria-label="Perfumes sugeridos"
        onScroll={updateEdges}
        className="-mx-4 mt-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto overscroll-x-contain px-4 pb-2 md:-mx-10 md:mt-6 md:scroll-px-10 md:px-10"
      >
        {results.map((product, index) => (
          <motion.li
            key={`${queryKey}-${product.id}`}
            className="w-[180px] shrink-0 snap-start md:w-[220px]"
            initial={touched ? { opacity: 0, y: 8 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: "easeOut", delay: Math.min(index, STAGGER_MAX) * STAGGER_S }}
          >
            <ProductCard product={product} headingLevel={3} />
          </motion.li>
        ))}
      </ul>
    </section>
  );
}
