import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { locales, translate } from "@/lib/i18n/store";
import { openFreeWords } from "@/lib/run-place";

/**
 * 렌더 인라인 6지점(레인 A2 — canvas-editor·photodump/steps·turnaround-dialog·
 * session-view·influencer-builder·split-tool)의 배선 기계 판정. 판정 원형은 twin 선례
 * (t_37a3d9f2 #153의 content-factory·estimate-line 계열): ① en 바이트 동일 ② ko 한글
 * ③ 소스 스캔 codeOnly(원 리터럴 잔존 0·tr(key) 호출) ④ 훅 경유(useI18n 구독) ⑤ 조립 재현.
 * en은 e2e·coupled 테스트가 원 영어 리터럴에 결속돼 있어 문자 단위 동일해야 초록(e2e
 * 'Film this path · Placeholder · free'·turnaround·clean-voice 등). ko는 100% 한국어.
 */
const SOURCE_LITERALS = {
  placeholderFree: "Placeholder · free",
  freeYourGpu: "Free · your GPU",
} as const;

// Earlier cards created both keys with byte-identical values — reuse, never duplicate or re-edit locales.
const KEYS: Record<keyof typeof SOURCE_LITERALS, string> = {
  placeholderFree: "faceless.controls.placeholderFree",
  freeYourGpu: "studio.composer.freeYourGpu",
};

/** 각 파일이 실제로 tr로 배선한 키(이 surface들의 body 실측 자리 기준). */
const FILE_KEYS: Record<string, (keyof typeof SOURCE_LITERALS)[]> = {
  "src/components/canvas/canvas-editor.tsx": ["placeholderFree"],
  "src/components/photodump/steps.tsx": ["placeholderFree", "freeYourGpu"],
  "src/components/turnaround/turnaround-dialog.tsx": ["placeholderFree"],
  "src/components/shorts/session-view.tsx": ["placeholderFree"],
  "src/components/influencer/influencer-builder.tsx": ["placeholderFree", "freeYourGpu"],
  "src/components/audio-tools/split-tool.tsx": ["placeholderFree", "freeYourGpu"],
};

const FILE_PATHS = Object.keys(FILE_KEYS);
const NAMES = Object.keys(SOURCE_LITERALS) as (keyof typeof SOURCE_LITERALS)[];
const HANGUL = /[\uAC00-\uD7A3]/;
const HANJA = /[\u4e00-\u9fff]/;
/** 코드에서 블록·라인 주석을 제거해 JSDoc의 설명용 리터럴을 판정에서 제외한다. */
const codeOnly = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
const codeOf = (rel: string) => codeOnly(fs.readFileSync(path.resolve(import.meta.dirname, "..", rel), "utf-8"));

describe("인라인 클러스터 A2의 렌더 시점 배선", () => {
  it("두 키가 en·ko 양쪽에 있고, en 값은 원 리터럴과 문자 단위 동일(스토어 경유 해석도 동일)", () => {
    for (const name of NAMES) {
      const key = KEYS[name];
      expect(locales.en[key], `${name}: en is a string`).toBeTypeOf("string");
      expect(locales.en[key], `${name}: byte identity`).toBe(SOURCE_LITERALS[name]);
      expect(locales.ko[key], `${name}: ko is a string`).toBeTypeOf("string");
      // vitest의 기본 언어는 en — 결속 테스트가 이 위에 선다.
      expect(translate("en", key), `${name}: translate("en") byte identity`).toBe(SOURCE_LITERALS[name]);
    }
  });

  it("ko 값은 en과 다르고 한글을 1자 이상 담으며 한자가 0자(로케일 무접촉이라 선재 값으로 판정)", () => {
    for (const name of NAMES) {
      const key = KEYS[name];
      expect(locales.ko[key], name).not.toBe(locales.en[key]);
      expect(HANGUL.test(locales.ko[key]!), `${name}: Hangul`).toBe(true);
      expect(HANJA.test(locales.ko[key]!), `${name}: zero hanja`).toBe(false);
    }
  });

  it("6파일의 코드(주석 제외)는 자기가 배선한 키를 tr()로 부르며 원 trio 리터럴을 코드에 담지 않는다", () => {
    for (const [rel, used] of Object.entries(FILE_KEYS)) {
      const code = codeOf(rel);
      for (const name of used) {
        expect(code, `${rel}: tr("KEYS[name]") present`).toContain(`tr("${KEYS[name]}")`);
      }
      // 배선된 surface는 원 trio 리터럴이 코드에서 사라진다(주석은 codeOnly가 제거).
      for (const literal of Object.values(SOURCE_LITERALS)) {
        expect(code, `${rel}: no leftover literal ${literal}`).not.toContain(literal);
      }
    }
  });

  it("6파일 모두 useI18n 알리아스 tr로 렌더 시점 구독한다(모듈 상수 스냅샷·store 직경유 아님)", () => {
    for (const rel of FILE_PATHS) {
      const code = codeOf(rel);
      expect(code, `${rel}: imports useI18n`).toContain("useI18n");
      expect(code, `${rel}: destructures t as tr`).toContain("useI18n()");
    }
  });

  it("canvas 조립은 접두 'N to run · '를 원문 공백 그대로 유지하고 데모 분기가 en에서 바이트 동일로 재조립된다", () => {
    const code = codeOf("src/components/canvas/canvas-editor.tsx");
    // 접두/구분자 원문 유지 — 키 분할로 공백을 망가뜨리지 않았는지.
    expect(code).toContain(" to run · ");
    // en 재조립: ${N} to run · <demo> == 원 문자열(결속 리터럴).
    const demoEn = translate("en", KEYS.placeholderFree);
    expect(`3 to run · ${demoEn}`).toBe("3 to run · Placeholder · free");
    // ko 재조립: 접두는 그대로 두고 demo만 ko로 바뀐다(바이트 동일 en·반응형 ko).
    expect(`3 to run · ${translate("ko", KEYS.placeholderFree)}`).toBe("3 to run · 플레이스홀더 · 무료");
  });

  it("데모 플래이스홀더 줄은 openFree에서 줄지 않고 순수 i18n로 산다(선재 바이트 잠금 재확인)", () => {
    // openFree는 "Free · your GPU" 계열만 줄이고 "Placeholder · free"는 원형 그대로 둔다(hosted-surface-labels 잠금).
    expect(openFreeWords(translate("en", KEYS.placeholderFree), true, "en")).toBe("Placeholder · free");
    expect(openFreeWords(translate("ko", KEYS.placeholderFree), true, "ko")).toBe("플레이스홀더 · 무료");
    // freeYourGpu는 openFree에서 사이트 GPU일 때 free word만 남는다(렌더 call-site의 조립 경로 증명).
    expect(openFreeWords(translate("en", KEYS.freeYourGpu), true, "en")).toBe("Free");
    expect(openFreeWords(translate("en", KEYS.freeYourGpu), false, "en")).toBe("Free · your GPU");
    expect(openFreeWords(translate("ko", KEYS.freeYourGpu), true, "ko")).toBe("무료");
    expect(openFreeWords(translate("ko", KEYS.freeYourGpu), false, "ko")).toBe("무료 · 내 GPU");
  });

  it("out-of-scope 변형(래퍼·bare Free·price unknown·on-your-GPU·plays-in-your-browser)은 각 파일 코드에 그대로 남는다", () => {
    // 범위 밖 리터럴을 건드리지 않았다는 회귀 방지방: 원문이 코드에 존재해야 한다.
    expect(codeOf("src/components/photodump/steps.tsx")).toContain("price unknown");
    expect(codeOf("src/components/influencer/influencer-builder.tsx")).toContain("price unknown");
    expect(codeOf("src/components/canvas/canvas-editor.tsx")).toContain("price unknown");
    expect(codeOf("src/components/shorts/session-view.tsx")).toContain("? \"Free\"");
    expect(codeOf("src/components/turnaround/turnaround-dialog.tsx")).toContain("Free · on your GPU");
    expect(codeOf("src/components/turnaround/turnaround-dialog.tsx")).toContain("openFree(");
    expect(codeOf("src/components/audio-tools/split-tool.tsx")).toContain("under $0.01");
    expect(codeOf("src/components/audio-tools/split-tool.tsx")).toContain("Free · plays in your browser");
    expect(codeOf("src/components/audio-tools/split-tool.tsx")).toContain("openToolPrice(p)");
  });
});
