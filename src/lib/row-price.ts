/**
 * A studio row's price as it is carried and read. Locale-bound words travel as a key+params payload:
 * the page bakes no language into them, so the client resolves them at render through the hook's `tr`
 * and a language switch re-renders them. A line bound to nothing (the `$` line, built from numbers)
 * stays a plain string, and null is nothing to show. `storeT` — the default here and in the sibling
 * price helpers — reads the language in effect at the call, which is what froze a baked row before.
 */
import { t as storeT, type Params } from "./i18n/store";

/** The price's words as the key and params that make them: the client reads them when it renders. */
export interface PriceWords {
  key: string;
  params?: Params;
}

/** What a row carries for its price: the payload for bound words, a plain string for the rest, null for nothing. */
export type RowPrice = PriceWords | string | null;

/**
 * Read a row price as `tr` reads it — the render hook's alias at every studio call-site. The default
 * is `storeT`, the server's read (for tests and any path that has no hook), so the en bytes a default
 * read gives are the dictionary's, byte for byte.
 */
export function rowPriceOf(price: RowPrice | undefined, tr: (key: string, params?: Params) => string = storeT): string | null {
  if (price === null || price === undefined) return null;
  if (typeof price === "string") return price;
  return tr(price.key, price.params);
}
