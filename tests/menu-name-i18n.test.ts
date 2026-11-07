/**
 * 런처 타일·행·리드의 NAME(e.label) 렌더 시점 해석의 기계 판정(t_e1f8ee06, 결정문 t_945498cb §1.3/§6).
 * 세 피치 메뉴(apps/motions/canvas)의 모든 렌더 항목에 대해:
 *  - en: 키로 해석한 결과가 영어 리터럴과 문자 단위 동일(바이트 보존 — 형제 LINE/countLine 카드의 요건과 동일).
 *  - ko: 이름 키가 로케일에 있는 항목은 100% 한국어(Hangul ≥1자, en과 다름).
 * 이름 키가 로케일에 없는 항목(캔버스의 "What's a canvas?" 리드 등)은 fallback 규칙대로 영어로 남는다 —
 * 그 예외 목록을 명시적으로 고정한다. 목록이 커지면(로케일이 줄면) 테스트가 실패로 알린다.
 *
 * 형제들이 같은 파일(mega-panel.tsx의 lineTr)과 로케일 두 파일을 건드리는 핫스팟이라 테스트는 분리한다.
 * Studios 메뉴의 행·리드는 NavEntry라 이 판정의 대상이 아니다(nav.<id> 경로는 t_f5a5c82d가 이미 배선했다).
 */
import { describe, expect, it } from "vitest";
import { appsMenu, canvasMenu, motionsMenu } from "@/lib/mega-menus.server";
import { megaItems, type MegaItem } from "@/lib/mega-menus";
import { keySnake, locales, translateOr } from "@/lib/i18n/store";

const MENUS: readonly [string, () => import("@/lib/mega-menus").MegaModel][] = [
  ["apps", appsMenu],
  ["motions", motionsMenu],
  ["canvas", canvasMenu],
];

const HANGUL = /[\uac00-\ud7a3]/;

/** The name key the panel resolves through, at all five render sites (LeadCard/Row/Tile and their titles). */
const nameKey = (e: MegaItem) => `preset.${keySnake(e.label)}.name`;

/**
 * 이름 키가 로케일(en/ko)에 없는 항목의 목록 — 의도된 폴백(이름 표기가 로케일 사전을 거치지 않는 항목).
 * 이 목록은 수동으로 고정한다: 새 항목이 로케일에 없이 렌더되면 테스트가 실패로 알리고, 여기서 정당한지
 * 판정한 뒤에만 추가한다. (고정하는 이유: 로케일 파일은 생성 스크립트 소유 — 손편집 금지.)
 */
const KEYLESS_EXCEPTIONS: readonly string[] = [
  "What's a canvas?", // 캔버스 리드: 이름이 리드의 물음 그대로, 로케일 이름 표기가 없다(결정문 §6의 예외).
];

describe("the launcher names' locale keys", () => {
  it("the three fetched menus render their items' names through preset.<snake(name)>.name", () => {
    // Count every distinct name the three menus can show at the render sites.
    const names = new Map<string, string>();
    for (const [, build] of MENUS) {
      for (const e of megaItems(build())) names.set(e.id, e.label);
    }
    expect(names.size).toBeGreaterThanOrEqual(100);
  });

  it("en: every item whose name key is in the locales resolves to the English literal byte for byte", () => {
    for (const [id, build] of MENUS) {
      for (const e of megaItems(build())) {
        const key = nameKey(e);
        if (locales.en[key] === undefined) continue; // keyless items are checked in the exception test
        // en.json의 값이 이 항목의 라벨과 문자 단위 동일 → translateOr("en", …)은 리터럴과 동일 바이트.
        expect(locales.en[key], `${key} (${id}: ${e.label})`).toBe(e.label);
        expect(translateOr("en", key, e.label), e.id).toBe(e.label);
      }
    }
  });

  it("ko: every item whose name key is in the locales reads as Korean, different from English", () => {
    for (const [, build] of MENUS) {
      for (const e of megaItems(build())) {
        const key = nameKey(e);
        if (locales.en[key] === undefined) continue;
        const korean = locales.ko[key];
        expect(korean, key).toBeTypeOf("string"); // 로케일 parity(키가 en에 있으면 ko에도 있다)
        expect(korean, key).not.toBe(locales.en[key]); // untranslated면 영어 누수
        expect(korean).toMatch(HANGUL); // 최소 1음절의 한글
        // 렌더 시점 해석이 그 한국어 값을 그대로 쓴다.
        expect(translateOr("ko", key, e.label), e.id).toBe(korean);
      }
    }
  });

  it("the items whose name key is in neither locale are exactly the documented fallback exceptions", () => {
    const keyless = new Set<string>();
    for (const [, build] of MENUS) {
      for (const e of megaItems(build())) {
        if (locales.en[nameKey(e)] === undefined) keyless.add(e.label);
      }
    }
    // 목록이 고정된 예외와 정확히 같아야 한다: 새 항목이 로케일에 없이 렌더되면(= ko에서 영어로 남으면) 실패.
    expect([...keyless].sort()).toEqual([...KEYLESS_EXCEPTIONS].sort());
    // 폴백이 en에서 리터럴과 바이트 동일(이름 키가 없으면 translateOr가 e.label로 돌아온다).
    for (const label of KEYLESS_EXCEPTIONS) {
      expect(translateOr("en", `preset.${keySnake(label)}.name`, label)).toBe(label);
    }
  });

  it("the key helper derives the key from the name itself, never from an id", () => {
    // 손계산 키: 렌더 지점과 생성 스크립트가 같은 형태를 쓸 것(형제 menuLineKey와 같은 원칙).
    expect(nameKey({ label: "Relight", id: "x" } as MegaItem)).toBe("preset.relight.name");
    expect(nameKey({ label: "Any Angle", id: "x" } as MegaItem)).toBe("preset.any_angle.name");
    expect(nameKey({ label: "What's a canvas?", id: "x" } as MegaItem)).toBe("preset.what_s_a_canvas.name");
  });
});
