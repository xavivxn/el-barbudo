"use client";

import { ImageOff } from "lucide-react";
import Image, { type ImageProps } from "next/image";
import { useState } from "react";

type SafeImageProps = Omit<ImageProps, "src"> & { src?: string | null };

/** `next/image` con placeholder neutro si falta la foto o no carga. */
export function SafeImage({ src, alt, className = "", onError, ...rest }: SafeImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (!src || failedSrc === src) {
    return (
      <div
        role="img"
        aria-label={alt || "Sin foto"}
        className={`flex items-center justify-center bg-surface text-muted ${
          rest.fill ? "absolute inset-0" : className
        }`}
        style={rest.fill ? undefined : { aspectRatio: aspectOf(rest) }}
      >
        <ImageOff size={28} aria-hidden="true" />
      </div>
    );
  }

  return (
    <Image
      {...rest}
      src={src}
      alt={alt}
      className={className}
      onError={(event) => {
        setFailedSrc(src);
        onError?.(event);
      }}
    />
  );
}

function aspectOf({ width, height }: Pick<ImageProps, "width" | "height">) {
  const w = Number(width);
  const h = Number(height);
  return w > 0 && h > 0 ? `${w} / ${h}` : undefined;
}
