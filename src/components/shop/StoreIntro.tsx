/** Banda de entrada de la tienda: compacta y sin foto, para que los productos se vean en el primer pantallazo. */
export function StoreIntro() {
  return (
    <div className="pb-6 pt-8 md:pb-10 md:pt-16">
      <p className="text-xs font-medium tracking-[0.16em] text-muted">
        PERFUMERÍA · BARBA · CABELLO
      </p>
      <h1 className="mt-2 font-serif text-[36px] font-medium leading-[1.1] md:mt-3 md:text-[56px]">
        Perfumes y cuidado para el hombre
      </h1>
      <p className="mt-2 text-muted md:mt-3 md:text-lg">
        Elegí, pedí por WhatsApp y te confirmamos al toque.
      </p>
    </div>
  );
}
