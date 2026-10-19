const SKELETONS = Array.from({ length: 8 }, (_, index) => index);

/** Misma estructura que el catálogo para que el contenido no salte al cargar. */
export default function CatalogLoading() {
  return (
    <div
      role="status"
      aria-label="Cargando productos"
      className="mx-auto max-w-6xl px-4 pb-20 pt-10 md:px-8 md:pb-28 md:pt-16"
    >
      <div className="mb-8 md:mb-10">
        <div className="h-10 w-64 max-w-full bg-surface motion-safe:animate-pulse md:h-12" />
        <div className="mt-3 h-6 w-24 bg-surface motion-safe:animate-pulse" />
      </div>
      <div className="mb-10 h-24 bg-surface motion-safe:animate-pulse md:mb-12" />
      <ul
        aria-hidden="true"
        className="grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4"
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
