import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ImgHTMLAttributes, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CategoryTabs } from "@/components/shop/home/CategoryTabs";
import { groupByCategory } from "@/lib/home";
import type { ProductDTO } from "@/lib/types";

type MockImageProps = ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; preload?: boolean };

vi.mock("next/image", () => ({
  default: (props: MockImageProps) => {
    const img = { ...props };
    delete img.fill;
    delete img.preload;
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...img} alt={img.alt ?? ""} />;
  },
}));

// Elementos de motion sin animación: `onAnimationComplete` nunca llega, como cuando el navegador
// corta la animación (pestaña en segundo plano). Solo el temporizador de seguridad libera el alto.
vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  function still(tag: "ul" | "li" | "span") {
    return function Still({ children, className }: { children?: ReactNode; className?: string }) {
      const Tag = tag;
      return <Tag className={className}>{children}</Tag>;
    };
  }
  return { ...actual, motion: { ul: still("ul"), li: still("li"), span: still("span") } };
});

function product(id: string, category: ProductDTO["category"]): ProductDTO {
  return {
    id,
    slug: id,
    name: id,
    subtitle: "",
    category,
    description: "",
    notes: null,
    benefits: [],
    tags: [],
    images: [],
    featured: false,
    active: true,
    variants: [{ id: "v", label: "50 ml", price: 100000, stock: 3 }],
  };
}

const groups = groupByCategory([product("f1", "perfume"), product("b1", "barba"), product("c1", "cabello")], 8);
const originalOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetHeight");

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  Object.defineProperty(HTMLElement.prototype, "offsetHeight", { configurable: true, get: () => 480 });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  if (originalOffsetHeight) Object.defineProperty(HTMLElement.prototype, "offsetHeight", originalOffsetHeight);
});

const panels = () => screen.getByRole("tabpanel").parentElement as HTMLElement;

describe("CategoryTabs: alto retenido al cambiar de pestaña", () => {
  it("se libera a los ~600 ms aunque la animación no avise que terminó; cada cambio reinicia la espera", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<CategoryTabs groups={groups} />);
    expect(panels().style.minHeight).toBe("");

    await user.click(screen.getByRole("tab", { name: "Barba" }));
    expect(panels().style.minHeight).toBe("480px");

    act(() => vi.advanceTimersByTime(400));
    await user.click(screen.getByRole("tab", { name: "Cabello" }));
    act(() => vi.advanceTimersByTime(400));
    // 800 ms desde el primer cambio, pero 400 desde el segundo: sigue retenido.
    expect(panels().style.minHeight).toBe("480px");

    act(() => vi.advanceTimersByTime(250));
    expect(panels().style.minHeight).toBe("");
  });

  it("al desmontar no queda ningún temporizador pendiente", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { unmount } = render(<CategoryTabs groups={groups} />);

    await user.click(screen.getByRole("tab", { name: "Barba" }));
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
