import type { Metadata } from "next";
import { ServiceList } from "@/components/admin/ServiceList";
import { requireAdmin } from "@/lib/auth";
import { listServices } from "@/lib/services";

export const metadata: Metadata = { title: "Servicios" };

export default async function AdminServicesPage() {
  // El layout también lo hace, pero en pedidos RSC el layout puede saltarse: cada página lo repite.
  await requireAdmin();

  const services = await listServices();
  return <ServiceList services={services} />;
}
