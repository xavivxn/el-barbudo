import { describe, expect, it } from "vitest";
import {
  capFor,
  clampDt,
  createMist,
  frameDue,
  isAlive,
  MAX_DT,
  MIST_CAP_DESKTOP,
  MIST_CAP_MOBILE,
  MIST_FRAME_MS,
  opacityOf,
  parseColor,
  spawn,
  step,
  tick,
} from "@/lib/mist";

/** Generador determinista (mulberry32): los tests no dependen de `Math.random`. */
function seeded(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const desktop = { width: 640, height: 520 };
const mobile = { width: 375, height: 300 };

describe("capFor", () => {
  it("24 partículas en un contenedor angosto y 48 en uno ancho", () => {
    expect(capFor(375)).toBe(MIST_CAP_MOBILE);
    expect(capFor(640)).toBe(MIST_CAP_DESKTOP);
    expect(MIST_CAP_MOBILE).toBe(24);
    expect(MIST_CAP_DESKTOP).toBe(48);
  });
});

describe("spawn", () => {
  it("nace en la base del frasco y con la misma semilla da la misma partícula", () => {
    const a = spawn(createMist({ width: desktop.width, rng: seeded(7) }), desktop);
    const b = spawn(createMist({ width: desktop.width, rng: seeded(7) }), desktop);
    expect(a).toEqual(b);
    expect(a).not.toBeNull();
    expect(a!.y).toBeGreaterThan(desktop.height * 0.5);
    expect(a!.y).toBeLessThanOrEqual(desktop.height);
    expect(a!.vy).toBeLessThan(0);
  });

  it("no pasa del tope", () => {
    const mist = createMist({ width: mobile.width, rng: seeded(3) });
    for (let i = 0; i < 100; i++) spawn(mist, mobile);
    expect(mist.particles).toHaveLength(MIST_CAP_MOBILE);
    expect(spawn(mist, mobile)).toBeNull();
  });
});

describe("step", () => {
  it("las partículas suben con el tiempo", () => {
    const mist = createMist({ width: desktop.width, rng: seeded(11) });
    for (let i = 0; i < 10; i++) spawn(mist, desktop);
    const before = mist.particles.map((p) => p.y);
    for (let i = 0; i < 30; i++) step(mist.particles, 1 / 60, desktop);
    mist.particles.forEach((p, i) => expect(p.y).toBeLessThan(before[i]));
  });

  it("crecen mientras viven", () => {
    const mist = createMist({ width: desktop.width, rng: seeded(5) });
    const p = spawn(mist, desktop)!;
    const r0 = p.r;
    step(mist.particles, 0.05, desktop);
    step(mist.particles, 0.05, desktop);
    expect(p.r).toBeGreaterThan(r0);
  });

  it("mueren al cumplir su vida", () => {
    const mist = createMist({ width: desktop.width, rng: seeded(2) });
    for (let i = 0; i < 20; i++) spawn(mist, desktop);
    const longest = Math.max(...mist.particles.map((p) => p.life));
    // Pasos de 50 ms hasta superar la vida más larga.
    for (let t = 0; t <= longest + 0.1; t += MAX_DT) step(mist.particles, MAX_DT, desktop);
    expect(mist.particles).toHaveLength(0);
  });

  it("acota dt: una pestaña que vuelve del fondo no hace saltar las partículas", () => {
    const a = createMist({ width: desktop.width, rng: seeded(9) });
    const b = createMist({ width: desktop.width, rng: seeded(9) });
    spawn(a, desktop);
    spawn(b, desktop);
    step(a.particles, 30, desktop);
    step(b.particles, MAX_DT, desktop);
    expect(a.particles).toEqual(b.particles);
    expect(a.particles).toHaveLength(1);
  });
});

describe("clampDt", () => {
  it("nunca negativo ni mayor que MAX_DT", () => {
    expect(clampDt(-1)).toBe(0);
    expect(clampDt(Number.NaN)).toBe(0);
    expect(clampDt(0.01)).toBe(0.01);
    expect(clampDt(5)).toBe(MAX_DT);
  });
});

describe("isAlive", () => {
  it("muere por edad o al salir del área", () => {
    const mist = createMist({ width: desktop.width, rng: seeded(4) });
    const p = spawn(mist, desktop)!;
    expect(isAlive(p, desktop)).toBe(true);
    expect(isAlive({ ...p, age: p.life }, desktop)).toBe(false);
    expect(isAlive({ ...p, y: -p.r - 1 }, desktop)).toBe(false);
    expect(isAlive({ ...p, x: -p.r - 1 }, desktop)).toBe(false);
    expect(isAlive({ ...p, x: desktop.width + p.r + 1 }, desktop)).toBe(false);
  });
});

describe("tick", () => {
  it("emite de a poco y nunca pasa del tope", () => {
    const mist = createMist({ width: desktop.width, rng: seeded(13) });
    tick(mist, 1 / 60, desktop);
    expect(mist.particles.length).toBeLessThanOrEqual(1);
    let max = 0;
    for (let i = 0; i < 60 * 30; i++) {
      tick(mist, 1 / 60, desktop);
      max = Math.max(max, mist.particles.length);
    }
    expect(max).toBeLessThanOrEqual(MIST_CAP_DESKTOP);
    expect(max).toBeGreaterThan(MIST_CAP_DESKTOP / 2);
  });

  it("con dt enorme no explota: emite lo de un paso acotado", () => {
    const mist = createMist({ width: mobile.width, rng: seeded(21) });
    tick(mist, 60, mobile);
    expect(mist.particles.length).toBeLessThanOrEqual(1);
  });

  it("si el contenedor se achica, recorta al tope nuevo", () => {
    const mist = createMist({ width: desktop.width, rng: seeded(8) });
    for (let i = 0; i < 60 * 20; i++) tick(mist, 1 / 60, desktop);
    tick(mist, 1 / 60, mobile);
    expect(mist.cap).toBe(MIST_CAP_MOBILE);
    expect(mist.particles.length).toBeLessThanOrEqual(MIST_CAP_MOBILE);
  });
});

describe("opacityOf", () => {
  it("aparece y se desvanece: cero al nacer y al morir, máxima en el medio", () => {
    const mist = createMist({ width: desktop.width, rng: seeded(6) });
    const p = spawn(mist, desktop)!;
    expect(opacityOf({ ...p, age: 0 })).toBe(0);
    expect(opacityOf({ ...p, age: p.life })).toBe(0);
    const mid = opacityOf({ ...p, age: p.life * 0.4 });
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThanOrEqual(p.alpha);
  });
});

describe("parseColor", () => {
  it("lee hex corto, largo y rgb()", () => {
    expect(parseColor("#6F9FD3")).toEqual([0x6f, 0x9f, 0xd3]);
    expect(parseColor(" #fff ")).toEqual([255, 255, 255]);
    expect(parseColor("rgb(74, 139, 208)")).toEqual([74, 139, 208]);
    expect(parseColor("rgb(74 139 208 / 0.5)")).toEqual([74, 139, 208]);
  });

  it("cae en null si no entiende el color", () => {
    expect(parseColor("")).toBeNull();
    expect(parseColor("var(--glow-light)")).toBeNull();
  });
});

describe("frameDue (~30 cuadros por segundo)", () => {
  it("el primer cuadro siempre dibuja", () => {
    expect(frameDue(0, null)).toBe(true);
  });

  it("a 60 Hz dibuja uno de cada dos cuadros; a 120 Hz, uno de cada cuatro", () => {
    expect(frameDue(1000 / 60, 0)).toBe(false);
    expect(frameDue(2000 / 60, 0)).toBe(true);
    expect(frameDue(3000 / 120, 0)).toBe(false);
    expect(frameDue(4000 / 120, 0)).toBe(true);
  });

  it("la cadencia es de 30 cuadros por segundo", () => {
    expect(MIST_FRAME_MS).toBeCloseTo(1000 / 30);
    expect(frameDue(MIST_FRAME_MS, 0)).toBe(true);
  });
});
