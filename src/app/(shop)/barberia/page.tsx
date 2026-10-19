import type { Metadata } from "next";
import { AboutSection } from "@/components/shop/AboutSection";
import { ServicesList } from "@/components/shop/ServicesList";
import { listServices } from "@/lib/services";
import { site } from "@/site";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "La barbería — El Barbudo" };
}

export default async function BarberiaPage() {
  const services = await listServices();

  return (
    <>
      <header className="mx-auto max-w-6xl px-4 pb-10 pt-10 md:px-8 md:pb-16 md:pt-16">
        <h1 className="font-serif text-4xl font-medium leading-tight md:text-5xl">La barbería</h1>
        <p className="mt-3 text-muted md:text-lg">{site.tagline}</p>
      </header>
      <AboutSection />
      <ServicesList services={services} />
    </>
  );
}
