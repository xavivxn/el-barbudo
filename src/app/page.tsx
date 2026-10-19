import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { site } from "@/site";

// Página temporal para verificar tema y logo; la portada real llega en la Task 6.
export default function Home() {
  return (
    <main className="mx-auto flex max-w-md flex-col items-center gap-6 px-4 py-16">
      <div className="flex w-full items-center justify-between">
        <Logo variant="mark" />
        <ThemeToggle />
      </div>
      <Logo variant="full" />
      <h1 className="font-serif text-4xl font-semibold">{site.name}</h1>
      <p className="text-center text-muted">{site.tagline}</p>
    </main>
  );
}
