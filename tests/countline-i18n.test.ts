/**
 * 카운트 라인 번역의 기계 판정(t_ca378163, 결정문 t_945498cb §5). 네 메뉴(apps/motions/canvas/studios)의
 * countLine이 렌더 시점 translateOr으로 en은 바이트 동일·ko는 100% 한국어로 해석됨을 증명한다. 자기 파일에만
 * 쓴다(형제 LINE 카드가 같은 두 로케일 파일을 고치는 핫스팟 — 테스트는 분리한다).
 */
import { describe, expect, it } from "vitest";
import { appsMenu, canvasMenu, motionsMenu } from "@/lib/mega-menus.server";
import { packMenu, studiosMenu, unpackMenu, type MegaModel } from "@/lib/mega-menus";
import { locales, translateOr } from "@/lib/i18n/store";

const MENUS: readonly [string, () => MegaModel][] = [
  ["apps", appsMenu],
  ["motions", motionsMenu],
  ["canvas", canvasMenu],
  ["studios", () => studiosMenu(undefined)],
];

describe("countLine의 렌더 시점 해석", () => {
  it("en에서 키로 해석한 결과가 영어 리터럴과 문자 단위 동일(fallback 보존)", () => {
    for (const [id, build] of MENUS) {
      const m = build();
      expect(m.countLineKey, id).toBe(`menu.countLine.${id}`);
      // en.json에 키가 있는 순간 그 키값이 이긴다(store.ts:144-150) → 출력이 리터럴과 같아야 한다.
      expect(translateOr("en", m.countLineKey, m.countLine, m.countLineParams), id).toBe(m.countLine);
    }
  });

  it("네 메뉴 모두 en.json에 키가 있고, 그 값이 {n}/{m}로 리터럴을 recreated한다", () => {
    for (const [id, build] of MENUS) {
      const m = build();
      const keyVal = locales.en[m.countLineKey];
      expect(keyVal, id).toBeTypeOf("string");
      // 키값을 params로 interpolate하면(translateOr의 en 경로) 리터럴과 동일 — 간접 증거.
      expect(translateOr("en", m.countLineKey, "FALLBACK", m.countLineParams), id).toBe(m.countLine);
      expect(keyVal, id).toContain("{n}");
      if (id === "motions") expect(keyVal, id).toContain("{m}");
    }
  });

  it("ko 값은 {n}/{m} 토큰이 살아 있고, en과 다르고, 한글을 1자 이상 담는다", () => {
    for (const [id, build] of MENUS) {
      const m = build();
      const koVal = locales.ko[m.countLineKey]!;
      expect(koVal, id).toBeTypeOf("string");
      expect(koVal, id).not.toBe(locales.en[m.countLineKey]);
      expect(koVal, id).toContain("{n}");
      if (id === "motions") expect(koVal, id).toContain("{m}");
      expect([...koVal].some((ch) => ch >= "\uAC00" && ch <= "\uD7A3"), `${id}: Hangul`).toBe(true);
    }
  });

  it("ko에서 실제 숫자로 채워진 한국어 라인이 나온다(토큰이 리터럴로 남지 않는다)", () => {
    for (const [, build] of MENUS) {
      const m = build();
      const ko = translateOr("ko", m.countLineKey, m.countLine, m.countLineParams);
      expect(ko).not.toMatch(/\{[nm]\}/); // {n}/{m}이 모두 params로 대체됨
      expect(ko).not.toBe(m.countLine); // ko가 영어 리터럴과 동일하면 안 된다
      expect([...ko].some((ch) => ch >= "\uAC00" && ch <= "\uD7A3")).toBe(true);
    }
  });

  it("packMenu/unpackMenu 왕복이 두 새 필드를 보존한다(스프레드로 최상위 유지)", () => {
    for (const [, build] of MENUS) {
      const m = build();
      const round = unpackMenu(JSON.parse(JSON.stringify(packMenu(m))));
      expect(round.countLineKey).toBe(m.countLineKey);
      expect(round.countLineParams).toEqual(m.countLineParams);
    }
  });
});
