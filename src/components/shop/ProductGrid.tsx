import type { ReactNode } from "react";
import { ProductCard } from "@/components/shop/ProductCard";
import type { ProductDTO } from "@/lib/types";

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
    <ul className="grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4">
      {products.map((product) => (
        <li key={product.id}>
          <ProductCard product={product} headingLevel={headingLevel} />
        </li>
      ))}
    </ul>
  );
}
