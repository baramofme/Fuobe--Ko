import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { locales, translate } from "@/lib/i18n/store";
import { priceLine, type DubPrice } from "@/lib/av/dub";
import { openToolPrice } from "@/lib/av/split";
import { costLabel } from "@/lib/composer";
import { placePrice } from "@/lib/run-place";
import { flyPrice, type FlyAroundPreview } from "@/components/fly-around-run";

/**
 * 레인 L(lib 가격 헬퍼 trio 배선)의 기계 판정 — twin 52d7e321의
 * tests/content-factory-estimate-i18n.test.ts 5건 판정 원형을 lib 헬퍼 판독으로 옮긴다.
 *
 * 대상: src/lib/av/dub.ts priceLine·src/lib/av/split.ts openToolPrice·src/lib/composer.ts
 * costLabel·src/lib/run-place.ts placePrice·src/components/fly-around-run.ts flyPrice,
 * 그리고 소비자 2(dub-studio.tsx PriceNote·studio/composer.tsx의 costLabel call-site 2곳).
 *
 * 결속 실측(a261e8a9): 인자 필수화 시 터지는 것들 —
 *   npx vitest run tests/av-dub.test.ts   (:563 toMatch(/^(Placeholder · free|Free on your GPU)$/)·:605 toBe("Placeholder · free"))
 *   npx vitest run tests/composer.test.ts (:308-313 toBe("Placeholder · free")·toBe("Free · your GPU"))
 *   npx vitest run tests/run-place.test.ts (:23,24,51 toBe("Placeholder · free"))
 * 세 줄 전부 마지막 인자를 기본값 storeT에 두었으므로 vitest(node, localStorage 없음 → en)에서
 * en 값이 원 리터럴과 바이트 동일해야 초록이 산다. 판정 5가 그 호출을 실제로 때려 증명한다.
 */
const SOURCE_LITERALS = {
  placeholderFree: "Placeholder · free",
  freeYourGpu: "Free · your GPU",
} as const;

// Reuse — 신규 키 0종. 세 키의 자매 키(faceless.controls.estimating)는 이 레인의 지점이 없다.
const KEYS: Record<keyof typeof SOURCE_LITERALS, string> = {
  placeholderFree: "faceless.controls.placeholderFree",
  freeYourGpu: "studio.composer.freeYourGpu",
};
const NAMES = Object.keys(SOURCE_LITERALS) as (keyof typeof SOURCE_LITERALS)[];

const HANGUL = /[\uAC00-\uD7A3]/;
const HANJA = /[\u4e00-\u9fff]/;
/** Code without block/line comments — JSDoc 나열용 리터럴을 판정에서 제외한다(twin 선례). */
const codeOnly = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

const at = (p: string) => path.resolve(import.meta.dirname, "..", p);
const SRC = {
  dub: at("src/lib/av/dub.ts"),
  split: at("src/lib/av/split.ts"),
  libComposer: at("src/lib/composer.ts"),
  runPlace: at("src/lib/run-place.ts"),
  flyRun: at("src/components/fly-around-run.ts"),
  dubStudio: at("src/components/dub/dub-studio.tsx"),
  studioComposer: at("src/components/studio/composer.tsx"),
};
const read = (p: string) => codeOnly(fs.readFileSync(p, "utf8"));

/** 배선된 함수를 기본값(기본 tr)으로 부를 때의 en 바이트 — call-site를 기본값에 둔 이유로 초록을 산다. */
const fmt = (n: number) => `$${n.toFixed(2)}`;
const previewLike = (over: Partial<FlyAroundPreview> = {}): FlyAroundPreview => ({
  engine: "cloud",
  model: { id: "m", name: "M" },
  label: "Fly",
  duration: 3,
  steps: 1,
  notes: [],
  costUsd: 0,
  demo: true,
  ...over,
});

describe("lib 가격 헬퍼 trio의 호출 시점 배선(레인 L)", () => {
  it("1. 두 키가 en·ko 양쪽에 있고, en 값은 원 리터럴과 문자 단위 동일", () => {
    for (const name of NAMES) {
      const key = KEYS[name];
      expect(locales.en[key], `${name}: en`).toBeTypeOf("string");
      expect(locales.en[key], `${name}: byte identity`).toBe(SOURCE_LITERALS[name]);
      expect(locales.ko[key], `${name}: ko`).toBeTypeOf("string");
      expect(translate("en", key), `${name}: translate`).toBe(SOURCE_LITERALS[name]);
    }
  });

  it("2. ko 값은 en과 다르고 한글을 1자 이상 담는다(한자·중문 0)", () => {
    expect(locales.ko[KEYS.placeholderFree]).toBe("플레이스홀더 · 무료");
    expect(locales.ko[KEYS.freeYourGpu]).toBe("무료 · 내 GPU");
    for (const name of NAMES) {
      const key = KEYS[name];
      const ko = locales.ko[key]!;
      expect(ko, name).not.toBe(locales.en[key]);
      expect(HANGUL.test(ko), `${name}: Hangul`).toBe(true);
      expect(HANJA.test(ko), `${name}: no hanja`).toBe(false);
      expect(translate("ko", key), `${name}: ko via translate`).toBe(ko);
    }
  });

  it("3. 소스 스캔(codeOnly): 배선 지점은 tr()로 키를 부르며 원 리터럴을 코드에 남기지 않는다", () => {
    // 헬퍼 5: 데모(비compact) 지점이 tr(key)로 바꿨다.
    expect(read(SRC.dub)).toContain(`tr("${KEYS.placeholderFree}")`);
    expect(read(SRC.split)).toContain(`tr("${KEYS.placeholderFree}")`);
    expect(read(SRC.libComposer)).toContain(`tr("${KEYS.placeholderFree}")`);
    expect(read(SRC.libComposer)).toContain(`tr("${KEYS.freeYourGpu}")`);
    expect(read(SRC.runPlace)).toContain(`tr("${KEYS.placeholderFree}")`);
    expect(read(SRC.flyRun)).toContain(`tr("${KEYS.placeholderFree}")`);
    // 소비자 2: 조립은 그대로, 인자만 건넨다.
    expect(read(SRC.dubStudio)).toContain("priceLine(price, tr)");
    const calls = read(SRC.studioComposer).match(/costLabel\(\{[^}]*\}, formatCost, t\)/g) ?? [];
    expect(calls.length, "studio composer의 costLabel call-site 2곳이 그 알리아스 t을 건넨다").toBe(2);
    // 원 리터럴 0 잔존(주석 제외 — JSDoc의 예시 나열은 무접촉 증거로 남는다).
    for (const [file, code] of Object.entries(SRC)) {
      expect(code, `leftover literal in ${file}`).not.toContain(SOURCE_LITERALS.placeholderFree);
      if (file !== "dub" && file !== "split" && file !== "runPlace") {
        expect(code, `leftover freeYourGpu in ${file}`).not.toContain(SOURCE_LITERALS.freeYourGpu);
      }
    }
  });

  it("4. 모듈 상수 스냅샷 아님: 호출 시점의 파라미터 기본값이며, 렌더 consumers는 훅을 경유한다", () => {
    const PARAM = "tr: (key: string, params?: Params) => string = storeT";
    expect(read(SRC.dub)).toContain(PARAM);
    expect(read(SRC.split)).toContain(PARAM);
    expect(read(SRC.libComposer)).toContain(PARAM);
    expect(read(SRC.runPlace)).toContain(PARAM);
    expect(read(SRC.flyRun)).toContain(PARAM);
    // storeT의 근원: pure store(런더 훅과 무관한 서버·유닛도 같은 표를 읽는다).
    expect(read(SRC.dub)).toContain(`storeT`);
    expect(read(SRC.split)).toContain(`storeT`);
    expect(read(SRC.libComposer)).toContain(`storeT`);
    expect(read(SRC.runPlace)).toContain(`storeT`);
    expect(read(SRC.flyRun)).toContain(`storeT`);
    // 모듈 스코프의 t() 스냅샷(언어를 import 시점에 고정하는 상수)이 0 — 배선은 함수 본문 안(twin 선례의 슬라이스 판정).
    const BODY_FNS: Record<"dub" | "split" | "libComposer" | "runPlace" | "flyRun", string> = { dub: "priceLine", split: "openToolPrice", libComposer: "costLabel", runPlace: "placePrice", flyRun: "flyPrice" };
    for (const file of ["dub", "split", "libComposer", "runPlace", "flyRun"] as const) {
      const code = read(SRC[file]);
      expect(code, `module const snapshot in ${file}`).not.toMatch(/\b(?:export )?const \w+ = (?:t|tr)\(/);
      const body = code.slice(code.indexOf(`export function ${BODY_FNS[file]}`));
      expect(body.length, `function found in ${file}`).toBeGreaterThan(0);
      expect(body, `tr call inside the function body of ${file}`).toContain(`tr("${KEYS.placeholderFree}")`);
    }
    // 렌더 call-site의 구독: 훅 알리아스 tr(또는 선재 알리아스 t)이 렌더 시점의 언어를 읽는다.
    expect(read(SRC.flyRun)).toContain("const { t: tr } = useI18n()");
    expect(read(SRC.dubStudio)).toContain("const { t: tr } = useI18n()");
    expect(read(SRC.studioComposer)).toContain("const { t } = useI18n()");
    // openFree 래퍼 유지(규칙 5): 안쪽만 tr로 — 래퍼 자체는 그대로 두 줄에 남아 있다.
    expect(read(SRC.flyRun)).toContain("openFree(flyPrice(preview.data, false, tr))");
    expect(read(SRC.flyRun)).toContain("openFree(flyPrice(preview.data, true, tr))");
  });

  it("5. 기본값 storeT의 en 바이트가 결속을 지킨다(호출 실측)과 결속 단언이 원문 그대로 살아 있다", () => {
    // vitest는 node 환경: localStorage 없음 → getLang()은 en → 기본값 호출은 en 원 바이트.
    const demoPrice: DubPrice = { engine: "cloud", costUsd: 0, unpriced: [], demo: true, steps: 4 };
    expect(priceLine(demoPrice)).toBe("Placeholder · free");
    expect(priceLine(demoPrice, (k) => translate("ko", k))).toBe("플레이스홀더 · 무료");
    // 범위 밖 변형은 무접촉 사실 그대로(카드 실측): "Free on your GPU"·"< $0.01".
    expect(priceLine({ engine: "open", costUsd: 0, unpriced: [], demo: false, steps: 4 })).toBe("Free on your GPU");
    expect(priceLine({ engine: "cloud", costUsd: 0.5, unpriced: ["Claude"], demo: false, steps: 3 })).toBe("≈ $0.50 + Claude");

    expect(openToolPrice({ demo: true })).toBe("Placeholder · free");
    expect(openToolPrice({ demo: true }, undefined, (k) => translate("ko", k))).toBe("플레이스홀더 · 무료");
    expect(openToolPrice(undefined)).toBe("…");
    expect(openToolPrice({ demo: false })).toBe("Free");
    expect(openToolPrice({ demo: true }, true)).toBe("Not available here");

    expect(costLabel({ demo: true, cost: 0.4 }, fmt)).toBe("Placeholder · free");
    expect(costLabel({ demo: true, cost: 0.4, compact: true }, fmt)).toBe("Placeholder");
    expect(costLabel({ demo: false, cost: 0 }, fmt)).toBe("Free");
    expect(costLabel({ demo: false, cost: 0, gpu: true }, fmt)).toBe("Free · your GPU");
    expect(costLabel({ demo: false, cost: 0, gpu: true, compact: true }, fmt)).toBe("Free · GPU");
    expect(costLabel({ demo: true, cost: 0, gpu: true }, fmt)).toBe("Placeholder · free");
    expect(costLabel({ demo: false, cost: null, unknown: true }, fmt)).toBe("Price unknown");

    expect(placePrice({ open: false, demo: true, costUsd: 0.4 }, fmt)).toBe("Placeholder · free");
    expect(placePrice({ open: true, demo: true }, fmt)).toBe("Placeholder · free");
    expect(placePrice({ open: true, demo: false }, fmt)).toBe("Free");
    expect(placePrice({ open: false, costUsd: null }, fmt)).toBe("Price unknown");

    expect(flyPrice(previewLike())).toBe("Placeholder · free");
    expect(flyPrice(previewLike(), true)).toBe("Placeholder");
    expect(flyPrice(undefined)).toBe("");
    expect(flyPrice(previewLike({ engine: "open", demo: false }))).toBe("Free · on your GPU");

    // 결속 단언의 원문이 결속된 바이트로 그대로 서 있다(테스트 표가 게이트의 열쇠).
    const avDub = fs.readFileSync(at("tests/av-dub.test.ts"), "utf8");
    expect(avDub).toContain('toMatch(/^(Placeholder · free|Free on your GPU)$/');
    expect(avDub).toContain('toBe("Placeholder · free")');
    const composerTest = fs.readFileSync(at("tests/composer.test.ts"), "utf8");
    expect(composerTest).toContain('expect(costLabel({ demo: false, cost: 0, gpu: true }, fmt)).toBe("Free · your GPU")');
    const runPlaceTest = fs.readFileSync(at("tests/run-place.test.ts"), "utf8");
    expect(runPlaceTest).toContain('expect(placePrice({ open: true, demo: true }, fmt)).toBe("Placeholder · free")');
  });
});
