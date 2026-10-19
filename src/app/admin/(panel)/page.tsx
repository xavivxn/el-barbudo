import type { Metadata } from "next";
import Link from "next/link";
import { ProductRow } from "@/components/admin/ProductRow";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { requireAdmin } from "@/lib/auth";
import { categoryFromSlug, firstParam } from "@/lib/catalog";
import { listProducts } from "@/lib/products";
import { CATEGORIES } from "@/lib/types";

export const metadata: Metadata = { title: "Productos" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminProductsPage({ searchParams }: Props) {
  // El layout también lo hace, pero en pedidos RSC el layout puede saltarse: cada página lo repite.
  await requireAdmin();

  const params = await searchParams;
  const category = categoryFromSlug(firstParam(params.categoria));
  const products = await listProducts({ includeInactive: true, category: category?.value });

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Productos</h1>
        <Button href="/admin/productos/nuevo">Nuevo producto</Button>
      </div>

      <nav aria-label="Filtrar por categoría" className="mt-6 flex flex-wrap gap-2">
        <Chip href="/admin" active={!category}>
          Todos
        </Chip>
        {CATEGORIES.map(({ slug, label }) => (
          <Chip key={slug} href={`/admin?categoria=${slug}`} active={category?.slug === slug}>
            {label}
          </Chip>
        ))}
      </nav>

      <p className="mt-4 text-sm text-muted">
        {products.length === 1 ? "1 producto" : `${products.length} productos`}
      </p>

      {products.length === 0 ? (
        <p className="mt-6">
          {category ? "No hay productos en esta categoría." : "Todavía no cargaste productos."}{" "}
          <Link
            href="/admin/productos/nuevo"
            className="underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Creá el primero
          </Link>
          .
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-4">
          {products.map((product) => (
            <ProductRow key={product.id} product={product} />
          ))}
        </ul>
      )}
    </>
  );
}
