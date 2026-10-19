import { Button } from "@/components/ui/Button";

export function NotFoundContent() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-24 md:py-36">
      <h1 className="font-serif text-4xl font-semibold leading-tight md:text-6xl">
        No encontramos esta página
      </h1>
      <p className="mt-6 max-w-prose text-lg text-muted">
        Puede que el enlace esté roto o que el producto ya no esté disponible.
      </p>
      <Button href="/productos" className="mt-10">
        Ver catálogo
      </Button>
    </section>
  );
}
