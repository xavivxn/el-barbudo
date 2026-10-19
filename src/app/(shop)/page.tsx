import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { CategorySection } from "@/components/shop/CategorySection";
import { ProductGrid } from "@/components/shop/ProductGrid";
import { StoreIntro } from "@/components/shop/StoreIntro";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { ChipRow } from "@/components/ui/ChipRow";
import { Reveal } from "@/components/ui/Reveal";
import { groupByCategory } from "@/lib/home";
import { listProducts } from "@/lib/products";
import { CATEGORIES } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const products = await listProducts();
  const featured = products.filter((product) => product.featured);
  // Lo que ya está en "Destacados" no se repite en su categoría; "Ver todos (N)" sigue contándolo.
  const groups = groupByCategory(products, 4, new Set(featured.map((product) => product.id)));

  return (
    <div className="mx-auto max-w-6xl px-4 pb-8 md:px-8 md:pb-10">
      <StoreIntro />

      <nav aria-label="Categorías">
        <ChipRow>
          <li className="shrink-0">
            <Chip href="/productos" className="whitespace-nowrap">
              Todos
            </Chip>
          </li>
          {CATEGORIES.map((category) => (
            <li key={category.slug} className="shrink-0">
              <Chip href={`/productos?categoria=${category.slug}`} className="whitespace-nowrap">
                {category.label}
              </Chip>
            </li>
          ))}
        </ChipRow>
      </nav>

      <div className="mt-8 space-y-16 md:mt-12 md:space-y-24">
        {featured.length > 0 ? (
          <section aria-labelledby="destacados-titulo">
            <div className="mb-6 flex items-end justify-between gap-6 md:mb-8">
              <h2
                id="destacados-titulo"
                className="font-serif text-3xl font-medium leading-tight md:text-4xl"
              >
                Destacados
              </h2>
              <Link
                href="/productos"
                className="inline-flex min-h-11 shrink-0 items-center gap-2 underline-offset-8 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Ver todo
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </div>
            <ProductGrid products={featured} />
          </section>
        ) : null}

        {groups.map((group, index) =>
          // Sin destacados, la primera sección queda sobre el pliegue: va sin Reveal para verse sin JS.
          featured.length === 0 && index === 0 ? (
            <CategorySection key={group.category.slug} {...group} />
          ) : (
            <Reveal key={group.category.slug}>
              <CategorySection {...group} />
            </Reveal>
          ),
        )}

        {products.length === 0 ? (
          <p className="text-muted">Pronto vas a ver acá nuestros productos.</p>
        ) : null}

        {/* Una fila entre líneas: la de abajo es el borde superior del footer. */}
        <Reveal>
          <section
            aria-labelledby="barberia-titulo"
            className="flex flex-col items-start gap-6 border-t border-line pt-8 md:flex-row md:items-center md:justify-between md:pt-10"
          >
            <div>
              <h2
                id="barberia-titulo"
                className="font-serif text-2xl font-medium leading-tight md:text-3xl"
              >
                ¿Corte o barba?
              </h2>
              <p className="mt-1 text-muted">Reservá tu turno en la barbería.</p>
            </div>
            <Button variant="secondary" href="/barberia" className="shrink-0">
              Ver servicios
            </Button>
          </section>
        </Reveal>
      </div>
    </div>
  );
}
