// 오너 리센트 보드의 편집 줄 2종에 대한 실브라우저 게이트 (t_6b958c1a).
// Usage: node tests/e2e/owner-edit-lines.mjs [appUrl]   (default http://localhost:3020)
//
// The Canvas launcher's owner column lists the four most recent boards; under each name sits the edit line —
// `Edited {X}` for a board that was edited, `Never edited` for one that wasn't. This gate reads those lines in
// the live :3020 Canvas menu and checks, per row against the board's own timestamp:
//   1. English shows exactly the bytes the plain code printed (`Edited ` + timeAgo, or `Never edited`).
//   2. 한국어 in one click, no reload: every edit line reads its decided Korean words — Hangul only, no Latin,
//      no braces, no English literal.
//   3. English back: the round trip lands byte-identical on the first English capture.
//   4. No "[i18n]" miss and no page error on the way.
// The dev server signs every new context as the owner, so the owner column is what opens.
import { DESKTOP, launch, openRoute } from "./_browser.mjs";

const app = (
  process.argv.slice(2).find((a) => !a.startsWith("--")) ??
  "http://localhost:3020"
).replace(/\/$/, "");

const browser = await launch();
const problems = [];
const step = (name) => console.log(`- ${name}`);
const check = (name, ok, detail = "") => {
  console.log(`  ${ok ? "ok" : "FAIL"} ${name}${ok ? "" : ` → ${detail}`}`);
  if (!ok) problems.push(`${name}: ${detail}`);
};

/** timeAgo를 src/lib/format.ts에서 그대로 옮긴 것 — 기대값은 "옛 합성 출력"이므로 같은 함수로 찍는다. */
function timeAgo(ts, now = Date.now()) {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** editOrdinal의 ko 경로와 같은 버킷 체인 — 줄임·반올림 순서가 같아야 기대 문자열이 일치한다. */
function koOrdinal(ts, now) {
  const m = Math.round(Math.max(0, Math.round((now - ts) / 1000)) / 60);
  if (m < 60) return `${m}분`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}시간`;
  return `${Math.round(h / 24)}일`;
}

/** 편집 줄만 골라담는 선별식 — 리센트 보드의 두 줄 형태(영문/한글)를 전부 잡고 프리셋 줄은 놓친다. */
const EDIT_SHAPE = /^(Edited |Never edited$|수정한 지 |수정한 적 없음$|방금 수정$)/;

// Console noise: "[i18n]" warnings are the misses we promise not to make.
const noise = [];
function listen(page, tag) {
  page.on("console", (m) => {
    if (m.type() === "warning" || m.type() === "error") noise.push(`${tag} console.${m.type()}: ${m.text()}`);
  });
  page.on("pageerror", (e) => noise.push(`${tag} pageerror: ${e.message}`));
}

/** 휴지로 포인터를 얹어 Canvas 런처를 연다(클릭은 호버가 안 될 때의 대신). 편집 줄이 뜰 때까지 기다린다. */
async function openCanvas(p) {
  await p.keyboard.press("Escape").catch(() => {});
  await p.waitForTimeout(200);
  const trigger = p.locator('[data-top-bar] [data-bar-menu="canvas"]').locator("visible=true").first();
  await trigger.waitFor({ state: "visible", timeout: 15_000 });
  await trigger.hover();
  let opened = await p.locator("#canvas-launcher").first().waitFor({ state: "visible", timeout: 6_000 }).then(() => true, () => false);
  if (!opened) {
    await trigger.click();
    await p.locator("#canvas-launcher").first().waitFor({ state: "visible", timeout: 6_000 });
  }
  await p
    .waitForFunction(() => {
      const el = document.querySelector("#canvas-launcher");
      if (!el) return false;
      const rows = [...el.querySelectorAll("a span.truncate.text-muted-foreground")].map((x) => x.textContent.trim()).filter(Boolean);
      return rows.some((r) => /^(Edited |Never edited$|수정한 |방금 수정$)/.test(r));
    }, null, { timeout: 12_000 })
    .catch(() => {});
  await p.waitForTimeout(300);
}

/** 패널의 편집 줄과 브라우저 시계를 한 번의 evaluate로 읽는다 — 노드 시계와 띄운 시간을 기대값 계산에 쓴다. */
async function readEditLines(p) {
  return p.evaluate(() => {
    const el = document.querySelector("#canvas-launcher");
    if (!el) return null;
    const rows = [...el.querySelectorAll("a span.truncate.text-muted-foreground")].map((x) => x.textContent.trim()).filter(Boolean);
    return { lines: rows.filter((r) => /^(Edited |Never edited$|수정한 지 |수정한 적 없음$|방금 수정$)/.test(r)), now: Date.now() };
  });
}

/** 이 브라우저 세션(자동오너 서명)으로 오너의 보드를 읽는다 — 컴포넌트의 정렬과 같은 식, 같은 절단. */
async function recentBoards(p) {
  const res = await p.request.get(`${app}/api/canvases`);
  const body = await res.json();
  return body.items
    .map((b) => ({ id: b.id, name: b.name, editedAt: b.editedAt, updatedAt: b.updatedAt }))
    .sort((a, b) => (b.editedAt ?? b.updatedAt) - (a.editedAt ?? a.updatedAt))
    .slice(0, 4);
}

/** 헤더의 언어 선택기(지구 아이콘 달린 유일한 버튼)로 한 언어를 고른다. */
async function pickLanguage(page, name) {
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(250);
  const trigger = page.locator('button:has(svg.lucide-globe)').locator("visible=true").first();
  await trigger.waitFor({ timeout: 15_000 });
  await trigger.click();
  await page.getByRole("menuitem").first().waitFor({ timeout: 8_000 });
  await page.getByRole("menuitem", { name }).click();
  await page.waitForTimeout(300);
}

step("the Canvas launcher opens with the owner's recent boards");
const page = await browser.newPage({ ...DESKTOP });
listen(page, "owner-lines");
await openRoute(page, `${app}/`);
await openCanvas(page);

let boards = await recentBoards(page);
step("a board that was never edited is listed (creates one if the four hold none)");
let createdId = null;
if (!boards.some((b) => b.editedAt == null)) {
  const made = await page.request.post(`${app}/api/canvases`, { data: "{}" });
  const body = await made.json().catch(() => null);
  createdId = body?.id ?? null;
  check("a never-edited board could be made", !!createdId, JSON.stringify(body === null ? made.status() : { id: createdId }));
  boards = await recentBoards(page);
  await openCanvas(page); // 다시 얹어 새 보드가 첫 줄로 뜨게 한다(쿼리는 패널이 열릴 때마다 다시 읽는다).
}

step("English reads the plain bytes, per row");
const first = await readEditLines(page);
check("the launcher's edit lines are there", !!first && first.lines.length > 0, JSON.stringify(first === null ? null : first.lines));
check("every recent board shows one edit line", !!first && first.lines.length === boards.length, `${first?.lines.length} lines vs ${boards.length} boards`);
if (first) {
  boards.forEach((b, i) => {
    const want = b.editedAt == null ? "Never edited" : `Edited ${timeAgo(b.editedAt, first.now)}`;
    check(`row ${i + 1} reads its plain bytes`, first.lines[i] === want, `got ${JSON.stringify(first.lines[i])} want ${JSON.stringify(want)}`);
  });
}

step("한국어 in one click, with no reload");
await pickLanguage(page, "한국어");
check("still the same page (no reload happened)", page.url().endsWith("/"), page.url());
await openCanvas(page);
const ko = await readEditLines(page);
check("the same number of edit lines renders in Korean", !!ko && ko.lines.length === boards.length, `${ko?.lines.length} vs ${boards.length}`);
if (ko) {
  check("no English edit line survived the switch", !ko.lines.some((l) => /^(Edited |Never edited)/.test(l)), JSON.stringify(ko.lines));
  ko.lines.forEach((l, i) => {
    const b = boards[i];
    check(`ko row ${i + 1} is pure Hangul`, /[가-힯]/.test(l) && !/[A-Za-z{]/.test(l), JSON.stringify(l));
    const want = b.editedAt == null ? "수정한 적 없음" : ko.now - b.editedAt < 45_000 ? "방금 수정" : `수정한 지 ${koOrdinal(b.editedAt, ko.now)}`;
    check(`ko row ${i + 1} reads its decided words`, l === want, `got ${JSON.stringify(l)} want ${JSON.stringify(want)}`);
  });
}

step("English back: the round trip is byte-identical");
await pickLanguage(page, "English");
await openCanvas(page);
const back = await readEditLines(page);
check("EN→ko→EN lands on the first English bytes", !!back && JSON.stringify(back.lines) === JSON.stringify(first?.lines), `back=${JSON.stringify(back?.lines)} first=${JSON.stringify(first?.lines)}`);

step("nothing was missed on the way");
{
  const i18nNoise = noise.filter((l) => /\[i18n\]/.test(l));
  check("no missing-key warning", i18nNoise.length === 0, i18nNoise.join(" | "));
  const pageErrors = noise.filter((l) => /pageerror/.test(l));
  check("no page error", pageErrors.length === 0, pageErrors.join(" | "));
}

// 게이트가 만든 보드는 게이트가 치운다(개발 데이터 정리). 처음부터 있던 editedAt-null 보드는 손대지 않는다.
if (createdId) {
  const gone = await page.request.delete(`${app}/api/canvases/${createdId}`);
  check("the created board was cleaned up", gone.ok(), `status=${gone.status()}`);
}
await page.close();
await browser.close();
if (problems.length) {
  console.log(`\n${problems.length} FAILED:\n` + problems.map((p) => `  ${p}`).join("\n"));
  process.exit(1);
}
console.log("\nowner-edit-lines: all checks passed");
