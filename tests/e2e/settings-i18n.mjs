// Owner /settings i18n gate (the app must be running; the dev instance is the install's owner).
// Usage: node tests/e2e/settings-i18n.mjs [appUrl]   (defaults to http://localhost:3024). Exits 1 on first failure.
//
// Proves the slice wired in t_c249f7e4 renders byte-identical English and switches to Korean in ONE render (no
// reload), leaking no English. On an owner install the visible wired strings are the page's SettingsIntro line and
// the About section's AboutLinks (Thanks / Models / Source). The signup/account/GPU surfaces render only for guests
// and accounts, so they are not exercised here; their byte-identity is checked against the pre-wiring source.
import { DESKTOP, launch, openRoute } from "./_browser.mjs";

const app = (process.argv.slice(2).find((a) => !a.startsWith("--")) ?? "http://localhost:3024").replace(/\/$/, "");
const browser = await launch();
const problems = [];
const check = (name, ok, detail = "") => {
  console.log(`  ${ok ? "ok" : "FAIL"} ${name}${ok ? "" : ` → ${detail}`}`);
  if (!ok) problems.push(`${name}: ${detail}`);
};
const noise = [];

const EN = {
  introOwner: "Choose open source, paid APIs or both, connect providers, point Fuobe at your ComfyUI server, and choose how prompts get enhanced. Keys stay on this server.",
  thanks: "Thanks & licences",
  models: "Models & licences",
  source: "Source on GitHub",
};
const KO = {
  introOwner: "오픈소스, 유료 API 또는 둘 다 선택하고, 제공업체를 연결하고, ComfyUI 서버로 Fuobe를 지정하고, 프롬프트가 강화되는 방식을 선택하세요. 키는 이 서버에 머무릅니다.",
  thanks: "감사 & 라이선스",
  models: "모델 & 라이선스",
  source: "GitHub 소스",
};

const main = (p) => p.locator("main").first();

console.log("- /settings (owner): English first (byte-identical)");
{
  const page = await browser.newPage({ ...DESKTOP });
  page.on("console", (m) => { if (m.type() === "warning" || m.type() === "error") noise.push(`console.${m.type()}: ${m.text()}`); });
  page.on("pageerror", (e) => noise.push(`pageerror: ${e.message}`));
  await openRoute(page, `${app}/settings`);
  check("the page is /settings", page.url().endsWith("/settings"), page.url());

  check(`the owner intro reads its English bytes`, await main(page).getByText(EN.introOwner, { exact: true }).first().isVisible().catch(() => false), "");
  check(`the Thanks link reads "${EN.thanks}"`, await main(page).getByRole("link", { name: EN.thanks, exact: true }).first().isVisible().catch(() => false), "");
  check(`the Models link reads "${EN.models}"`, await main(page).getByRole("link", { name: EN.models, exact: true }).first().isVisible().catch(() => false), "");
  check(`the Source link reads "${EN.source}"`, await main(page).getByRole("link", { name: EN.source, exact: true }).first().isVisible().catch(() => false), "");
  check("the intro is not Korean yet", !(await main(page).getByText(KO.introOwner).first().isVisible().catch(() => false)), "");

  console.log("- /settings (owner): 한국어 in ONE render (no reload)");
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(250);
  const trigger = page.locator("button:has(svg.lucide-globe)").locator("visible=true").first();
  await trigger.waitFor({ timeout: 15_000 });
  await trigger.click();
  await page.getByRole("menuitem", { name: "한국어" }).click();
  await page.waitForTimeout(300);
  check("still /settings — no reload happened", page.url().endsWith("/settings"), page.url());
  check("<html lang> is ko right after the click", await page.evaluate(() => document.documentElement.lang) === "ko", "");

  check(`the owner intro is Korean`, await main(page).getByText(KO.introOwner, { exact: true }).first().isVisible().catch(() => false), "");
  check(`the Thanks link is Korean "${KO.thanks}"`, await main(page).getByRole("link", { name: KO.thanks }).first().isVisible().catch(() => false), "");
  check(`the Models link is Korean "${KO.models}"`, await main(page).getByRole("link", { name: KO.models }).first().isVisible().catch(() => false), "");
  check(`the Source link is Korean "${KO.source}"`, await main(page).getByRole("link", { name: KO.source }).first().isVisible().catch(() => false), "");
  // "Models & licences" appears twice: AboutLinks (wired here) and settings-form's About section (lane D, still
  // English until lane D is wired). So only its Korean AboutLinks copy is checked; the English duplicate is lane D's.
  for (const gone of [EN.introOwner, EN.thanks, EN.source]) {
    check(`no English “${gone}” left after the switch`, !(await main(page).getByText(gone, { exact: true }).first().isVisible().catch(() => false)), "");
  }
  await page.close();
}

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
console.log("\nsettings-i18n: all checks passed");
