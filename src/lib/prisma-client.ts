import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

const DEV_DATABASE_URL = "file:./dev.db";

/**
 * Única construcción del cliente + adapter. Para cambiar de motor (p. ej.
 * Postgres) se edita solo este archivo.
 */
export function createPrismaClient(): PrismaClient {
  const env = process.env.NODE_ENV;
  let url = process.env.DATABASE_URL;
  if (!url) {
    if (env === "development" || env === "test") {
      url = DEV_DATABASE_URL;
    } else {
      throw new Error(
        "Falta la variable de entorno DATABASE_URL. Defínela (ver .env.example) antes de iniciar la aplicación.",
      );
    }
  }
  return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });
}
