import { describe, expect, it, vi } from "vitest";

/*
 * The navigation model's words on the area pages go through the switch: every entry's label has a `nav.<id>` key (the
 * two the bar's words already own live under `nav.entry.<id>`), every card's line a `nav.<id>.line`, and a feature
 * named by its tab a `nav.<id>.tab`. Under English the keys put the model's own words back byte for byte — the cards,
 * pills and lines the page draws are exactly what the model wrote; under Korean they are Korean.
 */

vi.mock("next/cache", () => ({ cacheLife: () => {} }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ prefetch: () => {}, push: () => {}, replace: () => {}, back: () => {}, refresh: () => {} }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

const { entry, labelKeyOf, NAV_ENTRIES, pillLabelKeyOf } = await import("@/lib/nav-model");
const { areaShowcase } = await import("@/lib/area-showcase");
const { locales, translate } = await import("@/lib/i18n/store");

const TAKEN = ["library", "motions"];

describe("the keys", () => {
  it("hold every entry's label in both languages, the English one byte for byte", () => {
    for (const e of NAV_ENTRIES) {
      const key = labelKeyOf(e.id);
      expect(locales.en[key], key).toBe(e.label);
      expect(locales.ko[key], key).toBeTypeOf("string");
      if (TAKEN.includes(e.id)) expect(key).toBe(`nav.entry.${e.id}`); // the bar's own words stay where they are
    }
  });

  it("hold every line the model carries, byte for byte", () => {
    for (const e of NAV_ENTRIES) {
      if (!e.line) continue;
      expect(locales.en[`nav.${e.id}.line`], e.id).toBe(e.line);
      expect(locales.ko[`nav.${e.id}.line`], e.id).toBeTypeOf("string");
    }
  });

  it("hold the two names a hub mode shows on its own tab", () => {
    for (const id of ["upscale-video", "audio-translate"]) {
      const e = entry(id)!;
      expect(locales.en[`nav.${id}.tab`], id).toBe(e.tab);
      expect(locales.ko[`nav.${id}.tab`], id).toBeTypeOf("string");
      expect(pillLabelKeyOf(e), id).toBe(`nav.${id}.tab`);
    }
  });
});

describe("what an area page draws", () => {
  it("reads each card's and pill's words through the keys, and English puts the model's words back exactly", async () => {
    for (const id of ["create", "studios"] as const) {
      const { sections } = await areaShowcase(id);
      for (const s of sections) {
        for (const c of s.cards) {
          expect(translate("en", c.labelKey), `${id}: ${c.id}`).toBe(c.label);
          if (c.lineKey) expect(translate("en", c.lineKey, c.lineParams), `${id}: ${c.id}`).toBe(c.line);
          expect(translate("ko", c.labelKey), `${id}: ${c.id}`).not.toBe(c.label);
        }
        for (const p of s.pills) {
          expect(translate("en", p.labelKey), `${id}: ${p.id}`).toBe(p.label);
          expect(translate("ko", p.labelKey), `${id}: ${p.id}`).not.toBe(p.label);
        }
        for (const x of s.subs) {
          expect(translate("en", x.parent.labelKey), x.parent.id).toBe(x.parent.label);
          for (const p of x.pills) expect(translate("en", p.labelKey), p.id).toBe(p.label);
        }
      }
    }
  });

  it("says every card's line in Korean under the Korean cookie", async () => {
    for (const id of ["create", "studios"] as const) {
      const { sections } = await areaShowcase(id);
      for (const s of sections)
        for (const c of s.cards) {
          if (!c.lineKey) continue; // a page with no line of its own anywhere shows its `what`
          const ko = translate("ko", c.lineKey, c.lineParams);
          expect(ko, `${id}: ${c.id}`).not.toBe(c.line);
          expect(ko).toMatch(/[.!?]$/);
        }
    }
  });

  it("counts a number through the key without changing Home's sentence", async () => {
    const { sections } = await areaShowcase("studios");
    const cinema = sections.flatMap((s) => s.cards).find((c) => c.id === "cinema")!;
    expect(cinema.lineKey).toBe("nav.cinema.line");
    expect(cinema.lineParams).toMatchObject({ moves: expect.any(Number) });
    const key = cinema.lineKey!;
    expect(translate("en", key, cinema.lineParams)).toBe(cinema.line);
    expect(translate("en", key, cinema.lineParams)).toMatch(/^Direct a film shot by shot/);
  });
});
