const SKELETONS = Array.from({ length: 8 }, (_, index) => index);

/** Misma estructura que el catálogo (cabecera, barra de filtros, grilla) para que no salte al cargar. */
export default function CatalogLoading() {
  return (
    <div
      role="status"
      aria-label="Cargando productos"
      className="mx-auto max-w-6xl px-4 pb-20 pt-8 md:px-8 md:pb-28 md:pt-12"
    >
      <div className="mb-4 flex items-baseline gap-4 md:mb-6">
        <div className="h-9 w-56 max-w-full bg-surface motion-safe:animate-pulse md:h-10" />
        <div className="h-5 w-20 bg-surface motion-safe:animate-pulse" />
      </div>
      <div className="border-b border-line py-3">
        <div className="h-11 w-full bg-surface motion-safe:animate-pulse" />
      </div>
      <ul
        aria-hidden="true"
        className="grid grid-cols-2 gap-x-4 gap-y-12 pt-8 md:grid-cols-3 md:gap-x-6 md:pt-10 lg:grid-cols-4"
      >
        {SKELETONS.map((index) => (
          <li key={index}>
            <div className="aspect-4/5 bg-surface motion-safe:animate-pulse" />
            <div className="mt-4 h-6 w-3/4 bg-surface motion-safe:animate-pulse" />
            <div className="mt-2 h-5 w-1/2 bg-surface motion-safe:animate-pulse" />
          </li>
        ))}
      </ul>
    </div>
  );
}
