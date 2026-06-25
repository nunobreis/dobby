import type { ProductCategory } from './products';

const SIGNAL_REGEX = /\[PRODUCTS:(training-treats|daily-food|supplements|dental|toys)\]/;
const SIGNAL_REGEX_GLOBAL = /\[PRODUCTS:(?:training-treats|daily-food|supplements|dental|toys)\]/g;
const PARTIAL_SIGNAL_REGEX = /\[PRODUCTS:[^\]]*$/;

export function parseProductSignal(text: string): {
  cleanText: string;
  category: ProductCategory | null;
} {
  const match = text.match(SIGNAL_REGEX);
  const cleanText = text
    .replace(SIGNAL_REGEX_GLOBAL, '')
    .replace(PARTIAL_SIGNAL_REGEX, '')
    .replace(/  +/g, ' ')
    .trimEnd();
  return {
    cleanText,
    category: match ? (match[1] as ProductCategory) : null,
  };
}
