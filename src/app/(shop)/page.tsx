import { CategoryTabs } from "@/components/shop/home/CategoryTabs";
import { FragranceFinder } from "@/components/shop/home/FragranceFinder";
import { Showcase } from "@/components/shop/home/Showcase";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { groupByCategory } from "@/lib/home";
import { listProducts } from "@/lib/products";
import { pickShowcase } from "@/lib/showcase";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  // Solo activos: el buscador y la vitrina confían en que la lista ya viene filtrada.
  const products = await listProducts();
  const showcase = pickShowcase(products);
  // Las pestañas no repiten lo que ya está en la vitrina (Ruling R8); "Ver todos (N)" sigue contando todo.
  const groups = groupByCategory(products, 8, new Set(showcase.map((product) => product.id)));
  const perfumes = products.filter((product) => product.category === "perfume");

  return (
    <div className="mx-auto max-w-6xl px-4 pb-8 md:px-8 md:pb-10">
      <h1 className="sr-only">El Barbudo — perfumes y cuidado para el hombre</h1>

      {products.length === 0 ? (
        <p className="pt-8 text-muted md:pt-12">Pronto vas a ver acá nuestros productos.</p>
      ) : (
        <>
          {/* Sobre el pliegue: sin Reveal, se ve aunque no haya JS. */}
          <div className="pt-4 md:pt-8">
            <Showcase products={showcase} />
          </div>

          <div className="mt-16 space-y-16 md:mt-24 md:space-y-24">
            <Reveal>
              <CategoryTabs groups={groups} />
            </Reveal>
            {/* Sin perfumes no hay buscador: tampoco su Reveal, que dejaría un hueco doble. */}
            {perfumes.length > 0 ? (
              <Reveal>
                <FragranceFinder perfumes={perfumes} />
              </Reveal>
            ) : null}
          </div>
        </>
      )}

      {/* Una fila entre líneas: la de abajo es el borde superior del footer. */}
      <Reveal className="mt-16 md:mt-24">
        <section
          aria-labelledby="barberia-titulo"
          className="flex flex-col items-start gap-6 border-t border-line pt-8 md:flex-row md:items-center md:justify-between md:pt-10"
        >
          <div>
            <h2 id="barberia-titulo" className="font-serif text-2xl font-medium leading-tight md:text-3xl">
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
  );
}
