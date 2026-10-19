import Link from "next/link";
import { focusRing } from "@/components/ui/focus";
import { SafeImage } from "@/components/ui/SafeImage";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { cardPricing } from "@/lib/pricing";
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

export function ProductCard({ product, headingLevel = 3, sizes = GRID_SIZES }: ProductCardProps) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const href = `/productos/${product.slug}`;
  const { soldOut, label: price, orderHref, orderVariant: cheapest } = cardPricing(product);

  return (
    <article className="group flex h-full flex-col transition-transform duration-200 hover:-translate-y-0.5">
      <div className="relative">
        {/* Duplica el enlace del nombre: fuera del orden de tabulación y del árbol accesible. */}
        <Link
          href={href}
          tabIndex={-1}
          aria-hidden="true"
          className="relative block aspect-4/5 overflow-hidden bg-surface"
        >
          <SafeImage
            src={product.images[0]}
            alt=""
            fill
            sizes={sizes}
            className={`object-cover transition-transform duration-300 group-hover:scale-105 ${
              soldOut ? "opacity-50" : ""
            }`}
          />
        </Link>
        {soldOut ? (
          <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-bg px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-fg">
            Agotado
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col pt-4">
        <Heading className="font-serif text-xl font-medium leading-tight md:text-2xl">
          <Link href={href} className={`-my-2.5 inline-block py-2.5 underline-offset-4 hover:underline ${focusRing}`}>
            {product.name}
          </Link>
        </Heading>
        {product.subtitle ? <p className="mt-1 text-muted">{product.subtitle}</p> : null}

        <div
          className={`mt-auto flex items-center justify-between gap-x-3 gap-y-2 pt-3 ${
            cheapest ? "" : "flex-wrap"
          }`}
        >
          {price ? <p className="min-w-0 tabular-nums">{price}</p> : null}

          {cheapest ? (
            <a
              href={orderHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Pedir ${product.name} por WhatsApp`}
              className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-[#141414] transition-[filter] duration-200 hover:brightness-110 ${focusRing}`}
            >
              <WhatsAppIcon />
            </a>
          ) : (
            <a
              href={orderHref}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex min-h-11 items-center gap-2 rounded-full border border-fg px-4 text-sm font-medium transition-colors duration-200 hover:bg-fg hover:text-bg ${focusRing}`}
            >
              <WhatsAppIcon className="h-4 w-4" />
              Consultar
              <span className="sr-only"> disponibilidad de {product.name} por WhatsApp</span>
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
