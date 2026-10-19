import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { AboutSection } from "@/components/shop/AboutSection";
import { CategoryLinks } from "@/components/shop/CategoryLinks";
import { Hero } from "@/components/shop/Hero";
import { ProductGrid } from "@/components/shop/ProductGrid";
import { ServicesList } from "@/components/shop/ServicesList";
import { Reveal } from "@/components/ui/Reveal";
import { listProducts } from "@/lib/products";
import { listServices } from "@/lib/services";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [featured, services] = await Promise.all([
    listProducts({ featuredOnly: true }),
    listServices(),
  ]);

  return (
    <>
      <Hero />

      <Reveal className="pt-12 md:pt-20">
        <CategoryLinks />
      </Reveal>

      <Reveal>
        <section
          aria-labelledby="destacados-titulo"
          className="mx-auto max-w-6xl px-4 py-20 md:px-8 md:py-28"
        >
          <div className="mb-10 flex items-end justify-between gap-6">
            <h2
              id="destacados-titulo"
              className="font-serif text-4xl font-medium leading-tight md:text-5xl"
            >
              Destacados
            </h2>
            <Link
              href="/productos"
              className="inline-flex min-h-11 items-center gap-2 underline-offset-8 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Ver todo
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
          <ProductGrid
            products={featured}
            empty={
              <p>
                Pronto vas a ver acá nuestra selección.{" "}
                <Link href="/productos" className="underline underline-offset-4">
                  Mirá el catálogo completo
                </Link>
              </p>
            }
          />
        </section>
      </Reveal>

      <Reveal>
        <AboutSection />
      </Reveal>

      <Reveal>
        <ServicesList services={services} />
      </Reveal>
    </>
  );
}
