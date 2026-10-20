"use client";

import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId } from "react";
import { focusRing } from "@/components/ui/focus";
import { buildCatalogHref, SORT_OPTIONS, type SortKey, sortFromParam } from "@/lib/catalog";

type SortSelectProps = {
  current: { categoria?: string; etiqueta?: string; orden: SortKey };
  className?: string;
};

/**
 * Orden del catálogo: un `<select>` nativo dentro de un formulario GET que conserva los otros
 * filtros. Con JS navega al cambiar; sin JS aparece "Aplicar" y el formulario envía igual.
 */
export function SortSelect({ current, className = "" }: SortSelectProps) {
  const router = useRouter();
  const id = useId();

  return (
    <form method="get" action="/productos" className={`flex items-center gap-2 ${className}`}>
      {current.categoria ? <input type="hidden" name="categoria" value={current.categoria} /> : null}
      {current.etiqueta ? <input type="hidden" name="etiqueta" value={current.etiqueta} /> : null}
      <label htmlFor={id} className="sr-only">
        Ordenar por
      </label>
      <div className="relative min-w-0 flex-1 md:flex-none">
        <select
          id={id}
          name="orden"
          defaultValue={current.orden}
          onChange={(event) =>
            router.push(buildCatalogHref(current, { orden: sortFromParam(event.currentTarget.value) }))
          }
          className={`w-full min-h-11 cursor-pointer appearance-none rounded-full border border-line bg-bg pr-9 pl-4 text-sm text-fg transition-colors duration-200 hover:border-fg ${focusRing}`}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-muted"
        />
      </div>
      <noscript>
        <button
          type="submit"
          className={`inline-flex min-h-11 items-center rounded-full border border-fg px-4 text-sm ${focusRing}`}
        >
          Aplicar
        </button>
      </noscript>
    </form>
  );
}
