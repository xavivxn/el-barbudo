import type { ReactNode } from "react";

/** Fade de entrada de 200 ms en cada navegación. La regla global de reduced-motion lo neutraliza. */
export default function ShopTemplate({ children }: { children: ReactNode }) {
  return <div className="animate-page-in">{children}</div>;
}
