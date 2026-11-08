/**
 * 오너 컬럼(mega-canvas-owner.tsx)의 크롬 4자리의 렌더 시점 해석 기계 판정(t_c373d4a4).
 * 정적 3줄은 menu.line.<keySnake>로, 스킬 행의 label은 nav.canvas-skills로, 그 title은
 * menu.line.<keySnake(what)>로 해석한다 — en은 렌더된 영문 바이트 그대로(구성상 보존), ko는
 * 100% 한국어(라틴 누수 0). 보드 이름("Layouts")은 사용자 데이터라 번역 대상이 아니다(명시).
 *
 * 형제 카드들이 같은 로케일 두 파일과 mega-panel을 건드리는 핫스팟이라 테스트는 분리한다
 * (NAME/countLine 관례 — 선례 t_6b958c1a).
 */
import { describe, expect, it } from "vitest";
import { keySnake, locales, translateOr } from "@/lib/i18n/store";
import { menuLineKey } from "@/components/nav/mega-panel";
import { entry, labelKeyOf } from "@/lib/nav-model";

const HANGUL = /[\uac00-\ud7a3]/;
const LATIN = /[A-Za-z]/;

describe("the Canvas owner column's chrome strings", () => {
  it("the three static lines sit exactly under the generated key scheme", () => {
    // 키는 렌더된 영문 문장 그대로의 keySnake — 렌더 지점의 menuLineKey와 같은 함수라 갈라질 수 없다.
    expect(menuLineKey("New board")).toBe(`menu.line.${keySnake("New board")}`);
    for (const [line, key, koLine] of [
      ["New board", "menu.line.new_board", "새 보드"],
      ["Your recent boards", "menu.line.your_recent_boards", "최근 보드"],
      ["All your boards", "menu.line.all_your_boards", "모든 보드"],
    ] as const) {
      expect(menuLineKey(line)).toBe(key);
      expect(locales.en[key], key).toBe(line); // en 값은 렌더된 영문 그대로 — 폴백과 바이트 동일
      expect(locales.ko[key], key).toBe(koLine);
      expect(locales.ko[key]).toMatch(HANGUL);
      expect(locales.ko[key]).not.toBe(locales.en[key]);
    }
  });

  it("en resolves through the keys byte-identical to the plain literals", () => {
    expect(translateOr("en", menuLineKey("New board"), "New board")).toBe("New board");
    expect(translateOr("en", menuLineKey("Your recent boards"), "Your recent boards")).toBe("Your recent boards");
    expect(translateOr("en", menuLineKey("All your boards"), "All your boards")).toBe("All your boards");
  });

  it("ko reads the decided words with no Latin leak", () => {
    expect(translateOr("ko", menuLineKey("New board"), "New board")).toBe("새 보드");
    expect(translateOr("ko", menuLineKey("Your recent boards"), "Your recent boards")).toBe("최근 보드");
    expect(translateOr("ko", menuLineKey("All your boards"), "All your boards")).toBe("모든 보드");
    for (const ko of ["새 보드", "최근 보드", "모든 보드"]) {
      expect(ko).not.toMatch(LATIN);
      expect(ko).toMatch(HANGUL);
    }
  });

  it("the skills row resolves its label through the nav key that already exists", () => {
    // nav.canvas-skills의 ko 키는 이미 있었다("캔버스로 보는 스킬") — 렌더 지점만 배선했다(t_f5a5c82d의 NavEntry 경로).
    expect(labelKeyOf("canvas-skills")).toBe("nav.canvas-skills");
    expect(locales.en["nav.canvas-skills"]).toBe(entry("canvas-skills")!.label);
    expect(locales.ko["nav.canvas-skills"]).toBe("캔버스로 보는 스킬");
    expect(translateOr("ko", labelKeyOf("canvas-skills"), entry("canvas-skills")!.label)).toBe("캔버스로 보는 스킬");
    expect(translateOr("en", labelKeyOf("canvas-skills"), entry("canvas-skills")!.label)).toBe("Skills as canvases");
  });

  it("the skills row's title resolves through menu.line (the `what` is a feature() positional)", () => {
    // `Assist's skills, drawn as boards`는 feature()의 위치 인자라 `what:` 정규식이 놓친다 —
    // OWNER_STATIC로 수확했으므로 이 키가 양쪽에 존재한다.
    const what = entry("canvas-skills")!.what;
    const key = menuLineKey(what);
    expect(key).toBe("menu.line.assist_s_skills_drawn_as_boards");
    expect(locales.en[key]).toBe(what); // en은 그 값과 문자 단위 동일 — title도 바이트 보존
    expect(locales.ko[key]).toBe("어시스트의 스킬을 보드로");
    expect(locales.ko[key]).not.toMatch(LATIN);
    expect(translateOr("ko", key, what)).toBe("어시스트의 스킬을 보드로");
    expect(translateOr("en", key, what)).toBe(what);
  });

  it("byte identity survives the fallback path if a key is lost", () => {
    // 키가 en.json에서 사라져도(생성 스크립트 회귀 상정) translateOr의 마지막 길(폴백)은 옛 리터럴 그대로다.
    const saved = locales.en["menu.line.new_board"];
    delete locales.en["menu.line.new_board"];
    try {
      expect(translateOr("en", menuLineKey("New board"), "New board")).toBe("New board");
      expect(translateOr("ko", menuLineKey("New board"), "New board")).toBe("새 보드"); // ko 키는 살아 있다
    } finally {
      locales.en["menu.line.new_board"] = saved;
    }
  });
});
