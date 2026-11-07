/**
 * 오너 리센트 보드의 동적 문구 2종(`Edited {X} …`, `Never edited`)의 렌더 시점 해석 기계 판정(t_6b958c1a,
 * 결정문 t_945498cb §5 · 오케스트레이터 결정): en은 옛 합성 출력과 문자 단위 동일(바이트 보존), ko는
 * 100% 한국어(라틴·{X} 토큰·영문 리터럴 누수 0), 정적 문구는 menu.line.<keySnake>로 해석한다.
 *
 * 형제들이 mega-panel.tsx와 로케일 두 파일을 건드리는 핫스팟이라 테스트는 분리한다(NAME/countLine 관례).
 * 버킷 경계는 고정 시계(NOW)로 판정한다 — 실제 Date.now로 돌리면 경계에서 요행이 통과할 수 있다.
 */
import { describe, expect, it } from "vitest";
import { keySnake, locales, translateOr } from "@/lib/i18n/store";
import { timeAgo } from "@/lib/format";
import { editLineIn } from "@/components/nav/mega-canvas-owner";

const HANGUL = /[\uac00-\ud7a3]/;
const LATIN = /[A-Za-z]/;

/** 고정 시계: 버킷 경계 판정이 실제 시계와 무관하게 결정적으로 굴러가게. */
const NOW = 1_794_081_600_000;
const ago = (ms: number) => NOW - ms;

/** timeAgo의 모든 버킷을 한 번씩 지나는 표 — just now, 분, 시간, 일, 그리고 주 넘김(영문은 날짜로 나는 자리). */
const BUCKETS = [
  ago(10_000), // 10 s: just now
  ago(50_000), // 50 s: 1분/1m의 최소 버킷
  ago(5 * 60_000), // 5분
  ago(3 * 3_600_000), // 3시간
  ago(3 * 86_400_000), // 3일
  ago(20 * 86_400_000), // 20일: ko는 "수정한 지 20일", en은 날짜로 갈라지는 자리
];

describe("the owner's recent-board edit lines", () => {
  it("the decided keys sit exactly under the decided scheme", () => {
    // 키는 렌더된 영문 문장 그대로의 keySnake — 생성 스크립트가 쓰는 것과 같은 함수라 갈라질 수 없다.
    expect(`menu.line.${keySnake("Never edited")}`).toBe("menu.line.never_edited");
    expect(`menu.line.${keySnake("Edited just now")}`).toBe("menu.line.edited_just_now");
    expect(locales.en["menu.line.never_edited"]).toBe("Never edited");
    expect(locales.en["menu.line.edited_just_now"]).toBe("Edited just now");
    expect(locales.en["menu.countLine.edited"]).toBe("Edited {X}");
  });

  it("en resolves through these keys to exactly what the plain code printed, in every bucket", () => {
    // 옛 렌더는 `Edited ${timeAgo(b.editedAt)}` 리터럴 합성이었다. 키를 거쳐도 바이트가 같아야 한다.
    for (const ts of BUCKETS) {
      expect(editLineIn("en", ts, NOW), `ts=${ts}`).toBe(`Edited ${timeAgo(ts, NOW)}`);
    }
    expect(editLineIn("en", null, NOW)).toBe("Never edited");
  });

  it("ko reads its decided words in every bucket", () => {
    expect(editLineIn("ko", null, NOW)).toBe("수정한 적 없음");
    expect(editLineIn("ko", ago(10_000), NOW)).toBe("방금 수정");
    expect(editLineIn("ko", ago(50_000), NOW)).toBe("수정한 지 1분");
    expect(editLineIn("ko", ago(5 * 60_000), NOW)).toBe("수정한 지 5분");
    expect(editLineIn("ko", ago(3 * 3_600_000), NOW)).toBe("수정한 지 3시간");
    expect(editLineIn("ko", ago(3 * 86_400_000), NOW)).toBe("수정한 지 3일");
    expect(editLineIn("ko", ago(20 * 86_400_000), NOW)).toBe("수정한 지 20일");
  });

  it("ko never leaks Latin, a token, or the English literals", () => {
    for (const ts of BUCKETS) {
      const ko = editLineIn("ko", ts, NOW);
      expect(ko, `ts=${ts}`).not.toMatch(LATIN); // ko 100% 게이트: 라틴 문자 0
      expect(ko).not.toContain("{"); // {X}가 파라미터로 다 채워진다
      expect(ko).not.toBe(`Edited ${timeAgo(ts, NOW)}`); // 영어 리터럴 그대로면 누수다
      expect(ko).toMatch(HANGUL);
    }
    expect(editLineIn("ko", null, NOW)).not.toMatch(LATIN);
  });

  it("the ko values the generation scripts wrote are what renders, and differ from English", () => {
    expect(locales.ko["menu.line.never_edited"]).toBe("수정한 적 없음");
    expect(locales.ko["menu.line.edited_just_now"]).toBe("방금 수정");
    expect(locales.ko["menu.countLine.edited"]).toContain("{X}");
    for (const key of ["menu.line.never_edited", "menu.line.edited_just_now", "menu.countLine.edited"]) {
      expect(locales.ko[key], key).toBeTypeOf("string"); // i18n parity 게이트의 규칙을 이 네임스페이스에 재확인
      expect(locales.ko[key]).not.toBe(locales.en[key]);
      expect(locales.ko[key]).toMatch(HANGUL);
    }
  });

  it("byte identity survives the fallback path too", () => {
    // 키가 en.json에서 사라져도(생성 스크립트 회귀 상정) 합성 폴백이 옛 바이트를 그대로 찍는다 —
    // translateOr의 마지막 길이 곧 옛 코드와 동일 출력이므로 영문은 구성상 보존된다.
    const saved = locales.en["menu.countLine.edited"];
    delete locales.en["menu.countLine.edited"];
    try {
      expect(editLineIn("en", ago(5 * 60_000), NOW)).toBe("Edited 5m ago");
      expect(translateOr("ko", "menu.countLine.edited", "Edited 5m ago", { X: "5분" })).toBe("수정한 지 5분"); // ko 키는 살아 있다
    } finally {
      locales.en["menu.countLine.edited"] = saved;
    }
  });
});
