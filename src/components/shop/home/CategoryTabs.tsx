"use client";

import { ArrowRight } from "lucide-react";
import { AnimatePresence, motion, type Transition, type Variants } from "motion/react";
import Link from "next/link";
import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { ProductCard } from "@/components/shop/ProductCard";
import { PRODUCT_GRID_CLASS, ProductGrid } from "@/components/shop/ProductGrid";
import type { CategoryGroup } from "@/lib/home";

const EASE_OUT: Transition = { duration: 0.25, ease: "easeOut" };
const STAGGER_S = 0.04;
/** Tope de la cascada: con la entrada de 250 ms, toda la animación termina dentro de 400 ms. */
const STAGGER_TOTAL_S = 0.15;
/** Red de seguridad: si `onAnimationComplete` no llega (animación cortada), el alto retenido se suelta igual. */
const HOLD_SAFETY_MS = 600;

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: EASE_OUT },
};

/** Solo las tarjetas se animan; la grilla únicamente reparte la cascada entre ellas. */
function gridVariants(cards: number): Variants {
  const staggerChildren = Math.min(STAGGER_S, STAGGER_TOTAL_S / Math.max(cards - 1, 1));
  return { hidden: {}, show: { transition: { staggerChildren } } };
}

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

type CategoryTabsProps = {
  /** La salida de `groupByCategory`: sin grupos vacíos, así que cada grupo es una pestaña. */
  groups: CategoryGroup[];
};

export function CategoryTabs({ groups }: CategoryTabsProps) {
  if (groups.length === 0) return null;
  return <Tabs groups={groups} />;
}

function Tabs({ groups }: CategoryTabsProps) {
  const uid = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const panelsRef = useRef<HTMLDivElement>(null);
  // Alto del panel saliente, retenido hasta que termina la entrada: el contenido de abajo no salta mientras se anima.
  const [holdHeight, setHoldHeight] = useState<number | undefined>(undefined);
  const holdTimer = useRef<number | undefined>(undefined);
  const [activeSlug, setActiveSlug] = useState(groups[0].category.slug);
  // Si el grupo activo desaparece de la lista, vuelve a la primera pestaña.
  const active = groups.find((group) => group.category.slug === activeSlug) ?? groups[0];
  const activeIndex = groups.indexOf(active);

  const titleId = `${uid}-titulo`;
  const tabId = (slug: string) => `${uid}-tab-${slug}`;
  const panelId = (slug: string) => `${uid}-panel-${slug}`;

  useEffect(() => () => window.clearTimeout(holdTimer.current), []);

  function releaseHold() {
    window.clearTimeout(holdTimer.current);
    setHoldHeight(undefined);
  }

  function select(index: number, { focus = false } = {}) {
    const slug = groups[index].category.slug;
    if (slug !== active.category.slug) {
      setHoldHeight(panelsRef.current?.offsetHeight);
      window.clearTimeout(holdTimer.current);
      holdTimer.current = window.setTimeout(releaseHold, HOLD_SAFETY_MS);
    }
    setActiveSlug(slug);
    if (focus) tabRefs.current[index]?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    // Alt/Cmd + flecha es "atrás/adelante" del navegador: no se intercepta.
    if (event.altKey || event.metaKey || event.ctrlKey || event.shiftKey) return;
    const last = groups.length - 1;
    let next: number;
    switch (event.key) {
      case "ArrowRight":
        next = activeIndex === last ? 0 : activeIndex + 1;
        break;
      case "ArrowLeft":
        next = activeIndex === 0 ? last : activeIndex - 1;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = last;
        break;
      default:
        return;
    }
    event.preventDefault();
    select(next, { focus: true });
  }

  return (
    <section aria-labelledby={titleId}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-x-6 md:mb-6">
        <h2 id={titleId} className="font-serif text-3xl leading-tight font-medium md:text-4xl">
          Explorá la tienda
        </h2>
        {/* Un enlace por categoría (también sin JS, en el HTML); solo se ve el de la pestaña activa. */}
        {groups.map(({ category, total }) => (
          <Link
            key={category.slug}
            href={`/productos?categoria=${category.slug}`}
            hidden={category !== active.category}
            className={`inline-flex min-h-11 shrink-0 items-center gap-2 underline-offset-8 hover:underline ${focusRing}`}
          >
            Ver todos ({total})<span className="sr-only">, {category.label}</span>
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        ))}
      </div>

      {/* Móvil: si las pestañas no entran, la fila se desplaza sola (sin barra visible). */}
      <div
        role="tablist"
        aria-label="Categorías de la tienda"
        onKeyDown={onKeyDown}
        className="-mx-4 mb-8 flex overflow-x-auto border-b border-line px-4 [scrollbar-width:none] md:mx-0 md:mb-10 md:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {groups.map(({ category }, index) => {
          const selected = category === active.category;
          return (
            <button
              key={category.slug}
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
              type="button"
              role="tab"
              id={tabId(category.slug)}
              aria-selected={selected}
              aria-controls={panelId(category.slug)}
              tabIndex={selected ? 0 : -1}
              onClick={() => select(index)}
              // El anillo va hacia adentro: la fila con overflow lo recortaría por fuera.
              className={`relative min-h-11 shrink-0 cursor-pointer px-5 text-base font-medium whitespace-nowrap transition-colors duration-200 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent ${
                selected ? "text-fg" : "text-muted hover:text-fg"
              }`}
            >
              {category.label}
              {selected ? (
                <motion.span
                  layoutId={`${uid}-indicador`}
                  aria-hidden="true"
                  transition={EASE_OUT}
                  className="absolute inset-x-0 bottom-0 h-0.5 bg-accent"
                />
              ) : null}
            </button>
          );
        })}
      </div>

      {/*
        Un `tabpanel` persistente por categoría, todos en el HTML del servidor: los inactivos con `hidden`,
        así sin JS se ve el de la primera y los demás existen con sus tarjetas (enlaces para buscadores).
        Solo el panel activo usa la grilla animada, que entra con una cascada; los ocultos llevan la grilla
        estática. `initial={false}` evita que el primer render parta de opacidad 0.
      */}
      <div ref={panelsRef} style={{ minHeight: holdHeight }}>
        {groups.map(({ category, products }) => {
          const selected = category === active.category;
          return (
            <div
              key={category.slug}
              role="tabpanel"
              id={panelId(category.slug)}
              aria-labelledby={tabId(category.slug)}
              tabIndex={0}
              hidden={!selected}
              className={`rounded-sm ${focusRing}`}
            >
              <AnimatePresence initial={false}>
                {selected ? (
                  <motion.ul
                    key="grid"
                    className={PRODUCT_GRID_CLASS}
                    variants={gridVariants(products.length)}
                    initial="hidden"
                    animate="show"
                    onAnimationComplete={releaseHold}
                  >
                    {products.map((product) => (
                      <motion.li key={product.id} variants={cardVariants}>
                        <ProductCard product={product} headingLevel={3} />
                      </motion.li>
                    ))}
                  </motion.ul>
                ) : null}
              </AnimatePresence>
              {selected ? null : <ProductGrid products={products} headingLevel={3} />}
            </div>
          );
        })}
      </div>
    </section>
  );
}
