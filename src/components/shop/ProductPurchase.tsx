"use client";

import { Check, Minus, Plus } from "lucide-react";
import { type RefObject, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { formatPYG } from "@/lib/money";
import { clampQuantity, isSoldOut, minPrice } from "@/lib/stock";
import type { ProductDTO } from "@/lib/types";
import { buildInquiryMessage, buildOrderMessage, whatsappUrl } from "@/lib/whatsapp";
import { useCart } from "@/stores/cart";

/** Cuánto queda visible el aviso de "Agregado al carrito". */
const ADDED_NOTICE_MS = 2000;
/** Alto del header sticky: el bloque de compra que queda debajo de él ya no se ve. */
const HEADER_HEIGHT = 56;

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

const stepButton = `inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors duration-200 hover:bg-surface aria-disabled:cursor-not-allowed aria-disabled:opacity-40 aria-disabled:hover:bg-transparent ${focusRing}`;

export function ProductPurchase({ product }: { product: ProductDTO }) {
  if (isSoldOut(product.variants)) return <SoldOutPurchase product={product} />;
  return <InStockPurchase product={product} />;
}

function SoldOutPurchase({ product }: { product: ProductDTO }) {
  const { variants } = product;
  const price =
    variants.length > 0
      ? `${variants.length > 1 ? "Desde " : ""}${formatPYG(minPrice(variants))}`
      : null;

  return (
    <div className="flex flex-col gap-5">
      {price ? <p className="text-2xl tabular-nums text-muted">{price}</p> : null}
      <p className="max-w-prose text-muted">
        Por ahora no hay stock. Escribinos y te avisamos cuando vuelva.
      </p>
      <Button
        variant="secondary"
        href={whatsappUrl(buildInquiryMessage(product.name))}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full"
      >
        <WhatsAppIcon />
        Consultar disponibilidad
        <span className="sr-only"> por WhatsApp</span>
      </Button>
    </div>
  );
}

function InStockPurchase({ product }: { product: ProductDTO }) {
  const { variants } = product;
  const multiple = variants.length > 1;
  // Las variantes vienen ordenadas por precio: la primera con stock es la más barata que se puede pedir.
  const [variantId, setVariantId] = useState(
    () => (variants.find((v) => v.stock > 0) ?? variants[0]).id,
  );
  const [quantity, setQuantity] = useState(1);
  const [notice, setNotice] = useState("");
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const variant = variants.find((v) => v.id === variantId) ?? variants[0];
  const variantLabel = multiple ? variant.label : null;
  const total = variant.price * quantity;
  const atMax = quantity >= variant.stock;
  const atMin = quantity <= 1;

  const add = useCart((state) => state.add);
  const open = useCart((state) => state.open);

  const actionsRef = useRef<HTMLDivElement>(null);
  const showBar = useOutOfView(actionsRef);

  useEffect(
    () => () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    },
    [],
  );

  const orderHref = whatsappUrl(
    buildOrderMessage([
      { name: product.name, variantLabel, quantity, unitPrice: variant.price },
    ]),
  );

  function selectVariant(id: string) {
    const next = variants.find((v) => v.id === id);
    if (!next || next.stock <= 0) return;
    setVariantId(id);
    setQuantity((current) => clampQuantity(current, next.stock));
  }

  function changeQuantity(delta: number) {
    setQuantity((current) => clampQuantity(current + delta, variant.stock));
  }

  function addToCart() {
    const inCart =
      useCart.getState().items.find((item) => item.variantId === variant.id)?.quantity ?? 0;
    add(
      {
        variantId: variant.id,
        productId: product.id,
        slug: product.slug,
        name: product.name,
        variantLabel,
        unitPrice: variant.price,
        image: product.images[0] ?? null,
        maxStock: variant.stock,
      },
      quantity,
    );
    open();
    setNotice(
      inCart >= variant.stock
        ? "Ya tenés en el carrito todas las unidades disponibles"
        : "Agregado al carrito",
    );
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(""), ADDED_NOTICE_MS);
  }

  return (
    <div className="flex flex-col gap-6">
      {multiple ? (
        <fieldset>
          <legend className="mb-3 text-sm uppercase tracking-[0.16em] text-muted">Tamaño</legend>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => {
              const unavailable = v.stock <= 0;
              return (
                <label key={v.id} className="relative">
                  <input
                    type="radio"
                    name={`variante-${product.id}`}
                    value={v.id}
                    checked={v.id === variant.id}
                    disabled={unavailable}
                    onChange={() => selectVariant(v.id)}
                    className="peer sr-only"
                  />
                  <span
                    className={`flex min-h-14 min-w-28 cursor-pointer flex-col justify-center rounded-2xl border border-line px-4 py-2 transition-colors duration-200 hover:border-fg peer-checked:border-fg peer-checked:bg-fg peer-checked:text-bg peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent peer-disabled:cursor-not-allowed peer-disabled:border-dashed peer-disabled:text-muted peer-disabled:hover:border-line`}
                  >
                    <span className="font-medium">{v.label}</span>
                    <span className="text-sm tabular-nums opacity-80">
                      {unavailable ? "Agotado" : formatPYG(v.price)}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div>
          <p className="mb-3 text-sm uppercase tracking-[0.16em] text-muted" aria-hidden="true">
            Cantidad
          </p>
          <div className="inline-flex items-center rounded-full border border-line p-0.5">
            <button
              type="button"
              aria-label="Disminuir cantidad"
              aria-disabled={atMin}
              onClick={() => !atMin && changeQuantity(-1)}
              className={stepButton}
            >
              <Minus size={18} aria-hidden="true" />
            </button>
            <output
              aria-label="Cantidad"
              aria-live="polite"
              className="w-10 text-center text-lg tabular-nums"
            >
              {quantity}
            </output>
            <button
              type="button"
              aria-label="Aumentar cantidad"
              aria-disabled={atMax}
              onClick={() => !atMax && changeQuantity(1)}
              className={stepButton}
            >
              <Plus size={18} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="text-right">
          <p data-testid="purchase-total" className="font-serif text-3xl font-medium tabular-nums md:text-4xl">
            {formatPYG(total)}
          </p>
          {quantity > 1 ? (
            <p className="text-sm tabular-nums text-muted">{formatPYG(variant.price)} c/u</p>
          ) : null}
        </div>
      </div>

      {atMax ? (
        <p className="-mt-3 text-sm text-muted">
          {variant.stock === 1
            ? "Queda 1 unidad disponible"
            : `Hay ${variant.stock} unidades disponibles`}
        </p>
      ) : null}

      <div ref={actionsRef} className="flex flex-col gap-3">
        <Button
          variant="accent"
          href={orderHref}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full"
        >
          <WhatsAppIcon />
          Pedir ahora
          <span className="sr-only"> por WhatsApp</span>
        </Button>
        <Button variant="secondary" onClick={addToCart} className="w-full">
          Agregar al carrito
        </Button>
        <p role="status" aria-live="polite" className="min-h-6 text-sm">
          {notice ? (
            <span className="inline-flex items-center gap-2">
              <Check size={16} aria-hidden="true" className="text-ok" />
              {notice}
            </span>
          ) : null}
        </p>
      </div>

      {/* Barra fija en móvil: "Pedir ahora" al alcance del pulgar cuando los botones salen de vista. */}
      <div
        data-sticky-buy
        inert={!showBar}
        className={`fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg pb-[env(safe-area-inset-bottom)] transition-[translate,visibility] duration-200 md:hidden ${
          showBar ? "visible translate-y-0" : "invisible translate-y-full"
        }`}
      >
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0">
            <p className="text-lg font-medium tabular-nums">{formatPYG(total)}</p>
            <p className="truncate text-sm text-muted">
              {quantity} × {variantLabel ?? product.name}
            </p>
          </div>
          <Button
            variant="accent"
            href={orderHref}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0"
          >
            <WhatsAppIcon />
            Pedir ahora
            <span className="sr-only"> por WhatsApp</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

/** `true` mientras el elemento no se ve (ni siquiera en parte) debajo del header sticky. */
function useOutOfView(ref: RefObject<HTMLElement | null>) {
  const [outOfView, setOutOfView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setOutOfView(!entry.isIntersecting),
      { rootMargin: `-${HEADER_HEIGHT}px 0px 0px 0px` },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return outOfView;
}
