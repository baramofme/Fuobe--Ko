/**
 * Marketing Studio 히어로 문장(<p>, marketing-studio.tsx line 489)의 조건 분기 파편 3종 +
 * 문장 골격 1종의 기계 판정(t_1a8eb7d1, 후속 of t_1f971eb9).
 *
 * 합성 설계: 문장 전체를 marketing.studio.productLine 한 키로 감싸고 조건 분기 어구만
 * fragment 키로 떼어, t(productLine, { fragment })가 {fragment} 자리에 조각을 끼워 넣는다.
 * en의 productLine 가치는 배선 전 원 렌더 문장과 문자 단위 동일 — {fragment}에 각 fragment
 * en 가치를 대입하면 세 분기 문장이 바이트 그대로 재조립된다(lang-switch의 영어 리터럴
 * 결속·테이블의 EN 문장이 이를 초록으로 묶는다). 계보는 marketing.<group>.<camel> — 이
 * 문장의 조감은 marketing.studio에 산다(marketing.blocker|brand|words|website|voiceover|output과 동격).
 *
 * ko는 문장을 재배열하되 각 fragment가 조사를自带한 종결형이라 {fragment}가 어느 자리에
 * 가도 문법적으로 붙는다. ko는 전량 한글 + 한국어에서도 쓰는 외래 표기(GPU·UGC)와 제품
 * 고유명사(Fuobe Marketing Image)만 남긴다 — 허용목록을 지우면 ASCII 문자가 0으로 남아
 * "line 489에 영어가 없다"를 기계로 판정한다.
 */
import { describe, expect, it } from "vitest";
import { locales, t } from "@/lib/i18n/store";

const HANGUL = /[\uac00-\ud7a3]/;
const ASCII_LETTER = /[A-Za-z]/;

/** 한국어 화면에 남기는 게 정당한 외래 표기·고유명사(지우고 나면 ASCII 문자가 남지 않는다). */
const RETAINED_LATIN = ["GPU", "UGC", "Fuobe", "Marketing", "Image"];

/** 배선 전 소스가 렌더하던 세 분기 문장(코드에서 그대로 옮겨 적었다 — &apos;는 '로 렌더된다). */
const BRANCH_EN: Record<string, string> = {
  "open/visitor":
    "Product shots, motion, UGC presenters, ads, posters and listings — from Fuobe's templates, on open-source models.",
  "open/owner":
    "Product shots, motion, UGC presenters, ads, posters and listings — from Fuobe's templates, on your own GPU, free.",
  cloud:
    "Product shots, motion, UGC presenters, ads, posters and listings — from Fuobe's templates, on Fuobe Marketing Image or partner models in the cloud.",
};

/** 분기 -> fragment 키. */
const BRANCH_KEY: Record<string, string> = {
  "open/visitor": "marketing.studio.fragmentOpenSource",
  "open/owner": "marketing.studio.fragmentOwnGpu",
  cloud: "marketing.studio.fragmentCloud",
};

const LINE_KEY = "marketing.studio.productLine";
const FRAGMENT_KEYS = Object.values(BRANCH_KEY);

/** 로케일 값을 정의된 문자열로 좁힌다 — 없으면 테스트가 명확히 실패하도록 던진다. */
function val(lang: "en" | "ko", k: string): string {
  const v = locales[lang][k];
  if (v === undefined) throw new Error(`missing ${lang} key ${k}`);
  return v;
}

/** ko 문장을 조립하고 정당한 외래 표기를 지운다 — 남은 ASCII 문자가 영어 잔존 판정의 대상. */
function koStrip(branch: string): string {
  const koLine = val("ko", LINE_KEY).replace("{fragment}", val("ko", BRANCH_KEY[branch]));
  let stripped = koLine;
  for (const token of RETAINED_LATIN) stripped = stripped.split(token).join("");
  return stripped;
}

describe("marketing hero sentence assembles from fragment keys and switches to Korean", () => {
  it("English keeps every source byte the sentence printed before wiring", () => {
    // productLine + 분기별 fragment를 대입한 조립이 원 렌더 문장과 문자 단위 동일(3분기).
    for (const [branch, orig] of Object.entries(BRANCH_EN)) {
      const asm = val("en", LINE_KEY).replace("{fragment}", val("en", BRANCH_KEY[branch]));
      expect(asm, branch).toBe(orig);
    }
  });

  it("the default language renders exactly what the code said before wiring", () => {
    // vitest 기본 언어는 en: 히어로 문장의 en 결속이 초록으로 남는다(조각을 파라미터로 건네는 배선).
    for (const [branch, orig] of Object.entries(BRANCH_EN)) {
      expect(t(LINE_KEY, { fragment: t(BRANCH_KEY[branch]) }), branch).toBe(orig);
    }
  });

  it("every fragment key has Korean words that contain Hangul", () => {
    for (const k of FRAGMENT_KEYS) {
      const kv = locales.ko[k];
      expect(kv, k).toBeTruthy();
      expect(HANGUL.test(kv!), `ko ${k} must read Korean`).toBe(true);
    }
  });

  it("no Korean value is a copy of its English (zero same-value keys)", () => {
    for (const k of [LINE_KEY, ...FRAGMENT_KEYS]) {
      expect(locales.ko[k], k).not.toBe(locales.en[k]);
    }
  });

  it("the Korean hero sentence leaves no English beyond the retained proper nouns", () => {
    for (const branch of Object.keys(BRANCH_EN)) {
      const stripped = koStrip(branch);
      // 정당한 외래 표기(GPU·UGC·Fuobe Marketing Image)를 지운 자리에 ASCII 문자가 하나도 없어야 한다.
      expect(ASCII_LETTER.test(stripped), `ko ${branch} still holds English: ${stripped}`).toBe(false);
      expect(HANGUL.test(stripped), `ko ${branch} reads Korean`).toBe(true);
    }
  });

  it("the three English fragments do not survive in any Korean branch", () => {
    const forbidden = [
      "open-source models",
      "your own GPU, free",
      "Fuobe Marketing Image or partner models in the cloud",
      "Product shots",
      "UGC presenters",
      "from Fuobe",
    ];
    for (const branch of Object.keys(BRANCH_EN)) {
      const koLine = val("ko", LINE_KEY).replace("{fragment}", val("ko", BRANCH_KEY[branch]));
      for (const phrase of forbidden) {
        expect(koLine.includes(phrase), `ko ${branch} leaked ${phrase}`).toBe(false);
      }
    }
  });

  it("the keys sit inside the marketing block, in the same order in both locales", () => {
    const keys = [LINE_KEY, ...FRAGMENT_KEYS];
    const enKeys = Object.keys(locales.en);
    const positions: number[] = [];
    for (const k of keys) {
      const i = enKeys.indexOf(k);
      expect(i, `${k} present in en`).toBeGreaterThan(-1);
      positions.push(i);
      expect(Object.keys(locales.ko)[i], `ko ${k} shares the position`).toBe(k);
    }
    // 앵커(marketing.generate) 바로 뒤 4종 연속 삽입: 앞뒤가 직전 블록의 마지막·다음 블록의 첫 키다.
    // 병합 결정(t_3913855f): main의 파일 순서에서 이 4종은 파일 꼬리(마지막 4키)로 붙었다 — 레인의
    // 앵커邻接은 main 순서에서 성립하지 않는다. 연속성(span 3)과 양 로케일 동위치는 그대로 검증한다.
    expect(positions[3] - positions[0]).toBe(3);
    expect(enKeys[positions[0] - 1]).toBe("settings.off"); // main 순서에서 앞은 설정 블록의 꼬리
    expect(positions[3]).toBe(enKeys.length - 1); // 파일의 마지막 키가 fragmentCloud다
  });
});
