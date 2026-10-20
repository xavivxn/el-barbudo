import { getPrisma } from "@/lib/db-lazy";
import { DEMO_MODE } from "@/lib/demo";
import {
  CATEGORIES,
  type Category,
  type Notes,
  type ProductDTO,
  type VariantSnapshot,
} from "@/lib/types";

type VariantRow = {
  id: string;
  label: string;
  price: number;
  stock: number;
};

export type ProductRow = {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  category: string;
  description: string;
  notes: string | null;
  benefits: string;
  tags: string;
  images: string;
  featured: boolean;
  active: boolean;
  variants: VariantRow[];
};

function parseJson(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function parseStringArray(raw: string | null): string[] {
  const value = parseJson(raw);
  if (!Array.isArray(value)) return [];
  return value.filter((x): x is string => typeof x === "string");
}

function parseNotes(raw: string | null): Notes | null {
  const v = parseJson(raw);
  if (!v || typeof v !== "object") return null;
  const { top, heart, base } = v as Record<string, unknown>;
  if (
    typeof top !== "string" ||
    typeof heart !== "string" ||
    typeof base !== "string"
  ) {
    return null;
  }
  return { top, heart, base };
}

function parseCategory(raw: string): Category {
  return CATEGORIES.some((c) => c.value === raw) ? (raw as Category) : "perfume";
}

export function toProductDTO(row: ProductRow): ProductDTO {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    subtitle: row.subtitle,
    category: parseCategory(row.category),
    description: row.description,
    notes: parseNotes(row.notes),
    benefits: parseStringArray(row.benefits),
    tags: parseStringArray(row.tags),
    images: parseStringArray(row.images),
    featured: row.featured,
    active: row.active,
    variants: row.variants.map((v) => ({
      id: v.id,
      label: v.label,
      price: v.price,
      stock: v.stock,
    })),
  };
}

/**
 * Productos relacionados: excluye el propio e inactivos; primero los de la
 * misma categoría, luego los que comparten alguna etiqueta.
 */
export function pickRelated(
  product: ProductDTO,
  candidates: ProductDTO[],
  limit = 4,
): ProductDTO[] {
  const pool = candidates.filter((c) => c.id !== product.id && c.active);
  const sameCategory = pool.filter((c) => c.category === product.category);
  const sharedTag = pool.filter(
    (c) =>
      c.category !== product.category &&
      c.tags.some((t) => product.tags.includes(t)),
  );
  return [...sameCategory, ...sharedTag].slice(0, limit);
}

/**
 * Lista de etiquetas sin repetir, en orden alfabético en español. La usan la base y la demo.
 */
export function uniqueSortedTags(tagLists: string[][]): string[] {
  const set = new Set<string>();
  for (const tags of tagLists) for (const t of tags) set.add(t);
  return [...set].sort((a, b) => a.localeCompare(b, "es"));
}

/** Foto principal y tamaño como los muestra el carrito. La usan la base y la demo. */
export function toVariantSnapshot(
  variant: VariantRow,
  product: { active: boolean; name: string; slug: string; images: string[]; variantCount: number },
): VariantSnapshot {
  return {
    id: variant.id,
    price: variant.price,
    stock: variant.stock,
    available: product.active,
    name: product.name,
    slug: product.slug,
    image: product.images[0] ?? null,
    // Igual que la ficha al agregar: el tamaño solo se nombra si hay más de uno.
    variantLabel: product.variantCount > 1 ? variant.label : null,
  };
}

/** Los datos de la demo también se cargan solo al usarlos (y así no hay ciclo de imports). */
const demo = () => import("@/lib/demo-store");

const include = { variants: { orderBy: { price: "asc" as const } } };

export async function listProducts(
  opts: {
    category?: Category;
    tag?: string;
    featuredOnly?: boolean;
    includeInactive?: boolean;
  } = {},
): Promise<ProductDTO[]> {
  if (DEMO_MODE) return (await demo()).listProducts(opts);
  const prisma = await getPrisma();
  const rows = await prisma.product.findMany({
    where: {
      ...(opts.includeInactive ? {} : { active: true }),
      ...(opts.category ? { category: opts.category } : {}),
      ...(opts.featuredOnly ? { featured: true } : {}),
    },
    include,
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
  });
  const products = rows.map(toProductDTO);
  const { tag } = opts;
  return tag ? products.filter((p) => p.tags.includes(tag)) : products;
}

export async function getProductBySlug(slug: string): Promise<ProductDTO | null> {
  if (DEMO_MODE) return (await demo()).getProductBySlug(slug);
  const prisma = await getPrisma();
  const row = await prisma.product.findUnique({ where: { slug }, include });
  if (!row || !row.active) return null;
  return toProductDTO(row);
}

/** Incluye inactivos (para el admin). */
export async function getProductById(id: string): Promise<ProductDTO | null> {
  if (DEMO_MODE) return (await demo()).getProductById(id);
  const prisma = await getPrisma();
  const row = await prisma.product.findUnique({ where: { id }, include });
  return row ? toProductDTO(row) : null;
}

export async function listTags(): Promise<string[]> {
  if (DEMO_MODE) return (await demo()).listTags();
  const prisma = await getPrisma();
  const rows = await prisma.product.findMany({
    where: { active: true },
    select: { tags: true },
  });
  return uniqueSortedTags(rows.map((r) => parseStringArray(r.tags)));
}

export async function getVariantSnapshots(
  ids: string[],
): Promise<VariantSnapshot[]> {
  if (DEMO_MODE) return (await demo()).getVariantSnapshots(ids);
  if (ids.length === 0) return [];
  const prisma = await getPrisma();
  const rows = await prisma.variant.findMany({
    where: { id: { in: ids } },
    include: {
      product: {
        select: { active: true, name: true, slug: true, images: true, _count: { select: { variants: true } } },
      },
    },
  });
  return rows.map((v) =>
    toVariantSnapshot(v, {
      active: v.product.active,
      name: v.product.name,
      slug: v.product.slug,
      images: parseStringArray(v.product.images),
      variantCount: v.product._count.variants,
    }),
  );
}
