"use client";

import { useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useDocumentHidden } from "@/lib/hooks/useDocumentHidden";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";
import { type Bounds, createMist, frameDue, type Mist, opacityOf, parseColor, tick } from "@/lib/mist";

/** Tope de densidad de píxeles: en una niebla difusa no se nota la diferencia y cuesta 4 veces menos. */
const MAX_DPR = 1;
/** Al cambiar de destacado la bruma saliente se funde en este tiempo y recién después se desmonta. */
export const MIST_FADE_MS = 400;
/** Lado del sprite de la voluta (se escala al dibujar). */
const SPRITE_PX = 64;
/** Bronce de la marca: por si `--glow` no se puede leer. */
const FALLBACK_RGB: [number, number, number] = [201, 166, 107];
/**
 * En claro no se suma luz (`lighter` sobre papel no se ve): se pinta normal, con un tinte más pálido
 * que el halo y algo más tenue, así la bruma queda como un velo claro sobre el color y nunca como
 * manchas oscuras. Las motas, aún más suaves.
 */
const LIGHT_ALPHA = { wisp: 0.9, mote: 0.5 } as const;
/**
 * Cuánto se aclara el tono hacia el blanco: el halo ya es de ese color, y la bruma del mismo tono
 * puro se perdería sobre él. Un tinte más pálido se lee como vapor del perfume.
 */
const PALE = { dark: 0.3, light: 0.45 } as const;

type Engine = { mist: Mist; bounds: Bounds; draw: () => void };

type FragranceMistProps = {
  /** Diapositiva activa. Al dejar de serlo, el canvas se funde y se desmonta (no se corta en seco). */
  active: boolean;
};

/**
 * Bruma de fragancia de la vitrina: volutas y motas del color del perfume (`--glow` del área de la
 * foto) que suben desde el frasco. Decorativa (`aria-hidden`). Con reduced motion no se monta; solo
 * anima en la diapositiva activa, en pantalla y con la pestaña visible, así que nunca corre más de un
 * bucle a la vez. La saliente queda quieta mientras se funde (`MIST_FADE_MS`) y luego se desmonta.
 */
export function FragranceMist({ active }: FragranceMistProps) {
  const reducedMotion = usePrefersReducedMotion();
  // Montada mientras es la activa y durante el fundido de salida.
  const [mounted, setMounted] = useState(active);
  if (active && !mounted) setMounted(true);

  useEffect(() => {
    if (active || !mounted) return;
    const id = window.setTimeout(() => setMounted(false), MIST_FADE_MS);
    return () => window.clearTimeout(id);
  }, [active, mounted]);

  if (reducedMotion || !mounted) return null;
  return <MistCanvas active={active} />;
}

function MistCanvas({ active }: FragranceMistProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const inView = useInView(canvasRef);
  const hidden = useDocumentHidden();
  const running = active && inView && !hidden;

  // Contexto, tamaño (ResizeObserver, DPR ≤ 1), color del tono y modo claro/oscuro.
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const bounds: Bounds = { width: 0, height: 0 };
    const mist = createMist({ width: 0 });
    const sprite = document.createElement("canvas");
    sprite.width = sprite.height = SPRITE_PX;
    let dpr = 1;
    let dark = false;

    function resize(width: number, height: number) {
      if (!canvas) return;
      dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      bounds.width = width;
      bounds.height = height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }

    /** Lee `--glow` (lo hereda del área de la foto) y rehace el sprite con ese tono. */
    function readTheme() {
      if (!canvas || !ctx) return;
      dark = document.documentElement.classList.contains("dark");
      const raw = getComputedStyle(canvas).getPropertyValue("--glow");
      let rgb = parseColor(raw);
      if (!rgb && raw.trim()) {
        // Otro formato de color (oklch, nombre…): el canvas lo normaliza a hex.
        ctx.fillStyle = raw.trim();
        rgb = parseColor(String(ctx.fillStyle));
      }
      const pale = dark ? PALE.dark : PALE.light;
      const [r, g, b] = (rgb ?? FALLBACK_RGB).map((c) => Math.round(c + (255 - c) * pale));
      const sctx = sprite.getContext("2d");
      if (!sctx) return;
      const half = SPRITE_PX / 2;
      // Caída casi gaussiana: sin borde, se lee como niebla y no como círculo.
      const gradient = sctx.createRadialGradient(half, half, 0, half, half, half);
      gradient.addColorStop(0, `rgba(${r},${g},${b},1)`);
      gradient.addColorStop(0.25, `rgba(${r},${g},${b},0.72)`);
      gradient.addColorStop(0.55, `rgba(${r},${g},${b},0.26)`);
      gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);
      sctx.clearRect(0, 0, SPRITE_PX, SPRITE_PX);
      sctx.fillStyle = gradient;
      sctx.fillRect(0, 0, SPRITE_PX, SPRITE_PX);
    }

    function draw() {
      if (!canvas || !ctx) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = dark ? "lighter" : "source-over";
      for (const p of mist.particles) {
        const alpha = opacityOf(p) * (dark ? 1 : LIGHT_ALPHA[p.kind]);
        if (alpha < 0.004) continue;
        // El sprite se apaga hacia el borde: la mota se dibuja más grande para que su núcleo mida `r`.
        const radius = p.kind === "mote" ? p.r * 2.4 : p.r;
        ctx.globalAlpha = alpha;
        ctx.drawImage(sprite, p.x - radius, p.y - radius, radius * 2, radius * 2);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    }

    resize(canvas.clientWidth, canvas.clientHeight);
    readTheme();
    engineRef.current = { mist, bounds, draw };

    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(([entry]) => {
            resize(entry.contentRect.width, entry.contentRect.height);
            draw();
          });
    resizeObserver?.observe(canvas);

    // next-themes cambia la clase `.dark` de <html>: el tono de `--glow` cambia con ella.
    const themeObserver =
      typeof MutationObserver === "undefined" ? null : new MutationObserver(readTheme);
    themeObserver?.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    return () => {
      resizeObserver?.disconnect();
      themeObserver?.disconnect();
      engineRef.current = null;
    };
  }, []);

  // El bucle corre solo en la activa, en pantalla y con la pestaña visible; al volver, `tick` acota
  // el dt. Dibuja a ~30 cuadros por segundo (`frameDue`): la niebla es lenta y no lo nota.
  useEffect(() => {
    const engine = engineRef.current;
    if (!running || !engine) return;
    let id = 0;
    let last: number | null = null;
    const frame = (now: number) => {
      id = requestAnimationFrame(frame);
      if (!frameDue(now, last)) return;
      const dt = last === null ? 0 : (now - last) / 1000;
      last = now;
      if (engine.bounds.width > 0 && engine.bounds.height > 0) {
        tick(engine.mist, dt, engine.bounds);
        engine.draw();
      }
    };
    id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
  }, [running]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      data-leaving={active ? undefined : ""}
      className={`absolute inset-0 h-full w-full transition-opacity duration-400 ease-out ${
        active ? "opacity-100" : "opacity-0"
      }`}
    />
  );
}
