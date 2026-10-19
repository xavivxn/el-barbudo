import type { Metadata } from "next";
import { ProductForm } from "@/components/admin/ProductForm";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Nuevo producto" };

export default async function NewProductPage() {
  await requireAdmin();
  return (
    <>
      <h1 className="text-2xl font-semibold">Nuevo producto</h1>
      <ProductForm />
    </>
  );
}
