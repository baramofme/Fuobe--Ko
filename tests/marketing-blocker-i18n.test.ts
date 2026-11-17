/**
 * Marketing Studio 실행 차단(run blocker) 키 3종의 기계 판정(t_1f971eb9, 후속 of t_63fdb0f8).
 *
 * 계보는 카드에 못 박힌 결정대로 marketing.blocker.<camelCase>(marketing.brand|words|website|
 * voiceover|output과 동격). en은 marketing-studio.tsx 배선 전 원 리터럴과 문자 단위 동일 —
 * Generate 툴팁·sm:hidden 모바일 줄·fail() 토스트가 같은 blocker 변수를 소비하므로 3곳 모두
 * 한 번의 배선으로 따라간다. ko는 전량 한글에 en 사본이 0(unavailable은 nav.marketing의
 * established 명칭 "마케팅 스튜디오"를 쓴다).
 *
 * marketing.website.badUrl(패널 쪽)과 blocker 쪽 badUrl은 같은 단어를 가리키는 별개 계보:
 * en/ko 값이 나란히 동일해야 화면이 한 문구로 말한다. 패널 쪽 키는 이 카드의 접촉 대상이
 * 아니다(lang-switch의 영어 리터럴 선택기가 거기에 결속되어 있다).
 *
 * line 500의 SelfHostNote는 마침표가 붙은 별개 바이트("…available here.") — 이 3종이 아니다.
 * kinetic-templates.mjs lines 153·302·316이 그 버전으로 guest 코드로/AI 템플릿의 유·무를 판정하므로
 * 바이트 보존이 필수였다. 후속 카드 t_85502228가 marketing.blocker.unavailableNote로 배선했다 —
 * en은 마침표까지 원 바이트 동일이라 kinetic 결속은 그대로 성립한다.
 */
import { describe, expect, it } from "vitest";
import { locales, t } from "@/lib/i18n/store";

const HANGUL = /[\uac00-\ud7a3]/;

/** 렌더 시점의 원 리터럴 표(배선 전 코드에서 그대로 옮겨 적었다). */
const EN = {
  "marketing.blocker.unavailable": "Marketing Studio isn't available here",
  "marketing.blocker.attachProduct": "Attach a product to generate",
  "marketing.blocker.badUrl": "Enter a valid website URL",
  // noProductImages is the Option A server key t_41c3ee86 added on top of this wiring. The pre-wire line was dynamic
  // (`${product.name} has no images`), so its en value is the card's full sentence, not a transcribed literal; the
  // product name stays out of the blocker (which product it is is already on screen).
  "marketing.blocker.noProductImages": "This product has no images yet",
} as const;

describe("marketing run blockers switch to Korean with the rest of the chrome", () => {
  it("English keeps every source byte the blocker printed before wiring", () => {
    for (const [k, v] of Object.entries(EN)) {
      expect(locales.en[k], k).toBe(v);
    }
  });

  it("every blocker key has Korean words that contain Hangul", () => {
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

  it("the default language renders exactly what the code said before wiring", () => {
    // vitest 기본 언어는 en: 툴팁·모바일 줄·토스트의 en 결속(선택기·문구 검사)이 초록으로 남는다.
    expect(t("marketing.blocker.unavailable")).toBe("Marketing Studio isn't available here");
    expect(t("marketing.blocker.attachProduct")).toBe("Attach a product to generate");
    expect(t("marketing.blocker.badUrl")).toBe("Enter a valid website URL");
    expect(t("marketing.blocker.noProductImages")).toBe("This product has no images yet");
  });

  it("the blocker side of the bad website says the panel's words in both languages", () => {
    // 패널 쪽(marketing.website.badUrl)과 차단 쪽이 한 문구로 말해야 전환이 매끄럽다.
    expect(locales.en["marketing.blocker.badUrl"]).toBe(locales.en["marketing.website.badUrl"]);
    expect(locales.ko["marketing.blocker.badUrl"]).toBe(locales.ko["marketing.website.badUrl"]);
  });

  it("the keys sit inside the marketing chrome block, in the same order in both locales", () => {
    const keys = Object.keys(EN);
    const positions: number[] = [];
    const enKeys = Object.keys(locales.en);
    for (const k of keys) {
      const i = enKeys.indexOf(k);
      expect(i, `${k} present in en`).toBeGreaterThan(-1);
      positions.push(i);
      expect(Object.keys(locales.ko)[i], `ko ${k} shares the position`).toBe(k);
    }
    // 정렬 순서로 붙어 있다(앵커 뒤 연속 삽입): 앞뒤가 직전 블록의 마지막·다음 블록의 첫 키다.
    // 4키로 늘었다(t_41c3ee86의 Option A 서버 키 noProductImages가 badUrl 뒤로 붙었다).
    // 병합 결정(t_3913855f): main의 파일 순서에서는 마케팅 블록 꼬리가 studio 블록과 인접하지 않다 —
    // unavailableNote가 badUrl과 noProductImages 사이에 끼므로 간격은 3이 아니라 4다.
    // 인접 단언은 main 순서의 실제 다음 키(marketing.format.title)로 맞췄다. 런더는 순서 무관.
    expect(positions[3] - positions[0]).toBe(4);
    expect(enKeys[positions[0] - 1]).toBe("marketing.output.model");
    expect(enKeys[positions[3] + 1]).toBe("marketing.format.title");
    // 정렬 순서로 붙어 있다(앵커 뒤 연속 삽입): 앞이 직전 블록의 마지막, 뒤가 후속 카드의 note 키다.
    expect(positions[2] - positions[0]).toBe(2);
    expect(enKeys[positions[0] - 1]).toBe("marketing.output.model");
    expect(enKeys[positions[2] + 1]).toBe("marketing.blocker.unavailableNote"); // 같은 블록 안에서 이어 붙였다
    expect(enKeys[positions[2] + 2]).toBe("marketing.blocker.noProductImages");
  });
});

/** line 500의 렌더 시점 리터럴 — 끝 마침표가 붙은 별개 바이트(Generate 차단 키와 다른 표면, 다른 열쇠). */
const NOTE = {
  key: "marketing.blocker.unavailableNote",
  en: "Marketing Studio isn't available here.",
  ko: "여기서는 마케팅 스튜디오를 사용할 수 없습니다.",
} as const;

describe("the SelfHostNote keeps its period byte and reads Korean", () => {
  it("English keeps the note's source bytes — trailing period, ASCII apostrophe", () => {
    const v = locales.en[NOTE.key] ?? ""; // 열쇠가 없으면 ""로 첫 단언에서 실패한다(누락 감지)
    expect(v, NOTE.key).toBe(NOTE.en);
    expect(v.endsWith("."), "kinetic이 getByText로 grep하는 마침표").toBe(true);
    expect(v.includes("\u2019"), "kinetic은 U+0027과 결속하므로 typographic apostrophe 금물").toBe(false);
    // 마침표 없는 Generate 차단 키와 별개 바이트 — 두 열쇠가 서로 다른 표면을 말한다.
    expect(locales.en["marketing.blocker.unavailable"]).not.toBe(v);
    expect(`${locales.en["marketing.blocker.unavailable"]}.`).toBe(v);
  });

  it("Korean uses the established sentence's period form, Hangul end to end", () => {
    const v = locales.ko[NOTE.key] ?? ""; // 열쇠가 없으면 ""로 첫 단언에서 실패한다(누락 감지)
    expect(v, NOTE.key).toBe(NOTE.ko);
    expect(HANGUL.test(v), `ko ${NOTE.key} must read Korean`).toBe(true);
    expect(v.endsWith("."), "확립된 문장의 마침표형으로 통일").toBe(true);
    expect(v).not.toBe(locales.en[NOTE.key]);
  });

  it("the default language renders what the kinetic stage matches on", () => {
    // vitest 기본 언어는 en: kinetic-templates.mjs의 마침표 버전 getByText(lines 153·302·316)가
    // 배선 후에도 실렌더와 바이트 동일로 초록을 유지한다(보존 바인딩의 기계 판정).
    expect(t(NOTE.key)).toBe("Marketing Studio isn't available here.");
  });

  it("the note hangs off the blocker block's tail, in the same place in both locales", () => {
    const enKeys = Object.keys(locales.en);
    const i = enKeys.indexOf(NOTE.key);
    expect(i, `${NOTE.key} present in en`).toBeGreaterThan(-1);
    expect(enKeys[i - 1]).toBe("marketing.blocker.badUrl"); // 차단 블록의 꼬리 — 계보 순서
    expect(enKeys[i + 1]).toBe("marketing.blocker.noProductImages"); // 후속 Option A 키가 곧바로 이어 붙었다(main 순서)
    expect(Object.keys(locales.ko)[i], `ko ${NOTE.key} shares the position`).toBe(NOTE.key);
  });
});
