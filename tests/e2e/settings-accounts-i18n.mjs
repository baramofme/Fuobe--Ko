// Owner /settings#accounts i18n gate (the app must be running; a passwordless dev instance is the install's owner).
// Usage: node tests/e2e/settings-accounts-i18n.mjs [appUrl]   (defaults to http://localhost:3026). Exits 1 on first failure.
//
// Proves the Accounts lane wired in t_98ee44ed renders byte-identical English, then switches to Korean in ONE render
// (no reload) — h2, blurb (plural), stat labels, table headers, buttons, row labels, off badge and the action
// aria-labels — leaking no English residue and raising no [i18n] warning.
import { DESKTOP, launch, openRoute } from "./_browser.mjs";

const app = (process.argv.slice(2).find((a) => !a.startsWith("--")) ?? "http://localhost:3026").replace(/\/$/, "");
const browser = await launch();
const problems = [];
const check = (name, ok, detail = "") => {
  console.log(`  ${ok ? "ok" : "FAIL"} ${name}${ok ? "" : ` → ${detail}`}`);
  if (!ok) problems.push(`${name}: ${detail}`);
};
const noise = [];

const EN = {
  h2: "Accounts",
  blurbHead: "3 people have signed up (Settings → Security → Public sign-up).",
  blurbBody: "Accounts never see your library or use your keys and GPU",
  cols: ["Email", "Runs", "Last run", "Space", "GPU", "Keys", "Created", "Last login"],
  stats: ["Runs in 24 hours", "Runs in 7 days", "Running now", "Files"],
  allRuns: "All accounts' runs",
  export: "Export CSV",
  off: "off",
};
const KO = {
  h2: "계정",
  blurbHead: "3명이 가입했습니다 (설정 → 보안 → 공개 가입).",
  blurbBody: "계정은 내 라이브러리를 보지",
  cols: ["이메일", "실행", "마지막 실행", "용량", "GPU", "키", "생성일", "마지막 로그인"],
  stats: ["24시간 내 실행", "7일간 실행", "현재 실행 중", "파일"],
  allRuns: "전체 계정 실행",
  export: "CSV 내보내기",
  off: "끔",
  connected: "연결됨",
  none: "없음",
  in7days: "최근 7일",
  failed: "실패",
  running: "실행 중",
};

// English residue we expect to be GONE after the switch. Brand names (fal.ai, Replicate) and "GPU" are the same
// in both languages by design, so they are excluded on purpose.
const EN_RESIDUE = [EN.h2, EN.blurbHead, EN.cols[0], EN.cols[2], EN.cols[3], EN.cols[5], EN.cols[6], EN.cols[7], EN.stats[0], EN.stats[1], EN.stats[2], EN.export, EN.allRuns, "in 7 days", "Connected", "None", EN.off];

const main = (p) => p.locator("main").first();
const section = (p) => p.locator("#accounts").first();
const h2Text = (p) => p.locator("#accounts-title").first().textContent();

console.log("- /settings#accounts (owner): English first (byte-identical)");
const page = await browser.newPage({ ...DESKTOP });
page.on("console", (m) => { if (m.type() === "warning" || m.type() === "error") noise.push(`console.${m.type()}: ${m.text()}`); });
page.on("pageerror", (e) => noise.push(`pageerror: ${e.message}`));
await openRoute(page, `${app}/settings`);
check("the page is /settings", page.url().endsWith("/settings"), page.url());
// The admin accounts query is async: wait for the Accounts section to appear before asserting.
await section(page).waitFor({ state: "visible", timeout: 15_000 }).catch(() => {});

check("the Accounts h2 reads its English bytes", (await h2Text(page))?.trim() === EN.h2, JSON.stringify(await h2Text(page)));
const blurb = (await main(page).locator("#accounts p").first().textContent().catch(() => "")) ?? "";
check("the blurb's signup plural reads its English bytes", blurb.includes(EN.blurbHead), blurb.slice(0, 160));
check("the blurb's static body reads its English bytes", blurb.includes(EN.blurbBody), blurb.slice(0, 160));
const cols = (await main(page).locator("thead th").allTextContents()).map((s) => s.trim());
check("the table headers read their English bytes", JSON.stringify(cols.slice(0, 8)) === JSON.stringify(EN.cols), JSON.stringify(cols));
for (const s of EN.stats) check(`the stat "${s}" reads its English bytes`, await main(page).getByText(s, { exact: true }).first().isVisible().catch(() => false), "");
check(`the All-runs button reads "${EN.allRuns}"`, await main(page).getByRole("link", { name: EN.allRuns, exact: true }).first().isVisible().catch(() => false), "");
check(`the Export button reads "${EN.export}"`, await main(page).getByRole("link", { name: EN.export, exact: true }).first().isVisible().catch(() => false), "");
check("a row reads \"in 7 days\"", await section(page).getByText("in 7 days", { exact: false }).first().isVisible().catch(() => false), "");
check("a row reads the \"failed\" label", await section(page).getByText("failed", { exact: false }).first().isVisible().catch(() => false), "");
check("a row reads the \"running\" label", await section(page).getByText("running", { exact: false }).first().isVisible().catch(() => false), "");
check("a row reads \"Connected\"", await section(page).getByText("Connected", { exact: false }).first().isVisible().catch(() => false), "");
check("a row reads \"None\"", await section(page).getByText("None", { exact: false }).first().isVisible().catch(() => false), "");
check("a disabled row reads the off badge \"off\"", await section(page).getByText(EN.off, { exact: true }).first().isVisible().catch(() => false), "");
check("a switch button has its English aria-label", await section(page).locator('[aria-label^="Switch "]').first().isVisible().catch(() => false), "");
check("a delete button has its English aria-label", await section(page).locator('[aria-label^="Delete "]').first().isVisible().catch(() => false), "");

console.log("- /settings#accounts: 한국어 in ONE render (no reload)");
await page.keyboard.press("Escape").catch(() => {});
await page.waitForTimeout(250);
const trigger = page.locator("button:has(svg.lucide-globe)").locator("visible=true").first();
await trigger.waitFor({ timeout: 15_000 });
await trigger.click();
await page.getByRole("menuitem", { name: "한국어" }).click();
await page.waitForTimeout(400);
check("still /settings — no reload happened", page.url().endsWith("/settings"), page.url());
check("<html lang> is ko right after the click", await page.evaluate(() => document.documentElement.lang) === "ko", "");

check("the Accounts h2 is Korean", (await h2Text(page))?.trim() === KO.h2, JSON.stringify(await h2Text(page)));
const blurbKo = (await main(page).locator("#accounts p").first().textContent().catch(() => "")) ?? "";
check("the blurb's signup plural is Korean", blurbKo.includes(KO.blurbHead), blurbKo.slice(0, 160));
check("the blurb's static body is Korean", blurbKo.includes(KO.blurbBody), blurbKo.slice(0, 160));
const colsKo = (await main(page).locator("thead th").allTextContents()).map((s) => s.trim());
check("the table headers are Korean", JSON.stringify(colsKo.slice(0, 8)) === JSON.stringify(KO.cols), JSON.stringify(colsKo));
for (const s of KO.stats) check(`the stat "${s}" is Korean`, await main(page).getByText(s, { exact: true }).first().isVisible().catch(() => false), "");
check(`the All-runs button is Korean "${KO.allRuns}"`, await main(page).getByRole("link", { name: KO.allRuns }).first().isVisible().catch(() => false), "");
check(`the Export button is Korean "${KO.export}"`, await main(page).getByRole("link", { name: KO.export }).first().isVisible().catch(() => false), "");
check("a row reads the Korean \"최근 7일\"", await section(page).getByText(KO.in7days, { exact: false }).first().isVisible().catch(() => false), "");
check("a row reads the Korean \"실패\"", await section(page).getByText(KO.failed, { exact: false }).first().isVisible().catch(() => false), "");
check("a row reads the Korean \"실행 중\"", await section(page).getByText(KO.running, { exact: false }).first().isVisible().catch(() => false), "");
check("a row reads the Korean \"연결됨\"", await section(page).getByText(KO.connected, { exact: false }).first().isVisible().catch(() => false), "");
check("a row reads the Korean \"없음\"", await section(page).getByText(KO.none, { exact: false }).first().isVisible().catch(() => false), "");
check("the off badge is Korean \"끔\"", await section(page).getByText(KO.off, { exact: true }).first().isVisible().catch(() => false), "");
check("a switch button has a Korean aria-label", await section(page).locator('[aria-label$=" 켜기"], [aria-label$=" 끄기"]').first().isVisible().catch(() => false), "");
check("a delete button has a Korean aria-label", await section(page).locator('[aria-label$=" 삭제"]').first().isVisible().catch(() => false), "");

for (const gone of EN_RESIDUE) {
  check(`no English “${gone}” left in the Accounts section after the switch`, !(await section(page).getByText(gone, { exact: false }).first().isVisible().catch(() => false)), "");
}
await page.close();

console.log("- nothing was missed (no missing-key warning, no page error)");
{
  const i18nNoise = noise.filter((l) => /\[i18n\]/.test(l));
  check("no missing-key warning", i18nNoise.length === 0, i18nNoise.join(" | "));
  const pageErrors = noise.filter((l) => /pageerror/.test(l));
  check("no page error", pageErrors.length === 0, pageErrors.join(" | "));
}

await browser.close();
if (problems.length) {
  console.log(`\n${problems.length} FAILED:\n` + problems.map((p) => `  ${p}`).join("\n"));
  process.exit(1);
}
console.log("\nsettings-accounts-i18n: all checks passed");
