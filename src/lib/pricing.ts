import { formatPYG } from "@/lib/money";
import { isSoldOut, minPrice } from "@/lib/stock";
import type { ProductDTO, VariantDTO } from "@/lib/types";
import { buildInquiryMessage, buildOrderMessage, whatsappUrl } from "@/lib/whatsapp";

/** `priced`: las variantes cuyo precio vale mostrar (las que tienen stock, o todas si está agotado). */
function priceLabel(product: ProductDTO, priced: VariantDTO[]): string | null {
  if (priced.length === 0) return null;
  // "₲" y el número nunca se separan; en tarjetas angostas "Desde" baja sola de línea.
  const amount = formatPYG(minPrice(priced)).replace(" ", " ");
  return product.variants.length > 1 ? `Desde ${amount}` : amount;
}

/**
 * Precio y pedido de una tarjeta de producto (regla R10): el precio y el pedido salen de las
 * variantes con stock; agotado muestra el precio de todas y "Consultar".
 */
export function cardPricing(product: ProductDTO): {
  soldOut: boolean;
  label: string | null;
  orderHref: string;
  orderVariant: VariantDTO | null;
} {
  const soldOut = isSoldOut(product.variants);
  const available = product.variants.filter((variant) => variant.stock > 0);
  const label = priceLabel(product, soldOut ? product.variants : available);
  // Las variantes vienen ordenadas por precio: la primera con stock es la más barata.
  const orderVariant = available[0] ?? null;
  const orderHref = orderVariant
    ? whatsappUrl(
        buildOrderMessage([
          {
            name: product.name,
            variantLabel: product.variants.length > 1 ? orderVariant.label : undefined,
            quantity: 1,
            unitPrice: orderVariant.price,
          },
        ]),
      )
    : whatsappUrl(buildInquiryMessage(product.name));
  return { soldOut, label, orderHref, orderVariant };
}
