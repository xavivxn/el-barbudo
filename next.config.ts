import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Las fotos de productos las carga el admin desde cualquier host https.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
