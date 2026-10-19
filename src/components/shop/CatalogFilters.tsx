import { Chip } from "@/components/ui/Chip";
import { ChipRow } from "@/components/ui/ChipRow";
import { buildCatalogHref } from "@/lib/catalog";
import { CATEGORIES } from "@/lib/types";

type CatalogFiltersProps = {
  /** Slug de la categoría activa, ya validado. */
  categoria?: string;
  etiqueta?: string;
  tags: string[];
};

const chip = "shrink-0 whitespace-nowrap";

export function CatalogFilters({ categoria, etiqueta, tags }: CatalogFiltersProps) {
  const current = { categoria, etiqueta };

  return (
    <div className="space-y-4">
      <nav aria-label="Categorías">
        <p className="mb-1 text-sm text-muted">Categoría</p>
        <ChipRow>
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
        </ChipRow>
      </nav>

      {tags.length > 0 ? (
        <nav aria-label="Etiquetas">
          <p className="mb-1 text-sm text-muted">Etiqueta</p>
          <ChipRow>
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
          </ChipRow>
        </nav>
      ) : null}
    </div>
  );
}
