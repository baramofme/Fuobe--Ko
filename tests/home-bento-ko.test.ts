// Renders HomeBento with lang="ko" and checks that no English words remain in visible text.
// Run: vitest run tests/home-bento-ko.test.ts --no-coverage
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ cacheLife: () => {} }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ prefetch: () => {}, push: () => {}, replace: () => {}, back: () => {}, refresh: () => {} }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

const { homeShowcase } = await import("@/lib/home-showcase");
const { HomeBento } = await import("@/components/home/home-bento");

const home = await homeShowcase();
const bento = home.bento;
const htmlKo = renderToStaticMarkup(
  createElement(QueryClientProvider, { client: new QueryClient() }, createElement(HomeBento, { bento, lang: "ko" })),
);

/** Extract the <section id="home-bento"> block and strip all tags to get visible text. */
function sectionText(html: string): string {
  const m = /<section id="home-bento"[^>]*>([\s\S]*?)<\/section>/.exec(html);
  if (!m) throw new Error("home-bento section not found");
  return m[1]
    .replace(/<script[\s\S]*?<\/script>/g, "")
    .replace(/<style[\s\S]*?<\/style>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/** English words that must not appear (brand names, technical terms, and structural labels are allowed). */
const ALLOWED_EN_TERMS = new Set(["ComfyUI", "RTX", "5090", "Genjutsu", "Canvas", "Open", "Video", "Image", "3D"]);

const text = sectionText(htmlKo);

describe("HomeBento lang=ko: Korean rendering", () => {
  it("contains Korean headings", () => {
    expect(text).toContain("무엇이든:");
    expect(text).toContain("아이디어에서");
    expect(text).toContain("완성된");
    expect(text).toContain("한 곳에서");
  });

  it("contains Korean aside", () => {
    expect(text).toContain("각 타일에서 해당 스튜디오를 열 수 있습니다");
  });

  it("contains Korean tile titles", () => {
    expect(text).toContain("영화, 광고, 숏폼");
    expect(text).toContain("인물 사진과 캠페인");
    expect(text).toContain("깨끗한 음성");
    expect(text).toContain("3D로 돌려보기");
    expect(text).toContain("클립 속 인물 교체");
    expect(text).toContain("타이핑하면 바로 반영");
    expect(text).toContain("모든 단계를 처음부터 끝까지");
    // (The numbers tile shows only its figures and its line: its title lives in the link's name, not in visible text.)
  });

  it("contains Korean CTAs", () => {
    expect(text).toContain("시네마 스튜디오 열기");
    expect(text).toContain("이미지 열기");
    expect(text).toContain("음성 정리 열기");
    expect(text).toContain("이미지→3D 열기");
    expect(text).toContain("Genjutsu 열기");
    expect(text).toContain("라이브 편집 열기");
    expect(text).toContain("캔버스 열기");
    expect(text).toContain("모든 스튜디오");
  });

  it("contains Korean number labels", () => {
    expect(text).toContain("스튜디오");
    expect(text).toContain("앱");
    expect(text).toContain("효과 & 모션");
  });

  it("contains Korean canvas board labels", () => {
    expect(text).toContain("당신의 사진");
    expect(text).toContain("장면 잡기");
    expect(text).toContain("진주 귀걸이");
    expect(text).toContain("당신의 영상");
  });

  it("types the live tile's phrases in Korean (the demo script's own words, keyed by their snake)", () => {
    // The SSR snapshot holds the first phrase whole; the rest type in once the tile plays (proved in the browser gate).
    expect(text).toContain("저녁 메이크업, 진한 빨강 입술");
    for (const gone of ["evening makeup", "side-swept waves", "hoop earrings"])
      expect(text.toLowerCase()).not.toContain(gone);
  });

  it("contains Korean wipe labels", () => {
    expect(text).toContain("원본");
    expect(text).toContain("교체");
  });

  it("contains Korean voice labels (client strings resolve to en during SSR, check via locale store)", () => {
    // Voice strings use useI18n() which returns DEFAULT_LANG during SSR.
    // The tile strings from server-resolved props are Korean (server render).
    // Verify the audio tile's resolved meta/title/cta are Korean:
    expect(text).toContain("오디오 · 사운드 도구");
    expect(text).toContain("깨끗한 음성");
    expect(text).toContain("음성 정리 열기");
  });

  it("English words remaining are only allowed brand/technical terms (voice labels are English during SSR, Korean after hydration)", () => {
    // Extract ASCII word tokens from the section text ("3D" leaves a lone "D", so take it out first).
    const words = text.replace(/3D/g, " ").match(/[A-Za-z][A-Za-z0-9'’\-]*/g) ?? [];
    // Voice labels are English during SSR by design — they appear Korean after hydration.
    // These are expected English words in the SSR snapshot.
    const SSR_CLIENT_VOICE_WORDS = new Set([
      "Tap", "to", "listen", "Loading", "Pause", "Resume", "Play", "again", "Try",
      "Noise", "on", "off", "Voice", "only", "Noisy", "restaurant",
      "Clean", "up", "voice", "a", "woman", "talking", "in", "noisy", "restaurant",
      // The Pause-previews button is a client island too: it reads English until hydration picks the language.
      "previews",
    ]);
    const unexpected = words.filter(
      (w) => !ALLOWED_EN_TERMS.has(w) && !SSR_CLIENT_VOICE_WORDS.has(w) && !SSR_CLIENT_VOICE_WORDS.has(w.toLowerCase()),
    );
    console.log("Unexpected English words:", [...new Set(unexpected)]);
    expect(unexpected.length, `Unexpected: ${JSON.stringify([...new Set(unexpected)])}`).toBe(0);
  });
});
