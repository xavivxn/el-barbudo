import Image from "next/image";

type LogoProps = {
  variant?: "mark" | "full";
  /** Solo el que se ve arriba al cargar (la cabecera): el del pie no compite por la red. */
  preload?: boolean;
  className?: string;
};

// logo.jpg es negro sobre blanco: se mezcla con el fondo en claro y se invierte en oscuro.
const blend = "mix-blend-multiply dark:invert dark:mix-blend-screen";

export function Logo({ variant = "full", preload = false, className = "" }: LogoProps) {
  if (variant === "mark") {
    // Decorativa: siempre va junto al wordmark o dentro de un enlace con nombre.
    // Recorta solo la barba: imagen ampliada y anclada arriba, sin el wordmark.
    return (
      <span className={`relative inline-block h-10 w-10 shrink-0 overflow-hidden ${className}`}>
        <Image
          src="/logo.jpg"
          alt=""
          width={150}
          height={150}
          preload={preload}
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
      preload={preload}
      className={`h-auto w-40 ${blend} ${className}`}
    />
  );
}
