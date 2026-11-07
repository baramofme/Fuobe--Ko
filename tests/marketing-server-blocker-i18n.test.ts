/**
 * 서버가 방출하는 실행 차단 키(run blocker key)를 클라이언트가 해석하는 계약(Option A, t_41c3ee86).
 *
 * 서버는 marketing.ts의 PlanError.message와 brand.ts의 Error.message에 안정 식별자를 싣고,
 * 클라이언트는 marketing-studio.tsx의 `est.data?.blocker` 슬롯과 공유 toastError 한 곳에서
 * resolveServerBlocker로 해석한다. 이 파일은 그 헬퍼(단일 소스)를 직접 판정한다 — e2e가
 * "서버 유래 차단이 en→ko 전환 시 토스트에서 한글로 해석된다"를 실측하기 전, 같은 동작을
 * 노드에서 결정적으로 고정하는 레인 테스트다(카드 권장 신규 레인).
 *
 * en은 배선 전 원 리터럴과 문자 단위 동일해야 e2e의 영어 선택기가 초록으로 남는다. ko는 전량
 * 한글에 en 사본이 0. 매칭되지 않는 원문(아직 키가 아닌 문구)은 그대로 지나간다 — 역호환.
 * 원문은 t()를 부르지 않으므로 missing-key 경고도 0.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

const HANGUL = /[\uac00-\ud7a3]/;

/** A browser for the node tests: a localStorage jar, a cookie document, a window for storage events. */
function fakeBrowser(initial: Record<string, string> = {}) {
  const jar = new Map<string, string>(Object.entries(initial));
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => jar.get(k) ?? null,
    setItem: (k: string, v: string) => void jar.set(k, v),
    removeItem: (k: string) => void jar.delete(k),
    clear: () => jar.clear(),
  });
  vi.stubGlobal("document", { cookie: "" });
  vi.stubGlobal("window", { addEventListener: () => {}, removeEventListener: () => {} });
  return jar;
}

afterEach(async () => {
  vi.unstubAllGlobals();
  // Put the choice back to English for the tests that follow, so a switch never leaks forward.
  (await import("@/lib/i18n/store")).switchLanguage("en");
});

describe("the server's blocker keys read in the language on screen", () => {
  it("under English, every key resolves to the words the blocker printed before Option A", async () => {
    const { resolveServerBlocker } = await import("@/lib/i18n/store");
    // The e2e's English selectors are bound to these exact bytes; the client's resolve must keep them.
    expect(resolveServerBlocker("attachProduct")).toBe("Attach a product to generate");
    expect(resolveServerBlocker("badUrl")).toBe("Enter a valid website URL");
    expect(resolveServerBlocker("noProductImages")).toBe("This product has no images yet");
  });

  it("the same key, switched to Korean, reads in Korean with no English left — the toast the e2e checks", async () => {
    fakeBrowser();
    const store = await import("@/lib/i18n/store");
    // The English state, as the page first shows it.
    const en = store.resolveServerBlocker("attachProduct");
    expect(en).toBe("Attach a product to generate");
    store.switchLanguage("ko"); // one click, no reload — the same tick the studio re-renders on
    const ko = store.resolveServerBlocker("attachProduct");
    expect(ko).toBe("생성하려면 제품을 첨부해 주세요");
    expect(HANGUL.test(ko)).toBe(true);
    expect(/Attach a product/i.test(ko)).toBe(false);
  });

  it("every blocker key has Korean words under the switch, none a copy of English", async () => {
    fakeBrowser();
    const store = await import("@/lib/i18n/store");
    store.switchLanguage("ko");
    const keys = ["attachProduct", "badUrl", "noProductImages", "unavailable"];
    for (const k of keys) {
      const resolved = store.resolveServerBlocker(k);
      expect(HANGUL.test(resolved), `ko ${k} reads Korean`).toBe(true);
      // It resolved (came back different), it isn't the raw key, and it isn't the English value.
      expect(resolved).not.toBe(k);
      expect(resolved).not.toBe(store.locales.en[`marketing.blocker.${k}`]);
    }
  });

  it("a blocker the server still says as plain English passes through, unchanged and un-warned", async () => {
    const { resolveServerBlocker } = await import("@/lib/i18n/store");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    // Real messages the plan throws that are not (yet) keys — Option A must not touch them.
    const plain = [
      "That template belongs to another format",
      "Attach reference or product",
      "Video duration: 4-30 seconds",
    ];
    for (const raw of plain) expect(resolveServerBlocker(raw)).toBe(raw);
    // An invented identifier nobody has words for yet reads exactly as the server sent it.
    expect(resolveServerBlocker("someUnknownKey")).toBe("someUnknownKey");
    expect(warn).not.toHaveBeenCalled(); // a non-key never calls t(), so no missing-key note
    warn.mockRestore();
  });

  it("nothing to show is empty, not a leaked key", async () => {
    const { resolveServerBlocker } = await import("@/lib/i18n/store");
    expect(resolveServerBlocker(undefined)).toBe("");
    expect(resolveServerBlocker("")).toBe("");
  });
});
