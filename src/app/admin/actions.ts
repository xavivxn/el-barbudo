"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PRICE_ERROR, STOCK_ERROR } from "@/lib/admin-messages";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseGuaranies } from "@/lib/money";
import {
  fieldErrors,
  parseProductForm,
  productSchema,
  type ProductInput,
} from "@/lib/validation";

export type FormState = { errors?: Record<string, string>; message?: string };

const SLUG_TAKEN = "Ya existe un producto con esta dirección.";

/** Tras escribir, la tienda (que lee la base en cada pedido) y el panel se vuelven a pedir. */
function revalidateAll() {
  revalidatePath("/", "layout");
}

function prismaCode(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code: unknown }).code)
    : undefined;
}

class ProductNotFound extends Error {}

/**
 * Edición en línea de una variante desde el listado. Cada campo es opcional; lo que llega pasa por
 * `parseGuaranies` igual que en el formulario.
 */
export async function updateVariant(
  variantId: string,
  data: { price?: string; stock?: string },
): Promise<{ ok: true } | { error: string }> {
  await requireAdmin();

  // Una Server Action es un endpoint público: no se confía en la forma de la entrada.
  if (typeof variantId !== "string" || !variantId) return { error: "No encontramos esta variante. Recargá la página." };
  const { price, stock } = data ?? {};
  const update: { price?: number; stock?: number } = {};

  if (price !== undefined) {
    const parsed = typeof price === "string" ? parseGuaranies(price) : null;
    if (parsed === null || parsed < 1) return { error: PRICE_ERROR };
    update.price = parsed;
  }
  if (stock !== undefined) {
    const parsed = typeof stock === "string" ? parseGuaranies(stock) : null;
    if (parsed === null) return { error: STOCK_ERROR };
    update.stock = parsed;
  }
  if (Object.keys(update).length === 0) return { ok: true };

  try {
    await prisma.variant.update({ where: { id: variantId }, data: update });
  } catch (error) {
    if (prismaCode(error) === "P2025") return { error: "No encontramos esta variante. Recargá la página." };
    throw error;
  }
  revalidateAll();
  return { ok: true };
}

/** Pone en 0 el stock de todas las variantes del producto. */
export async function markSoldOut(productId: string): Promise<{ ok: true } | { error: string }> {
  await requireAdmin();
  if (typeof productId !== "string" || !productId) return { error: "No encontramos este producto. Recargá la página." };

  await prisma.variant.updateMany({ where: { productId }, data: { stock: 0 } });
  revalidateAll();
  return { ok: true };
}

/** Invierte "destacado" o "activo". Cualquier otro nombre de campo se ignora. */
export async function toggleProductFlag(id: string, flag: "featured" | "active"): Promise<void> {
  await requireAdmin();
  if ((flag !== "featured" && flag !== "active") || typeof id !== "string") return;

  const current = await prisma.product.findUnique({ where: { id }, select: { [flag]: true } });
  if (!current) return;
  await prisma.product.update({ where: { id }, data: { [flag]: !current[flag] } });
  revalidateAll();
}

function productData(input: ProductInput) {
  return {
    slug: input.slug,
    name: input.name,
    subtitle: input.subtitle,
    category: input.category,
    description: input.description,
    notes: input.notes ? JSON.stringify(input.notes) : null,
    benefits: JSON.stringify(input.benefits),
    tags: JSON.stringify(input.tags),
    images: JSON.stringify(input.images),
    featured: input.featured,
    active: input.active,
  };
}

type VariantInput = ProductInput["variants"][number];

async function createProduct(input: ProductInput) {
  await prisma.product.create({
    data: {
      ...productData(input),
      variants: {
        create: input.variants.map(({ label, price, stock }) => ({ label, price, stock })),
      },
    },
  });
}

/** Actualiza por id, crea las nuevas y borra las quitadas, todo o nada. */
async function updateProduct(productId: string, input: ProductInput) {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.product.findUnique({
      where: { id: productId },
      select: { variants: { select: { id: true } } },
    });
    if (!existing) throw new ProductNotFound();

    const existingIds = new Set(existing.variants.map((variant) => variant.id));
    // Un id que no es de este producto se trata como variante nueva: nunca se toca la de otro.
    const kept: (VariantInput & { id: string })[] = [];
    const added: VariantInput[] = [];
    for (const variant of input.variants) {
      if (variant.id && existingIds.has(variant.id) && !kept.some((k) => k.id === variant.id)) {
        kept.push({ ...variant, id: variant.id });
      } else {
        added.push(variant);
      }
    }

    await tx.product.update({ where: { id: productId }, data: productData(input) });
    await tx.variant.deleteMany({ where: { productId, id: { notIn: kept.map((variant) => variant.id) } } });
    for (const { id, label, price, stock } of kept) {
      await tx.variant.update({ where: { id }, data: { label, price, stock } });
    }
    if (added.length > 0) {
      await tx.variant.createMany({
        data: added.map(({ label, price, stock }) => ({ productId, label, price, stock })),
      });
    }
  });
}

export async function saveProduct(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();

  const parsed = productSchema.safeParse(parseProductForm(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed) };

  const id = formData.get("productId");
  const productId = typeof id === "string" && id ? id : null;

  try {
    if (productId) await updateProduct(productId, parsed.data);
    else await createProduct(parsed.data);
  } catch (error) {
    if (error instanceof ProductNotFound) {
      return { message: "No encontramos este producto. Puede que ya lo hayan borrado." };
    }
    if (prismaCode(error) === "P2002") return { errors: { slug: SLUG_TAKEN } };
    console.error("saveProduct", error);
    return { message: "No pudimos guardar el producto. Probá de nuevo." };
  }

  revalidateAll();
  // redirect lanza una excepción de control de flujo: va fuera del try/catch.
  redirect("/admin?guardado=1");
}
