/**
 * marketing bottom-chrome의 5개 서브컴포넌트(BrandChip·TextPanel·WebsitePanel·VoiceControl·
 * SettingsPanel) 배선 키 35종의 기계 판정(t_63fdb0f8, 후속 of t_ae6f0954).
 *
 * en은 배선 전 소스 리터럴과 문자 단위 동일(e2e 선택기가 영어 리터럴에 결속되어 있어 vitest에서
 * en 기본값으로 초록을 유지하려면 바이트 보존이 필수), ko는 전량 한글에 en 사본이 0(값 동일 키 0건),
 * 파라미터 키는 원 합성 문자열을 바이트 그대로 재조립한다. 상수 2종(DRAWN_WORDS_LABEL·HINT)은
 * 카탈로그에 남고 렌더만 키로 옮기므로 상수-대-locale 동등으로 판정한다.
 */
import { describe, expect, it } from "vitest";
import { locales, t } from "@/lib/i18n/store";
import { DRAWN_WORDS_HINT, DRAWN_WORDS_LABEL } from "@/lib/catalog/marketing";

const HANGUL = /[\uac00-\ud7a3]/;

/** 렌더 시점의 원 리터럴 표(배선 전 코드에서 그대로 옮겨 적었다). */
const EN = {
  // BrandChip (brand-dialog.tsx)
  "marketing.brand.kit": "Brand kit",
  "marketing.brand.ariaSelected": "Brand kit: {name}",
  "marketing.brand.emptyOwner": "No brand kit added yet — paste a link or create one manually to get started.",
  "marketing.brand.emptyOther": "Brand kits aren't available here.",
  "marketing.brand.add": "Add brand kit",
  "marketing.brand.none": "No brand kit",
  "marketing.brand.manage": "Manage",
  // TextPanel (marketing-studio.tsx)
  "marketing.words.panelTitle": "Words on the image",
  "marketing.words.panelDesc":
    "Set exactly, letter for letter: Fuobe Marketing Image and open-source results get them set on top in your brand fonts; GPT Image, Ideogram and Recraft draw them.",
  "marketing.words.triggerAria": "Headline and button text",
  "marketing.words.headline": "Headline",
  "marketing.words.button": "Button",
  "marketing.words.headlinePlaceholder": "e.g. Crunch, sorted",
  "marketing.words.ctaPlaceholder": "e.g. Shop now",
  "marketing.words.placeholderProduct": "your product",
  "marketing.words.placeholderBrand": "your brand",
  "marketing.words.drawnLabel": DRAWN_WORDS_LABEL,
  "marketing.words.drawnHint": DRAWN_WORDS_HINT,
  // WebsitePanel (marketing-studio.tsx)
  "marketing.website.panelTitle": "Website or social link",
  "marketing.website.panelDesc": "What the video is about when there's no product photo: your site or a social profile.",
  "marketing.website.ariaNone": "Add a website or social link",
  "marketing.website.ariaValue": "Website: {value}",
  "marketing.website.word": "Website",
  "marketing.website.linkLabel": "Link",
  "marketing.website.badUrl": "Enter a valid website URL",
  // VoiceControl tooltip (pickers.tsx)
  "marketing.voiceover.openHint": "Open-source voices are cloned from a short sample (Chatterbox)",
  "marketing.voiceover.byModel": "Voiceover by {model}",
  // SettingsPanel — marketing (marketing-studio.tsx)
  "marketing.output.tooltip": "Aspect ratio, length, batch and model",
  "marketing.output.triggerAria": "Settings: {summary}",
  "marketing.output.lengthLine": "Length · {seconds}s",
  "marketing.output.ugcLengthNote": "The whole video: the script is sized to what's left after the hook and the product close-up",
  "marketing.output.lengthSecondsAria": "Length in seconds",
  "marketing.output.versions": "Versions",
  "marketing.output.batchAria": "Batch size",
  "marketing.output.model": "Model",
} as const;

/** 재사용한 기존 키(새로 만들지 않고 불렀다 — 존재와 en 바이트를 못으로 박는다). */
const REUSED = {
  "studio.settings.title": "Settings",
  "studio.settings.aspectRatio": "Aspect ratio",
  "studio.settings.images": "Images",
  "studio.audio.voice": "Voice",
} as const;

describe("marketing chrome i18n wiring (t_63fdb0f8)", () => {
  it("every wired key is English byte-for-byte of the original literal", () => {
    for (const [k, v] of Object.entries(EN)) {
      expect(locales.en[k], k).toBe(v);
    }
  });

  it("the reused keys exist and keep their English bytes", () => {
    for (const [k, v] of Object.entries(REUSED)) {
      expect(locales.en[k], k).toBe(v);
    }
  });

  it("every wired key has Korean words that contain Hangul", () => {
    for (const k of Object.keys(EN)) {
      const kv = locales.ko[k];
      expect(kv, k).toBeTruthy();
      expect(HANGUL.test(kv!), `ko ${k} must read Korean`).toBe(true);
    }
  });

  it("no Korean value is a copy of its English (zero same-value keys)", () => {
    for (const k of Object.keys(EN)) {
      expect(locales.ko[k], k).not.toBe(locales.en[k]);
    }
  });

  it("the parameter keys reassemble exactly what the code printed before wiring", () => {
    // vitest 기본 언어는 en: t()로 조립한 결과가 옛 템플릿 리터럴과 문자 단위 같아야 e2e가 초록이다.
    expect(t("marketing.brand.ariaSelected", { name: "Dew Theory" })).toBe(`Brand kit: ${"Dew Theory"}`);
    expect(t("marketing.website.ariaValue", { value: "dew.example" })).toBe(`Website: ${"dew.example"}`);
    expect(t("marketing.voiceover.byModel", { model: "ElevenLabs v4" })).toBe(`Voiceover by ${"ElevenLabs v4"}`);
    expect(t("marketing.output.triggerAria", { summary: "4:5 · ×4" })).toBe(`Settings: ${"4:5 · ×4"}`);
    expect(t("marketing.output.lengthLine", { seconds: 12 })).toBe(`Length · ${12}s`);
  });

  it("the drawn-words constants stay byte-identical to their keys", () => {
    // 렌더는 키로 옮겼지만 카탈로그 상수(new-ads.tsx 등)는 그대로 남는다: 같은 단어를 가리켜야 한다.
    expect(locales.en["marketing.words.drawnLabel"]).toBe(DRAWN_WORDS_LABEL);
    expect(locales.en["marketing.words.drawnHint"]).toBe(DRAWN_WORDS_HINT);
  });
});
