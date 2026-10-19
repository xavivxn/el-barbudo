import type { NextConfig } from "next";
import { assertProductionEnv, shouldCheckProductionEnv } from "./src/lib/env-check";

// En el deploy de producción (o con CHECK_PROD_ENV=1) el build falla si falta una variable clave.
if (shouldCheckProductionEnv(process.env)) assertProductionEnv(process.env);

const nextConfig: NextConfig = {
  images: {
    // Las fotos de productos las carga el admin desde cualquier host https.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
