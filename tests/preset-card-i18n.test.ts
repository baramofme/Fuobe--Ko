/**
 * 카탈로그 카드(preset-gallery.tsx의 PresetCard)이 이름·설명을 렌더 시점에 읽는 파생 키의 기계 판정(t_52bfd11a).
 * 카드가 쓰는 템플릿과 이 테스트가 세우는 키는 같은 함수(keySnake)로 같은 모양을 만든다 —
 * `preset.<snake(name)>.name`, `preset.<snake(description)>.description`. 런처 이름(nameIn)과 같은 스킴이다.
 *
 * 판정 3종, 카탈로그 전수(APPS+EFFECTS+MOTIONS, 495항목):
 *  - en: 키의 값이 카탈로그 원문과 문자 단위 동일 → translateOr("en", key, literal)은 리터럴과 동일 바이트.
 *  - ko: 키가 로케일에 있는 항목은 100% 한국어(en과 다르고, 한글 ≥1자 — 아래 예외 1건 제외).
 *  - 키가 로케일에 아예 없는 항목은 0건이어야 한다(갭은 scripts/gen-catalog-gap-keys.py로 메꾼다).
 *
 * 로케일 두 파일과 렌더 파일을 형제 카드들이 함께 건드리는 핫스팟이라 테스트는 분리한다(스킬 규칙).
 * 예외 목록은 명시적 배열로 고정한다: 새 항목이 로케일 없이 렌더되면 테스트가 실패로 알리고,
 * 여기서 정당한지 판정한 뒤에만 목록에 추가한다(로케일은 생성 스크립트 소유 — 손편집 금지).
 */
import { describe, expect, it } from "vitest";
import { APPS, EFFECTS, MOTIONS } from "@/lib/catalog";
import type { Preset } from "@/lib/catalog/types";
import { keySnake, locales, translateOr } from "@/lib/i18n/store";

const ALL: readonly Preset[] = [...APPS, ...EFFECTS, ...MOTIONS];

const HANGUL = /[\uac00-\ud7a3]/;

/** 카드가 렌더 시점에 세우는 두 파생 키(이 설명과 코드가 어긋나면 커버리지 판정이 즉시 잡는다). */
const nameKey = (name: string) => `preset.${keySnake(name)}.name`;
const descKey = (description: string) => `preset.${keySnake(description)}.description`;

/**
 * 로케일(en/ko)에 키가 없는 항목 — 의도된 폴백이면 여기에 적는다. 지금은 0건: Mugshot의 설명 갭 한 건을
 * gen-catalog-gap-keys.py로 메워 전수 커버리지가 성립했다. 이 목록이 커지면 로케일이 줄었다는 신호다.
 */
const KEYLESS_EXCEPTIONS: readonly string[] = [];

/**
 * 한국어 표기가 한글 없이 라틴 문자로 결정된 예외(고유명사·브랜드의 정당한 라틴 표기 — ko가 en과
 * 다른 값을 갖는 한 영어 누수가 아니다). 목록이 길어지면 새 항목이 미번역으로 섞인 것이다.
 */
const LATIN_NAME_EXCEPTIONS: readonly string[] = [
  "preset.gtai.name", // "GTAI"의 ko 표기 "GTA AI" — GTA를 풀어 쓴 라틴 표기(로케일 기존 값, 재결정 금지).
];

describe("catalog cards' derived name/description keys", () => {
  it("the catalog has the size this card renders", () => {
    expect(ALL.length).toBeGreaterThanOrEqual(400);
    // 이름과 설명이 없는 항목은 파생 키를 세울 수 없다 — 데이터 자체가 성립해야 판정이 의미 있다.
    for (const p of ALL) {
      expect(p.name.length, p.id).toBeGreaterThan(0);
      expect(p.description.length, p.id).toBeGreaterThan(0);
    }
  });

  it("en: every name and description resolves to the catalog literal byte for byte", () => {
    for (const p of ALL) {
      const nk = nameKey(p.name);
      const dk = descKey(p.description);
      if (locales.en[nk] !== undefined) {
        expect(locales.en[nk], `${nk} (${p.id})`).toBe(p.name);
        expect(translateOr("en", nk, p.name), p.id).toBe(p.name);
      }
      if (locales.en[dk] !== undefined) {
        expect(locales.en[dk], `${dk} (${p.id})`).toBe(p.description);
        expect(translateOr("en", dk, p.description), p.id).toBe(p.description);
      }
    }
  });

  it("ko: every item reads its own Korean words, different from English", () => {
    for (const p of ALL) {
      for (const kind of ["name", "description"] as const) {
        const literal = kind === "name" ? p.name : p.description;
        const key = kind === "name" ? nameKey(literal) : descKey(literal);
        if (locales.en[key] === undefined) continue; // keyless — pinned below
        const korean = locales.ko[key];
        expect(korean, key).toBeTypeOf("string"); // 로케일 패리티: en에 있으면 ko에도 있다
        expect(korean, key).not.toBe(locales.en[key]); // 같은 값이면 영어 누수
        if (!LATIN_NAME_EXCEPTIONS.includes(key)) expect(korean).toMatch(HANGUL); // 최소 1음절의 한글
        expect(translateOr("ko", key, literal), p.id).toBe(korean); // 렌더 시점 해석이 그 값을 쓴다
      }
    }
  });

  it("the items whose key is in neither locale are exactly the documented exceptions", () => {
    const keyless = new Set<string>();
    for (const p of ALL) {
      for (const kind of ["name", "description"] as const) {
        const literal = kind === "name" ? p.name : p.description;
        const key = kind === "name" ? nameKey(literal) : descKey(literal);
        if (locales.en[key] === undefined && locales.ko[key] === undefined) keyless.add(`${p.id} ${key}`);
      }
    }
    expect([...keyless].sort()).toEqual([...KEYLESS_EXCEPTIONS].sort());
  });

  it("the ko locale holds a value for every name and description key the en locale has", () => {
    // 패리티 검사(i18n.test.ts가 전체를 본다)를 파생 키에 한정해 한 번 더 확인한다.
    const presetKeys = Object.keys(locales.en).filter((k) => k.startsWith("preset."));
    expect(presetKeys.length).toBeGreaterThanOrEqual(900);
    for (const k of presetKeys) expect(locales.ko[k], k).toBeTypeOf("string");
  });

  it("the one gap this card closed reads Korean at render time", () => {
    // Mugshot: 설명 갭 한 건(프로브가 찾아낸 유일한 구멍) — 카드가 그 설명을 한국어로 해석한다.
    // "Mugshot" 이름의 항목이 사진·영상 두 개 있다(apps.ts) — 갭은 영상 쪽의 설명이므로 그 값으로 지목한다.
    const booking = ALL.find((p) => p.description === "A police booking-scene video");
    expect(booking, "the booking-scene video must still exist in the catalog").toBeDefined();
    expect(booking!.name).toBe("Mugshot");
    const key = descKey(booking!.description);
    expect(locales.en[key]).toBe("A police booking-scene video");
    expect(translateOr("ko", key, booking!.description)).toBe("체포 기록 장면의 영상");
  });
});
