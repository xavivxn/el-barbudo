"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { type MouseEvent, useRef } from "react";
import { Chip } from "@/components/ui/Chip";
import { focusRing } from "@/components/ui/focus";
import { buildCatalogHref } from "@/lib/catalog";

type TagsSheetProps = {
  current: { categoria?: string; etiqueta?: string; orden?: string };
  tags: string[];
  className?: string;
};

const SHEET_ID = "etiquetas";

/**
 * Etiquetas en móvil: un botón "Etiquetas" que abre una hoja inferior (`<dialog>` nativo: fondo
 * oscurecido, foco atrapado y Escape para cerrar). Sin JS el botón es un enlace a `#etiquetas` y la
 * hoja se muestra por `:target` (ver `.tags-sheet` en globals).
 */
export function TagsSheet({ current, tags, className = "" }: TagsSheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const active = current.etiqueta;

  function open(event: MouseEvent<HTMLAnchorElement>) {
    const dialog = dialogRef.current;
    if (!dialog || typeof dialog.showModal !== "function") return;
    event.preventDefault();
    dialog.showModal();
  }

  return (
    <div className={className}>
      <a
        href={`#${SHEET_ID}`}
        onClick={open}
        aria-haspopup="dialog"
        className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm transition-colors duration-200 ${
          active ? "border-fg" : "border-line hover:border-fg"
        } ${focusRing}`}
      >
        <SlidersHorizontal size={16} aria-hidden="true" />
        Etiquetas
        {active ? (
          <span className="rounded-full bg-fg px-2 py-0.5 text-xs leading-none text-bg">
            1<span className="sr-only"> activa: {active}</span>
          </span>
        ) : null}
      </a>

      <dialog
        ref={dialogRef}
        id={SHEET_ID}
        aria-labelledby={`${SHEET_ID}-titulo`}
        onClick={(event) => {
          // La hoja ocupa su caja: solo el fondo oscurecido llega con este target.
          if (event.target === event.currentTarget) dialogRef.current?.close();
        }}
        className="tags-sheet menu-sheet fixed inset-x-0 top-auto bottom-0 m-0 max-h-[80dvh] w-full max-w-none overflow-y-auto rounded-t-2xl border-t border-line bg-bg p-0 text-fg backdrop:bg-black/50"
      >
        <div className="px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center justify-between">
            <h2 id={`${SHEET_ID}-titulo`} className="font-serif text-2xl font-medium">
              Etiquetas
            </h2>
            <a
              href="#"
              onClick={(event) => {
                if (dialogRef.current?.open) {
                  event.preventDefault();
                  dialogRef.current.close();
                }
              }}
              aria-label="Cerrar"
              className={`inline-flex h-11 w-11 items-center justify-center rounded-full text-fg ${focusRing}`}
            >
              <X size={20} aria-hidden="true" />
            </a>
          </div>
          <ul
            className="mt-3 flex flex-wrap gap-2"
            // Elegir una etiqueta cierra la hoja en el acto; el enlace navega igual.
            onClick={(event) => {
              if ((event.target as HTMLElement).closest("a")) dialogRef.current?.close();
            }}
          >
            {tags.map((tag) => {
              const isActive = active === tag;
              return (
                <li key={tag}>
                  <Chip href={buildCatalogHref(current, { etiqueta: isActive ? null : tag })} active={isActive}>
                    {tag}
                  </Chip>
                </li>
              );
            })}
          </ul>
          {active ? (
            <Chip
              href={buildCatalogHref(current, { etiqueta: null })}
              className="mt-4 gap-2 border-fg"
              onClick={() => dialogRef.current?.close()}
            >
              <X size={16} aria-hidden="true" />
              Quitar etiqueta
            </Chip>
          ) : null}
        </div>
      </dialog>
    </div>
  );
}
