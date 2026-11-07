import { describe, expect, it } from "vitest";
import { appsMenu, canvasMenu, motionsMenu, LINE_MAX } from "@/lib/mega-menus.server";
import { studiosMenu, type MegaItem, type MegaModel } from "@/lib/mega-menus";
import { locales, translateOr } from "@/lib/i18n/store";
import { menuLineKey } from "@/components/nav/mega-panel";

/**
 * What the mega-panel's three render sites (LeadCard, Row, Tile) actually show: each column's lead,
 * then its rows — except the studio listed under another one (it renders as a link, not a row).
 * Studio links' own lines (`MegaSub.line`) are out of this card's scope, so they stay out of these checks.
 */
const rendered = (model: MegaModel): MegaItem[] =>
  model.columns
    .flatMap((c) => [c.lead, ...c.rows.filter((e) => !e.under)])
    .filter((e): e is MegaItem => !!e && !!e.line);

const HANGUL = /[\uac00-\ud7a3]/;

describe("the menu lines' locale keys", () => {
  it("resolves every rendered line to the key derived from that very sentence", () => {
    const models = [
      appsMenu(),
      motionsMenu(),
      canvasMenu(),
      studiosMenu(undefined),
      studiosMenu("guest"),
      studiosMenu("account"),
      studiosMenu("owner"),
    ];
    // One slot per item id — the Studios menu is checked for all viewer kinds, so the same item
    // appears several times; what matters is every distinct line this panel can show.
    const lines = new Map<string, string>();
    for (const model of models) {
      for (const e of rendered(model)) {
        if (!lines.has(e.id)) lines.set(e.id, e.line!);
      }
    }
    const checked = new Set<string>();
    for (const [id, line] of lines) {
      const key = menuLineKey(line);
      checked.add(key);
      // The key holds the line character for character — the direct evidence for byte identity:
      // en.json's value is exactly the value that produced this line, so `translateOr` cannot drift.
      expect(locales.en[key], `${key} (${id}: ${line})`).toBe(line);
      // And English resolves through this key to the same bytes as the untranslated line.
      expect(translateOr("en", key, line), id).toBe(line);
    }
    // The three fetched menus alone: 105 slots, all distinct, plus the Studios menu's own lines.
    expect(lines.size).toBeGreaterThanOrEqual(138);
    // Distinct sentences must get distinct keys — two different English lines sharing one key
    // would render the wrong bytes for one of them. (Two items with the SAME line sharing a key
    // is fine, which is why this compares sentences, not item ids.)
    const distinctSentences = new Set(lines.values());
    expect(distinctSentences.size, "lines are what they claim").toBe(lines.size);
    expect(new Set([...distinctSentences].map(menuLineKey)).size, "no two different lines share a key")
      .toBe(distinctSentences.size);
  });

  it("every menu.line key in English has Korean words that are Korean", () => {
    const keys = Object.keys(locales.en).filter((k) => k.startsWith("menu.line."));
    // This card's inventory: 105 wire lines + the Studios panel's lines, nothing orphaned below parity.
    expect(keys.length).toBeGreaterThanOrEqual(131);
    for (const key of keys) {
      const english = locales.en[key]!;
      const korean = locales.ko[key];
      expect(korean, key).toBeTypeOf("string"); // the parity test's rule, restated here for this namespace
      expect(korean).not.toBe(english); // an untranslated line is English leakage
      expect(korean).toMatch(HANGUL); // at least one Hangul syllable
      expect(korean).not.toContain("…"); // no ellipsis: the panel truncates, the title shows the whole thing
      expect(korean).not.toContain("\n"); // one row's line, whole
      expect(korean!.length, `${key}: ${korean}`).toBeLessThanOrEqual(LINE_MAX);
    }
  });

  it("the key helper wraps the store's own snake (render and generation cannot drift apart)", () => {
    // Hand-computed keys: the same shape the generation script writes from the server's lines.
    expect(menuLineKey("Relight any photo")).toBe("menu.line.relight_any_photo");
    expect(menuLineKey("A freeze-frame 360° spin")).toBe("menu.line.a_freeze_frame_360_spin");
    expect(menuLineKey("Match a shot's lighting")).toBe("menu.line.match_a_shot_s_lighting");
  });

  it("a line nobody translated falls back to exactly the item's own words, silently", () => {
    // The structural guarantee the key scheme relies on: a fresh sentence misses the key,
    // so English shows the freshly built line — byte-identical by construction, no warning.
    const line = "A brand new line no catalog had yesterday";
    expect(translateOr("en", menuLineKey(line), line)).toBe(line);
    expect(translateOr("ko", menuLineKey(line), line)).toBe(line); // until a ko value is added
  });
});
