import type { ReactNode } from "react";
import { CartDrawer } from "@/components/shop/CartDrawer";
import { Footer } from "@/components/shop/Footer";
import { Header } from "@/components/shop/Header";
import { DEMO_MODE } from "@/lib/demo";

/** Estructura común de la tienda: la usan `(shop)/layout` y el 404 global. En modo demo suma un aviso arriba. */
export function ShopShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-fg focus:px-5 focus:py-3 focus:text-bg"
      >
        Saltar al contenido
      </a>
      {DEMO_MODE && (
        // Fuera del header: al bajar se va con la página y el header queda fijo arriba como siempre.
        <div className="flex min-h-8 items-center justify-center bg-fg px-4 py-1 text-center text-xs leading-tight text-bg">
          Tienda de demostración · productos, precios y WhatsApp de ejemplo
        </div>
      )}
      <Header />
      <main id="contenido" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>
      <Footer />
      <CartDrawer />
    </div>
  );
}
