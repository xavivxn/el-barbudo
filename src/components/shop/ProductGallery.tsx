"use client";

import { useRef, useState } from "react";
import { SafeImage } from "@/components/ui/SafeImage";

type ProductGalleryProps = {
  images: string[];
  name: string;
};

const SIZES = "(min-width: 768px) 50vw, 100vw";

export function ProductGallery({ images, name }: ProductGalleryProps) {
  if (images.length <= 1) {
    return (
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
    );
  }

  return <MultiImageGallery images={images} name={name} />;
}

function MultiImageGallery({ images, name }: ProductGalleryProps) {
  const stripRef = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);

  function show(index: number) {
    const strip = stripRef.current;
    setActive(index);
    if (!strip) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    strip.scrollTo({ left: index * strip.clientWidth, behavior: reduced ? "auto" : "smooth" });
  }

  function onScroll() {
    const strip = stripRef.current;
    if (!strip || strip.clientWidth === 0) return;
    const index = Math.round(strip.scrollLeft / strip.clientWidth);
    if (index !== active) setActive(Math.min(Math.max(index, 0), images.length - 1));
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Se desliza con el dedo en móvil; con teclado se navega con las miniaturas (sin tabindex propio). */}
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
