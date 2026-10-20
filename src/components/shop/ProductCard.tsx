"use client";

import Link from "next/link";
import { type CSSProperties, ViewTransition } from "react";
import { focusRing } from "@/components/ui/focus";
import { SafeImage } from "@/components/ui/SafeImage";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { usePointerVars } from "@/lib/hooks/usePointerVars";
import { useProductMorph } from "@/lib/hooks/useProductMorph";
import { cardPricing, splitPriceLabel } from "@/lib/pricing";
import { toneFor } from "@/lib/tone";
import type { ProductDTO } from "@/lib/types";

/** Grilla de 2/3/4 columnas: catálogo y pestañas de la portada. */
const GRID_SIZES = "(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw";

type ProductCardProps = {
  product: ProductDTO;
  /** Nivel del título según el contexto: h3 bajo una sección (h2), h2 directo bajo el h1 del catálogo. */
  headingLevel?: 2 | 3;
  /** `sizes` de la foto; por defecto, el de la grilla. Un riel de ancho fijo pasa el suyo. */
  sizes?: string;
};

/** "amaderado, fresco, día" → "Amaderado · Fresco": el estilo, para elegir sin abrir la ficha. */
function styleLine(tags: string[]): string | null {
  const shown = tags.slice(0, 2).map((tag) => tag.charAt(0).toUpperCase() + tag.slice(1));
  return shown.length > 0 ? shown.join(" · ") : null;
}

const roundCta = `inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-[filter,background-color,color] duration-200 ${focusRing}`;

export function ProductCard({ product, headingLevel = 3, sizes = GRID_SIZES }: ProductCardProps) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const href = `/productos/${product.slug}`;
  const { onPointerMove } = usePointerVars<HTMLElement>();
  const morph = useProductMorph(product.slug);
  const { soldOut, label, orderHref, orderVariant: cheapest } = cardPricing(product);
  const price = splitPriceLabel(label);
  const style = styleLine(product.tags);
  // El foco del hover toma el color del tono del producto (ver .card-spotlight en globals).
  const { glow } = toneFor(product);

  return (
    <article
      onPointerMove={onPointerMove}
      style={{ "--spot-light": glow.light, "--spot-dark": glow.dark } as CSSProperties}
      className="card-spotlight group relative isolate flex h-full flex-col transition-transform duration-200 [--spot-color:var(--spot-light)] hover:-translate-y-0.5 dark:[--spot-color:var(--spot-dark)]"
    >
      <div className="relative">
        {/*
          Duplica el enlace del nombre: fuera del orden de tabulación y del árbol accesible. La foto
          vuela a la ficha (View Transition): el nombre se arma solo en esta tarjeta al activarla.
        */}
        <ViewTransition key={morph.generation} name={morph.name} share="morph" default="none">
          <Link
            href={href}
            tabIndex={-1}
            aria-hidden="true"
            {...morph.handlers}
            className="relative block aspect-4/5 overflow-hidden bg-surface"
          >
            <SafeImage
              src={product.images[0]}
              alt=""
              fill
              sizes={sizes}
              className={`object-cover transition-transform duration-300 group-hover:scale-105 ${
                soldOut ? "opacity-60 grayscale" : ""
              }`}
            />
          </Link>
        </ViewTransition>
        {soldOut ? (
          <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-bg px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-fg">
            Agotado
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col pt-4">
        <Heading className="font-serif text-xl font-medium leading-tight md:text-2xl">
          <Link
            href={href}
            {...morph.handlers}
            className={`-my-2.5 inline-block py-2.5 underline-offset-4 hover:underline ${focusRing}`}
          >
            {product.name}
          </Link>
        </Heading>
        {product.subtitle ? <p className="mt-1 text-muted">{product.subtitle}</p> : null}
        {style ? <p className="mt-0.5 text-sm text-muted">{style}</p> : null}

        {/* Precio como en la vitrina: eyebrow arriba, monto en serif; nunca se parte al lado del botón. */}
        <div className="mt-auto flex items-end justify-between gap-3 pt-3">
          {price ? (
            <p className="min-w-0">
              <span className="block text-xs font-medium tracking-[0.16em] text-muted uppercase">
                {soldOut ? "Consultar" : (price.prefix ?? " ")}
              </span>
              <span className="block font-serif text-xl leading-tight font-medium tabular-nums md:text-2xl">
                {price.amount}
              </span>
            </p>
          ) : (
            <span />
          )}

          {cheapest ? (
            <a
              href={orderHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Pedir ${product.name} por WhatsApp`}
              className={`${roundCta} bg-accent text-[#141414] hover:brightness-110`}
            >
              <WhatsAppIcon />
            </a>
          ) : (
            <a
              href={orderHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Consultar disponibilidad de ${product.name} por WhatsApp`}
              className={`${roundCta} border border-fg text-fg hover:bg-fg hover:text-bg`}
            >
              <WhatsAppIcon />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
