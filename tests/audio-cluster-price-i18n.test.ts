import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { locales, translate } from "@/lib/i18n/store";

/**
 * 레인 M1 — 오디오 클러스터의 모듈 fn money/price 4지점과 소비자 remove-dialogue-tool의
 * useI18n 구독 한 줄을 배선했는가의 기계 판정(t_01fadf29). twin 선례
 * tests/content-factory-estimate-i18n.test.ts의 판정 원형 5건을 이 레인 표면에 맞췄다.
 *
 * 이 레인이 t()로 덮어쓴 리터럴은 2종뿐("Placeholder · free"와 "Free · your GPU"). 세 번째
 * 재사용 키 "Estimating…"는 이 5파일 어디에도 리터럴이 없어 무접촉 — 로케일 불변식만 판정한다.
 * "Price unknown"·"Under $0.01"·"under $0.01"·"Free · runs on your GPU"는 카드가 범위 밖으로
 * 실측한 변형이므로 잔존을 증명한다(무접촉이 사실인지 기계로 확인한다).
 *
 * en 값은 원 리터럴과 바이트 동일이어야 한다 — tests/e2e/clean-voice.mjs:127,145의
 * /Free · your GPU|Placeholder · free/와 tests/e2e/clean-dialogue.mjs:60,73의
 * /^Free$|Placeholder · free/가 영어 리터럴에 결속돼 있고, vitest에서는 언어가 en이라
 * 배선된 호출도 바이트 동일일 때만 그 결속 테스트가 초록을 유지한다.
 */

const SOURCE_LITERALS = {
  estimating: "Estimating…",
  placeholderFree: "Placeholder · free",
  freeYourGpu: "Free · your GPU",
} as const;

// Reuse — do not duplicate. These keys already exist (t_bef00b22 created them), and this lane
// added no new key and touched neither locale file.
const KEYS: Record<keyof typeof SOURCE_LITERALS, string> = {
  estimating: "faceless.controls.estimating",
  placeholderFree: "faceless.controls.placeholderFree",
  freeYourGpu: "studio.composer.freeYourGpu",
};
const NAMES = Object.keys(SOURCE_LITERALS) as (keyof typeof SOURCE_LITERALS)[];

/** 이 레인이 실제로 tr()로 배선한 2종(세 번째 키는 이 5파일에 리터럴이 없다). */
const WIRED = ["placeholderFree", "freeYourGpu"] as const;

/** 카드가 범위 밖으로 실측한 변형 — 그대로 남아 있어야 무접촉이 사실이다. */
const OUT_OF_SCOPE: Record<string, string[]> = {
  "audio-tools/audio-tools.tsx": ["Price unknown", "Under $0.01"],
  "audio-tools/clean-voice-tool.tsx": ["Free · runs on your GPU"],
  "audio-tools/clean-dialogue-panel.tsx": ["Price unknown", "under $0.01"],
  "katana/katana-studio.tsx": ["Price unknown"],
  "audio-tools/remove-dialogue-tool.tsx": [],
};

/** money/price를 모듈 fn으로 두는 4파일(이 레인의 배선 대상). */
const MODULES = [
  "audio-tools/audio-tools.tsx",
  "audio-tools/clean-voice-tool.tsx",
  "audio-tools/clean-dialogue-panel.tsx",
  "katana/katana-studio.tsx",
];
/** 배선 4파일 + 리터럴이 없어 구독만 추가한 소비자 1파일. */
const FILES = [...MODULES, "audio-tools/remove-dialogue-tool.tsx"];

const src = (f: string) => fs.readFileSync(path.resolve(import.meta.dirname, "../src/components", f), "utf-8");
const HANGUL = /[\uAC00-\uD7A3]/;
const HANJA = /[\u4E00-\u9FFF]/;
/** 주석을 뺀 코드 — JSDoc에 남아 있는 설명용 리터럴을 판정에서 제외한다. */
const codeOnly = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
const code = (f: string) => codeOnly(src(f));

describe("오디오 클러스터 price 줄의 렌더 시점 배선(레인 M1)", () => {
  it("재사용 키 3종이 en·ko 양쪽에 있고 en 값은 원 리터럴과 문자 단위 동일 — 로케일은 무접촉", () => {
    for (const name of NAMES) {
      const key = KEYS[name];
      expect(locales.en[key], `${name}: en`).toBeTypeOf("string");
      expect(locales.en[key], `${name}: byte identity`).toBe(SOURCE_LITERALS[name]);
      expect(locales.ko[key], `${name}: ko`).toBeTypeOf("string");
      expect(translate("en", key), `${name}: translate`).toBe(SOURCE_LITERALS[name]);
    }
    // 이 레인은 로케일에 손을 대지 않았다(재사용 키만 사용): 기준선 a261e8a9의 실측 그대로여야 한다.
    const en = Object.keys(locales.en);
    const ko = Object.keys(locales.ko);
    expect(en).toHaveLength(3726);
    expect(ko).toHaveLength(3726);
    expect(ko, "키 서수까지 같다(로케일 재정리 0)").toEqual(en);
  });

  it("ko 값은 en과 다르고 한글을 1자 이상 담으며 한자·한자는 0건", () => {
    for (const name of NAMES) {
      const key = KEYS[name];
      expect(locales.ko[key], name).not.toBe(locales.en[key]);
      expect(HANGUL.test(locales.ko[key]!), `${name}: Hangul`).toBe(true);
      expect(HANJA.test(locales.ko[key]!), `${name}: no CJK ideograph`).toBe(false);
    }
  });

  it("4개 모듈의 코드(주석 제외)는 배선한 2키를 tr()로 부르고 원 리터럴은 0잔존, 범위 밖 변형은 그대로 남는다", () => {
    // 데모 브랜치 4파일 + open 브랜치는 audio-tools·katana만 "Free · your GPU"를 쓴다(카드 실측).
    for (const f of MODULES) expect(code(f), `${f}: placeholderFree`).toContain(`tr("${KEYS.placeholderFree}")`);
    for (const f of ["audio-tools/audio-tools.tsx", "katana/katana-studio.tsx"]) {
      expect(code(f), `${f}: freeYourGpu`).toContain(`tr("${KEYS.freeYourGpu}")`);
    }
    for (const f of ["audio-tools/clean-voice-tool.tsx", "audio-tools/clean-dialogue-panel.tsx"]) {
      expect(code(f), `${f}: freeYourGpu absent`).not.toContain(`tr("${KEYS.freeYourGpu}")`);
    }
    // 배선한 원 리터럴은 5파일의 코드 어디에도 남아 있지 않다(주석은 이미 제외했다).
    for (const name of WIRED) {
      for (const f of FILES) expect(code(f), `${f}: leftover ${SOURCE_LITERALS[name]}`).not.toContain(SOURCE_LITERALS[name]);
    }
    // 세 번째 재사용 키는 이 5파리에 원래 리터럴이 없었다(카드 실측) — 무접촉을 확인한다.
    for (const f of FILES) expect(code(f), `${f}: estimating absent`).not.toContain(SOURCE_LITERALS.estimating);
    // 범위 밖 변형은 그대로 남아 있어야 무접촉이 사실이다.
    for (const [f, keeps] of Object.entries(OUT_OF_SCOPE)) {
      for (const literal of keeps) expect(code(f), `${f}: ${literal}`).toContain(literal);
    }
  });

  it("함수 배선 형태: 마지막 인자 tr의 기본값은 storeT(호출 시점 읽기), 모듈 상수 스냅샷 아님, 렌더 call-site는 훅 tr을 건넨다", () => {
    const SHAPE: Record<string, { fn: string; call: string }> = {
      "audio-tools/audio-tools.tsx": {
        fn: "const money = (p: AudioToolPreview, engine: Engine, tr: (key: string, params?: Params) => string = storeT)",
        call: "money(p, engine, tr)",
      },
      "audio-tools/clean-voice-tool.tsx": {
        fn: "const money = (p: AudioToolPreview, tr: (key: string, params?: Params) => string = storeT)",
        call: "money(p, tr)",
      },
      "audio-tools/clean-dialogue-panel.tsx": {
        fn: "const price = (p: { costUsd: number | null; demo: boolean } | undefined, tr: (key: string, params?: Params) => string = storeT)",
        call: "price(p, tr)",
      },
      "katana/katana-studio.tsx": {
        fn: "const money = (usd: number | null | undefined, demo?: boolean, open?: boolean, tr: (key: string, params?: Params) => string = storeT)",
        call: 'money(preview.data.costUsd, preview.data.demo, engine === "open", tr)',
      },
    };
    for (const [f, shape] of Object.entries(SHAPE)) {
      expect(code(f), `${f}: fn signature`).toContain(shape.fn);
      expect(code(f), `${f}: render call-site passes tr`).toContain(shape.call);
      // 렌더 스코프의 구독(알리아스 tr — 섀도잉 함정 회피).
      expect(code(f), `${f}: hook subscription`).toContain("const { t: tr } = useI18n();");
      expect(code(f), `${f}: store default`).toContain('import { t as storeT, useI18n, type Params } from "@/lib/i18n"');
    }
    // 리터럴이 없는 소비자는 구독 한 줄만(카드 실측).
    const removed = code("audio-tools/remove-dialogue-tool.tsx");
    expect(removed).toContain('import { useI18n } from "@/lib/i18n"');
    expect(removed, "구독 한 줄").toMatch(/useI18n\(\);/);
    // 모듈 스코프에서 t()를 한 번만 읽어 언어를 고정하는 스냅샷은 0건(결정 3).
    for (const f of FILES) {
      expect(code(f), `${f}: module-level snapshot`).not.toMatch(/(?:^|\n)(?:export )?const \w+ = (?:storeT|tr|t)\(\s*"/);
    }
  });

  it("조립 재현: 분할한 키가 원문의 접두·접미·구분자와 함께 분할 전 영어 바이트를 그대로 만든다", () => {
    const enPlaceholder = translate("en", KEYS.placeholderFree);
    const enFree = translate("en", KEYS.freeYourGpu);
    const koPlaceholder = translate("ko", KEYS.placeholderFree);
    const koFree = translate("ko", KEYS.freeYourGpu);
    // audio-tools의 RunBar: clock(p.length) + " · " + money — 접두 경계 원문 공백 그대로.
    expect(`2:00 · ${enPlaceholder}`).toBe("2:00 · Placeholder · free");
    expect(`2:00 · ${enFree}`).toBe("2:00 · Free · your GPU");
    expect(`2:00 · ${koPlaceholder}`).toBe("2:00 · 플레이스홀더 · 무료");
    expect(code("audio-tools/audio-tools.tsx")).toContain('{p.length !== null && " · "}');
    // katana의 조립: N segments · N steps · + money — pool?.text 우선순위도 유지(카드: 조립 유지).
    expect(`2 segments · 4 steps · ${enFree}`).toBe("2 segments · 4 steps · Free · your GPU");
    expect(`2 segments · 4 steps · ${koFree}`).toBe("2 segments · 4 steps · 무료 · 내 GPU");
    expect(code("katana/katana-studio.tsx")).toContain("steps ·{\" \"}");
    expect(code("katana/katana-studio.tsx")).toContain("poolRun.pool?.text ??");
    expect(code("audio-tools/audio-tools.tsx")).toContain("pool?.text ??");
    // 범위 밖 가격 브랜치는 접두 "≈ $"와 두 자리 반올림을 그대로 조립한다.
    expect(`≈ $${(0.4).toFixed(2)}`).toBe("≈ $0.40");
    for (const f of ["audio-tools/audio-tools.tsx", "audio-tools/clean-dialogue-panel.tsx", "katana/katana-studio.tsx"]) {
      expect(code(f), `${f}: ≈ $ prefix`).toContain("≈ $${");
      expect(code(f), `${f}: toFixed(2)}`).toContain(".toFixed(2)}");
    }
    // 데모 줄은 openFree 래퍼를 거치지 않는다(순수 i18n 값 — twin 판정 5의 이 레인판).
    expect(enPlaceholder).toBe("Placeholder · free");
    expect(koPlaceholder).toBe("플레이스홀더 · 무료");
    // 열기 브랜치(lib openToolPrice)는 레인 L 소유 — 이 레인은 호출만 유지한다.
    expect(code("audio-tools/clean-dialogue-panel.tsx")).toContain("openToolPrice(p)");
    expect(code("audio-tools/remove-dialogue-tool.tsx")).toContain("openToolPrice(p)");
  });
});
