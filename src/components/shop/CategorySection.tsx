import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { ProductGrid } from "@/components/shop/ProductGrid";
import type { CategoryGroup } from "@/lib/home";

export function CategorySection({ category, products, total }: CategoryGroup) {
  const titleId = `categoria-${category.slug}-titulo`;
  return (
    <section aria-labelledby={titleId}>
      <div className="mb-6 flex items-end justify-between gap-6 md:mb-8">
        <h2 id={titleId} className="font-serif text-3xl font-medium leading-tight md:text-4xl">
          {category.label}
        </h2>
        <Link
          href={`/productos?categoria=${category.slug}`}
          className="inline-flex min-h-11 shrink-0 items-center gap-2 underline-offset-8 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Ver todos ({total})<span className="sr-only">, {category.label}</span>
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </div>
      <ProductGrid products={products} />
    </section>
  );
}
