import { DEFAULT_SORT, type SortKey, sortProducts } from "@/lib/catalog";
import { products as catalog, services as catalogServices } from "@/lib/catalog-data";
import { toProductDTO, toVariantSnapshot, uniqueSortedTags, type ProductRow } from "@/lib/products";
import type { Category, ProductDTO, ServiceDTO, VariantSnapshot } from "@/lib/types";

/**
 * Lecturas del modo demo: el catálogo de `catalog-data.ts` en memoria, con los mismos contratos que
 * las lecturas de la base en `products.ts` y `services.ts` (que delegan acá cuando `DEMO_MODE`).
 * Ids estables (`demo-<slug>`, `demo-<slug>-<n>`) para que el carrito guardado siga valiendo entre deploys.
 */

/** Cada producto pasa por la misma fila que escribe el seed y el mismo `toProductDTO` que la base. */
function toRow(p: (typeof catalog)[number]): ProductRow {
  const id = `demo-${p.slug}`;
  return {
    id,
    slug: p.slug,
    name: p.name,
    subtitle: p.subtitle,
    category: p.category,
    description: p.description,
    notes: p.notes ? JSON.stringify(p.notes) : null,
    benefits: JSON.stringify(p.benefits ?? []),
    tags: JSON.stringify(p.tags),
    images: JSON.stringify(p.images),
    featured: p.featured ?? false,
    active: true,
    // Las variantes salen de la base ordenadas por precio; el id usa la posición en el catálogo.
    variants: p.variants
      .map((v, i) => ({ id: `${id}-${i}`, ...v }))
      .sort((a, b) => a.price - b.price),
  };
}

let cache: ProductDTO[] | null = null;

/**
 * Mismo orden que `listProducts` en la base: destacados primero y después por `createdAt` desc,
 * que en el seed es el orden del catálogo (el primero es el más reciente). `sort` es estable.
 */
function allProducts(): ProductDTO[] {
  cache ??= catalog.map((p) => toProductDTO(toRow(p))).sort((a, b) => Number(b.featured) - Number(a.featured));
  return cache;
}

export async function listProducts(
  opts: {
    category?: Category;
    tag?: string;
    featuredOnly?: boolean;
    includeInactive?: boolean;
    orden?: SortKey;
  } = {},
): Promise<ProductDTO[]> {
  const { category, tag, featuredOnly, includeInactive, orden } = opts;
  const products = allProducts().filter(
    (p) =>
      (includeInactive || p.active) &&
      (!category || p.category === category) &&
      (!featuredOnly || p.featured) &&
      (!tag || p.tags.includes(tag)),
  );
  return sortProducts(products, orden ?? DEFAULT_SORT);
}

export async function getProductBySlug(slug: string): Promise<ProductDTO | null> {
  return allProducts().find((p) => p.slug === slug && p.active) ?? null;
}

/** Incluye inactivos (para el admin), como en la base. */
export async function getProductById(id: string): Promise<ProductDTO | null> {
  return allProducts().find((p) => p.id === id) ?? null;
}

export async function listTags(): Promise<string[]> {
  return uniqueSortedTags(allProducts().filter((p) => p.active).map((p) => p.tags));
}

/** Las variantes que no existen no vuelven, igual que en la base. */
export async function getVariantSnapshots(ids: string[]): Promise<VariantSnapshot[]> {
  const wanted = new Set(ids);
  const out: VariantSnapshot[] = [];
  for (const p of allProducts()) {
    for (const v of p.variants) {
      if (!wanted.has(v.id)) continue;
      out.push(
        toVariantSnapshot(v, {
          active: p.active,
          name: p.name,
          slug: p.slug,
          images: p.images,
          variantCount: p.variants.length,
        }),
      );
    }
  }
  return out;
}

export async function listServices(): Promise<ServiceDTO[]> {
  return catalogServices.map((s, order) => ({ id: `demo-servicio-${order}`, ...s, order }));
}
