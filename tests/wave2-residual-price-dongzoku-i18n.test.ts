import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { locales, translate, type Params } from "@/lib/i18n/store";
import { formatCost } from "@/lib/format";
import { formatUsd } from "@/components/cinema/money";
import { paidSuffix } from "@/lib/demo-mode";
import { pickerPrice, rowPriceOn, toModelRow, type ModelRow } from "@/lib/model-rows";
import { MODELS, getModel } from "@/lib/catalog";
import { enginesOf } from "@/lib/catalog/engines";

/**
 * 웨이브-2 잔여(t_1fc245a0)의 배선 기계 판정 — 판정 원형은 레인 선례(wave2-residual-storet-i18n·
 * lib-price-trio-i18n): ① en 바이트 동일 ② ko 판정(실호출에서 ko로 바뀐다) ③ 소스 스캔 codeOnly
 * (원 리터럴 잔존 0·키 호출 존재) ④ 렌더 구독(useI18n 경유) ⑤ call-site의 tr 전달 ⑥ fn 기본값 storeT
 * ⑦ openFree 래퍼 호출 개수 기준선 유지 ⑧ rowPriceOn strip의 localize-safe 규칙(카드 결정 ⑥).
 *
 * 대상은 카드 인벤토리의 24지점(키 매핑 고정) + 결정 ④의 run-skill-dialog 단가 1회·open 분지 교체.
 * en은 e2e·유닛이 원 영어 리터럴에 결속돼 있어 문자 단위 동일해야 초록이 산다. 신규 키는 생성기
 * (scripts/gen-price-dongzoku-keys.py) 소유 3종뿐 — 이 파일이 그 3종과 꼬리 무결성(서수 일치·dup 0·
 * CJK 0·꼬리 재정리 0)을 함께 잠근다.
 */
const ELL = "\u2026";
const MID = "\u00b7";

const LITERAL = {
  free: "Free",
  freeLower: "free",
  unknownLower: "price unknown",
  unknown: "Price unknown",
  pricing: `Pricing${ELL}`,
  placeholder: "Placeholder",
  workingOut: `Working out the price${ELL}`,
  commaFree: "placeholder, free",
  lt001: "<$0.01",
  under001: "Under $0.01",
  demoUnder001: ` ${MID} under $0.01`,
  freeOnYourGpu: "Free on your GPU",
  freeRunsBrowser: `Free ${MID} runs in your browser`,
} as const;

const KEY: Record<keyof typeof LITERAL, string> = {
  free: "studio.engine.freeShort",
  freeLower: "studio.price.freeLower",
  unknownLower: "studio.price.unknownLower",
  unknown: "studio.price.unknown",
  pricing: "assist.composer.schedulePricing",
  placeholder: "studio.viewer.placeholderLabel",
  workingOut: "studio.price.workingOut",
  commaFree: "studio.price.placeholderCommaFree",
  lt001: "studio.price.lt001NoSpace",
  under001: "studio.price.under001",
  demoUnder001: "studio.price.demoUnder001",
  freeOnYourGpu: "studio.finish.freeOnYourGpu",
  freeRunsBrowser: "studio.price.freeRunsBrowser",
};

/** 신규 키 3종(생성기 NEW_KEYS의 정의 순서 — 꼬리에 붙고 재정리는 0). */
const NEW_KEYS: Array<[string, string, string]> = [
  ["studio.price.freeRunsBrowser", `Free ${MID} runs in your browser`, `무료 ${MID} 내 브라우저에서 실행`],
  ["studio.price.placeholderCommaFree", "placeholder, free", "플레이스홀더, 무료"],
  ["studio.price.freeLower", "free", "무료"],
];

const HANGUL = /[\uAC00-\uD7A3]/;
const HANJA = /[\u4e00-\u9fff]/;
const CJK = /[\u4e00-\u9fff\u3400-\u4dbf]/;
/** 코드에서 블록·라인 주석을 제거해 JSDoc의 설명용 리터럴을 판정에서 제외한다(twin 선례). */
const codeOnly = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
const codeOf = (rel: string) => codeOnly(fs.readFileSync(path.resolve(import.meta.dirname, "..", rel), "utf-8"));

const STR_RE = /"([^"\n]*)"/g;
/** codeOnly 안의 따옴표 경계 문자열 중 가격 동族 리터럴과 문자 단위 일치하는 것(배선 후 0이어야 한다). */
function rawPriceStrings(rel: string): string[] {
  const hits = [...codeOf(rel).matchAll(STR_RE)].map((m) => m[1]);
  const family = new Set<string>(Object.values(LITERAL));
  return hits.filter((v) => family.has(v));
}

const koTr = (k: string, p?: Params) => translate("ko", k, p);

/** 렌더 구독이 없다가 이 레인이 추가한 파일(카드의 "구독 없음→추가" 항목 12). */
const SUBSCRIBED = [
  "src/components/ads/new-ads.tsx",
  "src/components/assist/skill-insights.tsx",
  "src/components/audio-tools/design-voice-tool.tsx",
  "src/components/canvas/board.tsx",
  "src/components/cinema/cinema-feed.tsx",
  "src/components/color-grade-view.tsx",
  "src/components/faceless/episode-view.tsx",
  "src/components/mixed-media/mixed-studio.tsx",
  "src/components/moodboards/create-moodboard.tsx",
  "src/components/moodboards/train-board.tsx",
  "src/components/skills/skill-builder.tsx",
  "src/components/train-dialog.tsx",
];

/** 이 레인이 배선한 지점(파일 → codeOnly에서 반드시 관측될 키 호출 형태). */
const CALLS: Array<[string, string]> = [
  ["src/components/cinema/soul-builders.tsx", 'tr("studio.engine.freeShort")'],
  ["src/components/cinema/world-panel.tsx", 'tr("studio.engine.freeShort")'],
  ["src/components/faceless/episode-view.tsx", 'tr("studio.price.unknownLower")'],
  ["src/components/faceless/episode-view.tsx", 'tr("assist.composer.schedulePricing")'],
  ["src/components/faceless/episode-view.tsx", 'tr("studio.viewer.placeholderLabel")'],
  ["src/components/ads/new-ads.tsx", 'tr("assist.composer.schedulePricing")'],
  ["src/components/assist/skill-insights.tsx", 'tr("studio.price.unknownLower")'],
  ["src/components/audio-tools/design-voice-tool.tsx", 'tr("studio.finish.freeOnYourGpu")'],
  ["src/components/audio-tools/design-voice-tool.tsx", 'tr("studio.price.unknown")'],
  ["src/components/audio-tools/design-voice-tool.tsx", 'tr("studio.price.under001")'],
  ["src/components/canvas/board.tsx", 'tr("studio.price.placeholderCommaFree")'],
  ["src/components/canvas/board.tsx", 'tr("studio.price.unknownLower")'],
  ["src/components/canvas/board.tsx", 'tr("studio.price.freeLower")'],
  ["src/components/cinema/cinema-feed.tsx", 'tr("studio.engine.freeShort")'],
  ["src/components/model3d/model3d-studio.tsx", 'tr("studio.price.workingOut")'],
  ["src/components/model3d/retexture-dialog.tsx", 'tr("studio.price.workingOut")'],
  ["src/components/model3d/rig-dialog.tsx", 'tr("studio.price.workingOut")'],
  ["src/components/moodboards/train-board.tsx", 'tr("studio.engine.freeShort")'],
  ["src/components/moodboards/create-moodboard.tsx", 'tr("studio.price.placeholderCommaFree")'],
  ["src/components/skills/skill-builder.tsx", 'tr("studio.price.placeholderCommaFree")'],
  ["src/components/skills/skill-builder.tsx", 'tr("studio.engine.freeShort")'],
  ["src/components/studio/run-place-chip.tsx", 't("studio.engine.freeShort")'],
  ["src/components/train-dialog.tsx", 'tr("studio.engine.freeShort")'],
  ["src/lib/catalog/training.ts", 'tr("studio.engine.freeShort")'],
  ["src/lib/demo-mode.ts", 'tr("studio.price.demoUnder001")'],
  ["src/lib/model-rows.ts", 'tr("studio.engine.freeShort")'],
  ["src/lib/format.ts", 'tr("studio.engine.freeShort")'],
  ["src/lib/format.ts", 'tr("studio.price.lt001NoSpace")'],
  ["src/components/cinema/money.ts", 'tr("studio.price.lt001NoSpace")'],
  ["src/components/color-grade-view.tsx", 'tr("studio.price.freeRunsBrowser")'],
  ["src/components/assist/run-skill-dialog.tsx", 'tr("studio.finish.freeOnYourGpu")'],
];

/** 카드 인벤토리가 파일별로 지정한 리터럴 — 오직 그 것만 codeOnly에서 사라져야 한다(지점별 판정). */
const INVENTORY: Record<string, string[]> = {
  "src/components/cinema/soul-builders.tsx": ["Free"],
  "src/components/cinema/world-panel.tsx": ["Free"],
  "src/components/faceless/episode-view.tsx": ["price unknown", "Pricing\u2026", "Placeholder", "Free"],
  "src/components/ads/new-ads.tsx": ["Pricing\u2026"],
  "src/components/assist/skill-insights.tsx": ["price unknown"],
  "src/components/audio-tools/design-voice-tool.tsx": ["Free on your GPU", "Price unknown", "Under $0.01"],
  "src/components/canvas/board.tsx": ["placeholder, free", "price unknown", "free"],
  "src/components/cinema/cinema-feed.tsx": ["Free"],
  "src/components/model3d/model3d-studio.tsx": ["Working out the price\u2026"],
  "src/components/model3d/retexture-dialog.tsx": ["Working out the price\u2026"],
  "src/components/model3d/rig-dialog.tsx": ["Working out the price\u2026"],
  "src/components/moodboards/train-board.tsx": ["Free"],
  "src/components/moodboards/create-moodboard.tsx": ["placeholder, free"],
  "src/components/skills/skill-builder.tsx": ["placeholder, free", "Free"],
  "src/components/studio/run-place-chip.tsx": ["Free"],
  "src/components/train-dialog.tsx": ["Free"],
  "src/lib/catalog/training.ts": ["Free"],
  "src/lib/demo-mode.ts": [" \u00b7 under $0.01"],
  "src/lib/model-rows.ts": ["Free"],
  "src/lib/format.ts": ["Free", "<$0.01"],
  "src/components/cinema/money.ts": ["<$0.01"],
};

/**
 * 인벤토리 밖에서 재실측된 동族 문자열(비-가격·모드 라벨·mock provider 칩). 이 물결의 범위는
 * 렌더 가격 줄이므로 무접촉이 원칙이며, 무접촉 사실을 여기서 기록으로 잠근다(over-wiring 방지).
 */
const OUT_OF_SCOPE_STILL_THERE: Array<[string, string]> = [
  ["src/components/assist/mode-picker.tsx", '"Free"'],
  ["src/components/assist/mode-picker.tsx", '"free"'],
  ["src/components/cinema/cinema-feed.tsx", '"Placeholder"'],
  ["src/components/elements-view.tsx", '"Placeholder"'],
  ["src/components/library/upload-delete.tsx", '"free"'],
  ["src/components/remove-object/remove-object-tool.tsx", '"free"'],
];

/** openFree 래퍼 호출 개수 기준선(8f4ee268 실측 — 이 레인은 래퍼를 건드리지 않는다). */
const OPEN_FREE_BASELINE: Record<string, number> = {
  "src/components/cinema/soul-builders.tsx": 1,
  "src/components/faceless/episode-view.tsx": 1,
  "src/components/audio-tools/design-voice-tool.tsx": 1,
  "src/components/mixed-media/mixed-studio.tsx": 3,
};

/** 이 레인이 tr를 건네도록 고친 call-site(파일·함수·인자 목록 그 자체로 잠근다). */
const CALL_SHAPES: Array<[string, string, string]> = [
  ["src/components/mixed-media/mixed-studio.tsx", "paidSuffix", "est?.previewUsd, tr"],
  ["src/components/audio-tools/design-voice-tool.tsx", "money", "engine, usd === null ? null : usd * VOICE_TAKES, tr"],
  ["src/components/skills/skill-builder.tsx", "priceOf", "e, tr"],
  ["src/components/train-dialog.tsx", "price", "t, tr"],
];

describe("웨이브-2 잔여 동族 가격 24지점의 배선 판정(t_1fc245a0)", () => {
  it("13개 키가 en·ko 양쪽에 있고 en 값은 원 리터럴과 문자 단위 동일(translate(\"en\")도 동일)", () => {
    for (const name of Object.keys(LITERAL) as (keyof typeof LITERAL)[]) {
      const key = KEY[name];
      expect(locales.en[key], `${name}: en is a string`).toBeTypeOf("string");
      expect(locales.en[key], `${name}: en byte identity`).toBe(LITERAL[name]);
      expect(locales.ko[key], `${name}: ko is a string`).toBeTypeOf("string");
      expect(translate("en", key), `${name}: translate("en") byte identity`).toBe(LITERAL[name]);
      // ko는 100% 한국어·한자 0(규칙 10).
      expect(HANGUL.test(locales.ko[key]!), `${name}: ko has Hangul`).toBe(true);
      expect(HANJA.test(locales.ko[key]!), `${name}: ko zero hanja`).toBe(false);
      // 규칙 11: ko로 불렀을 때 실제로 영어와 다른 값으로 바뀐다(ko 호출을 만드는 판정).
      expect(translate("ko", key), `${name}: ko call is the Korean words`).not.toBe(LITERAL[name]);
    }
    // 소문자 free와 Big F Free는 다른 키지만 같은 ko 값을 공유한다(선례 studio.price.unknown·unknownLower).
    expect(locales.ko[KEY.free]).toBe(locales.ko[KEY.freeLower]);
    // 근접 형제 혼용 금지(규칙 12): 근접 값이 아니라 이 카드가 지정한 키 값이 렌더된다.
    expect(locales.en["studio.price.freeInYourBrowser"]).not.toBe(LITERAL.freeRunsBrowser);
    expect(locales.en["studio.price.placeholderFree"]).not.toBe(LITERAL.commaFree);
  });

  it("신규 키 3종이 생성기 정의와 동일하게 꼬리에 붙었고 로케일 서수·퍼테리를 지킨다", () => {
    for (const [key, enVal, koVal] of NEW_KEYS) {
      expect(locales.en[key], `${key}: en value from the generator`).toBe(enVal);
      expect(locales.ko[key], `${key}: ko value from the generator`).toBe(koVal);
      expect(CJK.test(koVal), `${key}: ko has no CJK ideograph`).toBe(false);
      // 값 중복(dup) 0: 같은 en 값을 가진 다른 키가 없어야 생성기가 조용히 지나간다.
      const dup = Object.entries(locales.en).filter(([k, v]) => v === enVal && k !== key);
      expect(dup, `${key}: no other key holds this en value`).toEqual([]);
    }
    // 꼬리 재정리 0: 신규 3종이 마지막 3키로 정의 순서 그대로 앉아 있다.
    // 병합 결정(t_3913855f): 후속 레인들이 뒤에 키를 추가하면서 꼬리 위치는 더 이상 이 카드 것이 아니다 —
    // 정의 순서대로 3키가 연속으로 붙어 있는지(서수 유지)와 양 로케일 동위치로 판정한다.
    const tail = NEW_KEYS.map(([k]) => k);
    const enKeys = Object.keys(locales.en);
    const p0 = enKeys.indexOf(tail[0]);
    expect(p0, "first new key present").toBeGreaterThan(-1);
    expect(tail.map((k) => enKeys.indexOf(k) - p0), "en holds the three new keys contiguous, in definition order").toEqual([0, 1, 2]);
    expect(Object.keys(locales.ko).slice(p0, p0 + 3), "ko holds the same three at the same positions").toEqual(tail);
    // 서수 일치·퍼테리: 기저 3748 + 신규 3 = 3751, 거기에 홈 첫 화면 카드(t_6e2f3d4d)의 home.bento 64키가 뒤에서 붙어 3815.
    // 레인 스냅샷(3815) 이후 병합으로 로케일이 계속 늘어난다 — 하한으로만 검증하고 퍼테리·동순서를 그대로 본다.
    expect(Object.keys(locales.en).length, "en key count").toBeGreaterThanOrEqual(3815);
    expect(Object.keys(locales.ko).length, "ko parity").toBe(Object.keys(locales.en).length);
    expect(Object.keys(locales.en), "key order is identical in both files").toEqual(Object.keys(locales.ko));
    // ko 전체에서 한자·중문 0(형제 레인이 꼬리에 흘린 한자 선례).
    const cjkKeys = Object.entries(locales.ko).filter(([, v]) => CJK.test(v ?? ""));
    expect(cjkKeys, "zero CJK across all of ko.json").toEqual([]);
  });

  it("24지점이 그 키를 tr/t로 부른다(codeOnly에서 키 호출이 관측된다)", () => {
    for (const [rel, call] of CALLS) {
      expect(codeOf(rel), `${rel}: ${call}`).toContain(call);
    }
  });

  it("24지점의 원 리터럴이 codeOnly에서 사라졌다(지점별 따옴표 경계 잔존 0)·제외 버킷은 무접촉", () => {
    for (const [rel, literals] of Object.entries(INVENTORY)) {
      const still = rawPriceStrings(rel).filter((v) => literals.includes(v));
      expect(still, `${rel}: the card's literals are gone from code`).toEqual([]);
    }
    // color-grade 배지는 따옴표 없는 JSX 텍스트였으므로 문자열 자체로 잔존을 판정한다.
    expect(codeOf("src/components/color-grade-view.tsx")).not.toContain(LITERAL.freeRunsBrowser);
    // 제외 결정 ④: run-skill-dialog의 place-word("on your GPU")와 ' · paid'는 그대로 무접촉.
    expect(codeOf("src/components/assist/run-skill-dialog.tsx")).toContain('"on your GPU"');
    // 제외 버킷: run-place.ts의 locale free-word dict(:315)와 demo-mode의 ' · paid'는 그대로 있다.
    expect(codeOf("src/lib/run-place.ts")).toContain('"Free"');
    expect(codeOf("src/lib/demo-mode.ts")).toContain('" \u00b7 paid"');
    // ring C(카탈로그 prose 5지점)는 이 물결 범위 밖 — 무접촉 사실을 잠근다(문장 Composite라
    // 따옴표 경계 정밀 매칭 0건이라는 부모 스캔의 실증 근거도 함께).
    for (const rel of ["src/lib/catalog/rtx-video.ts", "src/lib/catalog/character-swap.ts", "src/lib/voice-design.ts"]) {
      expect(rawPriceStrings(rel), `${rel}: ring C prose is not a quoted 동族 hit`).toEqual([]);
    }
    expect(codeOf("src/lib/catalog/character-swap.ts"), "ring C: character-swap notes stay raw").toContain("Free on your GPU (20 GB)");
    expect(codeOf("src/lib/catalog/rtx-video.ts"), "ring C: rtx-video prose stays raw").toContain("Free on your GPU \u00b7 runs on NVIDIA's RTX video engine");
    expect(codeOf("src/lib/voice-design.ts"), "ring C: voice-design blurb stays raw").toContain("Free on your GPU, or in the cloud. 10 languages.");
  });

  it("인벤토리 밖에서 재실측된 동族은 비-가격이므로 무접촉이다(제외 사실의 기록 잠금)", () => {
    // 이 물결의 범위는 렌더 가격 줄이다. 모드 라벨의 Free·mock provider의 Placeholder 칩은
    // 가격 줄이 아니라 카드 인벤토리에 없다 — 접촉하지 않았다는 사실을 그대로 잠근다.
    for (const [rel, quoted] of OUT_OF_SCOPE_STILL_THERE) {
      expect(codeOf(rel), `${rel}: ${quoted} stays untouched (not a price line)`).toContain(quoted);
    }
  });

  it("렌더 구독이 없던 12개 파일에 useI18n 구독이 들어갔다(모두 알리아스 tr)", () => {
    for (const rel of SUBSCRIBED) {
      const code = codeOf(rel);
      expect(code, `${rel}: imports @/lib/i18n`).toContain('from "@/lib/i18n"');
      expect(code, `${rel}: subscribes through useI18n`).toContain("= useI18n()");
      expect(code, `${rel}: the new subscription is aliased as tr`).toContain("const { t: tr } = useI18n()");
    }
    // 선재 구독을 reused한 지점(카드:구독 이미 있음) 5파일.
    for (const rel of ["src/components/cinema/soul-builders.tsx", "src/components/cinema/world-panel.tsx", "src/components/model3d/model3d-studio.tsx", "src/components/model3d/retexture-dialog.tsx", "src/components/model3d/rig-dialog.tsx"]) {
      expect(codeOf(rel), `${rel}: tr already subscribed`).toContain("const { t: tr } = useI18n()");
    }
    // run-place-chip은 알리아스 없이 t로 구독한 지점(127줄 스코프 확인) — 기존 관례 유지.
    expect(codeOf("src/components/studio/run-place-chip.tsx")).toContain("const { t } = useI18n()");
  });

  it("call-site가 렌더 언어의 tr를 건닌다(이 레인이 고친 4지점의 인자 목록을 그대로 잠근다)", () => {
    for (const [rel, fn, args] of CALL_SHAPES) {
      const calls = [...codeOf(rel).matchAll(new RegExp(`${fn}\\(([^()\\n]*)\\)`, "g"))];
      expect(calls.length, `${rel}: ${fn}( has exactly one call`).toBe(1);
      expect(calls[0]![1], `${rel}: ${fn} call hands its tr`).toBe(args);
    }
    // model-picker의 call-site는 카드 범위 밖(기본값 storeT로 en 바이트 경로 유지) — 접촉하지 않았다는 사실만 잠근다.
    expect(codeOf("src/components/studio/model-picker.tsx"), "model-picker: still the 3-arg call").toContain("pickerPrice(m, today, edits)");
    // 포매터의 call-site 32파일·서버 2지점도 인자 변경 없이 기본값으로 동작한다(이 레인이 손대지 않았다).
    for (const rel of ["src/server/generations.ts", "src/server/assist/schedules.ts"]) {
      expect(codeOf(rel), `${rel}: still calls formatCost with no tr argument`).toContain("formatCost(");
    }
    expect(codeOf("src/server/generations.ts")).not.toMatch(/formatCost\([^()]*,\s*tr\)/);
  });

  it("헬퍼의 기본값 storeT가 en 원 바이트를 지킨다(실호출)와 ko 호출에서 실제로 ko로 바뀐다", () => {
    // vitest는 node 환경: localStorage 없음 → getLang()은 en → 기본값 호출은 en 원 바이트.
    expect(formatCost(0), "formatCost(0) default is the en original").toBe("Free");
    expect(formatCost(0.005), "formatCost(<0.01) default is the en original").toBe("<$0.01");
    expect(formatCost(1.25), "formatCost(1.25) is untouched money").toBe("$1.25");
    expect(formatUsd(0), "formatUsd(0) keeps $0.00").toBe("$0.00");
    expect(formatUsd(0.004), "formatUsd(<0.01) default is the en original").toBe("<$0.01");
    expect(paidSuffix(0.005), "paidSuffix default is the en suffix byte-for-byte").toBe(" \u00b7 under $0.01");
    expect(paidSuffix(0.42), "paidSuffix of a real price is assembled money").toBe(" \u00b7 \u2248 $0.42");
    expect(paidSuffix(null), "the unpriced branch keeps the excluded raw ' \u00b7 paid'").toBe(" \u00b7 paid");

    expect(formatCost(0, koTr), "formatCost with ko tr").toBe("무료");
    expect(formatCost(0.005, koTr), "the under-one-cent line in ko").toBe("1센트 미만");
    expect(formatUsd(0.004, koTr), "formatUsd with ko tr").toBe("1센트 미만");
    expect(paidSuffix(0.005, koTr), "paidSuffix with ko tr").toBe(" \u00b7 1센트 미만");
    expect(paidSuffix(null, koTr), "the excluded ' \u00b7 paid' stands in ko too").toBe(" \u00b7 paid");

    const open = MODELS.find((m) => m.engine === "open")!;
    expect(pickerPrice(open, null), "pickerPrice default for an open model").toBe("Free");
    expect(pickerPrice(open, null, false, koTr), "pickerPrice with ko tr").toBe("무료");

    const original = MODELS.find((m) => m.engine === "open" && enginesOf(m).includes("cloud"))!;
    expect(toModelRow(original).price.startsWith(`Free ${MID} `), "toModelRow default keeps the compressed en prefix").toBe(true);
    expect(toModelRow(original, koTr).price.startsWith(`무료 ${MID} `), "toModelRow with ko tr builds the ko prefix").toBe(true);
    expect(toModelRow(original).price, "toModelRow default is byte-identical to the pre-wiring build").toBe(`${LITERAL.free} ${MID} ${toModelRow(original).price.slice(`Free ${MID} `.length)}`);
    expect(getModel(original.id), "the model the row was built from resolves").toBeDefined();
  });

  it("rowPriceOn의 cloud strip은 localize-safe다(결정 ⑥): en 경로 바이트 동일·ko 접두 불일치 시 원문 유지", () => {
    const enRow: Pick<ModelRow, "price" | "launch" | "engines"> = { price: `Free ${MID} $0.08 / second`, engines: ["open", "cloud"] };
    const koRow: Pick<ModelRow, "price" | "launch" | "engines"> = { price: `무료 ${MID} $0.08 / 초`, engines: ["open", "cloud"] };
    // en 경로는 기저의 정규식 절단과 문자 단위 동일하다(배선 전 동작 불변).
    expect(rowPriceOn(enRow, null, "cloud"), "en cloud strip").toBe("$0.08 / second");
    expect(rowPriceOn(enRow, null, "cloud"), "en strip equals the pre-wiring regex result").toBe(enRow.price.replace(/^Free \u00b7 /, ""));
    expect(rowPriceOn(enRow, null, "open"), "en open-only").toBe("Free");
    // ko로 잘라낼 때는 그 언어의 접두로 판정해 잘라낸다(빌드·렌더 언어 일치).
    expect(rowPriceOn(koRow, null, "cloud", koTr), "ko cloud strip").toBe("$0.08 / 초");
    expect(rowPriceOn(koRow, null, "open", koTr), "ko open-only").toBe("무료");
    // 회피 경로: en으로 빌드한 줄에 ko 접두를 대조하면 원문을 그대로 둔다(오타 절단 금지).
    expect(rowPriceOn(enRow, null, "cloud", koTr), "ko prefix mismatch keeps the original").toBe(enRow.price);
    expect(rowPriceOn(koRow, null, "cloud"), "en prefix against a ko-built row keeps the original too").toBe(koRow.price);
    // engines가 하나인 분지는 판정 순서상 무접촉(원문 그대로).
    const single: Pick<ModelRow, "price" | "launch" | "engines"> = { price: "Free", engines: ["open"] };
    expect(rowPriceOn(single, null, "cloud"), "single-engine row passes through").toBe("Free");
  });

  it("fn의 tr 기본값이 storeT로 선언돼 있다(모듈 상수 스냅샷 아님 — 규칙 3)와 섀도잉을 피했다", () => {
    const fns: Array<[string, string]> = [
      ["src/lib/format.ts", "export function formatCost(usd: number | null | undefined, tr: (key: string, params?: Params) => string = storeT)"],
      ["src/components/cinema/money.ts", "export function formatUsd(usd: number | null | undefined, tr: (key: string, params?: Params) => string = storeT)"],
      ["src/lib/demo-mode.ts", "export function paidSuffix(price?: number | null, tr: (key: string, params?: Params) => string = storeT): string"],
      ["src/lib/model-rows.ts", "export function toModelRow(m: ModelDef, tr: (key: string, params?: Params) => string = storeT)"],
      ["src/lib/model-rows.ts", "export function pickerPrice(m: ModelDef, now: PriceClock, edits = false, tr: (key: string, params?: Params) => string = storeT)"],
      ["src/lib/model-rows.ts", "export function rowPriceOn(r: Pick<ModelRow, \"price\" | \"launch\" | \"engines\">, now: number | null, only?: Engine, tr: (key: string, params?: Params) => string = storeT)"],
      ["src/lib/catalog/training.ts", "tr: (key: string, params?: Params) => string = storeT"],
      ["src/components/audio-tools/design-voice-tool.tsx", "function money(engine: \"open\" | \"cloud\", usd: number | null, tr: (key: string, params?: Params) => string = storeT): string"],
      ["src/components/skills/skill-builder.tsx", "function priceOf(e: DraftCheckResult[\"engines\"][number], tr: (key: string, params?: Params) => string = storeT): string"],
      ["src/components/train-dialog.tsx", "const price = (t: Target, tr: (key: string, params?: Params) => string = storeT)"],
    ];
    for (const [rel, sig] of fns) expect(codeOf(rel), `${rel}: ${sig}`).toContain(sig);
    // 모듈 스코프의 t() 스냅샷(언어를 import 시점에 고정) 0 — 규칙 3.
    for (const rel of ["src/lib/format.ts", "src/components/cinema/money.ts", "src/lib/demo-mode.ts", "src/lib/model-rows.ts", "src/lib/catalog/training.ts", "src/components/audio-tools/design-voice-tool.tsx", "src/components/skills/skill-builder.tsx", "src/components/train-dialog.tsx"]) {
      expect(codeOf(rel), `${rel}: no module-level t() snapshot`).not.toMatch(/^export (?:const|function) \w+ = (?:t|tr)\(/m);
      expect(codeOf(rel), `${rel}: storeT is imported`).toContain("storeT");
    }
    // 규칙 2: catalog/training.ts의 target은 파라미터 t와 지역 tr가 부딪히므로 트레이너를 trainer로 renamed했다.
    // (지역 tr는 target 밖의 다른 함수들(227·589)에도 있다 — 그들은 translate 파라미터가 없어 섀도 위험이 없다.
    //  그래서 판정은 target 함수 몸체로만 좁힌다.)
    const training = codeOf("src/lib/catalog/training.ts");
    const targetBody = training.slice(training.indexOf("function target("));
    const bodyEnd = targetBody.indexOf("\n}\n");
    const body = bodyEnd < 0 ? targetBody : targetBody.slice(0, bodyEnd);
    expect(body.length, "the target body was located").toBeGreaterThan(40);
    expect(body, "training: the local trainer is renamed off tr").toContain("const trainer = getTrainer(");
    expect(body, "training: no local tr shadows the translate param").not.toContain("const tr = getTrainer(");
    // train-dialog의 price는 파라미터 t와 tr가 공존한다(알리아스라 섀도 없음).
    expect(codeOf("src/components/train-dialog.tsx"), "train-dialog: param t survives, tr is separate").toContain("(t: Target, tr:");
    // 규칙 3의 수용 형태: 카탈로그 빌드 시점 정적(선례 shorts-models.ts)이 아니라 호출 시점 언어다.
    expect(codeOf("src/lib/catalog/training.ts"), "target builds its price at call time").toContain('tr("studio.engine.freeShort")');
  });

  it("openFree 래퍼 호출 개수가 기준선(8f4ee268)과 전 파일에서 동일하다", () => {
    for (const [rel, want] of Object.entries(OPEN_FREE_BASELINE)) {
      const n = (codeOf(rel).match(/openFree\(/g) ?? []).length;
      expect(n, `${rel}: openFree( call count`).toBe(want);
    }
  });

  it("결정 ④: run-skill-dialog의 단가 1회·open 분지는 바이트 동일하게 기존 키로 읽는다(en 조립 == 키 값)", () => {
    // 조립형 "Free" + " " + "on your GPU"는 키 값과 문자 단위 동일 — 그래서 en 결속이 그대로 산다.
    expect(`${translate("en", KEY.free)} on your GPU`, "the en assembly equals the key value").toBe(translate("en", KEY.freeOnYourGpu));
    const dialog = codeOf("src/components/assist/run-skill-dialog.tsx");
    expect(dialog, "dialog: the runs>1 assembly still uses freeShort").toContain('tr("studio.engine.freeShort")');
    expect(dialog, "dialog: the open·runs==1 branch reads the key").toContain('return e.engine === "open" ? tr("studio.finish.freeOnYourGpu")');
    // ko는 미배선 place-word가 섞이지 않는다(키 값 자체가 완전한 한국어).
    const ko = translate("ko", KEY.freeOnYourGpu);
    expect(ko, "ko reads the whole Korean line").not.toContain("Free");
    expect(ko, "ko keeps the free word").toContain("무료");
    // 조립에 쓰이던 where 라벨은 제외 결정 그대로 무접촉.
    expect(dialog, "dialog: the place word stays unwired").toContain('"on your GPU"');
  });
});
