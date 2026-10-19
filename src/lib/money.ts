const formatter = new Intl.NumberFormat("es-PY", { maximumFractionDigits: 0 });

export function formatPYG(amount: number): string {
  return `₲ ${formatter.format(amount)}`;
}

const MAX_GUARANIES = 2_000_000_000; // debe caber en un Int de 32 bits de la base

export function parseGuaranies(input: string): number | null {
  const trimmed = input.trim();
  const plain = /^\d+$/.test(trimmed);
  const grouped = /^\d{1,3}([. ])\d{3}(?:\1\d{3})*$/.test(trimmed);
  if (!plain && !grouped) return null;
  const value = Number(trimmed.replace(/[. ]/g, ""));
  return value <= MAX_GUARANIES ? value : null;
}
