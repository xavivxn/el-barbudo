"use client";

import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react";
import { type MotionValue, motion, useInView, useScroll, useTransform } from "motion/react";
import {
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { flushSync } from "react-dom";
import { Button } from "@/components/ui/Button";
import { focusRing } from "@/components/ui/focus";
import { IconButton } from "@/components/ui/IconButton";
import { SafeImage } from "@/components/ui/SafeImage";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";
import { cardPricing } from "@/lib/pricing";
import { wrapIndex } from "@/lib/showcase";
import { toneFor } from "@/lib/tone";
import type { ProductDTO } from "@/lib/types";

/** Intervalo de auto-avance; la barra de progreso (`animate-showcase-progress`) dura lo mismo. */
const INTERVAL_MS = 6000;
/** Espera tras el último evento de scroll para leer en qué diapositiva quedó el swipe. */
const SCROLL_SETTLE_MS = 120;
/** Salto de más de una diapositiva: fundido corto (bajo 400 ms) y desplazamiento instantáneo en el punto más bajo. */
const JUMP_DIP_MS = 360;
const JUMP_DIP_LOW = 0.4;
const PARALLAX_PX = 24;
/** Alto del área de la foto; el aura del tono vive dentro de ella y se funde antes del texto. */
const IMAGE_AREA_HEIGHT = "h-[38svh] min-h-60 md:h-[520px]";
const IMAGE_SIZES = "(min-width: 1024px) 336px, (min-width: 768px) 272px, 60vw";

// En móvil los dos CTA comparten una fila de ~150 px cada uno: menos padding que el `md` del Button
// (con `!`, porque la clase de tamaño del Button gana por orden en el CSS).
const ctaFit = "gap-1.5! px-3! whitespace-nowrap md:gap-2! md:px-5! lg:px-7!";

type Progress = "running" | "full" | "empty";
const PROGRESS_CLASS: Record<Progress, string> = {
  running: "animate-showcase-progress",
  full: "scale-x-100",
  empty: "scale-x-0",
};

function subscribeVisibility(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}

function useDocumentHidden() {
  return useSyncExternalStore(subscribeVisibility, () => document.hidden, () => false);
}

const subscribeNothing = () => () => {};

/** `false` en el HTML del servidor y durante la hidratación; `true` una vez que hay JS. */
function useHydrated() {
  return useSyncExternalStore(subscribeNothing, () => true, () => false);
}

type ShowcaseProps = {
  /** La salida de `pickShowcase`. */
  products: ProductDTO[];
};

export function Showcase({ products }: ShowcaseProps) {
  if (products.length === 0) return null;
  return <ShowcaseCarousel products={products} />;
}

function ShowcaseCarousel({ products }: ShowcaseProps) {
  const count = products.length;
  const trackId = `${useId()}-riel`;
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const rotationRef = useRef<HTMLButtonElement>(null);
  const settleTimer = useRef<number | undefined>(undefined);
  const jumpTimer = useRef<number | undefined>(undefined);

  const [activeState, setActive] = useState(0);
  // Si la lista se achica, la activa queda dentro del rango.
  const active = Math.min(activeState, count - 1);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focusedWithin, setFocusedWithin] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const hidden = useDocumentHidden();
  // Fuera de la pantalla no gira: al volver, la diapositiva que el usuario dejó sigue ahí.
  const inView = useInView(sectionRef);
  // Sin JS todas las diapositivas quedan usables con scroll-snap; `inert` llega con la hidratación.
  const hydrated = useHydrated();

  const playing =
    count > 1 && !reducedMotion && inView && !paused && !hovered && !focusedWithin && !hidden;

  // Parallax leve de la foto mientras la vitrina cruza la pantalla (nunca con reduced motion).
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start end", "end start"] });
  const parallaxY = useTransform(scrollYProgress, [0, 1], [PARALLAX_PX, -PARALLAX_PX]);

  function scrollTrack(next: number) {
    const track = trackRef.current;
    if (!track) return;
    window.clearTimeout(jumpTimer.current);
    const left = next * track.clientWidth;
    // Un salto (incluida la vuelta de la última a la primera) no recorre todas las diapositivas:
    // corta con un fundido breve del riel. Entre vecinas, desplazamiento suave.
    const jump = Math.abs(next - active) > 1;
    if (reducedMotion || !jump) {
      track.scrollTo({ left, behavior: reducedMotion ? "auto" : "smooth" });
      return;
    }
    if (typeof track.animate !== "function") {
      track.scrollTo({ left, behavior: "auto" });
      return;
    }
    track.animate(
      [
        { opacity: 1, easing: "ease-in" },
        { opacity: 0, offset: JUMP_DIP_LOW, easing: "ease-out" },
        { opacity: 1 },
      ],
      { duration: JUMP_DIP_MS },
    );
    jumpTimer.current = window.setTimeout(
      () => track.scrollTo({ left, behavior: "auto" }),
      JUMP_DIP_MS * JUMP_DIP_LOW,
    );
  }

  function goTo(target: number, { moveFocus = false } = {}) {
    const next = wrapIndex(target, count);
    scrollTrack(next);
    if (!moveFocus) {
      setActive(next);
      return;
    }
    // El foco estaba en la diapositiva que se vuelve inert: pasa a la nueva para no perderse.
    flushSync(() => setActive(next));
    slideRefs.current[next]?.focus({ preventScroll: true });
  }

  const advance = useEffectEvent(() => {
    // Defensa: nunca volver inert la diapositiva que tiene el foco.
    if (slideRefs.current[active]?.contains(document.activeElement)) return;
    goTo(active + 1);
  });

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => advance(), INTERVAL_MS);
    return () => window.clearInterval(id);
    // `active` reinicia el intervalo: tras un swipe o un clic, la diapositiva nueva dura 6 s enteros.
  }, [playing, active]);

  useEffect(
    () => () => {
      window.clearTimeout(settleTimer.current);
      window.clearTimeout(jumpTimer.current);
    },
    [],
  );

  function onTrackScroll() {
    window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(() => {
      const track = trackRef.current;
      if (!track || track.clientWidth === 0) return;
      setActive(wrapIndex(Math.round(track.scrollLeft / track.clientWidth), count));
    }, SCROLL_SETTLE_MS);
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (count < 2 || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return;
    // Alt/Cmd + flecha es "atrás/adelante" del navegador: no se intercepta.
    if (event.altKey || event.metaKey || event.ctrlKey || event.shiftKey) return;
    event.preventDefault();
    const fromSlide = slideRefs.current.some((slide) => slide?.contains(event.target as Node));
    goTo(active + (event.key === "ArrowRight" ? 1 : -1), { moveFocus: fromSlide });
  }

  function onFocus(event: FocusEvent<HTMLElement>) {
    // Pausa todo foco que entra desde afuera y todo foco en una diapositiva u otro control. Solo
    // moverse adentro hasta el botón de rotación no pausa: tras "Reanudar" el foco queda ahí.
    const fromOutside = !event.currentTarget.contains(event.relatedTarget);
    if (fromOutside || event.target !== rotationRef.current) setFocusedWithin(true);
  }

  function onBlur(event: FocusEvent<HTMLElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) setFocusedWithin(false);
  }

  function togglePaused() {
    if (paused) {
      // Reanudar es explícito: vuelve a girar aunque el foco siga en el botón (patrón WAI-ARIA).
      setPaused(false);
      setFocusedWithin(false);
    } else {
      setPaused(true);
    }
  }

  return (
    <section
      ref={sectionRef}
      aria-roledescription="carrusel"
      aria-label="Destacados"
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      onBlur={onBlur}
      onPointerEnter={(event) => event.pointerType === "mouse" && setHovered(true)}
      onPointerLeave={(event) => event.pointerType === "mouse" && setHovered(false)}
      className="relative isolate overflow-hidden rounded-2xl border border-line bg-surface md:rounded-3xl"
    >
      {/*
        Control de rotación: primero en el orden de foco y de lectura (patrón WAI-ARIA). Va arriba a
        la derecha, sobre el área de la foto (nunca sobre el texto), en móvil y en desktop.
      */}
      {count > 1 && !reducedMotion ? (
        <IconButton
          ref={rotationRef}
          label={paused ? "Reanudar" : "Pausar"}
          onClick={togglePaused}
          className="absolute top-2 right-2 z-10 bg-surface md:top-5 md:right-5"
        >
          {paused ? <Play size={18} aria-hidden="true" /> : <Pause size={18} aria-hidden="true" />}
        </IconButton>
      ) : null}

      <div
        ref={trackRef}
        id={trackId}
        onScroll={onTrackScroll}
        aria-live={playing ? "off" : "polite"}
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {products.map((product, index) => (
          <Slide
            key={product.id}
            ref={(node) => {
              slideRefs.current[index] = node;
            }}
            product={product}
            index={index}
            count={count}
            active={index === active}
            inert={hydrated && index !== active}
            parallaxY={reducedMotion ? undefined : parallaxY}
            reducedMotion={reducedMotion}
          />
        ))}
      </div>

      {count > 1 ? (
        <div className="flex items-center gap-3 px-4 pb-3 md:px-12 md:pb-5">
          <div className="flex flex-1 items-center gap-2">
            {products.map((product, index) => {
              const current = index === active;
              const progress: Progress = current ? (playing ? "running" : "full") : "empty";
              return (
                <button
                  key={product.id}
                  type="button"
                  aria-label={`Ir al destacado ${index + 1}`}
                  aria-current={current ? "true" : undefined}
                  onClick={() => goTo(index)}
                  className={`group/bar relative h-11 min-w-6 flex-1 cursor-pointer md:max-w-20 ${focusRing}`}
                >
                  <span className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 overflow-hidden rounded-full bg-fg/15 transition-colors duration-200 group-hover/bar:bg-fg/35">
                    <span
                      // Una animación nueva por cada vuelta: al cambiar de diapositiva o al reanudar arranca de cero.
                      key={progress === "running" ? `run-${active}` : progress}
                      data-progress={progress}
                      className={`block h-full origin-left bg-fg ${PROGRESS_CLASS[progress]}`}
                    />
                  </span>
                </button>
              );
            })}
          </div>

          {/* Solo escritorio: en móvil se desliza con el dedo o se usan las barras. */}
          <div className="hidden gap-3 md:flex">
            <IconButton label="Destacado anterior" aria-controls={trackId} onClick={() => goTo(active - 1)}>
              <ArrowLeft size={18} aria-hidden="true" />
            </IconButton>
            <IconButton label="Destacado siguiente" aria-controls={trackId} onClick={() => goTo(active + 1)}>
              <ArrowRight size={18} aria-hidden="true" />
            </IconButton>
          </div>
        </div>
      ) : null}
    </section>
  );
}

type SlideProps = {
  ref: (node: HTMLDivElement | null) => void;
  product: ProductDTO;
  index: number;
  count: number;
  active: boolean;
  inert: boolean;
  parallaxY: MotionValue<number> | undefined;
  reducedMotion: boolean;
};

/** Inclinación máxima del marco hacia el mouse, en grados (eje X / eje Y). */
const TILT_X = 8;
const TILT_Y = 10;

function Slide({ ref, product, index, count, active, inert, parallaxY, reducedMotion }: SlideProps) {
  const { soldOut, label: price, orderHref } = cardPricing(product);
  const { glow } = toneFor(product);
  const frameRef = useRef<HTMLDivElement>(null);

  // Inclinación 3D y reflejo que siguen al mouse (solo mouse, solo la activa, sin reduced-motion).
  // Se escriben como variables CSS en el marco: sin re-render por cada movimiento.
  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const frame = frameRef.current;
    if (!frame || !active || reducedMotion || event.pointerType !== "mouse") return;
    const rect = frame.getBoundingClientRect();
    const px = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
    const py = Math.min(Math.max((event.clientY - rect.top) / rect.height, 0), 1);
    frame.style.setProperty("--rx", `${((0.5 - py) * TILT_X * 2).toFixed(2)}deg`);
    frame.style.setProperty("--ry", `${((px - 0.5) * TILT_Y * 2).toFixed(2)}deg`);
    frame.style.setProperty("--gx", `${(px * 100).toFixed(1)}%`);
    frame.style.setProperty("--gy", `${(py * 100).toFixed(1)}%`);
    frame.dataset.glare = "on";
  }

  function onPointerLeave() {
    const frame = frameRef.current;
    if (!frame) return;
    frame.style.setProperty("--rx", "0deg");
    frame.style.setProperty("--ry", "0deg");
    delete frame.dataset.glare;
  }
  const line = product.notes?.top ? `Salida: ${product.notes.top}` : product.description || product.subtitle;
  const tags = product.tags.slice(0, 2);

  return (
    <div
      ref={ref}
      role="group"
      aria-roledescription="diapositiva"
      aria-label={`${index + 1} de ${count}`}
      inert={inert}
      tabIndex={-1}
      className="grid min-h-[70svh] w-full shrink-0 snap-center grid-rows-[auto_1fr] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent md:h-[520px] md:min-h-0 md:grid-cols-2 md:grid-rows-1"
    >
      <div className="@container flex min-w-0 flex-col px-4 pt-4 pb-5 md:justify-center md:py-10 md:pr-6 md:pl-12 lg:pl-16">
        <p className="text-xs font-medium tracking-[0.2em] text-muted uppercase">
          Destacado
          {count > 1 ? (
            <span aria-hidden="true" className="tabular-nums">
              {" · "}
              {index + 1}/{count}
            </span>
          ) : null}
        </p>
        <h2 className="mt-2 font-serif text-[32px] leading-[1.05] font-medium text-balance md:mt-3 md:text-[44px] lg:text-[56px]">
          {product.name}
        </h2>

        {tags.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-2 md:mt-4" aria-label="Estilo">
            {tags.map((tag) => (
              <li
                key={tag}
                className="rounded-full border border-fg/20 px-3 py-1 text-sm leading-none first-letter:uppercase"
              >
                {tag}
              </li>
            ))}
          </ul>
        ) : null}

        {line ? <p className="mt-3 line-clamp-2 max-w-md text-muted md:mt-4">{line}</p> : null}

        <div className="mt-4 flex items-center gap-3 md:mt-6">
          {price ? <p className="text-xl font-medium tabular-nums">{price}</p> : null}
          {soldOut ? (
            <span className="rounded-full bg-fg px-3 py-1 text-xs font-medium tracking-[0.16em] text-bg uppercase">
              Agotado
            </span>
          ) : null}
        </div>

        {/* Los dos CTA comparten fila si entran (~150 px c/u); en pantallas más angostas se apilan. */}
        <div
          className={`mt-auto grid grid-cols-1 gap-2 pt-5 md:mt-8 md:flex md:flex-wrap md:pt-0 ${
            soldOut ? "" : "@min-[19rem]:grid-cols-2"
          }`}
        >
          <Button
            variant="accent"
            href={orderHref}
            target="_blank"
            rel="noopener noreferrer"
            className={ctaFit}
          >
            <WhatsAppIcon />
            {soldOut ? "Consultar disponibilidad" : "Pedir ahora"}
            <span className="sr-only"> {product.name} por WhatsApp</span>
          </Button>
          <Button
            variant="secondary"
            href={`/productos/${product.slug}`}
            className={ctaFit}
          >
            Ver producto
          </Button>
        </div>
      </div>

      {/*
        Decorativa: el nombre ya está en el h2. Sin foto, el placeholder se anuncia "Sin foto".
        Aura de la foto (al estilo de la landing de Ardentium): halo difuminado del tono que respira,
        sombra de color que irradia, borde de luz que gira, flotación suave y, con mouse, inclinación
        3D con reflejo. Todo queda dentro del área de la foto (el halo se recorta en sus bordes), así
        que el texto nunca queda sobre el color (Ruling R3).
      */}
      <div
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        style={{ "--glow-light": glow.light, "--glow-dark": glow.dark } as CSSProperties}
        className={`relative order-first flex items-center justify-center [perspective:900px] [--glow:var(--glow-light)] md:order-none dark:[--glow:var(--glow-dark)] ${IMAGE_AREA_HEIGHT}`}
      >
        {/* La máscara funde el halo hacia los bordes del área: no hay corte visible y nunca llega al texto. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden [mask-image:radial-gradient(farthest-side,#000_72%,transparent)]"
        >
          <div
            className={`absolute top-1/2 left-1/2 aspect-square h-[96%] -translate-x-1/2 -translate-y-1/2 transition-opacity duration-500 ease-out md:h-[480px] lg:h-[520px] ${
              active ? "opacity-100" : "opacity-0"
            }`}
          >
            {/* Halo amplio: tiñe el aire alrededor de la foto. */}
            <div className="absolute inset-0 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--glow)_85%,transparent)_35%,transparent)] blur-3xl" />
            {/* Núcleo intenso que asoma por los bordes del marco: la "luz" que respira. */}
            <div
              className={`absolute inset-[8%] rounded-full bg-[radial-gradient(closest-side,var(--glow)_55%,transparent)] blur-[40px] ${
                active ? "showcase-breathe" : ""
              }`}
            />
          </div>
        </div>

        <motion.div style={parallaxY ? { y: parallaxY } : undefined} className="relative h-[86%] md:h-[340px] lg:h-[420px]">
          <div className={`h-full ${active ? "showcase-float" : ""}`}>
            <div
              ref={frameRef}
              style={{ transform: "rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg))" }}
              className={`group/frame showcase-rim relative aspect-4/5 h-full overflow-hidden rounded-2xl bg-surface shadow-[0_24px_48px_-24px_rgb(20_20_20/0.45),0_0_90px_-8px_var(--glow)] transition-[transform,rotate,scale,box-shadow] duration-400 ease-out ${
                active ? "-rotate-3 scale-100" : "rotate-0 scale-[0.92]"
              }`}
            >
              <SafeImage
                src={product.images[0]}
                alt=""
                fill
                preload={index === 0}
                // La 2 es la próxima en entrar (auto-avance o swipe): sin esperar al lazy-load. De la 3 en adelante, diferidas.
                loading={index === 1 ? "eager" : undefined}
                sizes={IMAGE_SIZES}
                className={`object-cover ${soldOut ? "opacity-60" : ""}`}
              />
              {/* Reflejo que sigue al mouse. */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-1 bg-[radial-gradient(45%_40%_at_var(--gx,50%)_var(--gy,30%),rgb(255_255_255/0.35),transparent_70%)] opacity-0 mix-blend-soft-light transition-opacity duration-500 group-data-[glare=on]/frame:opacity-100"
              />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
