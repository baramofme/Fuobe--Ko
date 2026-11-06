/**
 * Fuobe's i18n: English and Korean, switchable at runtime from anywhere.
 *
 * Client code: `import { useI18n } from "@/lib/i18n"` — t(), switchLanguage and the live lang, re-render included.
 * Server code: `import { getServerLang } from "@/lib/i18n/server-lang"` — the saved choice, from the cookie.
 * The store itself (getLang, translate, locales) backs both.
 */
export * from "./store";
export * from "./use-i18n";
