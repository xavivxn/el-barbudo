import Image from "next/image";

type LogoProps = {
  variant?: "mark" | "full";
  className?: string;
};

// logo.jpg es negro sobre blanco: se mezcla con el fondo en claro y se invierte en oscuro.
const blend = "mix-blend-multiply dark:invert dark:mix-blend-screen";

export function Logo({ variant = "full", className = "" }: LogoProps) {
  if (variant === "mark") {
    // Recorta solo la barba: imagen ampliada y anclada arriba, sin el wordmark.
    return (
      <span className={`relative inline-block h-10 w-10 shrink-0 overflow-hidden ${className}`}>
        <Image
          src="/logo.jpg"
          alt="El Barbudo"
          width={150}
          height={150}
          priority
          className={`absolute left-[-90%] top-[-33.5%] h-[280%] w-[280%] max-w-none object-cover object-top ${blend}`}
        />
      </span>
    );
  }

  return (
    <Image
      src="/logo.jpg"
      alt="El Barbudo"
      width={150}
      height={150}
      priority
      className={`h-auto w-40 ${blend} ${className}`}
    />
  );
}
