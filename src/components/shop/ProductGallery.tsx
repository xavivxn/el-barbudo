"use client";

import { type ReactNode, useRef, useState, ViewTransition } from "react";
import { SafeImage } from "@/components/ui/SafeImage";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";
import { morphName } from "@/lib/morph";

type ProductGalleryProps = {
  images: string[];
  name: string;
  /** Slug del producto: la foto principal lleva su nombre de View Transition (la foto que vuela desde la tarjeta). */
  slug?: string;
};

const SIZES = "(min-width: 768px) 50vw, 100vw";

/**
 * Destino de "la foto vuela a la ficha": en la ficha hay una sola galería, así que el nombre va
 * siempre. `share="morph"` + `default="none"`: solo se anima al formar el par con la tarjeta.
 */
function MorphTarget({ slug, children }: { slug?: string; children: ReactNode }) {
  if (!slug) return children;
  return (
    <ViewTransition name={morphName(slug)} share="morph" default="none">
      {children}
    </ViewTransition>
  );
}

export function ProductGallery({ images, name, slug }: ProductGalleryProps) {
  if (images.length <= 1) {
    return (
      <MorphTarget slug={slug}>
        <div className="relative aspect-4/5 overflow-hidden bg-surface">
          {/* Sin foto: alt vacío para que el placeholder se anuncie como "Sin foto". */}
          <SafeImage
            src={images[0]}
            alt={images[0] ? name : ""}
            fill
            preload
            sizes={SIZES}
            className="object-cover"
          />
        </div>
      </MorphTarget>
    );
  }

  return <MultiImageGallery images={images} name={name} slug={slug} />;
}

function MultiImageGallery({ images, name, slug }: ProductGalleryProps) {
  const stripRef = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);
  const reducedMotion = usePrefersReducedMotion();

  function show(index: number) {
    const strip = stripRef.current;
    setActive(index);
    if (!strip) return;
    strip.scrollTo({ left: index * strip.clientWidth, behavior: reducedMotion ? "auto" : "smooth" });
  }

  function onScroll() {
    const strip = stripRef.current;
    if (!strip || strip.clientWidth === 0) return;
    const index = Math.round(strip.scrollLeft / strip.clientWidth);
    if (index !== active) setActive(Math.min(Math.max(index, 0), images.length - 1));
  }

  return (
    <div className="flex flex-col gap-3">
      {/*
        Se desliza con el dedo en móvil; con teclado se navega con las miniaturas (sin tabindex propio).
        El nombre de View Transition va en el riel (no en la primera foto): al llegar muestra la
        primera y, si se cambió de foto, la captura es la que está a la vista, nunca una fuera del recorte.
      */}
      <MorphTarget slug={slug}>
        <ul
          ref={stripRef}
          tabIndex={-1}
          onScroll={onScroll}
          aria-label={`Fotos de ${name}`}
          className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] focus:outline-none [&::-webkit-scrollbar]:hidden"
        >
          {images.map((src, index) => (
            <li
              key={src}
              className="relative aspect-4/5 w-full shrink-0 snap-center overflow-hidden bg-surface"
            >
              <SafeImage
                src={src}
                alt={`${name}, foto ${index + 1} de ${images.length}`}
                fill
                preload={index === 0}
                sizes={SIZES}
                className="object-cover"
              />
            </li>
          ))}
        </ul>
      </MorphTarget>

      <ul className="flex gap-2 px-4 md:px-0" aria-label="Elegir foto">
        {images.map((src, index) => (
          <li key={src}>
            <button
              type="button"
              aria-label={`Ver imagen ${index + 1}`}
              aria-current={index === active ? "true" : undefined}
              onClick={() => show(index)}
              className="relative block h-16 w-14 overflow-hidden border border-transparent bg-surface transition-[border-color,opacity] duration-200 opacity-70 hover:opacity-100 aria-[current=true]:border-fg aria-[current=true]:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <SafeImage src={src} alt="" fill sizes="56px" className="object-cover" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
