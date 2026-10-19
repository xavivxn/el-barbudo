import { Check } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ProductGallery } from "@/components/shop/ProductGallery";
import { ProductGrid } from "@/components/shop/ProductGrid";
import { ProductPurchase } from "@/components/shop/ProductPurchase";
import { Chip } from "@/components/ui/Chip";
import { buildCatalogHref } from "@/lib/catalog";
import { getProductBySlug, listProducts, pickRelated } from "@/lib/products";
import { isSoldOut } from "@/lib/stock";
import { CATEGORIES } from "@/lib/types";

export const dynamic = "force-dynamic";

// generateMetadata y la página piden el mismo producto: una sola consulta por request.
const getProduct = cache(getProductBySlug);

const sectionHeading = "mb-4 text-sm uppercase tracking-[0.16em] text-muted";

export async function generateMetadata(
  props: PageProps<"/productos/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const product = await getProduct(slug);
  if (!product) return { title: "Producto no encontrado — El Barbudo" };
  return { title: `${product.name} — El Barbudo`, description: product.description };
}

export default async function ProductPage(props: PageProps<"/productos/[slug]">) {
  const { slug } = await props.params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const related = pickRelated(product, await listProducts());
  const category = CATEGORIES.find((c) => c.value === product.category);
  const soldOut = isSoldOut(product.variants);
  const notes = product.notes
    ? [
        { label: "Salida", value: product.notes.top },
        { label: "Corazón", value: product.notes.heart },
        { label: "Fondo", value: product.notes.base },
      ]
    : null;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 md:px-8 md:pb-28 md:pt-12">
      <div className="grid gap-8 md:grid-cols-2 md:gap-12 lg:gap-16">
        <div className="-mx-4 md:sticky md:top-20 md:mx-0 md:self-start">
          <ProductGallery images={product.images} name={product.name} />
        </div>

        <div className="flex flex-col">
          {category ? (
            <Link
              href={`/productos?categoria=${category.slug}`}
              className="inline-flex min-h-11 items-center self-start text-xs uppercase tracking-[0.16em] text-muted underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {category.label}
            </Link>
          ) : null}
          <h1 className="font-serif text-4xl font-medium leading-tight md:text-5xl">
            {product.name}
          </h1>
          {product.subtitle ? (
            <p className="mt-2 text-lg text-muted">{product.subtitle}</p>
          ) : null}

          {soldOut ? (
            <p className="mt-4 self-start rounded-full border border-fg px-3 py-1 text-xs font-medium uppercase tracking-[0.16em]">
              Agotado
            </p>
          ) : (
            <p className="mt-4 inline-flex items-center gap-2 text-sm text-ok">
              <Check size={16} aria-hidden="true" />
              En stock
            </p>
          )}

          <div className="mt-8">
            <ProductPurchase product={product} />
          </div>

          {product.description ? (
            <p className="mt-10 max-w-prose whitespace-pre-line">{product.description}</p>
          ) : null}

          {notes ? (
            <section aria-labelledby="notas" className="mt-10">
              <h2 id="notas" className={sectionHeading}>
                Notas olfativas
              </h2>
              <dl className="border-b border-line">
                {notes.map((row) => (
                  <div
                    key={row.label}
                    className="grid grid-cols-[6.5rem_1fr] gap-4 border-t border-line py-3"
                  >
                    <dt className="text-muted">{row.label}</dt>
                    <dd>{row.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : product.benefits.length > 0 ? (
            <section aria-labelledby="beneficios" className="mt-10">
              <h2 id="beneficios" className={sectionHeading}>
                Lo que hace
              </h2>
              <ul className="border-b border-line">
                {product.benefits.map((benefit) => (
                  <li key={benefit} className="border-t border-line py-3">
                    {benefit}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {product.tags.length > 0 ? (
            <section aria-labelledby="etiquetas" className="mt-10">
              <h2 id="etiquetas" className={sectionHeading}>
                Etiquetas
              </h2>
              <ul className="flex flex-wrap gap-2">
                {product.tags.map((tag) => (
                  <li key={tag}>
                    <Chip href={buildCatalogHref({}, { etiqueta: tag })}>{tag}</Chip>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>

      {related.length > 0 ? (
        <section aria-labelledby="relacionados" className="mt-20 border-t border-line pt-12 md:mt-28">
          <h2 id="relacionados" className="mb-8 font-serif text-3xl font-medium md:mb-10 md:text-4xl">
            También te puede gustar
          </h2>
          <ProductGrid products={related} />
        </section>
      ) : null}
    </div>
  );
}
