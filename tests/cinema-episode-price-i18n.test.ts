import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { locales, translate } from "@/lib/i18n/store";
import { openFreeWords } from "@/lib/run-place";

/**
 * 시네마 5종과 faceless/episode-view의 렌더 인라인 6지점이 동族 trio를 같은 재사용 키로
 * 배선했는지의 기계 판정(레인 A1 — EstimateLine/SeriesPriceLine twin 선례의 cinema 판독판).
 * en은 원 리터럴과 바이트 동일(cinema-path·cinema-scene 등 e2e 선택기가 영어 리터럴에 결속돼 있다),
 * ko는 100% 한국어로 해석된다. 배선 형태(렌더 시점 훅, 모듈 상수 스냅샷 아님)도 소스 스캔으로 검증한다.
 */
const SOURCE_LITERALS = {
  placeholderFree: "Placeholder · free",
  freeYourGpu: "Free · your GPU",
  estimating: "Estimating…",
} as const;

// Reuse — do not duplicate. The keys already exist (t_bef00b22 created them); locales are untouched here.
const KEYS: Record<keyof typeof SOURCE_LITERALS, string> = {
  placeholderFree: "faceless.controls.placeholderFree",
  freeYourGpu: "studio.composer.freeYourGpu",
  estimating: "faceless.controls.estimating",
};

/** 이 레인이 배선한 지점(파일별 키)과 각 지점의 알리아스 tr 선언 스코프(훅 경유 증명용 앵커). */
const WIRING: Record<string, (keyof typeof SOURCE_LITERALS)[]> = {
  "blockout-panel.tsx": ["placeholderFree", "freeYourGpu"],
  "prompt-bar.tsx": ["placeholderFree", "freeYourGpu"],
  "scene-actions.tsx": ["placeholderFree", "freeYourGpu"],
  "soul-builders.tsx": ["placeholderFree", "freeYourGpu"],
  "world-panel.tsx": ["placeholderFree"],
  "episode-view.tsx": ["placeholderFree", "freeYourGpu"],
};
const ANCHORS: Record<string, string> = {
  "blockout-panel.tsx": "export function BlockoutPanel",
  "prompt-bar.tsx": "export function PromptBar",
  "scene-actions.tsx": "export function usePlanPrice",
  "soul-builders.tsx": "function CostLabel",
  "world-panel.tsx": "export function WorldPanel",
  "episode-view.tsx": "function SceneEditor",
};
const SOURCES: Record<string, string> = {
  "blockout-panel.tsx": "../src/components/cinema/blockout-panel.tsx",
  "prompt-bar.tsx": "../src/components/cinema/prompt-bar.tsx",
  "scene-actions.tsx": "../src/components/cinema/scene-actions.tsx",
  "soul-builders.tsx": "../src/components/cinema/soul-builders.tsx",
  "world-panel.tsx": "../src/components/cinema/world-panel.tsx",
  "episode-view.tsx": "../src/components/faceless/episode-view.tsx",
};

const HANGUL = /[\uAC00-\uD7A3]/;
// ko 스타일 규칙: 한자(중국 한자) 0자. 한글(한국)은 허용, CJK 이데오그래프는 금지.
const HANJA = /[\u4E00-\u9FFF]/;
/** Code without block/line comments — JSDoc 나열용 리터럴을 판정에서 제외한다. */
const codeOnly = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
const codeOf = (file: string) => codeOnly(fs.readFileSync(path.resolve(import.meta.dirname, SOURCES[file]), "utf-8"));

describe("시네마·episode 6지점의 렌더 시점 trio 배선 (twin 판독판)", () => {
  it("세 키가 en·ko 양쪽에 있고, en 값은 원 리터럴과 문자 단위 동일", () => {
    for (const name of Object.keys(SOURCE_LITERALS) as (keyof typeof SOURCE_LITERALS)[]) {
      const key = KEYS[name];
      expect(locales.en[key], `${name}: en`).toBeTypeOf("string");
      expect(locales.en[key], `${name}: byte identity`).toBe(SOURCE_LITERALS[name]);
      expect(locales.ko[key], `${name}: ko`).toBeTypeOf("string");
      expect(translate("en", key), `${name}: translate`).toBe(SOURCE_LITERALS[name]);
    }
  });

  it("ko 값은 en과 다르고 한글을 1자 이상, 한자(中文)는 0자", () => {
    for (const name of Object.keys(SOURCE_LITERALS) as (keyof typeof SOURCE_LITERALS)[]) {
      const key = KEYS[name];
      expect(locales.ko[key], name).not.toBe(locales.en[key]);
      expect(HANGUL.test(locales.ko[key]!), `${name}: Hangul`).toBe(true);
      expect(HANJA.test(locales.ko[key]!), `${name}: no hanja`).toBe(false);
    }
  });

  it("6파일의 코드(주석 제외)는 배선 키를 tr()로 부르며 trio 원 리터럴을 코드에서 담지 않는다", () => {
    for (const [file, names] of Object.entries(WIRING)) {
      const code = codeOf(file);
      for (const name of names) {
        expect(code, `${file}: tr call ${KEYS[name]}`).toContain(`tr("${KEYS[name]}")`);
      }
      // 배선되지 않은 키까지 원문으로 되살아나선 안 된다(전 레인 무접촉이므로 trio 3종 전수 금지).
      for (const [name, literal] of Object.entries(SOURCE_LITERALS)) {
        expect(code, `${file}: leftover ${literal}`).not.toContain(literal);
      }
    }
  });

  it("배선은 useI18n 훅을 경유한다(모듈 상수 스냅샷 아님 — 언어 전환 반응형)", () => {
    for (const [file, names] of Object.entries(WIRING)) {
      const raw = fs.readFileSync(path.resolve(import.meta.dirname, SOURCES[file]), "utf-8");
      expect(raw, `${file}: the hook`).toContain("useI18n");
      const code = codeOf(file);
      // 알리아스 선언이 함수 본문 안에 있다(모듈 스코프 상수 아님).
      expect(code, `${file}: tr bound in scope`).toMatch(/const\s*\{\s*t:\s*tr\s*\}\s*=\s*useI18n\(\)/);
      // 트로글로버 상수 스냅샷(모듈 레벨에서 t()/tr()로 굳히는 형태)이 이 레인 파일에 0건.
      expect(code, `${file}: no module const snapshot`).not.toMatch(/^(?:export )?const [A-Z][A-Za-z0-9_]* = tr\(/m);
      // 각 지점의 호출이 자기 컴포넌트·훅 스코프(앵커) 안에 있다 — 렌더 시점 읽기.
      const anchor = code.indexOf(ANCHORS[file]);
      expect(anchor, `${file}: anchor ${ANCHORS[file]}`).toBeGreaterThanOrEqual(0);
      const scope = code.slice(anchor);
      for (const name of names) {
        expect(scope, `${file}: inside ${ANCHORS[file]}`).toContain(`tr("${KEYS[name]}")`);
      }
    }
  });

  it("조립 재현: 접두·구분자 원문 공백 그대로, openFree는 en 바이트 동일·ko에서 사이트 GPU만 줄인다", () => {
    // e2e 결속 문자열(cinema-path.mjs 버튼 이름)이 en에서 원 bytes로 재조립된다.
    expect(`Film this path · ${translate("en", KEYS.placeholderFree)}`).toBe("Film this path · Placeholder · free");
    expect(`Build 3D scene · ${translate("en", KEYS.placeholderFree)}`).toBe("Build 3D scene · Placeholder · free");
    // episode 거대 템플릿의 접미 경계(" · ")도 원문 그대로 재현된다.
    expect(`Re-renders 2 steps (picture and motion) · ${translate("en", KEYS.placeholderFree)}`).toBe(
      "Re-renders 2 steps (picture and motion) · Placeholder · free",
    );
    // ko 전환: trio 부분만 한국어로 바뀌고 접두(타 레인 소유)는 그대로다.
    expect(`Film this path · ${translate("ko", KEYS.placeholderFree)}`).toBe("Film this path · 플레이스홀더 · 무료");
    // openFree 래퍼: en은 원 바이트, ko는 사이트 GPU일 때만 "무료"로 줄고 그 외엔 그대로.
    expect(openFreeWords(translate("en", KEYS.freeYourGpu), false, "en")).toBe("Free · your GPU");
    expect(openFreeWords(translate("en", KEYS.freeYourGpu), true, "en")).toBe("Free");
    expect(openFreeWords(translate("ko", KEYS.freeYourGpu), false, "ko")).toBe("무료 · 내 GPU");
    expect(openFreeWords(translate("ko", KEYS.freeYourGpu), true, "ko")).toBe("무료");
    // 데모 placeholder 줄은 openFree를 거치지 않는다(순수 i18n 값 — 래퍼가 건드리지 않는다).
    expect(openFreeWords(translate("ko", KEYS.placeholderFree), true, "ko")).toBe("플레이스홀더 · 무료");
    expect(openFreeWords(translate("en", KEYS.placeholderFree), true, "en")).toBe("Placeholder · free");
  });
});
