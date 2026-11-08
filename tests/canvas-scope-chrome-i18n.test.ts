/**
 * 범위 확장 크롬 문자열(t_dee3be02 — NAME 카드가 명시 제외했던 4종, 오케스트레이터 포함 판정):
 * `Start here`·`Effect films` column 헤드, `See all ready boards`(tiles column의 more 라벨),
 * 에러 토스트 `Couldn't make a new board. Please try again.`.
 *
 * 형제 t_c373d4a4가 `tests/canvas-chrome-i18n.test.ts` 이름을 선점했다 — 같은 경로의 add/add
 * 병합을 피하려 이 레인은 다른 이름으로 분리한다(오케스트레이터 결정). 로케일 값은 생성
 * 스크립트(scripts/gen-canvas-chrome-keys.py)가 실행 중인 wire과 코드 리터럴을 원천으로 써
 * 넣었다 — 이 테스트는 그 바이트를 렌더가 실제로 지나는 키로 재확인한다.
 *
 * 키 스킴(오케스트레이터 결정, 이 카드 본문에 그대로 박혀 있다):
 * - 두 헤드 → `area.section.<column id>.title` — MegaColumns의 헤드가 이미 이 모양으로
 *   translateOr 해석 중이라 로케일 키만 채우면 배선이 끝난다(렌더 site를 고치지 않는다).
 * - `See all ready boards` → `nav.canvas.seeAllReadyBoards`(크롬 링크 라벨 — menu.line이 아니라 nav.*)
 * - 토스트 → `nav.canvas.newBoardError`(wire 어디에도 없는 정적 신규 문구 — OWNER_STATIC 선례로
 *   스크립트가 직접 선언한다)
 * en은 키의 값이 원출력과 문자 단위 같으므로 바이트 동일이 구성상 성립한다.
 */
import { describe, expect, it } from "vitest";
import { canvasMenu, SERVER_MENUS } from "@/lib/mega-menus.server";
import { studiosMenu } from "@/lib/mega-menus";
import { TEMPLATE_SECTIONS } from "@/lib/canvas-sections";
import { locales, translateOr } from "@/lib/i18n/store";

const HANGUL = /[\uac00-\ud7a3]/;

/** ko 품질 규칙(생성 스크립트의 규칙과 같은 문서): 한글 1자 이상, 줄임표·개행 금지, en과 동일 금지. */
function koIsKorean(key: string): string {
  const english = locales.en[key]!;
  const korean = locales.ko[key];
  expect(korean, key).toBeTypeOf("string"); // i18n parity의 규칙을 이 키들에 대해 재확인
  expect(korean, key).not.toBe(english); // untranslated는 English 누수다
  expect(korean, key).toMatch(HANGUL);
  expect(korean, key).not.toContain("…");
  expect(korean, key).not.toContain("\n");
  return korean!;
}

describe("the scope-expansion chrome strings", () => {
  it("the column headings resolve through the very key the render site reads", () => {
    const model = canvasMenu();
    const start = model.columns.find((c) => c.id === "start");
    const films = model.columns.find((c) => c.id === "effect-films");
    expect(start?.label).toBe("Start here"); // wire가 오늘 내준 바이트
    expect(films?.label).toBe(TEMPLATE_SECTIONS[1].title); // "Effect films" — 섹션의 그 값

    // MegaColumns의 헤드 한 줄: translateOr(lang, `area.section.${c.id}.title`, c.label).
    // 렌더가 만들어 읽는 키 모양을 같은 column id로 재구성한다(스크립트가 이 키를 썼다).
    const startKey = `area.section.${start!.id}.title`;
    const filmsKey = `area.section.${films!.id}.title`;
    expect(startKey).toBe("area.section.start.title");
    expect(filmsKey).toBe("area.section.effect-films.title");

    // en은 키의 값이 라벨과 문자 단위 동일 → 영어 출력은 원출력과 바이트 동일.
    expect(locales.en[startKey], startKey).toBe(start!.label);
    expect(translateOr("en", startKey, start!.label)).toBe(start!.label);
    expect(locales.en[filmsKey], filmsKey).toBe(films!.label);
    expect(translateOr("en", filmsKey, films!.label)).toBe(films!.label);

    // ko는 두 헤드가 이미 다른 페이지에서 보여주는 문구와 같은 값(같은 제품 안의 용어 통일):
    // /apps의 Start here는 apps.startHere로 "여기서 시작", /canvas의 섹션은 canvas.sections.effectFilms로 "효과 영화".
    const startKo = koIsKorean(startKey);
    const filmsKo = koIsKorean(filmsKey);
    expect(startKo, "같은 문구, 같은 번역").toBe(locales.ko["apps.startHere"]);
    expect(filmsKo, "같은 문구, 같은 번역").toBe(locales.ko["canvas.sections.effectFilms"]);
    expect(translateOr("ko", startKey, start!.label)).toBe(startKo); // 렌더가 ko에서 읽는 값
    expect(translateOr("ko", filmsKey, films!.label)).toBe(filmsKo);
  });

  it("See all ready boards resolves through one key in both render sites", () => {
    const label = canvasMenu().columns.at(-1)?.more?.label;
    expect(label).toBe("See all ready boards"); // wire의 마지막 tiles column가 내준 바이트
    const key = "nav.canvas.seeAllReadyBoards";

    // mega-panel은 translateOr(lang, key, c.more.label)로, studios-sheet의 고정 span은 t(key)로 읽는다.
    // 두 경로가 같은 키를 쓰므로 두 화면의 문구가 갈라질 수 없다.
    expect(locales.en[key], key).toBe(label);
    expect(translateOr("en", key, label!)).toBe(label); // en: 원출력 바이트 그대로
    const ko = koIsKorean(key);
    expect(translateOr("ko", key, label!)).toBe(ko); // ko: 누수 없이 한국어
    // t()의 en 경로는 en.json의 값 — 그 값이 라벨과 같으니 t로 읽어도 바이트 동일이다.
    expect(locales.en[key]).toBe("See all ready boards");
  });

  it("the one see-all key is exhaustive: every column's more label is the pinned literal", () => {
    // MegaColumns은 모든 가족의 컬럼을 그리는 제너릭 렌더인데, 그 자리에 단 하나의 키를 박았다.
    // 오늘 그 자리를 통과하는 라벨이 오직 이 리터럴이라는 것을 예외 목록으로 박는다(선례 9a —
    // 배열로 고정해야 새 라벨이 조용히 English로 누수되는 대신 이 테스트가 실패한다).
    const PINNED = ["See all ready boards"];
    const seen: string[] = [];
    for (const build of Object.values(SERVER_MENUS)) {
      for (const c of build().columns) if (c.more) seen.push(c.more.label);
    }
    for (const kind of [undefined, "guest", "account", "owner"] as const) {
      for (const c of studiosMenu(kind).columns) if (c.more) seen.push(c.more.label);
    }
    expect([...new Set(seen)].sort(), `column more 라벨 수집: ${JSON.stringify(seen)}`).toEqual(PINNED);
  });

  it("the new-board failure toast has words in both languages, en byte-identical to the old literal", () => {
    const key = "nav.canvas.newBoardError";
    // 코드가 예전에 넘기던 리터럴 그 자체가 en.json으로 이사왔다 — 폴백 리터럴과 같은 값이라 바이트 동일.
    expect(locales.en[key]).toBe("Couldn't make a new board. Please try again.");
    const ko = koIsKorean(key);
    expect(ko).toContain("새 보드"); // 실패한 대상(새 보드)을 그대로 지목한다
    expect(ko).toContain("다시"); // 재시도 권유 — 원문의 "Please try again"에 대응
    // 렌더 지점의 기계(translateOr)로 재확인: en은 폴백과 동일, ko는 키의 한국어.
    expect(translateOr("en", key, "Couldn't make a new board. Please try again.")).toBe("Couldn't make a new board. Please try again.");
    expect(translateOr("ko", key, "Couldn't make a new board. Please try again.")).toBe(ko);
  });

  it("no English leak survives for the four positions once the keys exist", () => {
    // 네 위치의 en 원출력. ko로 해석하면 세 헤드·라벨과 토스트 모두 영문에서 벗어난다.
    const pairs: [string, string][] = [
      ["area.section.start.title", "Start here"],
      ["area.section.effect-films.title", "Effect films"],
      ["nav.canvas.seeAllReadyBoards", "See all ready boards"],
      ["nav.canvas.newBoardError", "Couldn't make a new board. Please try again."],
    ];
    for (const [key, english] of pairs) {
      expect(translateOr("en", key, english), key).toBe(english); // en은 바이트 동일(위 단정들의 재확인)
      expect(translateOr("ko", key, english), key).not.toBe(english); // ko에서는 영문으로 되돌아오지 않는다
    }
  });
});
