import { prisma } from "@/lib/db";
import type { ServiceDTO } from "@/lib/types";

export async function listServices(): Promise<ServiceDTO[]> {
  const rows = await prisma.service.findMany({ orderBy: [{ order: "asc" }, { id: "asc" }] });
  return rows.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    price: s.price,
    order: s.order,
  }));
}
