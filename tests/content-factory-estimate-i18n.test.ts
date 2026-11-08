import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { locales, translate } from "@/lib/i18n/store";

/**
 * content-factory/parts.tsx의 SeriesPriceLine이 EstimateLine의 쌍둥이(twin)로서
 * 세 렌더 문자열을 같은 키로 배선했는지의 기계 판정(t_37a3d9f2).
 * en은 원 리터럴과 바이트 동일(e2e 선택기·결속 테스트가 영어 리터럴에 결속돼 있다), ko는
 * 100% 한국어로 해석된다. controls.tsx의 estimate-line-i18n.test.ts가 판정한 것의
 * content-factory 판독판 — 배선 형태(렌더 시점 t(), 모듈 상수 아님)도 소스 스캔으로 검증한다.
 */
const SOURCE_LITERALS = {
  estimating: "Estimating…",
  placeholderFree: "Placeholder · free",
  freeYourGpu: "Free · your GPU",
} as const;

// Reuse — do not duplicate. The keys already exist (t_bef00b22 created them).
const KEYS: Record<keyof typeof SOURCE_LITERALS, string> = {
  estimating: "faceless.controls.estimating",
  placeholderFree: "faceless.controls.placeholderFree",
  freeYourGpu: "studio.composer.freeYourGpu",
};
const NAMES = Object.keys(SOURCE_LITERALS) as (keyof typeof SOURCE_LITERALS)[];

const PARTS = path.resolve(import.meta.dirname, "../src/components/content-factory/parts.tsx");
const HANGUL = /[\uAC00-\uD7A3]/;
/** Code without block/line comments — JSDoc 나열용 리터럴을 판정에서 제외한다. */
const codeOnly = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

describe("SeriesPriceLine의 렌더 시점 배선 (EstimateLine twin)", () => {
  it("세 키가 en·ko 양쪽에 있고, en 값은 원 리터럴과 문자 단위 동일", () => {
    for (const name of NAMES) {
      const key = KEYS[name];
      expect(locales.en[key], `${name}: en`).toBeTypeOf("string");
      expect(locales.en[key], `${name}: byte identity`).toBe(SOURCE_LITERALS[name]);
      expect(locales.ko[key], `${name}: ko`).toBeTypeOf("string");
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

  it("parts.tsx의 코드(주석 제외)는 세 키를 t()로 부르며 원 리터럴을 코드에서 담지 않는다", () => {
    const code = codeOnly(fs.readFileSync(PARTS, "utf-8"));
    for (const key of Object.values(KEYS)) {
      expect(code, `key call ${key}`).toContain(`t("${key}")`);
    }
    for (const literal of Object.values(SOURCE_LITERALS)) {
      expect(code, `leftover literal ${literal}`).not.toContain(literal);
    }
  });

  it("배선이 useI18n 훅을 경유한다(모듈 상수 스냅샷 아님 — 언어 전환 가능)", () => {
    const code = codeOnly(fs.readFileSync(PARTS, "utf-8"));
    expect(code).toContain("useI18n");
    // t() 호출이 함수 본문 내부에 있다(모듈 스코프 상수 아님).
    const seriesPriceLine = code.slice(code.indexOf("function SeriesPriceLine"));
    expect(seriesPriceLine).toContain("t(\"faceless.controls.estimating\")");
    expect(seriesPriceLine).toContain("t(\"faceless.controls.placeholderFree\")");
    expect(seriesPriceLine).toContain("t(\"studio.composer.freeYourGpu\")");
  });

  it("데모 경로의 placeholder 줄은 openFree를 거치지 않는다(순수 i18n 값)", () => {
    expect(translate("ko", KEYS.placeholderFree)).toBe("플레이스홀더 · 무료");
    expect(translate("en", KEYS.placeholderFree)).toBe("Placeholder · free");
  });
});
