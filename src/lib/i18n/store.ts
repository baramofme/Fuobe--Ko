/**
 * Fuobe's languages: English and Korean. The choice lives in this browser (localStorage) and is mirrored to a
 * cookie, so a server render can honour the same value. switchLanguage updates the store and notifies every
 * subscriber — each useI18n consumer re-renders with the new words, on the same tick.
 *
 * Keys are flat with a namespace ("nav.search", "common.close"). en.json holds every key; ko.json translates
 * them. A key missing from the active language falls back to English, warned once.
 */
import en from "./locales/en.json";
import ko from "./locales/ko.json";

export type Lang = "en" | "ko";
/** undefined on purpose: a lookup must be allowed to miss (Record<string, string> would hide the miss from TS). */
export type Messages = Record<string, string | undefined>;
export type Params = Record<string, string | number>;

export const DEFAULT_LANG: Lang = "en";
/** The languages the site can show. */
export const SUPPORTED_LANGS: readonly Lang[] = ["en", "ko"];

/** The registry: every language and its words. */
export const locales: Record<Lang, Messages> = { en, ko };

/** Each language's own name — shown as-is in every language (a language's name isn't translated). */
export const LANG_NAMES: Record<Lang, string> = { en: "English", ko: "한국어" };

export const LANG_STORAGE_KEY = "fuobe.lang";
export const LANG_COOKIE = "fuobe_lang";

export function isLang(value: unknown): value is Lang {
  return typeof value === "string" && (SUPPORTED_LANGS as readonly string[]).includes(value);
}

/** Reads the saved language: localStorage first, then the cookie (the server has neither → null, so English). */
function storedLang(): Lang | null {
  try {
    if (typeof localStorage !== "undefined") {
      const v = localStorage.getItem(LANG_STORAGE_KEY);
      if (isLang(v)) return v;
    }
  } catch {
    /* Some browsers throw on the accessor when site data is blocked. */
  }
  try {
    if (typeof document !== "undefined") {
      const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${LANG_COOKIE}=([^;]*)`));
      const v = m ? decodeURIComponent(m[1]) : null;
      if (isLang(v)) return v;
    }
  } catch {}
  return null;
}

/** The language in effect. Read from this browser on the first read; until then, the default (English). */
let current: Lang | undefined;

export function getLang(): Lang {
  return (current ??= storedLang() ?? DEFAULT_LANG);
}

// The store's subscribers. Each is the listener React gives useSyncExternalStore — notifying it re-renders the
// component, which reads its words again in the new language.
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

/** Subscribes to language changes, including from another tab (the storage event). Returns the unsubscribe. */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (typeof window === "undefined") return () => void listeners.delete(listener);
  const onStorage = (e: { key: string | null }) => {
    // A key of null means the tab cleared all of storage: the choice is gone, so the site goes back to English.
    if (e.key !== null && e.key !== LANG_STORAGE_KEY) return;
    const next = storedLang() ?? DEFAULT_LANG;
    if (next !== current) {
      current = next;
      notify();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * Switches the language: updates the store, saves the choice (localStorage, and a cookie for server renders),
 * and notifies every subscriber — so all rendered strings update at once. An unsupported value is ignored.
 */
export function switchLanguage(lang: Lang): void {
  if (!isLang(lang)) {
    console.warn(`[i18n] not a supported language: ${String(lang)}`);
    return;
  }
  current = lang;
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {}
  try {
    // A year, same-site, path-wide: the server reads the same cookie (getServerLang).
    if (typeof document !== "undefined") document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=31536000; samesite=lax`;
  } catch {}
  notify();
}

// A missing key warns once per language and key, so a whole page of misses stays one quiet note.
const warned = new Set<string>();

function warnOnce(id: string, message: string) {
  if (warned.has(id)) return;
  warned.add(id);
  console.warn(message);
}

/** "{name}" placeholders take their value from params; a token with no param stays as written. */
function interpolate(value: string, params?: Params): string {
  if (!params) return value;
  return value.replace(/\{(\w+)\}/g, (token, name: string) => (name in params ? String(params[name]) : token));
}

/** Words for one language: the language's own, else English, else the key itself (so the gap is visible). */
export function translate(lang: Lang, key: string, params?: Params): string {
  const value = locales[lang]?.[key];
  if (value !== undefined) return interpolate(value, params);
  const fallback = locales[DEFAULT_LANG][key];
  if (fallback !== undefined) {
    warnOnce(`${lang}:miss:${key}`, `[i18n] no "${lang}" words for "${key}" — showing English`);
    return interpolate(fallback, params);
  }
  warnOnce(`${lang}:noen:${key}`, `[i18n] "${key}" has no English either — showing the key`);
  return interpolate(key, params);
}

/** Words in the language in effect. */
export function t(key: string, params?: Params): string {
  return translate(getLang(), key, params);
}

/**
 * A data string (a catalog name, a description, a category, a caption) whose words may exist under a derived key.
 * Order: the language's own value, else English (byte-identical to the catalog), else the item's own words — so an
 * item nobody translated reads exactly as authored, with no warning (catalog data is meant to fall back silently).
 */
export function translateOr(lang: Lang, key: string, fallback: string, params?: Params): string {
  const value = locales[lang]?.[key];
  if (value !== undefined) return interpolate(value, params);
  const english = locales[DEFAULT_LANG][key];
  if (english !== undefined) return interpolate(english, params);
  return fallback;
}

/** Key fragment from any string: lower-case, runs of non-alphanumerics collapse to one underscore, edges trimmed. */
export function keySnake(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}
