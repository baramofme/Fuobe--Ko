import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * The language store: the registry, switching, persistence, and the re-render it triggers.
 * Runs in node (the repo's vitest environment), with a fake browser stubbed per test.
 */
const {
  DEFAULT_LANG,
  LANG_COOKIE,
  LANG_NAMES,
  LANG_STORAGE_KEY,
  SUPPORTED_LANGS,
  getLang,
  isLang,
  locales,
  subscribe,
  switchLanguage,
  t,
  translate,
} = await import("@/lib/i18n/store");

/** A browser for the node tests: localStorage that keeps values, a document with a cookie jar, storage events. */
function fakeBrowser(initial: Record<string, string> = {}, cookie = "") {
  const jar = new Map<string, string>(Object.entries(initial));
  const handlers = new Set<(e: { key: string | null }) => void>();
  const localStorage = {
    getItem: (k: string) => jar.get(k) ?? null,
    setItem: (k: string, v: string) => void jar.set(k, v),
    removeItem: (k: string) => void jar.delete(k),
    clear: () => jar.clear(),
  };
  const document = { cookie };
  const window = {
    addEventListener: (t: string, h: (e: { key: string | null }) => void) => t === "storage" && handlers.add(h),
    removeEventListener: (t: string, h: (e: { key: string | null }) => void) => handlers.delete(h),
  };
  vi.stubGlobal("localStorage", localStorage);
  vi.stubGlobal("document", document);
  vi.stubGlobal("window", window);
  return {
    jar,
    document,
    /** Another tab wrote this key (null = cleared everything): tells the listeners. */
    fire: (key: string | null) => handlers.forEach((h) => h({ key })),
    handlers,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("the registry", () => {
  it("knows English and Korean", () => {
    expect(SUPPORTED_LANGS).toEqual(["en", "ko"]);
    expect(Object.keys(locales).sort()).toEqual(["en", "ko"]);
    expect(DEFAULT_LANG).toBe("en");
    expect(locales.en).toBeTypeOf("object");
    expect(locales.ko).toBeTypeOf("object");
    expect(isLang("ko")).toBe(true);
    expect(isLang("en")).toBe(true);
    expect(isLang("fr")).toBe(false);
    expect(isLang(null)).toBe(false);
  });

  it("every English key has Korean words (the seed)", () => {
    // The translation package (ko.json in full) must keep this true for all keys, not just the seed.
    const enKeys = Object.keys(locales.en);
    for (const key of enKeys) expect(locales.ko[key], key).toBeTypeOf("string");
    expect(Object.keys(locales.ko).length).toBe(enKeys.length);
  });

  it("names each language in its own words", () => {
    expect(LANG_NAMES.en).toBe("English");
    expect(LANG_NAMES.ko).toBe("한국어");
  });
});

describe("the default and what is saved", () => {
  it("defaults to English when nothing is saved", () => {
    fakeBrowser();
    // A fresh module, as if the page just loaded with no saved choice.
    // getLang caches on first read, so this test reads before any switch ran.
    expect(getLang()).toBe(DEFAULT_LANG);
  });

  it("restores the saved choice from localStorage across a reload", async () => {
    vi.resetModules();
    fakeBrowser({ [LANG_STORAGE_KEY]: "ko" });
    const fresh = await import("@/lib/i18n/store");
    expect(fresh.getLang()).toBe("ko"); // the page reloads and finds Korean again
  });

  it("restores the choice from the cookie when localStorage is empty", async () => {
    vi.resetModules();
    fakeBrowser({}, `${LANG_COOKIE}=ko`);
    const fresh = await import("@/lib/i18n/store");
    expect(fresh.getLang()).toBe("ko");
  });

  it("ignores a saved value that isn't a language", async () => {
    vi.resetModules();
    fakeBrowser({ [LANG_STORAGE_KEY]: "fr" });
    const fresh = await import("@/lib/i18n/store");
    expect(fresh.getLang()).toBe("en");
  });

  it("is English on a server with no browser at all", async () => {
    vi.resetModules();
    const fresh = await import("@/lib/i18n/store");
    expect(fresh.getLang()).toBe("en");
    expect(() => fresh.switchLanguage("ko")).not.toThrow(); // no browser to write to: it still works
    expect(fresh.getLang()).toBe("ko");
  });
});

describe("switchLanguage", () => {
  it("updates the active language, saves it, and mirrors it to the cookie", () => {
    const b = fakeBrowser();
    switchLanguage("ko");
    expect(getLang()).toBe("ko");
    expect(b.jar.get(LANG_STORAGE_KEY)).toBe("ko");
    expect(b.document.cookie).toContain(`${LANG_COOKIE}=ko`);
    switchLanguage("en");
    expect(getLang()).toBe("en");
    expect(b.jar.get(LANG_STORAGE_KEY)).toBe("en");
    expect(b.document.cookie).toContain(`${LANG_COOKIE}=en`);
  });

  it("ignores a language the site doesn't have", () => {
    fakeBrowser();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    switchLanguage("fr" as never);
    expect(getLang()).toBe("en");
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("notifies every subscriber — the re-render — and stops after unsubscribing", () => {
    fakeBrowser();
    const a = vi.fn();
    const b = vi.fn();
    const offA = subscribe(a);
    subscribe(b);
    switchLanguage("ko");
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
    offA();
    switchLanguage("en");
    expect(a).toHaveBeenCalledTimes(1); // unsubscribed: no more
    expect(b).toHaveBeenCalledTimes(2); // still listening: every switch re-renders it
  });

  it("follows another tab's change (the storage event)", () => {
    const b = fakeBrowser();
    const listener = vi.fn();
    subscribe(listener);
    // Another tab made the same choice; its write lands here.
    b.jar.set(LANG_STORAGE_KEY, "ko");
    b.fire(LANG_STORAGE_KEY);
    expect(getLang()).toBe("ko");
    expect(listener).toHaveBeenCalledTimes(1);
    switchLanguage("en"); // put the choice back for the tests that follow
  });

  it("ignores a storage event for an unrelated key", () => {
    const b = fakeBrowser();
    const listener = vi.fn();
    subscribe(listener);
    b.jar.set("fuobe.theme", "dark"); // another tab's preference, none of our business
    b.fire("fuobe.theme");
    expect(listener).not.toHaveBeenCalled();
    expect(getLang()).toBe("en");
  });

  it("re-reads when another tab clears storage", () => {
    const b = fakeBrowser();
    switchLanguage("ko"); // this tab's choice: Korean, saved to the fake jar
    const listener = vi.fn();
    subscribe(listener);
    expect(getLang()).toBe("ko");
    b.jar.delete(LANG_STORAGE_KEY); // another tab wipes everything
    b.document.cookie = ""; // wiped the cookie mirror too: the choice is really gone
    b.fire(null); // key null = everything cleared
    expect(getLang()).toBe("en"); // back to the default, and everyone re-renders
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("the store works with no browser (a server import) and still notifies", () => {
    const listener = vi.fn();
    subscribe(listener);
    switchLanguage("ko");
    expect(getLang()).toBe("ko");
    expect(listener).toHaveBeenCalledTimes(1);
    switchLanguage("en");
  });
});

describe("words", () => {
  it("reads the language of the switch", () => {
    fakeBrowser();
    expect(translate("en", "nav.search")).toBe("Search Fuobe");
    expect(translate("ko", "nav.search")).toBe("Fuobe에서 검색");
    switchLanguage("ko");
    expect(t("nav.search")).toBe("Fuobe에서 검색"); // t() follows the active language
    switchLanguage("en");
    expect(t("nav.search")).toBe("Search Fuobe");
  });

  it("fills {placeholders} from params", () => {
    expect(translate("en", "common.welcome", { name: "Lee" })).toBe("Welcome, Lee!");
    expect(translate("ko", "common.welcome", { name: "Lee" })).toBe("Lee님, 환영합니다!");
    expect(translate("en", "common.welcome", {})).toBe("Welcome, {name}!"); // no param: the token stays
  });

  it("falls back to English for a key the language lacks, warned once", () => {
    fakeBrowser();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    // Take a key away from the Korean dictionary to make the miss real, and put it back when done.
    const saved = locales.ko["nav.more"];
    delete locales.ko["nav.more"];
    try {
      expect(translate("ko", "nav.more")).toBe("More"); // English stands in
      expect(translate("ko", "nav.more")).toBe("More");
      expect(warn).toHaveBeenCalledTimes(1); // once per key and language, not once per call
    } finally {
      locales.ko["nav.more"] = saved;
    }
  });

  it("shows the key itself when neither language has it, warned once", () => {
    fakeBrowser();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(translate("ko", "nowhere.at.all")).toBe("nowhere.at.all");
    expect(translate("ko", "nowhere.at.all")).toBe("nowhere.at.all");
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("says nothing when both languages have the key", () => {
    fakeBrowser();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(translate("ko", "nav.assist")).toBe("어시스트"); // it has Korean: no warning at all
    expect(warn).toHaveBeenCalledTimes(0);
  });
});
