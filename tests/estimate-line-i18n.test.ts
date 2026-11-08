import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { locales, translate } from "@/lib/i18n/store";
import { openFreeWords } from "@/lib/run-place";

/**
 * EstimateLine의 세 렌더 문자열이 i18n 키로 배선되었는지의 기계 판정(t_bef00b22).
 * en은 원 리터럴과 바이트 동일(e2e 선택기·coupled 테스트가 영어 리터럴에 결속돼 있다), ko는
 * 100% 한국어로 해석된다. 재설계된 openFreeWords는 locale 토큰에서 패턴을 조립하므로, 배선된
 * ko 문자열("무료 · 내 GPU")이 사이트 GPU일 때 실제로 "무료"로 줄어드는 것을 실측으로 증명한다.
 */
const SOURCE_LITERALS = {
  estimating: "Estimating…",
  placeholderFree: "Placeholder · free",
  freeYourGpu: "Free · your GPU",
} as const;

// Earlier card created freeYourGpu with the byte-identical value — reuse, not duplicate.
const KEYS: Record<keyof typeof SOURCE_LITERALS, string> = {
  estimating: "faceless.controls.estimating",
  placeholderFree: "faceless.controls.placeholderFree",
  freeYourGpu: "studio.composer.freeYourGpu",
};
const NAMES = Object.keys(SOURCE_LITERALS) as (keyof typeof SOURCE_LITERALS)[];

const CONTROLS = path.resolve(import.meta.dirname, "../src/components/faceless/controls.tsx");
const HANGUL = /[\uAC00-\uD7A3]/;
/** Code without block/line comments — JSDoc 나열용 리터럴을 판정에서 제외한다. */
const codeOnly = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

describe("EstimateLine의 렌더 시점 배선", () => {
  it("세 키가 en·ko 양쪽에 있고, en 값은 원 리터럴과 문자 단위 동일", () => {
    for (const name of NAMES) {
      const key = KEYS[name];
      expect(locales.en[key], `${name}: en`).toBeTypeOf("string");
      expect(locales.en[key], `${name}: byte identity`).toBe(SOURCE_LITERALS[name]);
      expect(locales.ko[key], `${name}: ko`).toBeTypeOf("string");
      // 실제 스토어 경유 해석도 리터럴과 동일(vitest의 기본 언어는 en — 결속 테스트가 이 위에 서 있다).
      expect(translate("en", key), `${name}: translate`).toBe(SOURCE_LITERALS[name]);
    }
  });

  it("ko 값은 en과 다르고 한글을 1자 이상 담는다", () => {
    for (const name of NAMES) {
      const key = KEYS[name];
      expect(locales.ko[key], name).not.toBe(locales.en[key]);
      expect(HANGUL.test(locales.ko[key]!), `${name}: Hangul`).toBe(true);
    }
  });

  it("controls.tsx의 코드(주석 제외)는 세 키를 t()로 부르며 원 리터럴을 문자열로 담지 않는다", () => {
    const code = codeOnly(fs.readFileSync(CONTROLS, "utf-8"));
    for (const key of Object.values(KEYS)) {
      expect(code, `key call ${key}`).toContain(`t("${key}")`);
    }
    for (const literal of Object.values(SOURCE_LITERALS)) {
      expect(code, `leftover literal ${literal}`).not.toContain(literal);
    }
  });

  it("배선 문자열이 재설계된 openFreeWords를 지나 사이트 GPU에서는 free word만 남는다", () => {
    // en: 배선 값은 영어 리터럴과 바이트 동일 → 예전 동작과 같은 결과.
    expect(openFreeWords(translate("en", KEYS.freeYourGpu), true, "en")).toBe("Free");
    expect(openFreeWords(translate("en", KEYS.freeYourGpu), false, "en")).toBe("Free · your GPU");
    // ko: 렌더 값 "무료 · 내 GPU"가 사이트 GPU에서 "무료"로 줄고, 그 외에는 그대로 남는다.
    const koValue = translate("ko", KEYS.freeYourGpu);
    expect(koValue).toBe("무료 · 내 GPU");
    expect(openFreeWords(koValue, true, "ko")).toBe("무료");
    expect(openFreeWords(koValue, false, "ko")).toBe("무료 · 내 GPU");
  });

  it("플래이스홀더 줄은 데모 경로에서 openFree를 거치지 않는다(줄임 없는 순수 i18n)", () => {
    // 데모의 price 분기는 t()만 지난다 — ko에서 줄임 패턴이 적용되지 않아야 값이 산다.
    expect(translate("ko", KEYS.placeholderFree)).toBe("플레이스홀더 · 무료");
    expect(translate("en", KEYS.placeholderFree)).toBe("Placeholder · free");
  });
});
