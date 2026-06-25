import type { ProductCategory } from './products';

const SIGNAL_REGEX = /\[PRODUCTS:(training-treats|daily-food|supplements|dental|toys)\]/;
const PARTIAL_SIGNAL_REGEX = /\[PRODUCTS:[^\]]*$/;

export function parseProductSignal(text: string): {
  cleanText: string;
  category: ProductCategory | null;
} {
  const match = text.match(SIGNAL_REGEX);
  const cleanText = text
    .replace(SIGNAL_REGEX, '')
    .replace(PARTIAL_SIGNAL_REGEX, '')
    .trimEnd();
  return {
    cleanText,
    category: match ? (match[1] as ProductCategory) : null,
  };
}
