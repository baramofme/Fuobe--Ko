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
 * line 500의 SelfHostNote는 마침표가 붙은 별개 바이트("…available here.") — 이 3종이 아니며
 * kinetic-templates.mjs가 그 버전을 결속 검사하므로 무접촉이 규정이다.
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
    expect(positions[3] - positions[0]).toBe(3);
    expect(enKeys[positions[0] - 1]).toBe("marketing.output.model");
    expect(enKeys[positions[3] + 1]).toBe("studio.shots.addShot");
  });
});
