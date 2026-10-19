"use client";

import { Minus, Plus, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { refreshCart } from "@/app/(shop)/actions";
import { Button } from "@/components/ui/Button";
import { SafeImage } from "@/components/ui/SafeImage";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { formatPYG } from "@/lib/money";
import { buildOrderMessage, whatsappUrl } from "@/lib/whatsapp";
import { type CartItem, cartTotal, toOrderLines, useCart } from "@/stores/cart";

/** Antes de este tiempo el refresco pasa inadvertido: no se muestra "Actualizando…". */
const SLOW_REFRESH_MS = 300;

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

const stepButton = `inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors duration-200 hover:bg-surface aria-disabled:cursor-not-allowed aria-disabled:opacity-40 aria-disabled:hover:bg-transparent ${focusRing}`;

const noopSubscribe = () => () => {};

/** `false` en el servidor y en la hidratación; `true` después. Evita el desajuste con localStorage. */
function useHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

function unique(names: string[]): string {
  return [...new Set(names)].join(", ");
}

function noticeText(removed: string[], adjusted: string[]): string {
  const parts: string[] = [];
  if (adjusted.length > 0) parts.push(`Ajustamos la cantidad de ${unique(adjusted)} por stock.`);
  if (removed.length > 0) parts.push(`Ya no está disponible: ${unique(removed)}.`);
  return parts.join(" ");
}

export function CartDrawer() {
  const hydrated = useHydrated();
  const items = useCart((state) => state.items);
  const isOpen = useCart((state) => state.isOpen);
  const close = useCart((state) => state.close);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const [notice, setNotice] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // El store manda: abrir o cerrar el <dialog> nativo según `isOpen`.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) {
      openerRef.current = document.activeElement as HTMLElement | null;
      dialog.showModal();
      document.documentElement.style.overflow = "hidden";
      titleRef.current?.focus();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  useEffect(
    () => () => {
      document.documentElement.style.overflow = "";
    },
    [],
  );

  // Al abrir: precios y stock vuelven del servidor y el carrito se ajusta.
  useEffect(() => {
    if (!isOpen || !hydrated) return;
    const ids = useCart.getState().items.map((i) => i.variantId);
    if (ids.length === 0) return;

    let cancelled = false;
    const slowTimer = setTimeout(() => setRefreshing(true), SLOW_REFRESH_MS);

    refreshCart(ids)
      .then((snapshots) => {
        if (cancelled) return;
        // `reconcile` solo se llama con una respuesta válida: con un error el carrito queda intacto.
        const { removed, adjusted } = useCart.getState().reconcile(snapshots);
        setNotice(noticeText(removed, adjusted));
      })
      .catch(() => {
        // Sin conexión o error del servidor: se siguen mostrando los ítems guardados.
      })
      .finally(() => {
        clearTimeout(slowTimer);
        if (!cancelled) setRefreshing(false);
      });

    return () => {
      cancelled = true;
      clearTimeout(slowTimer);
      setRefreshing(false);
    };
  }, [isOpen, hydrated]);

  function handleClosed() {
    const dialog = dialogRef.current;
    // Un `close` tardío no debe pisar un drawer que ya se volvió a abrir.
    if (dialog?.open) return;
    document.documentElement.style.overflow = "";
    setNotice("");
    close();
    const opener = openerRef.current;
    openerRef.current = null;
    if (opener?.isConnected) opener.focus();
  }

  const total = cartTotal(items);
  const message = buildOrderMessage(toOrderLines(items));

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="cart-drawer-title"
      onClose={handleClosed}
      onClick={(event) => {
        // El panel ocupa todo el <dialog>: solo el fondo oscurecido llega con este target.
        if (event.target === event.currentTarget) dialogRef.current?.close();
      }}
      className="cart-drawer fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-dvh w-full max-w-none overflow-hidden bg-bg p-0 text-fg backdrop:bg-black/50 md:w-[420px] md:border-l md:border-line"
    >
      <div className="flex h-full flex-col">
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-line pl-4 pr-2 md:pl-6 md:pr-4">
          <h2
            id="cart-drawer-title"
            ref={titleRef}
            tabIndex={-1}
            className="font-serif text-2xl font-medium focus:outline-none"
          >
            Carrito
          </h2>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={() => dialogRef.current?.close()}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors duration-200 hover:bg-surface ${focusRing}`}
          >
            <X size={22} aria-hidden="true" />
          </button>
        </div>

        {hydrated && items.length > 0 ? (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 md:px-6">
              <p aria-live="polite" className="text-sm text-muted empty:hidden">
                {refreshing ? "Actualizando…" : ""}
              </p>
              {notice ? (
                <p role="status" className="mt-4 border-l-4 border-accent bg-surface px-4 py-3 text-sm">
                  {notice}
                </p>
              ) : null}
              <ul>
                {items.map((cartItem) => (
                  <CartRow
                    key={cartItem.variantId}
                    item={cartItem}
                    onNavigate={() => dialogRef.current?.close()}
                    onRemoved={() => titleRef.current?.focus()}
                  />
                ))}
              </ul>
            </div>

            <div className="shrink-0 border-t border-line px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:px-6">
              <div className="flex items-baseline justify-between gap-4">
                <p className="text-sm uppercase tracking-[0.16em] text-muted">Total estimado</p>
                <p className="font-serif text-3xl font-medium tabular-nums">{formatPYG(total)}</p>
              </div>
              <p className="mt-1 text-sm text-muted">
                Confirmamos stock, entrega y pago por WhatsApp.
              </p>

              <p id="cart-preview-label" className="mt-4 text-sm uppercase tracking-[0.16em] text-muted">
                Mensaje que vas a enviar
              </p>
              <div
                role="region"
                aria-labelledby="cart-preview-label"
                tabIndex={0}
                className={`mt-2 max-h-28 overflow-y-auto whitespace-pre-line rounded-none rounded-r-lg border-l-4 border-accent bg-surface px-4 py-3 text-sm ${focusRing}`}
              >
                {message}
              </div>

              <Button
                variant="whatsapp"
                href={whatsappUrl(message)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 w-full"
              >
                <WhatsAppIcon />
                Enviar pedido por WhatsApp
                <span className="sr-only"> (se abre en una pestaña nueva)</span>
              </Button>
            </div>
          </>
        ) : hydrated ? (
          <div className="flex flex-1 flex-col items-start justify-center gap-4 px-4 md:px-6">
            <h3 className="font-serif text-3xl font-medium">Tu carrito está vacío</h3>
            <p className="text-muted">Mirá los productos y armá tu pedido.</p>
            <Button
              variant="primary"
              href="/productos"
              onClick={() => dialogRef.current?.close()}
            >
              Ver catálogo
            </Button>
          </div>
        ) : null}
      </div>
    </dialog>
  );
}

function CartRow({
  item,
  onNavigate,
  onRemoved,
}: {
  item: CartItem;
  onNavigate: () => void;
  onRemoved: () => void;
}) {
  const setQuantity = useCart((state) => state.setQuantity);
  const remove = useCart((state) => state.remove);

  const atMax = item.quantity >= item.maxStock;
  const atMin = item.quantity <= 1;

  return (
    <li className="flex gap-4 border-b border-line py-4 last:border-b-0">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden bg-surface">
        <SafeImage src={item.image} alt="" fill sizes="64px" className="object-cover" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              href={`/productos/${item.slug}`}
              onClick={onNavigate}
              className={`font-medium underline-offset-4 hover:underline ${focusRing}`}
            >
              {item.name}
            </Link>
            {item.variantLabel ? <p className="text-sm text-muted">{item.variantLabel}</p> : null}
          </div>
          <p className="shrink-0 tabular-nums">{formatPYG(item.quantity * item.unitPrice)}</p>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex items-center rounded-full border border-line p-0.5">
            <button
              type="button"
              aria-label={`Disminuir cantidad de ${item.name}`}
              aria-disabled={atMin}
              onClick={() => !atMin && setQuantity(item.variantId, item.quantity - 1)}
              className={stepButton}
            >
              <Minus size={18} aria-hidden="true" />
            </button>
            {/* No es <output>: su rol implícito "status" chocaría con el aviso de cambios. */}
            <span aria-live="polite" className="w-8 text-center tabular-nums">
              <span className="sr-only">Cantidad de {item.name}: </span>
              {item.quantity}
            </span>
            <button
              type="button"
              aria-label={`Aumentar cantidad de ${item.name}`}
              aria-disabled={atMax}
              onClick={() => !atMax && setQuantity(item.variantId, item.quantity + 1)}
              className={stepButton}
            >
              <Plus size={18} aria-hidden="true" />
            </button>
          </div>

          <button
            type="button"
            aria-label={`Quitar ${item.name}`}
            onClick={() => {
              remove(item.variantId);
              onRemoved();
            }}
            className={`inline-flex min-h-11 items-center px-2 text-sm text-muted underline underline-offset-4 transition-colors duration-200 hover:text-fg ${focusRing}`}
          >
            Quitar
          </button>
        </div>

        {atMax ? <p className="-mt-1 text-sm text-muted">Máximo disponible</p> : null}
      </div>
    </li>
  );
}
