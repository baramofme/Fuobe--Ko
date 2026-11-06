"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import {
  DEFAULT_LANG,
  getLang,
  LANG_NAMES,
  SUPPORTED_LANGS,
  subscribe,
  switchLanguage,
  translate,
  type Lang,
  type Params,
} from "./store";

/**
 * The language of this render, live: every component that calls useI18n re-renders when switchLanguage runs (or
 * when another tab changes the choice), and its t() reads the new language's words. On the server the default
 * (English) is used — the browser's choice isn't there yet.
 */
export function useI18n(): {
  lang: Lang;
  /** Words for the language of this render; {placeholders} fill from params. */
  t: (key: string, params?: Params) => string;
  /** Switches the language everywhere. Accepts "en" or "ko"; anything else is ignored. */
  switchLanguage: (lang: Lang) => void;
  languages: readonly Lang[];
  /** Each language's own name, for the selector's options. */
  langNames: Record<Lang, string>;
} {
  const lang = useSyncExternalStore(subscribe, getLang, () => DEFAULT_LANG);
  const t = useCallback((key: string, params?: Params) => translate(lang, key, params), [lang]);
  const change = useCallback((next: Lang) => switchLanguage(next), []);
  return { lang, t, switchLanguage: change, languages: SUPPORTED_LANGS, langNames: LANG_NAMES };
}

/**
 * Keeps the document's language honest (it ships as lang="en"): the <html> tag follows the language the person
 * chose. Screen readers, translation tools and CSS that keys on [lang] all read it.
 */
export function HtmlLang() {
  const lang = useI18n().lang;
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return null;
}
