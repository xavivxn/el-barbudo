import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { clampQuantity } from "@/lib/stock";
import type { VariantSnapshot } from "@/lib/types";
import type { OrderLine } from "@/lib/whatsapp";

export type CartItem = {
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  variantLabel: string | null;
  unitPrice: number;
  image: string | null;
  quantity: number;
  maxStock: number;
};

type CartState = {
  items: CartItem[];
  isOpen: boolean;
  add: (item: Omit<CartItem, "quantity">, qty: number) => void;
  setQuantity: (variantId: string, qty: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
  open: () => void;
  close: () => void;
  /** Refresca precio y stock contra el servidor. Devuelve los nombres para el aviso. */
  reconcile: (snapshots: VariantSnapshot[]) => { removed: string[]; adjusted: string[] };
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      add: (item, qty) =>
        set((state) => {
          const existing = state.items.find((i) => i.variantId === item.variantId);
          const quantity = clampQuantity((existing?.quantity ?? 0) + qty, item.maxStock);
          if (quantity === 0) return state;
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.variantId === item.variantId ? { ...i, ...item, quantity } : i,
              ),
            };
          }
          return { items: [...state.items, { ...item, quantity }] };
        }),

      setQuantity: (variantId, qty) =>
        set((state) => {
          if (!(qty > 0)) {
            return { items: state.items.filter((i) => i.variantId !== variantId) };
          }
          return {
            items: state.items.map((i) =>
              i.variantId === variantId
                ? { ...i, quantity: clampQuantity(qty, i.maxStock) }
                : i,
            ),
          };
        }),

      remove: (variantId) =>
        set((state) => ({ items: state.items.filter((i) => i.variantId !== variantId) })),

      clear: () => set({ items: [] }),
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),

      reconcile: (snapshots) => {
        const byId = new Map(snapshots.map((s) => [s.id, s]));
        const removed: string[] = [];
        const adjusted: string[] = [];
        const next: CartItem[] = [];

        for (const item of get().items) {
          const snap = byId.get(item.variantId);
          if (!snap || !snap.available || snap.stock <= 0) {
            removed.push(item.name);
            continue;
          }
          const quantity = clampQuantity(item.quantity, snap.stock);
          if (quantity < item.quantity) adjusted.push(item.name);
          next.push({ ...item, unitPrice: snap.price, maxStock: snap.stock, quantity });
        }

        set({ items: next });
        return { removed, adjusted };
      },
    }),
    {
      name: "elbarbudo-cart",
      // En el servidor (SSR/build) no hay localStorage: createJSONStorage atrapa el error y deja el store sin persistir.
      storage: createJSONStorage(() => {
        if (typeof window === "undefined") throw new Error("localStorage no disponible");
        return localStorage;
      }),
      partialize: (state) => ({ items: state.items }),
    },
  ),
);

export function cartCount(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}

export function cartTotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
}

export function toOrderLines(items: CartItem[]): OrderLine[] {
  return items.map((i) => ({
    name: i.name,
    variantLabel: i.variantLabel,
    quantity: i.quantity,
    unitPrice: i.unitPrice,
  }));
}
