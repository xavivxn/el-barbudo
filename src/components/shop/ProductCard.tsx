import Link from "next/link";
import { SafeImage } from "@/components/ui/SafeImage";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { formatPYG } from "@/lib/money";
import { isSoldOut, minPrice } from "@/lib/stock";
import type { ProductDTO } from "@/lib/types";
import { buildInquiryMessage, buildOrderMessage, whatsappUrl } from "@/lib/whatsapp";

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

/** `priced`: las variantes cuyo precio vale mostrar (las que tienen stock, o todas si está agotado). */
function priceLabel(product: ProductDTO, priced: ProductDTO["variants"]): string | null {
  if (priced.length === 0) return null;
  // "₲" y el número nunca se separan; en tarjetas angostas "Desde" baja sola de línea.
  const amount = formatPYG(minPrice(priced)).replace(" ", "\u00A0");
  return product.variants.length > 1 ? `Desde ${amount}` : amount;
}

export function ProductCard({ product }: { product: ProductDTO }) {
  const href = `/productos/${product.slug}`;
  const soldOut = isSoldOut(product.variants);
  // Lo que se puede pedir hoy: el precio y el pedido salen de las variantes con stock.
  const available = product.variants.filter((variant) => variant.stock > 0);
  const price = priceLabel(product, soldOut ? product.variants : available);
  // Las variantes vienen ordenadas por precio: la primera con stock es la más barata.
  const cheapest = available[0];

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
            sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
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
        <h3 className="font-serif text-xl font-medium leading-tight md:text-2xl">
          <Link href={href} className={`underline-offset-4 hover:underline ${focusRing}`}>
            {product.name}
          </Link>
        </h3>
        {product.subtitle ? <p className="mt-1 text-muted">{product.subtitle}</p> : null}

        <div
          className={`mt-auto flex items-center justify-between gap-x-3 gap-y-2 pt-3 ${
            cheapest ? "" : "flex-wrap"
          }`}
        >
          {price ? <p className="min-w-0 tabular-nums">{price}</p> : null}

          {cheapest ? (
            <a
              href={whatsappUrl(
                buildOrderMessage([
                  {
                    name: product.name,
                    variantLabel: product.variants.length > 1 ? cheapest.label : undefined,
                    quantity: 1,
                    unitPrice: cheapest.price,
                  },
                ]),
              )}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Pedir ${product.name} por WhatsApp`}
              className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-[#141414] transition-[filter] duration-200 hover:brightness-110 ${focusRing}`}
            >
              <WhatsAppIcon />
            </a>
          ) : (
            <a
              href={whatsappUrl(buildInquiryMessage(product.name))}
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
