"use client";

import { ShoppingBag } from "lucide-react";
import { useSyncExternalStore } from "react";
import { cartCount, useCart } from "@/stores/cart";

const noopSubscribe = () => () => {};

/** `false` en el servidor y en la hidratación; `true` después. Evita el desajuste con localStorage. */
function useHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

export function CartButton({ className = "" }: { className?: string }) {
  const hydrated = useHydrated();
  const count = useCart((state) => cartCount(state.items));
  const open = useCart((state) => state.open);

  const shown = hydrated ? count : 0;
  const label = hydrated
    ? `Abrir carrito, ${count} ${count === 1 ? "producto" : "productos"}`
    : "Abrir carrito";

  return (
    <button
      type="button"
      aria-label={label}
      onClick={open}
      className={`relative inline-flex h-11 w-11 items-center justify-center rounded-full text-fg transition-colors duration-200 hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${className}`}
    >
      <ShoppingBag size={20} aria-hidden="true" />
      {shown > 0 ? (
        <span
          aria-hidden="true"
          className="absolute right-0.5 top-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[11px] font-semibold leading-none text-[#141414]"
        >
          {shown > 99 ? "99+" : shown}
        </span>
      ) : null}
    </button>
  );
}
