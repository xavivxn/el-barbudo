import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/ProductForm";
import { requireAdmin } from "@/lib/auth";
import { getProductById } from "@/lib/products";

export const metadata: Metadata = { title: "Editar producto" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) notFound();
  return (
    <>
      <h1 className="text-2xl font-semibold">Editar producto</h1>
      <p className="mt-1 text-muted">{product.name}</p>
      <ProductForm product={product} />
    </>
  );
}
