import Link from "next/link";
import type { ReactNode } from "react";

type ChipProps = {
  href: string;
  active?: boolean;
  className?: string;
  children: ReactNode;
};

const base =
  "inline-flex min-h-11 items-center justify-center rounded-full border px-5 text-sm transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

/** Enlace con forma de chip (filtros y etiquetas). El activo lleva `aria-current="page"`. */
export function Chip({ href, active = false, className = "", children }: ChipProps) {
  const tone = active
    ? "border-fg bg-fg text-bg"
    : "border-line text-fg hover:border-fg";

  return (
    <Link href={href} className={`${base} ${tone} ${className}`} aria-current={active ? "page" : undefined}>
      {children}
    </Link>
  );
}
