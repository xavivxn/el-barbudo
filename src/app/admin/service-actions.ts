"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getPrisma } from "@/lib/db-lazy";
import { fieldErrors, parseServiceForm, serviceSchema } from "@/lib/validation";
import type { FormState } from "./actions";

/**
 * Acciones del admin de servicios. Van aparte de `actions.ts` (productos) para que ese archivo no
 * crezca; siguen el mismo orden: sesión, lectura de la entrada, validación, escritura, revalidar.
 */

function revalidateAll() {
  revalidatePath("/", "layout");
}

/** Crea (sin `id`) o actualiza (con `id`) un servicio. Al terminar devuelve `{ saved: true }`. */
export async function saveService(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();

  const parsed = serviceSchema.safeParse(parseServiceForm(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed) };
  const { name, description, price } = parsed.data;

  const rawId = formData.get("id");
  const id = typeof rawId === "string" && rawId ? rawId : null;
  const prisma = await getPrisma();

  try {
    if (id) {
      // El orden no se escribe acá: el formulario trae el que leyó al abrirse y podría pisar un
      // "Subir" o "Bajar" hecho después. El orden solo cambia con `moveService`.
      const { count } = await prisma.service.updateMany({ where: { id }, data: { name, description, price } });
      if (count === 0) return { message: "No encontramos este servicio. Puede que ya lo hayan borrado." };
    } else {
      // Un servicio nuevo va al final; se calcula en el servidor, no con el orden del formulario.
      await prisma.$transaction(async (tx) => {
        const { _max } = await tx.service.aggregate({ _max: { order: true } });
        await tx.service.create({ data: { name, description, price, order: (_max.order ?? -1) + 1 } });
      });
    }
  } catch (error) {
    // Un redirect/notFound de Next no es un fallo de la base: sigue su camino.
    unstable_rethrow(error);
    console.error("saveService", error);
    return { message: "No pudimos guardar el servicio. Probá de nuevo." };
  }

  revalidateAll();
  return { saved: true };
}

/** Borra por id. Si ya no existe no pasa nada. */
export async function deleteService(id: string): Promise<void> {
  await requireAdmin();
  if (typeof id !== "string" || !id) return;

  const prisma = await getPrisma();
  await prisma.service.deleteMany({ where: { id } });
  revalidateAll();
}

/**
 * Intercambia el servicio con su vecino. Primero renumera 0..n-1 según el orden actual (desempata
 * por id), así dos servicios con el mismo `order`, o huecos tras borrar, no rompen el intercambio.
 * En los extremos no hace nada.
 */
export async function moveService(id: string, direction: "up" | "down"): Promise<void> {
  await requireAdmin();
  if (typeof id !== "string" || !id || (direction !== "up" && direction !== "down")) return;

  const prisma = await getPrisma();
  await prisma.$transaction(async (tx) => {
    const current = await tx.service.findMany({
      orderBy: [{ order: "asc" }, { id: "asc" }],
      select: { id: true, order: true },
    });
    const from = current.findIndex((service) => service.id === id);
    const to = direction === "up" ? from - 1 : from + 1;
    if (from === -1 || to < 0 || to >= current.length) return;

    const next = [...current];
    [next[from], next[to]] = [next[to], next[from]];
    // Solo se reescribe lo que cambia de posición.
    for (const [position, service] of next.entries()) {
      if (service.order !== position) {
        await tx.service.update({ where: { id: service.id }, data: { order: position } });
      }
    }
  });
  revalidateAll();
}
