import { Chip } from "@/components/ui/Chip";
import { buildCatalogHref } from "@/lib/catalog";
import { CATEGORIES } from "@/lib/types";

type CatalogFiltersProps = {
  /** Slug de la categoría activa, ya validado. */
  categoria?: string;
  etiqueta?: string;
  tags: string[];
};

/**
 * Móvil: una sola línea con scroll horizontal (sin barra visible; los enlaces siguen
 * alcanzables con Tab). Escritorio: las filas se acomodan en varias líneas.
 * El padding vertical deja sitio al anillo de foco, que el overflow recortaría.
 */
const row =
  "-mx-4 flex gap-2 overflow-x-auto px-4 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:flex-wrap md:overflow-visible md:px-0";
const chip = "shrink-0 whitespace-nowrap";

export function CatalogFilters({ categoria, etiqueta, tags }: CatalogFiltersProps) {
  const current = { categoria, etiqueta };

  return (
    <div className="space-y-4">
      <nav aria-label="Categorías">
        <p className="mb-1 text-sm text-muted">Categoría</p>
        <ul className={row}>
          <li className="shrink-0">
            <Chip
              href={buildCatalogHref(current, { categoria: null })}
              active={!categoria}
              className={chip}
            >
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
        <nav aria-label="Etiquetas">
          <p className="mb-1 text-sm text-muted">Etiqueta</p>
          <ul className={row}>
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
          </ul>
        </nav>
      ) : null}
    </div>
  );
}
