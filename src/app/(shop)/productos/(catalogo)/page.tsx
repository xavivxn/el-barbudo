import { X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CatalogFilters } from "@/components/shop/CatalogFilters";
import { ProductGrid } from "@/components/shop/ProductGrid";
import { Chip } from "@/components/ui/Chip";
import { buildCatalogHref, categoryFromSlug, firstParam } from "@/lib/catalog";
import { listProducts, listTags } from "@/lib/products";

export const dynamic = "force-dynamic";

function readFilters(searchParams: Record<string, string | string[] | undefined>) {
  const category = categoryFromSlug(firstParam(searchParams.categoria));
  return { category, etiqueta: firstParam(searchParams.etiqueta) || undefined };
}

export async function generateMetadata(props: PageProps<"/productos">): Promise<Metadata> {
  const { category } = readFilters(await props.searchParams);
  return { title: `${category?.label ?? "Productos"} — El Barbudo` };
}

export default async function CatalogPage(props: PageProps<"/productos">) {
  const { category, etiqueta } = readFilters(await props.searchParams);
  const [products, tags] = await Promise.all([
    listProducts({ category: category?.value, tag: etiqueta }),
    listTags(),
  ]);
  const current = { categoria: category?.slug, etiqueta };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-10 md:px-8 md:pb-28 md:pt-16">
      <header className="mb-8 md:mb-10">
        <h1 className="font-serif text-4xl font-medium leading-tight md:text-5xl">
          {category?.label ?? "Todos los productos"}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="text-muted">
            {products.length === 1 ? "1 producto" : `${products.length} productos`}
          </p>
          {etiqueta ? (
            <Chip href={buildCatalogHref(current, { etiqueta: null })} className="gap-2 border-fg">
              <span className="sr-only">Quitar etiqueta </span>
              {etiqueta}
              <X size={16} aria-hidden="true" />
            </Chip>
          ) : null}
        </div>
      </header>

      <div className="mb-10 md:mb-12">
        <CatalogFilters categoria={category?.slug} etiqueta={etiqueta} tags={tags} />
      </div>

      <ProductGrid
        products={products}
        headingLevel={2}
        empty={
          <div className="flex flex-col items-start gap-2">
            <p>No hay productos en esta categoría todavía</p>
            <Link
              href="/productos"
              className="inline-flex min-h-11 items-center text-fg underline underline-offset-8 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Ver todos
            </Link>
          </div>
        }
      />
    </div>
  );
}
