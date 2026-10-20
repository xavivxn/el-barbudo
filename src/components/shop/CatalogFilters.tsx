import { X } from "lucide-react";
import Link from "next/link";
import { SortSelect } from "@/components/shop/SortSelect";
import { TagRail } from "@/components/shop/TagRail";
import { TagsSheet } from "@/components/shop/TagsSheet";
import { Chip } from "@/components/ui/Chip";
import { focusRing } from "@/components/ui/focus";
import { buildCatalogHref, type SortKey } from "@/lib/catalog";
import { CATEGORIES } from "@/lib/types";

type CatalogFiltersProps = {
  /** Slug de la categoría activa, ya validado. */
  categoria?: string;
  etiqueta?: string;
  orden: SortKey;
  tags: string[];
};

const chip = "shrink-0 whitespace-nowrap";

/**
 * Barra de filtros del catálogo. Queda pegada bajo el header (56 px) al hacer scroll: categorías
 * como pestañas, etiquetas en un riel (desktop) o en una hoja inferior (móvil), orden y "Limpiar".
 * Todo son enlaces con query params: sin JS funciona igual (la hoja se abre por `#etiquetas`).
 */
export function CatalogFilters({ categoria, etiqueta, orden, tags }: CatalogFiltersProps) {
  const current = { categoria, etiqueta, orden };
  const filtered = Boolean(categoria || etiqueta);

  return (
    <div className="sticky top-14 z-30 -mx-4 border-b border-line bg-bg/85 px-4 backdrop-blur-md md:mx-0 md:px-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
        <nav aria-label="Categorías" className="w-full min-w-0 md:w-auto">
          {/* Móvil: una línea desplazable que sangra hasta el borde; desktop: en su sitio. */}
          <ul className="-mx-4 flex gap-2 overflow-x-auto scroll-px-4 px-4 py-1 [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden">
            <li className="shrink-0">
              <Chip href={buildCatalogHref(current, { categoria: null })} active={!categoria} className={chip}>
                Todos
              </Chip>
            </li>
            {CATEGORIES.map((category) => (
              <li key={category.slug} className="shrink-0">
                <Chip
                  href={buildCatalogHref(current, { categoria: category.slug })}
                  active={categoria === category.slug}
                  className={chip}
                >
                  {category.label}
                </Chip>
              </li>
            ))}
          </ul>
        </nav>

        {tags.length > 0 ? (
          <>
            <div aria-hidden="true" className="hidden h-6 w-px bg-line md:block" />
            <nav aria-label="Etiquetas" className="hidden min-w-0 flex-1 md:block">
              <TagRail>
                {tags.map((tag) => {
                  const active = etiqueta === tag;
                  return (
                    <li key={tag} className="shrink-0">
                      {/* La etiqueta activa vuelve a quitar el filtro. */}
                      <Chip
                        href={buildCatalogHref(current, { etiqueta: active ? null : tag })}
                        active={active}
                        className={chip}
                      >
                        {tag}
                      </Chip>
                    </li>
                  );
                })}
              </TagRail>
            </nav>
          </>
        ) : null}

        {/* Móvil: segunda fila (etiquetas, orden, limpiar). En desktop el envoltorio se disuelve en la barra. */}
        <div className="flex w-full items-center gap-2 md:contents">
          {tags.length > 0 ? <TagsSheet current={current} tags={tags} className="shrink-0 md:hidden" /> : null}
          <SortSelect current={current} className="min-w-0 flex-1 md:flex-none" />
          {filtered ? (
            <Link
              href="/productos"
              aria-label="Limpiar filtros"
              className={`inline-flex h-11 w-11 shrink-0 items-center justify-center gap-1.5 rounded-full border border-line text-muted transition-colors duration-200 hover:border-fg hover:text-fg md:w-auto md:border-0 md:px-3 md:text-sm ${focusRing}`}
            >
              <X size={16} aria-hidden="true" />
              <span className="hidden md:inline">Limpiar</span>
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
