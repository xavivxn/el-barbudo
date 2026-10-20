/**
 * Bruma de fragancia de la vitrina: lógica pura de partículas (sin DOM ni canvas).
 *
 * Dos clases de partícula suben desde la base del frasco: volutas (manchas grandes, difusas y muy
 * tenues que crecen al subir) y unas pocas motas (puntos diminutos). Las dos ondulan con un seno
 * suave, se abren hacia afuera como una columna de aroma y se desvanecen. Todo se mide en px CSS del
 * área de la foto; el componente (`FragranceMist`) solo dibuja.
 */

export type Rng = () => number;
export type Bounds = { width: number; height: number };

export type MistParticle = {
  kind: "wisp" | "mote";
  /** Posición dibujada (incluye la ondulación). */
  x: number;
  y: number;
  /** Eje de la deriva, sin ondulación. */
  x0: number;
  vx: number;
  vy: number;
  /** Radio actual, radio al nacer y cuánto crece a lo largo de la vida (`r0 * (1 + grow)` al morir). */
  r: number;
  r0: number;
  grow: number;
  age: number;
  life: number;
  /** Opacidad máxima, antes del fundido de entrada y salida. */
  alpha: number;
  phase: number;
  swayAmp: number;
  swayFreq: number;
};

export type Mist = {
  particles: MistParticle[];
  cap: number;
  rng: Rng;
  /** Fracción de partícula pendiente de emitir (la emisión es continua, no por cuadro). */
  carry: number;
};

export const MIST_CAP_MOBILE = 32;
export const MIST_CAP_DESKTOP = 64;
/** Ancho del contenedor desde el que se usa el tope de escritorio. */
export const MIST_WIDE_PX = 480;
/** Paso máximo en segundos: al volver de una pestaña en segundo plano no hay saltos. */
export const MAX_DT = 0.05;
/** Cadencia de dibujo: ~30 cuadros por segundo alcanzan para una niebla lenta y difusa. */
export const MIST_FRAME_MS = 1000 / 30;
/** Margen para que a 60/90/120 Hz se dibuje justo un cuadro de cada 2/3/4 (el reloj de rAF oscila). */
const FRAME_SLACK = 0.9;

/** ¿Toca dibujar en este cuadro de rAF? `last` es el instante del último dibujado (`null`: ninguno). */
export function frameDue(now: number, last: number | null) {
  return last === null || now - last >= MIST_FRAME_MS * FRAME_SLACK;
}

/** Vida media aproximada: con ella la emisión mantiene la bruma cerca del tope sin pasarlo. */
const MEAN_LIFE = 6;
/** Proporción de motas entre las partículas nuevas. */
const MOTE_SHARE = 0.35;

export function capFor(width: number) {
  return width >= MIST_WIDE_PX ? MIST_CAP_DESKTOP : MIST_CAP_MOBILE;
}

export function clampDt(dt: number) {
  if (!(dt > 0)) return 0;
  return Math.min(dt, MAX_DT);
}

export function createMist({ width, rng = Math.random }: { width: number; rng?: Rng }): Mist {
  return { particles: [], cap: capFor(width), rng, carry: 0 };
}

const between = (rng: Rng, min: number, max: number) => min + rng() * (max - min);

/** Suma una partícula en la base del frasco. Devuelve `null` si la bruma ya está en el tope. */
export function spawn(mist: Mist, { width, height }: Bounds): MistParticle | null {
  if (mist.particles.length >= mist.cap) return null;
  const { rng } = mist;
  const mote = rng() < MOTE_SHARE;
  const size = Math.min(width, height);
  // Columna centrada en el frasco, un poco más ancha que él y cargada hacia los costados: el marco
  // tapa el centro, así que la bruma se ve asomar por los bordes y por encima.
  const spread = Math.min(width * 0.45, height * 0.45);
  const u = rng() * 2 - 1;
  const side = Math.sign(u) * Math.abs(u) ** 0.5;
  const x = width / 2 + side * spread;
  const r0 = mote ? between(rng, 1.6, 3.2) : size * between(rng, 0.05, 0.09);
  const particle: MistParticle = {
    kind: mote ? "mote" : "wisp",
    x,
    x0: x,
    y: height * between(rng, 0.7, 0.92),
    // Se abre hacia afuera, como una columna de humo que se ensancha.
    vx: side * between(rng, 4, 10),
    vy: -height * between(rng, 0.07, 0.12) * (mote ? 1.25 : 1),
    r: r0,
    r0,
    grow: mote ? 0 : between(rng, 1.2, 2),
    age: 0,
    life: mote ? between(rng, 4, 7) : between(rng, 5, 8),
    alpha: mote ? between(rng, 0.6, 0.95) : between(rng, 0.14, 0.26),
    phase: rng() * Math.PI * 2,
    swayAmp: mote ? between(rng, 4, 10) : between(rng, 6, 16),
    swayFreq: mote ? between(rng, 0.8, 1.6) : between(rng, 0.4, 0.9),
  };
  mist.particles.push(particle);
  return particle;
}

/** Viva mientras le quede vida y no haya salido entera del área (por arriba o por un costado). */
export function isAlive(p: MistParticle, { width }: Bounds) {
  return p.age < p.life && p.y + p.r > 0 && p.x + p.r > 0 && p.x - p.r < width;
}

/** Avanza `dt` segundos (acotado) y saca las partículas muertas. Muta y devuelve la misma lista. */
export function step(particles: MistParticle[], dt: number, bounds: Bounds) {
  const d = clampDt(dt);
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.age += d;
    p.x0 += p.vx * d;
    p.y += p.vy * d;
    const t = Math.min(p.age / p.life, 1);
    p.r = p.r0 * (1 + p.grow * t);
    // La ondulación se abre a medida que sube: al nacer casi recta, arriba más suelta.
    p.x = p.x0 + Math.sin(p.phase + p.age * p.swayFreq) * p.swayAmp * (0.3 + 0.7 * t);
    if (!isAlive(p, bounds)) particles.splice(i, 1);
  }
  return particles;
}

/** Un cuadro: ajusta el tope al ancho, emite de forma continua y avanza. */
export function tick(mist: Mist, dt: number, bounds: Bounds) {
  const d = clampDt(dt);
  mist.cap = capFor(bounds.width);
  if (mist.particles.length > mist.cap) mist.particles.splice(0, mist.particles.length - mist.cap);
  mist.carry += (d * mist.cap) / MEAN_LIFE;
  while (mist.carry >= 1) {
    mist.carry -= 1;
    if (!spawn(mist, bounds)) {
      mist.carry = 0;
      break;
    }
  }
  step(mist.particles, d, bounds);
  return mist;
}

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};

/** Opacidad del cuadro: aparece en el primer cuarto de vida y se desvanece en el último 40 %. */
export function opacityOf(p: Pick<MistParticle, "age" | "life" | "alpha">) {
  const t = p.age / p.life;
  return p.alpha * smoothstep(0, 0.25, t) * (1 - smoothstep(0.6, 1, t));
}

/** `#rgb`, `#rrggbb` (`#rrggbbaa` ignora el alfa) o `rgb()/rgba()` → `[r, g, b]`; si no, `null`. */
export function parseColor(value: string): [number, number, number] | null {
  const color = value.trim();
  const hex = /^#([\da-f]{3}|[\da-f]{6}|[\da-f]{8})$/i.exec(color);
  if (hex) {
    const digits = hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join("") : hex[1].slice(0, 6);
    return [0, 2, 4].map((i) => Number.parseInt(digits.slice(i, i + 2), 16)) as [number, number, number];
  }
  const rgb = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(color);
  if (rgb) return [rgb[1], rgb[2], rgb[3]].map((n) => Math.round(Number(n))) as [number, number, number];
  return null;
}
