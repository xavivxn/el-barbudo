import type { Metadata } from "next";
import { CatalogFilters } from "@/components/shop/CatalogFilters";
import { ProductGrid } from "@/components/shop/ProductGrid";
import { Chip } from "@/components/ui/Chip";
import { buildCatalogHref, categoryFromSlug, firstParam, sortFromParam } from "@/lib/catalog";
import { listProducts, listTags } from "@/lib/products";

export const dynamic = "force-dynamic";

function readFilters(searchParams: Record<string, string | string[] | undefined>) {
  const category = categoryFromSlug(firstParam(searchParams.categoria));
  return {
    category,
    etiqueta: firstParam(searchParams.etiqueta) || undefined,
    orden: sortFromParam(firstParam(searchParams.orden)),
  };
}

export async function generateMetadata(props: PageProps<"/productos">): Promise<Metadata> {
  const { category } = readFilters(await props.searchParams);
  return { title: `${category?.label ?? "Productos"} — El Barbudo` };
}

export default async function CatalogPage(props: PageProps<"/productos">) {
  const { category, etiqueta, orden } = readFilters(await props.searchParams);
  const [products, tags] = await Promise.all([
    listProducts({ category: category?.value, tag: etiqueta, orden }),
    listTags(),
  ]);
  const current = { categoria: category?.slug, etiqueta, orden };
  const count = products.length === 1 ? "1 producto" : `${products.length} productos`;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-8 md:px-8 md:pb-28 md:pt-12">
      <header className="mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-1 md:mb-6">
        <h1 className="font-serif text-3xl font-medium leading-tight md:text-4xl">
          {category?.label ?? "Todos los productos"}
        </h1>
        <p className="text-muted tabular-nums">{count}</p>
      </header>

      <CatalogFilters categoria={category?.slug} etiqueta={etiqueta} orden={orden} tags={tags} />

      <div className="pt-8 md:pt-10">
        <ProductGrid
          products={products}
          headingLevel={2}
          empty={
            <div className="flex flex-col items-start gap-4">
              <p className="max-w-md text-balance">
                {etiqueta ? (
                  <>
                    No hay {category ? category.label.toLowerCase() : "productos"} con la etiqueta{" "}
                    <span className="font-medium text-fg">{etiqueta}</span>.
                  </>
                ) : (
                  "No hay productos en esta categoría todavía."
                )}
              </p>
              <div className="flex flex-wrap gap-2">
                {etiqueta ? (
                  <Chip href={buildCatalogHref(current, { etiqueta: null })} active>
                    Quitar etiqueta
                  </Chip>
                ) : null}
                <Chip href="/productos" active={!etiqueta}>
                  Ver todos
                </Chip>
              </div>
            </div>
          }
        />
      </div>
    </div>
  );
}
