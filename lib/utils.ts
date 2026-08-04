/**
 * Generate a unique ID (for cases where UUID isn't available)
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Format currency in INR
 */
export function formatCurrency(amount: number | null | undefined): string {
  const safeAmount = typeof amount === "number" && Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(safeAmount);
}

/**
 * Format a date string
 */
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

/**
 * Capitalize first letter
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Generate PO/Quotation/Invoice number
 */
export function generateNumber(
  prefix: string,
  count: number
): string {
  const now = new Date();
  const fy = now.getMonth() < 3
    ? `${now.getFullYear() - 1}-${now.getFullYear().toString().slice(-2)}`
    : `${now.getFullYear()}-${(now.getFullYear() + 1).toString().slice(-2)}`;
  return `${prefix}/${fy}/${String(count + 1).padStart(4, "0")}`;
}

/**
 * Truncate text
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

/**
 * Calculate percentage
 */
export function percentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
