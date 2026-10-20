import type { ReactNode } from "react";
import { CartDrawer } from "@/components/shop/CartDrawer";
import { Footer } from "@/components/shop/Footer";
import { Header } from "@/components/shop/Header";

/** Estructura común de la tienda: la usan `(shop)/layout` y el 404 global. */
export function ShopShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-fg focus:px-5 focus:py-3 focus:text-bg"
      >
        Saltar al contenido
      </a>
      <Header />
      <main id="contenido" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>
      <Footer />
      <CartDrawer />
    </div>
  );
}
