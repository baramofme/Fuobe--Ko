import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { locales, translate } from "@/lib/i18n/store";
import { placeRows, runPlace, type RunPlaceInput } from "@/lib/run-place";
import { modelInfos } from "@/lib/catalog/shorts-models";

/**
 * 2차 잔여(t_96d00226)의 배선 기계 판정 — 판정 원형은 레인 선례(inline-cluster-b·
 * lib-price-trio): ① en 바이트 동일 ② ko 판정 ③ 소스 스캔 codeOnly(원 리터럴 잔존 0·
 * tr/t(key) 호출) ④ 렌더 구독(훅 경유, 기본값 storeT의 call-site 잔존 0) ⑤ 조립·호출 재현.
 *
 * 대상 4지점(카드 실측): run-place-chip.tsx의 useRunPlace·useOpenRunPlace·RunPlaceChip의
 * runPlace/placeRows call-site + :140의 ellipsis "…"(studio.price.dots) · model3d 소비자
 * 3지점(model3d-studio·other-sides·retexture-dialog의 priceLine(preview.data)) ·
 * shorts-models.ts:94의 trio 생존 리터럴 "Free · your GPU"(기존 키로 배선, 신규 키 0).
 * en은 e2e·coupled 결속(mixed-shorts-originals:111의 price 핀)이 원 영어 리터럴에 결속돼
 * 있어 문자 단위 동일해야 초록이 산다. 로케일 무접촉이라 키 값은 전부 선재 값으로 판정한다.
 */
const SOURCE_LITERALS = {
  dots: "…",
  freeYourGpu: "Free \u00b7 your GPU",
} as const;

// Reuse — 신규 키 0종(로케일 무접촉). 값은 선재 바이트로 결속된다.
const KEYS: Record<keyof typeof SOURCE_LITERALS, string> = {
  dots: "studio.price.dots",
  freeYourGpu: "studio.composer.freeYourGpu",
};

const CHIP = "src/components/studio/run-place-chip.tsx";
const M3D_FILES = ["src/components/model3d/model3d-studio.tsx", "src/components/model3d/other-sides.tsx", "src/components/model3d/retexture-dialog.tsx"];
const SHORTS = "src/lib/catalog/shorts-models.ts";

const HANGUL = /[\uAC00-\uD7A3]/;
const HANJA = /[\u4e00-\u9fff]/;
/** 코드에서 블록·라인 주석을 제거해 JSDoc의 설명용 리터럴을 판정에서 제외한다(twin 선례). */
const codeOnly = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
const codeOf = (rel: string) => codeOnly(fs.readFileSync(path.resolve(import.meta.dirname, "..", rel), "utf-8"));

describe("2차 잔여의 렌더 시점 배선(t_96d00226 레인)", () => {
  it("두 키가 en·ko 양쪽에 있고, en 값은 원 리터럴과 문자 단위 동일(스토어 경유 해석도 동일)", () => {
    for (const name of Object.keys(SOURCE_LITERALS) as (keyof typeof SOURCE_LITERALS)[]) {
      const key = KEYS[name];
      expect(locales.en[key], `${name}: en is a string`).toBeTypeOf("string");
      expect(locales.en[key], `${name}: byte identity`).toBe(SOURCE_LITERALS[name]);
      expect(locales.ko[key], `${name}: ko is a string`).toBeTypeOf("string");
      expect(translate("en", key), `${name}: translate("en") byte identity`).toBe(SOURCE_LITERALS[name]);
    }
    // freeYourGpu의 ko는 en과 다른 100% 한국어(한자 0); dots는 ko에서도 같은 줄임표라 en과 같다는 사실이 값으로 잠긴다.
    expect(locales.ko[KEYS.freeYourGpu]).not.toBe(locales.en[KEYS.freeYourGpu]);
    expect(HANGUL.test(locales.ko[KEYS.freeYourGpu]!), "freeYourGpu: Hangul").toBe(true);
    expect(HANJA.test(locales.ko[KEYS.freeYourGpu]!), "freeYourGpu: zero hanja").toBe(false);
    expect(translate("ko", KEYS.dots), "dots: the ellipsis stands unchanged in ko").toBe("…");
  });

  it("칩 파일의 코드(주석 제외)는 ellipsis를 키로 부르며 원 리터럴을 담지 않는다", () => {
    const code = codeOf(CHIP);
    expect(code, "chip: t(\"studio.price.dots\") present").toContain('t("studio.price.dots")');
    expect(code, "chip: no leftover ellipsis").not.toContain('"…"');
  });

  it("칩의 runPlace·placeRows call-site 3곳이 그 알리아스 t을 건네고, 파일은 useI18n로 렌더 시점 구독한다", () => {
    const code = codeOf(CHIP);
    const passed = code.match(/(?:runPlace|placeRows)\([^;]*,\s*t\)/g) ?? [];
    expect(passed.length, "칩 안의 runPlace/placeRows call-site 3곳이 t을 건넨다").toBe(3);
    // 기본값 storeT로 부르는 잔여 call-site 0: 모든 호출이 `, t)`로 끝난다.
    const all = code.match(/(?:runPlace|placeRows)\([^;]*\)/g) ?? [];
    expect(all.length, "칩 안의 runPlace/placeRows 호출은 3곳").toBe(3);
    for (const call of all) expect(call, `call ends with its tr: ${call}`).toMatch(/,\s*t\)$/);
    const subs = code.match(/const \{ t \} = useI18n\(\)/g) ?? [];
    expect(subs.length, "useRunPlace·useOpenRunPlace·RunPlaceChip 3곳이 t로 구독한다").toBe(3);
    // openFree 래퍼 원형 유지(규칙 5): 이 카드의 판정은 래퍼를 건드리지 않는다.
    expect(code, "chip: openFreeWords 래퍼 그대로").toContain("openFreeWords(text, site)");
  });

  it("model3d 소비자 3지점이 훅의 tr로 구독하고 priceLine에 건넨다(기본값 call-site 잔존 0)", () => {
    for (const rel of M3D_FILES) {
      const code = codeOf(rel);
      expect(code, `${rel}: imports useI18n`).toContain("useI18n");
      expect(code, `${rel}: subscribes t as tr`).toContain("const { t: tr } = useI18n()");
      expect(code, `${rel}: priceLine(preview.data, tr)`).toContain("priceLine(preview.data, tr)");
      expect(code, `${rel}: no bare priceLine(preview.data)`).not.toMatch(/priceLine\(preview\.data\)(?!,)/);
    }
    // 헬퍼 자체(1차 배선)는 기본값 storeT 그대로 — 이 카드는 무접촉.
    expect(codeOf("src/components/model3d/hooks.ts")).toContain("tr: (key: string, params?: Params) => string = storeT");
  });

  it("shorts-models의 trio 생존 지점은 기존 키를 tr로 부르며 원 리터럴이 코드에서 사라진다(신규 키 0·로케일 무접촉)", () => {
    const code = codeOf(SHORTS);
    expect(code, "shorts: tr(\"studio.composer.freeYourGpu\")").toContain('tr("studio.composer.freeYourGpu")');
    expect(code, "shorts: no leftover trio literal").not.toContain(SOURCE_LITERALS.freeYourGpu);
    expect(code, "shorts: fn 기본값 storeT(모듈 상수 스냅샷 아님)").toContain("tr: (key: string, params?: Params) => string = storeT");
    expect(code, "shorts: storeT 근원").toContain("storeT");
    // 모듈 스코프의 t() 스냅샷(언어를 import 시점에 고정)이 0(twin 선례의 슬라이스 판정).
    expect(code, "shorts: no module const snapshot").not.toMatch(/\b(?:export )?const \w+ = (?:t|tr)\(/);
  });

  it("기본값 storeT의 en 바이트가 결속을 지킨다(호출 실측)과 ko 호출이 실제로 ko로 바뀐다", () => {
    // vitest는 node 환경: localStorage 없음 → getLang()은 en → 기본값 호출은 en 원 바이트.
    const [open] = modelInfos(["fuobe-shorts"], "open");
    expect(open.price, "modelInfos 기본값은 en 원 바이트(mixed-shorts-originals:111 결속)").toBe(SOURCE_LITERALS.freeYourGpu);

    const koTr = (k: string) => translate("ko", k);
    const input: RunPlaceInput = { audience: "account", engine: "open", models: ["Some model"], gpu: false, hosted: false, format: (n) => `$${n.toFixed(2)}` };
    expect(runPlace(input).price, "runPlace default is en").toBe("Free");
    expect(runPlace(input, koTr).price, "runPlace with ko tr is ko").toBe("무료");
    // runPlace는 공유 가격 줄을 placePrice에 tr까지 건네서 넘긴다(2차 실측 결함: 인자 3 생략 시 가격 줄이 en에 고착).
    expect(codeOf("src/lib/run-place.ts"), "run-place: placePrice gets runPlace's tr").toContain("input.format, tr)");

    const viewer = { kind: "account" as const, hosted: true, gpu: { connected: true, online: true, device: "NVIDIA RTX 4090" }, placeName: "Our GPUs" };
    const enRows = placeRows(viewer, { siteRuns: true })!.rows;
    const koRows = placeRows(viewer, { siteRuns: true }, {}, koTr)!.rows;
    expect(enRows[1].sub, "placeRows default en").toBe("Free \u00b7 RTX 4090");
    expect(koRows[1].sub.startsWith("무료"), "placeRows with ko tr starts the ko free word").toBe(true);
    expect(koRows[1].sub, "placeRows ko keeps the device").toBe("무료 \u00b7 RTX 4090");

    // 칩의 pending ellipsis 조립: en·ko 모두 줄임표로 재현(키 값이 원 문자와 동일).
    expect(`pending → ${translate("en", KEYS.dots)}`).toBe("pending → …");
    expect(`pending → ${translate("ko", KEYS.dots)}`).toBe("pending → …");
  });

  it("이 레인이 잠근 4파일 외의 인접 지점은 무접촉 사실로 남는다(color-grade·bare Free 플래그)", () => {
    // color-grade-view:447의 원 리터럴은 재사용 가능한 바이트 동일 키가 0(전수 스캔 실측)라 무접촉 —
    // 신규 키가 필요해 이 카드에서 불가 보고됐다(로케일 무접촉 결정). 판정도 그 사실을 그대로 잠근다.
    expect(codeOf("src/components/color-grade-view.tsx")).toContain("Free \u00b7 runs in your browser");
    // run-place-chip의 bare "Free"(steps 줄의 0원 표기)는 이 카드 범위 밖(벌거벗은 Free 관례 제외).
    expect(codeOf(CHIP)).toContain('"Free"');
    // 로케일 무접촉: 두 키의 값은 선재 바이트(위 판정)로 충분 — 이 카드는 en.json/ko.json를 건드리지 않았다.
  });
});
