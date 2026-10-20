"use client";

import { type CSSProperties, type ReactNode, ViewTransition } from "react";
import { ProductCard } from "@/components/shop/ProductCard";
import type { ProductDTO } from "@/lib/types";

/** Clases de la grilla de tarjetas; la comparten las grillas que animan sus tarjetas. */
export const PRODUCT_GRID_CLASS =
  "grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4";

type ProductGridProps = {
  products: ProductDTO[];
  /** Lo que se muestra si no hay productos. */
  empty?: ReactNode;
  /** Nivel de los títulos de las tarjetas (h2 si la grilla va justo bajo el h1). */
  headingLevel?: 2 | 3;
};

export function ProductGrid({ products, empty, headingLevel }: ProductGridProps) {
  if (products.length === 0) {
    return <div className="py-12 text-muted">{empty ?? "No hay productos para mostrar."}</div>;
  }

  return (
    <ul className={PRODUCT_GRID_CLASS}>
      {products.map((product, index) => (
        // Al filtrar u ordenar (una navegación), la tarjeta que sigue en la grilla se desliza a su
        // nueva posición: la instancia vieja y la nueva comparten nombre y React las empareja
        // (ver `.tarjeta-move` en globals). Las que se van se funden; las nuevas entran.
        <ViewTransition key={product.id} name={`tarjeta-${product.id}`} share="tarjeta-move">
          <li className="card-in" style={{ "--i": index } as CSSProperties}>
            <ProductCard product={product} headingLevel={headingLevel} />
          </li>
        </ViewTransition>
      ))}
    </ul>
  );
}
