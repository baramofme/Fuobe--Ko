import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { locales, translate } from "@/lib/i18n/store";
import { openFreeWords } from "@/lib/run-place";
import { costText } from "@/components/shorts/ui";
import { priceText } from "@/components/swap-studio/parts";

/**
 * 레인 M2(shorts·swap·assist)의 money 패턴 6파일 판정 — twin 선례
 * (content-factory-estimate-i18n.test.ts)와 estimate-line-i18n.test.ts의 5판정 원형을
 * fn 파라미터 `tr 기본값 storeT` 형태에 맞춰 적용했다(t_0c8c31f4).
 *
 * 이 레인은 렌더 인라인이 아니라 exported fn·훅 래퍼 배선이다:
 * - shorts/ui.tsx costText·swap-studio/parts.tsx priceText·assist/run-skill-dialog.tsx priceLine은
 *   마지막 인자 tr(기본값 storeT)로 호출 시점 읽기 — 비렌더 소비자(genjutsu·mixed 등 타 레인)와
 *   vitest 유닛은 기본값으로 en 초록을 유지한다.
 * - 구독은 usePriceText 래퍼의 useI18n에 착지하므로 stage-anchors·stage-review은 무접촉이다.
 * - shorts-studio.tsx :540과 run-skill-dialog의 Loaded는 렌더 call-site로 훅 tr을 건넨다.
 * 조립 재현(run-skill-dialog의 " · N runs" 접미)과 오픈프리 통과 무변경은 판정 5에서 실측한다.
 */
const SOURCE_LITERALS = {
  estimating: "Estimating…",
  placeholderFree: "Placeholder · free",
  freeYourGpu: "Free · your GPU",
} as const;

// Reuse — do not duplicate. The keys already exist (t_bef00b22 created them; en=ko=3726 @ a261e8a9).
const KEYS: Record<keyof typeof SOURCE_LITERALS, string> = {
  estimating: "faceless.controls.estimating",
  placeholderFree: "faceless.controls.placeholderFree",
  freeYourGpu: "studio.composer.freeYourGpu",
};
const NAMES = Object.keys(SOURCE_LITERALS) as (keyof typeof SOURCE_LITERALS)[];

const SRC = path.resolve(import.meta.dirname, "../src");
const FILES = {
  ui: path.join(SRC, "components/shorts/ui.tsx"),
  studio: path.join(SRC, "components/shorts/shorts-studio.tsx"),
  parts: path.join(SRC, "components/swap-studio/parts.tsx"),
  anchors: path.join(SRC, "components/swap-studio/stage-anchors.tsx"),
  review: path.join(SRC, "components/swap-studio/stage-review.tsx"),
  dialog: path.join(SRC, "components/assist/run-skill-dialog.tsx"),
} as const;
const HANGUL = /[\uAC00-\uD7A3]/;
/** Code without block/line comments — JSDoc 나열용 리터럴을 판정에서 제외한다. */
const codeOnly = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
const code = (f: keyof typeof FILES) => codeOnly(fs.readFileSync(FILES[f], "utf-8"));
const koT = (key: string) => translate("ko", key);

describe("레인 M2의 money 배선 (shorts·swap·assist)", () => {
  it("재사용 키 3종이 en·ko 양쪽에 있고, en 값은 원 리터럴과 문자 단위 동일", () => {
    for (const name of NAMES) {
      const key = KEYS[name];
      expect(locales.en[key], `${name}: en`).toBeTypeOf("string");
      expect(locales.en[key], `${name}: byte identity`).toBe(SOURCE_LITERALS[name]);
      expect(locales.ko[key], `${name}: ko`).toBeTypeOf("string");
      // vitest의 기본 언어는 en — 스토어 경유 해석이 리터럴과 동일해야 결속 테스트가 이 위에 선다.
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

  it("6파일의 코드(주석 제외)는 배선 형태를 지키고 trio 원 리터럴을 코드에 담지 않는다", () => {
    // fn 경유 3파일: 알리아스 tr로 키를 부르고, 리터럴은 사라진다.
    for (const f of ["ui", "parts"] as const) {
      expect(code(f), `${f}: placeholderFree call`).toContain(`tr("${KEYS.placeholderFree}")`);
      expect(code(f), `${f}: freeYourGpu call`).toContain(`tr("${KEYS.freeYourGpu}")`);
    }
    expect(code("dialog"), "dialog: placeholderFree call").toContain(`tr("${KEYS.placeholderFree}")`);
    // 조립 리터럴이 코드에서 사라졌는지: 가격접미(" · ${runs} runs")는 남되 원 문장은 조립으로만 재현된다.
    expect(code("dialog"), "dialog: leftover Placeholder · free").not.toContain(SOURCE_LITERALS.placeholderFree);
    // 렌더 call-site 1파일: 훅 알리아스 tr을 fn에 건넨다.
    expect(code("studio"), "studio: tr passed at :540").toContain("costText(est, engine, tr)");
    // 무접촉 소비자 2파일: 구독은 usePriceText 래퍼로만 들어온다(모듈 priceText 수입 금지).
    for (const f of ["anchors", "review"] as const) {
      expect(code(f), `${f}: consumer of the hook`).toMatch(/const priceText = usePriceText\(\)/);
      expect(code(f), `${f}: no module priceText import`).not.toMatch(/import \{[^}]*\bpriceText\b[^}]*\} from "\.\/parts"/);
    }
    for (const literal of Object.values(SOURCE_LITERALS)) {
      for (const f of ["ui", "parts", "studio", "anchors"] as const) {
        expect(code(f), `${f}: leftover literal ${literal}`).not.toContain(literal);
      }
    }
    // 2차(wave-2)가 비-트리오 변형까지 배선한다: 원 리터럴은 키로 이동하고 코드를 떠난다.
    expect(code("review"), "review: Free on your GPU wired").toContain('tr("studio.finish.freeOnYourGpu")');
    expect(code("ui"), "ui: Price unknown wired").toContain('tr("studio.price.unknown")');
    expect(code("parts"), "parts: Price unknown wired").toContain('tr("studio.price.unknown")');
    expect(code("dialog"), "dialog: Some prices vary wired").toContain('tr("assist.transcript.pricesVary")');
    expect(code("dialog"), "dialog: Pricing… wired").toContain('tr("assist.composer.schedulePricing")');
  });

  it("배선은 호출 시점 읽기·구독 선재·모듈 상수 스냅샷 금지", () => {
    // 구독 착지점: usePriceText 래퍼가 useI18n으로 re-render하고 tr을 priceText에 넘긴다(래퍼·useCallback 유지).
    const parts = code("parts");
    const wrapper = parts.slice(parts.indexOf("function usePriceText"), parts.indexOf("function priceText"));
    expect(wrapper, "parts: wrapper holds the subscription").toContain("useI18n");
    expect(wrapper, "parts: tr in the callback deps").toContain("[openFree, tr]");
    expect(wrapper, "parts: openFree still wraps").toContain("openFree(priceText(costUsd, o, tr))");
    // fn 기본값: 비렌더 소비자와 유닛을 en 초록으로 묶는 storeT.
    expect(code("ui"), "ui: costText default is storeT").toContain("= storeT");
    expect(parts, "parts: priceText default is storeT").toContain("= storeT");
    expect(code("dialog"), "dialog: priceLine default is storeT").toContain("= storeT");
    // 렌더 call-site의 useI18n 선재(알리아스 tr — 섀도잉 함정 회피).
    expect(code("studio"), "studio: SetupPanel subscribes").toContain('const { t: tr } = useI18n()');
    const dialog = code("dialog");
    const loaded = dialog.slice(dialog.indexOf("function Loaded"));
    expect(loaded, "dialog: Loaded subscribes").toContain('const { t: tr } = useI18n()');
    expect(loaded, "dialog: call-site hands tr").toContain("priceLine(est, runs, tr)");
    // 모듈 스코프에서 t()/tr()/storeT()를 호출해 언어를 수입 시점에 고정하는 스냅샷이 6파일 어디에도 없다.
    for (const f of Object.keys(FILES) as (keyof typeof FILES)[]) {
      expect(code(f), `${f}: no module-level snapshot`).not.toMatch(/^(export )?(const|let) [A-Za-z_]\w* = (tr|t|storeT)\(/m);
    }
  });

  it("조립 바이트 재현과 오픈프리 통과 무변경, 범위 밖 값은 원래 동작", () => {
    // 판정 A — run-skill-dialog의 demo 조립: 키 값 + 접미 원문 공백이 en 원문을 바이트로 재현한다.
    expect(`${translate("en", KEYS.placeholderFree)}${` · ${3} runs`}`, "assembly 3 runs").toBe("Placeholder · free · 3 runs");
    expect(translate("en", KEYS.placeholderFree), "assembly runs=1 (no suffix)").toBe("Placeholder · free");
    // 판정 B — exported fn의 기본값(storeT, vitest=en)은 유닛·비렌더 소비자를 바이트로 묶는다.
    expect(costText({ costUsd: null, demo: true }, "cloud"), "costText demo default").toBe("Placeholder · free");
    expect(costText({ costUsd: 0, demo: false }, "open"), "costText open default").toBe("Free · your GPU");
    expect(priceText(0, { demo: true, engine: "cloud" }), "priceText demo default").toBe("Placeholder · free");
    expect(priceText(0, { demo: false, engine: "open" }), "priceText open default").toBe("Free · your GPU");
    // 판정 C — ko 주입(렌더 call-site가 훅 tr을 넘기면 이 값이 뜬다).
    expect(costText({ costUsd: null, demo: true }, "cloud", koT), "costText demo ko").toBe("플레이스홀더 · 무료");
    expect(priceText(0, { demo: false, engine: "open" }, koT), "priceText open ko").toBe("무료 · 내 GPU");
    // 판정 D — swap의 오픈프리 통과 무변경: usePriceText가 composition하는 openFreeWords가
    // en에서 site GPU일 때 "Free"로 줄이는 동작은 배선 전과 동일, ko는 토큰 조립 규칙대로 "무료"로 줄고,
    // 데모 줄은 어느 언어에서도 줄임 없이 그대로 통과한다(freeRules 실독 결과의 기계 재현).
    expect(openFreeWords(translate("en", KEYS.freeYourGpu), true, "en"), "openFree en site").toBe("Free");
    expect(openFreeWords(translate("en", KEYS.freeYourGpu), false, "en"), "openFree en own").toBe("Free · your GPU");
    expect(openFreeWords(translate("ko", KEYS.freeYourGpu), true, "ko"), "openFree ko site").toBe("무료");
    expect(openFreeWords(translate("ko", KEYS.freeYourGpu), false, "ko"), "openFree ko own").toBe("무료 · 내 GPU");
    expect(openFreeWords(translate("en", KEYS.placeholderFree), true, "en"), "demo en survives openFree").toBe("Placeholder · free");
    expect(openFreeWords(translate("ko", KEYS.placeholderFree), true, "ko"), "demo ko survives openFree").toBe("플레이스홀더 · 무료");
    // 판정 E — 범위 밖 분기는 원래 값 그대로(무접촉 행동 증명).
    expect(costText(undefined, "cloud"), "costText missing").toBe("…");
    expect(costText({ costUsd: null, demo: false }, "cloud"), "costText unknown").toBe("Price unknown");
    expect(costText({ costUsd: 0, demo: false }, "cloud"), "costText bare free").toBe("Free");
    expect(priceText(undefined, { engine: "cloud" }), "priceText missing").toBe("…");
    expect(priceText(null, { engine: "cloud" }), "priceText unknown").toBe("Price unknown");
    expect(priceText(0, { engine: "cloud" }), "priceText bare free").toBe("Free");
  });
});
