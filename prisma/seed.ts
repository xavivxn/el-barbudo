// ATENCION: este seed BORRA todos los productos, variantes y servicios antes de
// recrearlos. Solo para desarrollo o demo; nunca correrlo contra datos reales.
import "dotenv/config";
import { products, services } from "../src/lib/catalog-data";
import { createPrismaClient } from "../src/lib/prisma-client";

const prisma = createPrismaClient();

async function main() {
  await prisma.variant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.service.deleteMany();

  const base = Date.now();
  for (const [i, p] of products.entries()) {
    await prisma.product.create({
      data: {
        slug: p.slug,
        name: p.name,
        subtitle: p.subtitle,
        category: p.category,
        description: p.description,
        notes: p.notes ? JSON.stringify(p.notes) : null,
        benefits: JSON.stringify(p.benefits ?? []),
        tags: JSON.stringify(p.tags),
        images: JSON.stringify(p.images),
        featured: p.featured ?? false,
        active: true,
        // el primero de la lista es el más reciente
        createdAt: new Date(base - i * 1000),
        variants: { create: p.variants },
      },
    });
  }

  for (const [order, s] of services.entries()) {
    await prisma.service.create({ data: { ...s, order } });
  }

  console.log(`Seed listo: ${products.length} productos, ${services.length} servicios`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
