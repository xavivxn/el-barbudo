import "dotenv/config";
import { defineConfig } from "prisma/config";

// Mismo criterio que src/lib/prisma-client.ts: el archivo local solo es válido como valor
// por defecto en desarrollo y tests. En cualquier otro entorno se exige DATABASE_URL; si falta,
// no se declara el datasource, así `prisma generate` (postinstall) sigue funcionando y los
// comandos que sí necesitan la base (migrate, db seed) fallan con el error de Prisma.
const env = process.env.NODE_ENV;
const url = process.env.DATABASE_URL || (env === "development" || env === "test" ? "file:./dev.db" : undefined);

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  ...(url ? { datasource: { url } } : {}),
});
