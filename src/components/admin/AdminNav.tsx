"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/admin/login/actions";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const links = [
  { href: "/admin", label: "Productos", exact: true },
  { href: "/admin/servicios", label: "Servicios", exact: false },
];

const linkBase =
  "inline-flex min-h-11 items-center rounded-lg px-3 text-base transition-colors duration-200 hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export function AdminNav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-line bg-bg">
      <nav
        aria-label="Panel de administración"
        className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-2 gap-y-1 px-4 py-2"
      >
        {links.map(({ href, label, exact }) => {
          const current = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={current ? "page" : undefined}
              className={`${linkBase} ${current ? "bg-surface font-semibold underline decoration-2 underline-offset-8" : ""}`}
            >
              {label}
            </Link>
          );
        })}
        <Link href="/" className={`${linkBase} text-muted`}>
          Ver tienda
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <form action={logout}>
            <Button type="submit" variant="secondary" size="sm">
              Salir
            </Button>
          </form>
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
