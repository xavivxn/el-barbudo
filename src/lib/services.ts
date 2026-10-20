import { getPrisma } from "@/lib/db-lazy";
import { DEMO_MODE } from "@/lib/demo";
import type { ServiceDTO } from "@/lib/types";

export async function listServices(): Promise<ServiceDTO[]> {
  if (DEMO_MODE) return (await import("@/lib/demo-store")).listServices();
  const prisma = await getPrisma();
  const rows = await prisma.service.findMany({ orderBy: [{ order: "asc" }, { id: "asc" }] });
  return rows.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    price: s.price,
    order: s.order,
  }));
}
