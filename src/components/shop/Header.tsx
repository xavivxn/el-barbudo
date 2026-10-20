"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CartButton } from "@/components/shop/CartButton";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { CATEGORIES } from "@/lib/types";

const NAV = [
  ...CATEGORIES.map((c) => ({
    key: c.slug,
    label: c.label,
    href: `/productos?categoria=${c.slug}`,
  })),
  { key: "barberia", label: "La barbería", href: "/barberia" },
];

/** Ítem activo: la categoría filtrada en el catálogo o la página de la barbería. */
function currentKey(pathname: string, categoria: string | null): string | null {
  if (pathname === "/barberia") return "barberia";
  if (pathname === "/productos") return categoria;
  return null;
}

function useScrolledPast(px: number) {
  return useSyncExternalStore(
    (onChange) => {
      window.addEventListener("scroll", onChange, { passive: true });
      return () => window.removeEventListener("scroll", onChange);
    },
    () => window.scrollY > px,
    () => false,
  );
}

type NavLinksProps = {
  current: string | null;
  variant: "desktop" | "mobile";
  onNavigate?: () => void;
};

function NavLinks({ current, variant, onNavigate }: NavLinksProps) {
  const mobile = variant === "mobile";
  return (
    <ul className={mobile ? "flex flex-col" : "flex items-center gap-8"}>
      {NAV.map((item) => (
        <li key={item.key} className={mobile ? "border-b border-line" : undefined}>
          <Link
            href={item.href}
            onClick={onNavigate}
            aria-current={current === item.key ? "page" : undefined}
            className={
              mobile
                ? "flex min-h-14 items-center font-serif text-2xl font-medium aria-[current=page]:underline aria-[current=page]:underline-offset-8 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
                : "inline-flex min-h-11 items-center text-sm tracking-wide underline-offset-8 hover:underline aria-[current=page]:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            }
          >
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Lee la categoría activa de la URL; va dentro de <Suspense> por useSearchParams. */
function ActiveNavLinks(props: Omit<NavLinksProps, "current">) {
  const pathname = usePathname();
  const params = useSearchParams();
  return <NavLinks current={currentKey(pathname, params.get("categoria"))} {...props} />;
}

function Nav(props: Omit<NavLinksProps, "current">) {
  const pathname = usePathname();
  return (
    <Suspense fallback={<NavLinks current={currentKey(pathname, null)} {...props} />}>
      <ActiveNavLinks {...props} />
    </Suspense>
  );
}

export function Header() {
  const scrolled = useScrolledPast(0);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  function openMenu() {
    dialogRef.current?.showModal();
    setMenuOpen(true);
    document.documentElement.style.overflow = "hidden";
  }

  function closeMenu() {
    dialogRef.current?.close();
  }

  // Si el viewport pasa a escritorio con el menú abierto, se cierra para no dejar la página inerte.
  useEffect(() => {
    const query = window.matchMedia("(min-width: 768px)");
    const onChange = () => {
      if (query.matches) dialogRef.current?.close();
    };
    query.addEventListener("change", onChange);
    return () => {
      query.removeEventListener("change", onChange);
      document.documentElement.style.overflow = "";
    };
  }, []);

  return (
    <>
      <header
        className={`sticky top-0 z-40 h-14 border-b bg-bg text-fg transition-colors duration-200 ${
          scrolled ? "border-line" : "border-transparent"
        }`}
      >
        <div className="mx-auto flex h-full max-w-6xl items-center gap-2 px-4 md:gap-4 md:px-8">
          <Link
            href="/"
            aria-label="El Barbudo, inicio"
            className="flex min-h-11 shrink-0 items-center gap-2 md:gap-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <Logo variant="mark" preload />
            {/* Bajo 360 px la palabra se achica: con los tres botones de 44 px la fila entra en 320 con su margen. */}
            <span className="font-serif text-lg font-semibold tracking-[0.16em] max-[359px]:text-[15px] max-[359px]:tracking-[0.06em] md:text-xl md:tracking-[0.22em]">
              EL BARBUDO
            </span>
          </Link>

          <nav aria-label="Principal" className="hidden flex-1 justify-center md:flex">
            <Nav variant="desktop" />
          </nav>

          <div className="ml-auto flex items-center md:ml-0 md:gap-1">
            <ThemeToggle />
            <CartButton />
            <button
              ref={triggerRef}
              type="button"
              aria-label="Abrir menú"
              aria-haspopup="dialog"
              aria-expanded={menuOpen}
              onClick={openMenu}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors duration-200 hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent md:hidden"
            >
              <Menu size={22} aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <dialog
        ref={dialogRef}
        aria-label="Menú"
        onClose={() => {
          setMenuOpen(false);
          document.documentElement.style.overflow = "";
          triggerRef.current?.focus();
        }}
        onClick={(event) => {
          // Con el panel ocupando todo el <dialog>, solo el fondo oscurecido llega con este target.
          if (event.target === event.currentTarget) closeMenu();
        }}
        className="menu-sheet fixed inset-x-0 top-0 m-0 max-h-dvh w-full max-w-none overflow-y-auto bg-bg p-0 text-fg backdrop:bg-black/50 md:hidden"
      >
        <div className="px-4 pb-6">
          <div className="flex h-14 items-center justify-between">
            <span className="font-serif text-xl font-semibold tracking-[0.22em]">EL BARBUDO</span>
            <button
              type="button"
              aria-label="Cerrar menú"
              onClick={closeMenu}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors duration-200 hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <X size={22} aria-hidden="true" />
            </button>
          </div>
          <nav aria-label="Menú principal">
            <Nav variant="mobile" onNavigate={closeMenu} />
          </nav>
        </div>
      </dialog>
    </>
  );
}
