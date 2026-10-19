import { NotFoundContent } from "@/components/shop/NotFoundContent";
import { ShopShell } from "@/components/shop/ShopShell";

// Las URLs que no existen caen aquí (fuera del grupo (shop)), así que se monta el mismo marco de la tienda.
export default function NotFound() {
  return (
    <ShopShell>
      <NotFoundContent />
    </ShopShell>
  );
}
