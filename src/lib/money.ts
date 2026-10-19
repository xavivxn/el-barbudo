const formatter = new Intl.NumberFormat("es-PY", { maximumFractionDigits: 0 });

export function formatPYG(amount: number): string {
  return `₲ ${formatter.format(amount)}`;
}

export function parseGuaranies(input: string): number | null {
  const cleaned = input.replace(/[\s.]/g, "");
  if (!/^\d+$/.test(cleaned)) return null;
  return Number(cleaned);
}
