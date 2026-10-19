import { Button } from "@/components/ui/Button";

/**
 * 404 dentro del admin (por ejemplo, editar un producto que ya se borró). Sin esto caería en el 404
 * de la tienda, con cabecera y carrito.
 */
export default function AdminNotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col items-start justify-center gap-4 px-4 py-12">
      <h1 className="text-2xl font-semibold">No encontramos esta página</h1>
      <p className="max-w-prose text-muted">Puede que el producto ya no exista o que el enlace esté roto.</p>
      <Button href="/admin" className="mt-2">
        Volver al panel
      </Button>
    </main>
  );
}
