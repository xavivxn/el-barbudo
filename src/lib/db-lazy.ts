/**
 * El cliente de Prisma, cargado solo cuando se usa. `@/lib/db` crea el cliente al importarse y en
 * producción falla sin `DATABASE_URL`: con un import estático, la demo (que no tiene base) caería
 * con solo cargar un módulo que lo importa. Fuera de este archivo, nadie importa `@/lib/db` de forma estática.
 */
export async function getPrisma() {
  return (await import("@/lib/db")).prisma;
}
