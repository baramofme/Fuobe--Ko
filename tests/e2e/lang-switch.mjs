// Language-switch checks in a real browser (the app must be running; demo mode is fine).
// Usage: node tests/e2e/lang-switch.mjs [appUrl]   (pnpm test:e2e:lang-switch). Exits 1 on the first failure.
//
// The header's language selector wired to the words: picking "한국어" re-renders the bar's visible text (and its
// accessible names) in Korean in one render — no reload, no console noise; picking "English" gives the English words
// back; the choice survives a reload (localStorage `fuobe.lang` and the `fuobe_lang` cookie), and <html lang> follows.
// The phone's own chrome (its bar and tabs) switches the same way.
//
// 1. English by default: the bar shows the English words, <html lang="en">.
// 2. 한국어 one click away: every bar word and its accessible name is Korean right after the click (the same commit).
// 3. The search element translates too (its words and its dialog name), and so does the palette's static chrome.
// 4. English back.
// 5. A reload keeps Korean (the saved choice), with the cookie mirrored for the server's next render.
// 6. No "[i18n]" warning and no page error during all of it.
// 7. A phone: its header's search button and its five tabs switch with the same selector.
import { DESKTOP, PHONE, launch, openRoute } from "./_browser.mjs";

const app = (
  process.argv.slice(2).find((a) => !a.startsWith("--")) ??
  "http://localhost:3000"
).replace(/\/$/, "");

const browser = await launch();
const step = (name) => console.log(`- ${name}`);
const problems = [];
const check = (name, ok, detail = "") => {
  console.log(`  ${ok ? "ok" : "FAIL"} ${name}${ok ? "" : ` → ${detail}`}`);
  if (!ok) problems.push(`${name}: ${detail}`);
};

/** The words of the bar, read as one snapshot: what a person sees, plus the names a screen reader gets. */
async function barWords(page) {
  return page.evaluate(() => {
    const bar = document.querySelector("[data-top-bar]");
    if (!bar) return null;
    const text = (el) => (el ? el.textContent.trim() : null);
    const nav = bar.querySelector("nav");
    const search = bar.querySelector('button[aria-keyshortcuts="/ Meta+K Control+K"]');
    const leaf = (s) => s.children.length === 0 && !!s.textContent.trim() && getComputedStyle(s).display !== "none";
    const visibleWord = (el) => (el ? [...el.querySelectorAll("span")].filter(leaf).map((s) => s.textContent.trim())[0] ?? null : null);
    const creation = bar.querySelector('a[href="/?new"]') ?? bar.querySelector('a[href*="new"]');
    const items = [...bar.querySelectorAll('[data-bar-item], a[data-bar-item]')].map((el) => ({
      text: text(el),
      aria: el.getAttribute("aria-label"),
    }));
    return {
      wordmarkAria: bar.querySelector('a[aria-label]')?.getAttribute("aria-label") ?? null,
      navAria: nav?.getAttribute("aria-label") ?? null,
      searchWords: visibleWord(search),
      creationWords: visibleWord(creation),
      items,
      lang: document.documentElement.lang,
      stored: (() => {
        try {
          return localStorage.getItem("fuobe.lang");
        } catch {
          return null;
        }
      })(),
      cookie: /(?:^|;\s*)fuobe_lang=([^;]*)/.exec(document.cookie)?.[1] ?? null,
    };
  });
}

// The header's own selector: the only button with a globe in it, whichever bar this viewport shows.
// A leftover open menu or dialog would make the trigger toggle it shut instead of open, so clear the way first.
async function openSelector(page) {
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(250);
  const trigger = page.locator('button:has(svg.lucide-globe)').locator("visible=true").first();
  await trigger.waitFor({ timeout: 15_000 });
  await trigger.click();
  await page.getByRole("menuitem").first().waitFor({ timeout: 8_000 });
  return page;
}

const EN = {
  homeAria: "Fuobe home",
  main: "Main",
  assist: "Assist",
  library: "Library",
  create: "Create",
  studios: "Studios",
  apps: "Apps",
  motions: "Motions & effects",
  canvas: "Canvas",
  search: "Search Fuobe",
  newCreation: "New creation",
};
const KO = {
  homeAria: "Fuobe 홈",
  main: "메인 내비게이션",
  assist: "어시스트",
  library: "라이브러리",
  create: "만들기",
  studios: "스튜디오",
  apps: "앱",
  motions: "모션 & 효과",
  canvas: "캔버스",
  search: "Fuobe에서 검색",
  newCreation: "새 작업",
};

// Console noise: what the page says while we switch. "[i18n]" warnings are the misses we promise not to make.
const noise = [];
function listen(page, tag) {
  page.on("console", (msg) => {
    if (msg.type() === "warning" || msg.type() === "error") noise.push(`${tag} console.${msg.type()}: ${msg.text()}`);
  });
  page.on("pageerror", (e) => noise.push(`${tag} pageerror: ${e.message}`));
}

step("desktop: English by default");
{
  const page = await browser.newPage({ ...DESKTOP });
  listen(page, "desktop");
  await openRoute(page, `${app}/`);
  const words = await barWords(page);
  check("the bar renders", !!words, JSON.stringify(words === null));
  check('<html lang="en"> at first paint', words.lang === "en", `lang=${words.lang}`);
  check("nothing saved yet", words.stored === null && words.cookie === null, `stored=${words.stored} cookie=${words.cookie}`);
  const texts = words.items.map((i) => i.text).filter(Boolean);
  for (const want of [EN.library]) check(`shows “${want}”`, texts.includes(want), JSON.stringify(texts));
  check(`wordmark name “${EN.homeAria}”`, words.wordmarkAria === EN.homeAria, `aria=${words.wordmarkAria}`);
  check(`nav name “${EN.main}”`, words.navAria === EN.main, `aria=${words.navAria}`);
  check(`search words “${EN.search}”`, words.searchWords === EN.search, `words=${words.searchWords}`);
  check(`New creation “${EN.newCreation}”`, words.creationWords === EN.newCreation, `words=${words.creationWords}`);

  step("desktop: 한국어 in one render");
  {
    const menu = await openSelector(page);
    await menu.getByRole("menuitem", { name: "한국어" }).click();
    // The same commit: read straight away, with no settling wait, so a reload could not be the reason it changed.
    const after = await page.evaluate(() => {
      const bar = document.querySelector("[data-top-bar]");
      const nav = bar?.querySelector("nav");
      const search = bar?.querySelector('button[aria-keyshortcuts="/ Meta+K Control+K"]');
      const leaf = (s) => s.children.length === 0 && !!s.textContent.trim() && getComputedStyle(s).display !== "none";
      const visibleWord = (el) => (el ? [...el.querySelectorAll("span")].filter(leaf).map((s) => s.textContent.trim())[0] ?? null : null);
      return {
        lang: document.documentElement.lang,
        navAria: nav?.getAttribute("aria-label") ?? null,
        searchWords: visibleWord(search),
        itemTexts: [...bar.querySelectorAll("[data-bar-item]")].map((el) => el.textContent.trim()),
        itemArias: [...bar.querySelectorAll("[data-bar-item]")].map((el) => el.getAttribute("aria-label")),
        wordmarkAria: bar.querySelector("nav a[aria-label]")?.getAttribute("aria-label"),
      };
    });
    check("the bar still shows one page (no reload happened)", page.url().endsWith("/"), page.url());
    check('<html lang="ko" right after the click', after.lang === "ko", `lang=${after.lang}`);
    check(`nav name “${KO.main}”`, after.navAria === KO.main, `aria=${after.navAria}`);
    check(`search words “${KO.search}”`, after.searchWords === KO.search, `words=${after.searchWords}`);
    check("the bar's words are Korean", after.itemTexts.every((t) => !t || t === "Fuobe" || /[가-힯]/.test(t)), JSON.stringify(after.itemTexts));
    for (const want of [KO.library, KO.assist, KO.studios, KO.apps, KO.motions, KO.canvas])
      check(`a bar item reads “${want}”`, after.itemTexts.includes(want), JSON.stringify(after.itemTexts));
    check(`wordmark name “${KO.homeAria}”`, after.wordmarkAria === KO.homeAria, `aria=${after.wordmarkAria}`);

    step("desktop: the search element speaks Korean");
    {
      // The language menu's own content holds "/" until it leaves the DOM (slashOpens ignores a menu); let it go.
      await page.keyboard.press("Escape");
      await page.waitForTimeout(600);
      await page.keyboard.press("/");
      const dialog = page.getByRole("dialog", { name: KO.search });
      await dialog.waitFor({ timeout: 15_000 });
      check("the palette opens under its Korean name", true, "");
      const field = dialog.getByRole("combobox").first();
      const ph = await field.getAttribute("placeholder");
      check("the field's placeholder is Korean", ph === "무엇을 만들고 싶으신가요?", `placeholder=${ph}`);
      const hint = await dialog.locator("div.border-t >> text=열기").first().textContent().catch(() => null);
      check("the hint bar reads 열기/닫기", !!hint && /열기/.test(hint), `hint=${hint}`);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
    }

    step("desktop: English back");
    {
      const menu = await openSelector(page);
      await menu.getByRole("menuitem", { name: "English" }).click();
      const back = await barWords(page);
      check('<html lang="en" again', back.lang === "en", `lang=${back.lang}`);
      check(`nav name “${EN.main}” again`, back.navAria === EN.main, `aria=${back.navAria}`);
      check(`search words “${EN.search}” again`, back.searchWords === EN.search, `words=${back.searchWords}`);
      check(`the bar's words are English again`, back.items.map((i) => i.text).includes(EN.library), JSON.stringify(back.items.map((i) => i.text)));
    }

    step("desktop: a reload keeps the choice");
    {
      const menu = await openSelector(page);
      await menu.getByRole("menuitem", { name: "한국어" }).click();
      await page.waitForTimeout(200);
      const saved = await page.evaluate(() => ({ stored: localStorage.getItem("fuobe.lang"), cookie: /fuobe_lang=([^;]*)/.exec(document.cookie)?.[1] }));
      check("saved to localStorage", saved.stored === "ko", `stored=${saved.stored}`);
      check("mirrored to the cookie", saved.cookie === "ko", `cookie=${saved.cookie}`);
      await page.reload({ waitUntil: "load" });
      await page.locator("h1").first().waitFor({ timeout: 15_000 }).catch(() => {});
      await page.waitForTimeout(1_200);
      const afterReload = await barWords(page);
      check("Korean after the reload", afterReload.items.map((i) => i.text).includes(KO.library), JSON.stringify(afterReload.items.map((i) => i.text)));
      check("<html lang> is ko after the reload", afterReload.lang === "ko", `lang=${afterReload.lang}`);
      check("the choice is still saved", afterReload.stored === "ko", `stored=${afterReload.stored}`);
      await page.close();
    }
  }
}

step("phone: the header and the tabs switch the same way");
{
  const page = await browser.newPage({ ...PHONE });
  listen(page, "phone");
  await openRoute(page, `${app}/`);
  const globe = page.locator("button:has(svg.lucide-globe)").locator("visible=true").first();
  check("the phone header has the selector", await globe.isVisible().catch(() => false), "");
  const tabsBefore = await page.evaluate(() => [...document.querySelectorAll("[data-phone-tabs] [data-tab]")].map((el) => el.textContent.trim()));
  check("its tabs start in English", tabsBefore.includes("Home") && tabsBefore.includes("You"), JSON.stringify(tabsBefore));
  await globe.click();
  await page.getByRole("menuitem", { name: "한국어" }).click();
  await page.waitForTimeout(400);
  const tabsAfter = await page.evaluate(() => [...document.querySelectorAll("[data-phone-tabs] [data-tab]")].map((el) => el.textContent.trim()));
  check("its tabs are Korean after one click", ["홈", "만들기", "스튜디오", "라이브러리", "내 계정"].every((w) => tabsAfter.includes(w)), JSON.stringify(tabsAfter));
  // The phone has no keyboard shortcut: search lives behind a sheet. Open its studios sheet and read the field's word.
  await page.locator("[data-phone-tabs] [data-tab]").filter({ hasText: "스튜디오" }).first().click();
  await page.waitForTimeout(400);
  const fieldWord = await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((el) => /Fuobe에서 검색|스튜디오, 앱, 효과 검색/.test(el.textContent));
    return b ? b.textContent.trim() : null;
  });
  check("the phone's search field is Korean too", /Fuobe에서 검색/.test(fieldWord || ""), `word=${fieldWord}`);
  await page.close();
}

step("studio: the composer's labels switch to Korean");
{
  const page = await browser.newPage({ ...DESKTOP });
  listen(page, "studio");
  await openRoute(page, `${app}/image`);
  // In English first: the run control reads as "Generate".
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(200);
  check("the run button reads “Generate” in English", await page.getByRole("button", { name: "Generate" }).first().isVisible().catch(() => false), "");
  const trigger = page.locator('button:has(svg.lucide-globe)').locator("visible=true").first();
  await trigger.waitFor({ timeout: 15_000 });
  await trigger.click();
  await page.getByRole("menuitem", { name: "한국어" }).click();
  await page.waitForTimeout(400);
  check("the run button reads “생성” after the switch", await page.getByRole("button", { name: "생성" }).first().isVisible().catch(() => false), "");
  check("no English “Generate” left in the composer", !(await page.getByRole("button", { name: "Generate" }).first().isVisible().catch(() => false)), "");
  await page.close();
}

step("RSC: the server's words follow the cookie");
{
  // With the `fuobe_lang` cookie set to ko, the server renders in Korean on first paint — no English flash.
  const page = await browser.newPage({ ...DESKTOP });
  listen(page, "rsc");
  await page.goto(`${app}/`, { waitUntil: "load" });
  await page.evaluate(() => {
    document.cookie = "fuobe_lang=ko; path=/; max-age=31536000; samesite=lax";
    localStorage.setItem("fuobe.lang", "ko");
  });
  await page.reload({ waitUntil: "load" });
  await page.waitForTimeout(1_000);
  const homeText = await page.evaluate(() => document.body.innerText);
  // The below-fold sections use content-visibility: innerText skips them until scrolled, so read the heading by id.
  const openHeading = await page.evaluate(() => document.getElementById("home-open")?.textContent ?? "");
  check("the Open source heading is Korean in the server HTML", openHeading.includes("처음부터 끝까지 오픈소스"), `heading=${openHeading}`);
  check("no English “Open source, all the way down” in the server HTML", !openHeading.includes("Open source, all the way down"), `heading=${openHeading}`);
  check("the footer's MIT line is Korean", homeText.includes("MIT 라이선스로 공개된 오픈소스입니다."), "");
  check("<html lang> is ko on the server's first paint", await page.evaluate(() => document.documentElement.lang) === "ko", "");
  await page.close();
}

step("nothing was missed on the way");
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
console.log("\nlang-switch: all checks passed");
