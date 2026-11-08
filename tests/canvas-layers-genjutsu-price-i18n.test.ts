import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { locales, translate } from "@/lib/i18n/store";
import { openFreeWords } from "@/lib/run-place";

/**
 * canvas·layers·genjutsu 계열 7파일(레인 M3)이 동族 trio를 같은 재사용 키로 배선했는지의
 * 기계 판정(twin 선례 content-factory-estimate-i18n·레인 A1 cinema-episode-price-i18n의 판정 원형).
 * en은 원 리터럴과 바이트 동일(e2e 선택기와 character-swap-2k 유닛이 영어 리터럴에 결속돼 있다), ko는
 * 100% 한국어로 해석된다. 배선 형태(렌더 시점 훅 구독, fn의 `tr 기본값 storeT`, 모듈 상수 스냅샷 아님)도
 * 소스 스캔으로 검증한다. 로케일에는 손대지 않았다 — 3키는 선재(t_bef00b22 생성).
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

/** 이 레인이 배선한 파일과 각 파일이 요구하는 키(호출 지점 기준). */
const WIRING: Record<string, (keyof typeof SOURCE_LITERALS)[]> = {
  "nodes.tsx": ["placeholderFree", "freeYourGpu"],
  "node-list.tsx": ["placeholderFree", "freeYourGpu"],
  "editor-context.tsx": ["placeholderFree", "freeYourGpu"],
  "tools.tsx": ["placeholderFree", "freeYourGpu"],
  "layers-panel.tsx": ["placeholderFree", "freeYourGpu"],
  "layers-editor.tsx": ["placeholderFree", "freeYourGpu"],
  "character-panel.tsx": ["freeYourGpu"],
};
const SOURCES: Record<string, string> = {
  "nodes.tsx": "../src/components/canvas/nodes.tsx",
  "node-list.tsx": "../src/components/canvas/node-list.tsx",
  "editor-context.tsx": "../src/components/layers/editor-context.tsx",
  "tools.tsx": "../src/components/layers/tools.tsx",
  "layers-panel.tsx": "../src/components/layers/layers-panel.tsx",
  "layers-editor.tsx": "../src/components/layers/layers-editor.tsx",
  "character-panel.tsx": "../src/components/genjutsu/character-panel.tsx",
};
/** 렌더 측 파일(useI18n 훅 구독이 요구되는 곳). editor-context는 이 레인의 렌더 지점이 없다 — fn 기본값으로 충분하다. */
const HOOK_FILES = ["nodes.tsx", "node-list.tsx", "tools.tsx", "layers-panel.tsx", "layers-editor.tsx", "character-panel.tsx"];
/** fn 정의측 파일(마지막 인자 `tr: … = storeT` 기본값이 요구되는 곳). */
const FN_FILES = ["nodes.tsx", "editor-context.tsx", "character-panel.tsx"];

const HANGUL = /[\uAC00-\uD7A3]/;
// ko 스타일 규칙: 한자(중국 한자) 0자. 한글(한국)은 허용, CJK 이데오그래프는 금지.
const HANJA = /[\u4E00-\u9FFF]/;
/** Code without block/line comments — JSDoc 나열용 리터럴을 판정에서 제외한다. */
const codeOnly = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
const codeOf = (file: string) => codeOnly(fs.readFileSync(path.resolve(import.meta.dirname, SOURCES[file]), "utf-8"));

const HOOK_RE = /const\s*\{\s*t:\s*tr\s*\}\s*=\s*useI18n\(\)/;

describe("canvas·layers·genjutsu 7파일의 렌더 시점 trio 배선 (twin 판정 원형 · 레인 M3)", () => {
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

  it("7파일의 코드(주석 제외)는 trio 원 리터럴을 코드에서 담지 않고, 키 호출은 fn 정의측에, 통과만 렌더 측에 있다", () => {
    for (const file of Object.keys(WIRING)) {
      const code = codeOf(file);
      // 배선되지 않은 키까지 원문으로 되살아나선 안 된다(전 레인 무접촉이므로 trio 3종 전수 금지).
      for (const literal of Object.values(SOURCE_LITERALS)) {
        expect(code, `${file}: leftover ${literal}`).not.toContain(literal);
      }
    }
    // 리터럴을 실제로 tr(키)로 바꾸는 지점은 fn 정의측 3파일(costLabel×2·qualityShort) — 각자의 배선 키 호출이 거기에 있다.
    for (const file of FN_FILES) {
      const code = codeOf(file);
      for (const name of WIRING[file]) {
        expect(code, `${file}: tr call ${KEYS[name]}`).toContain(`tr("${KEYS[name]}")`);
      }
    }
    // 통과 측(순수 렌더 파일)은 키를 직접 부르지 않고 훅 tr을 fn으로 건넨다 — 직접 호출도, 원문도 있어선 안 된다.
    for (const file of ["node-list.tsx", "tools.tsx", "layers-panel.tsx", "layers-editor.tsx"]) {
      const code = codeOf(file);
      for (const key of Object.values(KEYS)) {
        expect(code, `${file}: no direct key call`).not.toContain(`tr("${key}")`);
      }
    }
    // character-panel에는 데모 경로가 없다(demo 없음·키1 무관): 키1 호출이 있어서도 안 된다.
    expect(codeOf("character-panel.tsx"), "no placeholderFree call").not.toContain(`tr("${KEYS.placeholderFree}")`);
  });

  it("배선은 구독을 거친다: 렌더 파일은 useI18n 훅·알리아스 tr, fn 파일은 tr 기본값 storeT(모듈 상수 스냅샷 아님)", () => {
    for (const file of HOOK_FILES) {
      const raw = fs.readFileSync(path.resolve(import.meta.dirname, SOURCES[file]), "utf-8");
      expect(raw, `${file}: the hook import`).toContain("useI18n");
      const code = codeOf(file);
      expect(code, `${file}: tr bound in scope`).toMatch(HOOK_RE);
      // 트로글로버 상수 스냅샷(모듈 레벨에서 t()/tr()/storeT()로 굳히는 형태)이 이 레인 파일에 0건.
      expect(code, `${file}: no module const snapshot`).not.toMatch(/^(?:export )?const [A-Z][A-Za-z0-9_]* = (?:tr|t|storeT)\(/m);
    }
    // 구독 수가 렌더 컴포넌트 수와 맞는다(같은 컴포넌트 안 다수 지점은 구독 1회 + tr 재사용이 원칙).
    const counts: Record<string, number> = { "nodes.tsx": 2, "node-list.tsx": 1, "tools.tsx": 8, "layers-panel.tsx": 2, "layers-editor.tsx": 1, "character-panel.tsx": 1 };
    for (const [file, n] of Object.entries(counts)) {
      const hits = (codeOf(file).match(new RegExp(HOOK_RE.source, "g")) ?? []).length;
      expect(hits, `${file}: hook count`).toBe(n);
    }
    // fn 정의측: `t as storeT` 수입과 마지막 인자 기본값. 1차는 costLabel×2·qualityShort에 각 1건,
    // 2차가 character-panel의 qualityHint에 같은 형태로 1건을 더했다(총 2건).
    const FN_DEFAULTS: Record<string, number> = { "nodes.tsx": 1, "editor-context.tsx": 1, "character-panel.tsx": 2 };
    for (const file of FN_FILES) {
      const code = codeOf(file);
      expect(code, `${file}: storeT imported`).toMatch(/import\s*\{[^}]*\bt as storeT\b[^}]*\}\s*from\s*"@\/lib\/i18n"/);
      const defaults = (code.match(/tr:\s*\(key: string, params\?: Params\) => string = storeT/g) ?? []).length;
      expect(defaults, `${file}: tr default = storeT`).toBe(FN_DEFAULTS[file]);
    }
  });

  it("호출 지점은 훅 tr을 건넨다(구독으로 렌더 시점 읽기 보장): 지점 수는 triage 실측과 정확히 일치", () => {
    const passCounts: Record<string, number> = {
      "nodes.tsx": 1, // :905의 join(" · ") 조립
      "node-list.tsx": 1, // :130의 ` · ` 접두 조립
      "tools.tsx": 10, // :321,529,653,705,905,1075,1113,1221,1426,1433
      "layers-panel.tsx": 2, // :231,576
      "layers-editor.tsx": 1, // :653
      "character-panel.tsx": 2, // :168의 openFree(qualityShort(…)) 래퍼 + 2차의 qualityHint(engine, shown, tr)
    };
    for (const [file, n] of Object.entries(passCounts)) {
      const hits = (codeOf(file).match(/, tr\)/g) ?? []).length;
      expect(hits, `${file}: calls pass tr`).toBe(n);
    }
    // 앵커 스코프: 각 호출이 자기 컴포넌트 본문 안에 있다(렌더 시점 읽기 — 모듈로 끌려 올라가지 않았다).
    const anchors: [string, string, string][] = [
      ["nodes.tsx", "const GeneratorNode = memo(", "v.costUsd, tr)"],
      ["node-list.tsx", "function NodeCard(", "v.costUsd, tr)"],
      ["layers-panel.tsx", "function AddLayer(", "isDemo(model), undefined, tr)"],
      ["layers-panel.tsx", "function SelectedLayer(", "isDemo(model), undefined, tr)"],
      ["layers-editor.tsx", "function Editor(", "decomposeCost(modelId, 8), tr)"],
      ["character-panel.tsx", "export function CharacterControls(", "qualityShort(engine, shown, tr)"],
    ];
    for (const [file, anchor, call] of anchors) {
      const code = codeOf(file);
      const i = code.indexOf(anchor);
      expect(i, `${file}: anchor ${anchor}`).toBeGreaterThanOrEqual(0);
      expect(code.slice(i), `${file}: call inside ${anchor}`).toContain(call);
    }
    // fn 본문 자체가 tr(키)를 부른다(호출 시점 읽기 — 기본값 storeT도 반응형, 비렌더·유닛은 en 초록).
    const fnAnchors: [string, string][] = [
      ["nodes.tsx", "function costLabel("],
      ["editor-context.tsx", "export function costLabel("],
      ["character-panel.tsx", "export function qualityShort("],
    ];
    for (const [file, anchor] of fnAnchors) {
      const code = codeOf(file);
      const i = code.indexOf(anchor);
      expect(i, `${file}: ${anchor} found`).toBeGreaterThanOrEqual(0);
      expect(code.slice(i, i + 800), `${file}: tr(key) inside ${anchor}`).toContain(`tr("${KEYS.freeYourGpu}")`);
    }
  });

  it("조립 재현: 접두·구분자 원문 공백 그대로, openFree 래퍼는 en 바이트 동일·ko에서 사이트 GPU만 줄인다", async () => {
    // node-list의 ` · ` 접두와 nodes footer의 join(" · ")이 en에서 원 bytes로 재조립된다(e2e 결속 문자열).
    expect(` · ${translate("en", KEYS.placeholderFree)}`).toBe(" · Placeholder · free");
    expect(["Pinned", translate("en", KEYS.freeYourGpu)].filter(Boolean).join(" · ")).toBe("Pinned · Free · your GPU");
    expect(["", translate("en", KEYS.placeholderFree)].filter(Boolean).join(" · ")).toBe("Placeholder · free");
    // ko 전환: trio 부분만 한국어로 바뀌고 접두·구분자(원문 저자의 공간)는 그대로다.
    expect(` · ${translate("ko", KEYS.placeholderFree)}`).toBe(" · 플레이스홀더 · 무료");
    expect(["Pinned", translate("ko", KEYS.freeYourGpu)].filter(Boolean).join(" · ")).toBe("Pinned · 무료 · 내 GPU");
    // openFree 래퍼(useOpenFree→openFreeWords): en은 원 바이트, ko는 사이트 GPU일 때만 "무료"로 줄고 그 외엔 그대로(pass-through).
    expect(openFreeWords(translate("en", KEYS.freeYourGpu), false, "en")).toBe("Free · your GPU");
    expect(openFreeWords(translate("en", KEYS.freeYourGpu), true, "en")).toBe("Free");
    expect(openFreeWords(translate("ko", KEYS.freeYourGpu), false, "ko")).toBe("무료 · 내 GPU");
    expect(openFreeWords(translate("ko", KEYS.freeYourGpu), true, "ko")).toBe("무료");
    // 데모 placeholder 줄은 래퍼의 변형을 거치지 않는다(순수 i18n 값 — freeRules 실독 확인).
    expect(openFreeWords(translate("ko", KEYS.placeholderFree), true, "ko")).toBe("플레이스홀더 · 무료");
    expect(openFreeWords(translate("en", KEYS.placeholderFree), true, "en")).toBe("Placeholder · free");
    // 결속 확인: character-swap-2k.test.ts :103은 qualityShort를 2인자로 직접 불러 en 바이트를 단언한다.
    // 기본값(storeT)을 없애거나 인자를 필수화하지 말 것 — 이 호출 형태 자체가 그 초록의 조건이다.
    const { qualityShort } = await import("@/components/genjutsu/character-panel");
    expect(qualityShort("open", "4K")).toBe("Free · your GPU");
    expect(qualityShort("cloud", "2K")).toBe("$0.81 for 5 s");
    expect(qualityShort("cloud", "768p")).toBe("H3's native top");
  });
});
