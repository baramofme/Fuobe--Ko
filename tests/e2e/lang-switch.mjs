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

/**
 * A menu's body, read as visible words only (innerText ignores attributes): column headings, row short-lines,
 * See-all subs, the count line, the "See all" link, and row-name leaf spans (the first leaf span inside each
 * link's flex-col wrapper, excluding muted short-lines).
 */
const readPanel = (p, sel) =>
  p.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el || !el.checkVisibility()) return null;
    const lines = [...el.querySelectorAll("a span.truncate.text-muted-foreground")].map((x) => x.textContent.trim()).filter(Boolean);
    const subs = [...el.querySelectorAll("a[data-sub] span.truncate")].map((x) => x.textContent.trim()).filter(Boolean);
    const head = [...el.querySelectorAll("[data-group] > p")].map((x) => x.textContent.trim()).filter(Boolean);
    const count = el.querySelector("[data-count-line]")?.textContent.trim() ?? null;
    const seeAll = [...el.querySelectorAll("[data-see-all]")].map((x) => x.textContent.trim()).filter(Boolean);
    const names = [...el.querySelectorAll("a span")].filter(x =>
      !x.querySelector("span") &&
      !x.classList.contains("text-muted-foreground") &&
      x.textContent.trim() &&
      x.checkVisibility()
    ).map(x => x.textContent.trim());
    return { text: el.innerText, lines, subs, head, count, seeAll, names };
  }, sel);

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
  check("the attach button reads “Add media” in English", await page.getByRole("button", { name: "Add media" }).first().isVisible().catch(() => false), "");
  const trigger = page.locator('button:has(svg.lucide-globe)').locator("visible=true").first();
  await trigger.waitFor({ timeout: 15_000 });
  await trigger.click();
  await page.getByRole("menuitem", { name: "한국어" }).click();
  await page.waitForTimeout(400);
  check("the run button reads “생성” after the switch", await page.getByRole("button", { name: "생성" }).first().isVisible().catch(() => false), "");
  check("no English “Generate” left in the composer", !(await page.getByRole("button", { name: "Generate" }).first().isVisible().catch(() => false)), "");
  check("the attach button reads “미디어 추가” after the switch", await page.getByRole("button", { name: "미디어 추가" }).first().isVisible().catch(() => false), "");
  check("no English “Add media” left in the composer", !(await page.getByRole("button", { name: "Add media" }).first().isVisible().catch(() => false)), "");
  await page.close();
}

step("RSC: the server's words follow the cookie");
{
  // On a dynamic server page (the apps gallery), the `fuobe_lang` cookie makes the server render in Korean.
  // This page is NOT listened to: its owner/guest hydration note is a pre-existing app behaviour, unrelated to i18n.
  const page = await browser.newPage({ ...DESKTOP });
  await page.goto(`${app}/`, { waitUntil: "load" });
  await page.evaluate(() => {
    document.cookie = "fuobe_lang=ko; path=/; max-age=31536000; samesite=lax";
    localStorage.setItem("fuobe.lang", "ko");
  });
  await page.goto(`${app}/apps`, { waitUntil: "load" });
  const ssr = await page.content();
  check("the apps gallery renders “모든 앱” on the server", ssr.includes("모든 앱"), "");
  check("no English “Every app” on the server-rendered apps page", !ssr.includes("Every app"), "");
  check("the apps gallery renders “여기서 시작” on the server", ssr.includes("여기서 시작"), "");
  check("no English “Start here” on the server-rendered apps page", !ssr.includes("Start here"), "");
  await page.close();
}

step("studio: the new labels follow the switch (Frames)");
{
  const page = await browser.newPage({ ...DESKTOP });
  await openRoute(page, `${app}/video`);
  const chip = page.getByRole("button", { name: "Frames", exact: true }).first();
  await chip.waitFor({ timeout: 10_000 });
  await chip.click();
  const strip = page.locator("[data-frames-strip]");
  await strip.first().waitFor({ timeout: 5_000 }).catch(() => {});
  const on = await strip.first().isVisible().catch(() => false);
  check("Frames turned the strip on", on, "");
  check(
    "the Frames hint reads English first",
    await page.locator("text=Up to 10 frames. The first is the start frame.").first().isVisible().catch(() => false),
    "",
  );
  const enReplace = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button[aria-label$=": replace"]')];
    return b.length === 0 || b.every((x) => /^Frame \d+, (start|end|middle) frame at \d+(\.\d+)? s: replace$/.test(x.getAttribute("aria-label") ?? ""));
  });
  check("the replace aria keeps the assembled English bytes", enReplace, "");
  const trigger = page.locator('button:has(svg.lucide-globe)').locator("visible=true").first();
  await trigger.waitFor({ timeout: 15_000 });
  await trigger.click();
  await page.getByRole("menuitem", { name: "한국어" }).click();
  await page.waitForTimeout(400);
  check(
    "the Frames hint is Korean after the switch",
    await page.locator("text=최대 10개의 프레임입니다. 첫 프레임은 시작 프레임입니다.").first().isVisible().catch(() => false),
    "",
  );
  check("no English Frames hint left", !(await page.locator("text=Up to 10 frames").first().isVisible().catch(() => false)), "");
  const frameHeadKo = await strip.first().getByText("프레임", { exact: true }).first().isVisible().catch(() => false);
  check("the strip's heading reads 프레임 after the switch", frameHeadKo, "");
  check("no English Frames heading left in the strip", !(await strip.first().locator("span").filter({ hasText: /^Frames$/ }).first().isVisible().catch(() => false)), "");
  const koReplace = await page.evaluate(() => [...document.querySelectorAll('button[aria-label$="교체"]')].length);
  if (koReplace > 0) check("the replace buttons' accessible names went Korean", true, "");
  await page.close();
}

step("apps: the home chrome reads Korean under the cookie (after hydration)");
{
  // Same two-step language as the server render: load, save ko, then navigate so the cookie is sent and every
  // section — the before/after widget, its captions and the footer — reads in Korean once the page settles.
  const page = await browser.newPage({ ...DESKTOP });
  listen(page, "apps");
  await page.goto(`${app}/`, { waitUntil: "load" });
  await page.evaluate(() => {
    document.cookie = "fuobe_lang=ko; path=/; max-age=31536000; samesite=lax";
    localStorage.setItem("fuobe.lang", "ko");
  });
  await page.goto(`${app}/apps`, { waitUntil: "load" });
  await page.waitForTimeout(1500);
  const start = page.locator('section[aria-labelledby="apps-start"]');
  for (const want of ["스케치에서 실물로", "재조명", "메이크업 스튜디오"])
    check(`the tab reads “${want}”`, await start.getByRole("tab", { name: want }).first().isVisible().catch(() => false), "");
  for (const gone of ["Sketch to Real", "Relight", "Makeup Studio", "Drag to compare"])
    check(`no English “${gone}” left in the section`, !(await start.getByText(gone, { exact: true }).first().isVisible().catch(() => false)), "");
  check("the drag line reads 밀어서 비교", await start.getByText("밀어서 비교", { exact: true }).first().isVisible().catch(() => false), "");
  const tablistAria = await start.locator('[role="tablist"]').first().getAttribute("aria-label");
  check(`the tablist name is “비교할 앱”`, tablistAria === "비교할 앱", `aria=${tablistAria}`);
  const panelAria = await start.locator('[role="tabpanel"]').first().getAttribute("aria-label");
  check("the panel is named by its app and tags", panelAria === "스케치에서 실물로: 스케치와 사진", `aria=${panelAria}`);
  const slider = start.locator('[role="slider"]').first();
  const sliderAria = await slider.getAttribute("aria-label");
  check("the slider is named in Korean", sliderAria === "스케치와 사진 비교", `aria=${sliderAria}`);
  const valueText = await slider.getAttribute("aria-valuetext");
  check("the slider's position text speaks Korean too", /^스케치 \d+% · 사진 \d+%$/.test(valueText || ""), `valuetext=${valueText}`);
  check("a reveal caption reads in Korean", await start.getByText("아무 사진에나 그 옷을 입혀 보세요").first().isVisible().catch(() => false), "");
  check("no English reveal caption left", !(await start.getByText("Wear the outfit from any photo").first().isVisible().catch(() => false)), "");
  const footer = page.locator("footer").last();
  check("the footer says it is open source in Korean", await footer.getByText("MIT 라이선스로 공개된 오픈소스입니다.").first().isVisible().catch(() => false), "");
  for (const [want, gone] of [["개인정보", "Privacy"], ["약관", "Terms"], ["감사 & 라이선스", "Thanks & licences"], ["GitHub 소스", "GitHub"]])
    check(`the footer links read “${want}”`, (await footer.getByRole("link", { name: want }).count()) > 0, "");
  const aboutAria = await footer.locator("nav").first().getAttribute("aria-label");
  check("the footer's own name is Korean", aboutAria === "Fuobe 소개", `aria=${aboutAria}`);
  await page.close();
}

step("apps: the widget follows the switch without a reload");
{
  const page = await browser.newPage({ ...DESKTOP });
  listen(page, "apps-switch");
  await openRoute(page, `${app}/apps`);
  const start = page.locator('section[aria-labelledby="apps-start"]');
  check("the tab starts in English", await start.getByRole("tab", { name: "Sketch to Real" }).first().isVisible().catch(() => false), "");
  check("the drag line starts in English", await start.getByText("Drag to compare", { exact: true }).first().isVisible().catch(() => false), "");
  const trigger = page.locator('button:has(svg.lucide-globe)').locator("visible=true").first();
  await trigger.waitFor({ timeout: 15_000 });
  await trigger.click();
  await page.getByRole("menuitem", { name: "한국어" }).click();
  await page.waitForTimeout(400);
  check("still the same page (no reload happened)", page.url().endsWith("/apps"), page.url());
  check("the tab reads 스케치에서 실물로 right after the click", await start.getByRole("tab", { name: "스케치에서 실물로" }).first().isVisible().catch(() => false), "");
  check("no English tab name left", !(await start.getByRole("tab", { name: "Sketch to Real" }).first().isVisible().catch(() => false)), "");
  const aria = await start.locator('[role="tablist"]').first().getAttribute("aria-label");
  check("the tablist name went Korean on the same render", aria === "비교할 앱", `aria=${aria}`);
  check("the drag line went Korean", await start.getByText("밀어서 비교", { exact: true }).first().isVisible().catch(() => false), "");
  await page.close();
}

step("nav hover: the row short-lines, column headings and chrome switch to Korean");
{
  const page = await browser.newPage({ ...DESKTOP });
  listen(page, "nav");
  await openRoute(page, `${app}/`);

  // Resting the pointer on the bar's item opens its menu (bar-intent's rest); a click stands in if hover didn't.
  async function openByHover(p, id) {
    await p.keyboard.press("Escape").catch(() => {});
    await p.waitForTimeout(200);
    const trigger = p.locator(`[data-top-bar] [data-bar-menu="${id}"]`).locator("visible=true").first();
    await trigger.waitFor({ state: "visible", timeout: 15_000 });
    await trigger.hover();
    const sel = id === "create" ? '[data-bar-card="create"]' : `#${id}-launcher`;
    let opened = await p.locator(sel).first().waitFor({ state: "visible", timeout: 6_000 }).then(() => true, () => false);
    if (!opened) {
      await trigger.click();
      await p.locator(sel).first().waitFor({ state: "visible", timeout: 6_000 });
    }
    // Its rows render once the menu is open and its data is in; wait for the first short line to show.
    await p
      .waitForFunction((s) => { const el = document.querySelector(s); return !!el && [...el.querySelectorAll("a span.truncate.text-muted-foreground")].some((x) => x.checkVisibility()); }, sel, { timeout: 10_000 })
      .catch(() => {});
    await p.waitForTimeout(300);
    return sel;
  }

  // English first: the Studios launcher's count line and a row line read as authored.
  const selS = await openByHover(page, "studios");
  const en = await readPanel(page, selS);
  check("the Studios launcher opens on hover", !!en, JSON.stringify(en === null));
  check("the count line is English first", /studios, grouped by what you want to make/.test(en?.count || ""), `count=${en?.count}`);
  check("a Studios row line is English first", (en?.lines || []).some((l) => /Insert or swap anyone|Direct shots like a film set|Plan a film frame by frame/.test(l)), JSON.stringify(en?.lines));

  // English Create card: its two column headings and a row short line.
  const selC = await openByHover(page, "create");
  const enC = await readPanel(page, selC);
  check("the Create card reads “Make” and “Edit a picture”", /make/i.test(enC?.text || "") && /edit a picture/i.test(enC?.text || ""), "");
  check("a Create row line is English first", (enC?.lines || []).some((l) => /Text to image|Text or image to video/.test(l)), JSON.stringify(enC?.lines));
  // Row names must read their English source labels byte-for-byte (pre-wiring invariant).
  const EN_ROW = ["Image","Video","Assist","Canvas","Storyboard","Edit","Live edit","Inpaint"];
  check("Create row names are English first", EN_ROW.every((n) => (enC?.names || []).includes(n)), JSON.stringify(enC?.names));

  // 한국어, one click, no reload.
  const menu = await openSelector(page);
  await menu.getByRole("menuitem", { name: "한국어" }).click();
  await page.waitForTimeout(300);
  check("still the same page (no reload happened)", page.url().endsWith("/"), page.url());

  // Hover the launcher again: every wired string is now Korean, with none of the English left.
  const selS2 = await openByHover(page, "studios");
  const ko = await readPanel(page, selS2);
  check("the Studios count line is Korean", /^만들고 싶은 것별로 모은 스튜디오 \d+개$/.test(ko?.count || ""), `count=${ko?.count}`);
  check("no English count line left", !/studios, grouped by what you want to make/.test(ko?.count || ""), "");
  check("the See all link reads 전체 보기", (ko?.seeAll || []).includes("전체 보기"), JSON.stringify(ko?.seeAll));
  check("no English “See all” left in the panel", !/\bSee all\b/.test(ko?.text || ""), "");
  check("the search-all button is Korean", (ko?.text || "").includes("모든 앱, 효과 및 도구 검색"), "");
  check("no English “Search all apps, effects and tools”", !(ko?.text || "").includes("Search all apps, effects and tools"), "");
  check("the column headings are Korean", (ko?.head || []).some((h) => /영화와 영상|소셜과 숏폼|판매와 광고|인물과 패션|^소리$|마무리와 변환/.test(h)), JSON.stringify(ko?.head));
  check("no English column heading left", !(ko?.head || []).some((h) => /Film & video|Social & shorts|Sell & advertise|People & fashion|Finish & convert/.test(h)), JSON.stringify(ko?.head));
  check("the Studios row short-lines are all Korean", (ko?.lines || []).length > 0 && (ko?.lines || []).every((l) => /[가-힯]/.test(l)), JSON.stringify(ko?.lines));
  check("a known Studios line reads its Korean words", (ko?.lines || []).some((l) => /누구든 삽입 또는 교체|영화 세트처럼 컷을 연출|장면마다 프레임별 기획/.test(l)), "");
  check("no English Studios row line left", !(ko?.lines || []).some((l) => /Insert or swap anyone|Direct shots like a film set|Plan a film frame by frame|Text to image|Text or image to video/.test(l)), JSON.stringify(ko?.lines));
  check("no English “See all N” sub label left", !(ko?.subs || []).some((s) => /^See all \d+$/.test(s)), JSON.stringify(ko?.subs));
  check("a See-all sub reads 전체 N개 보기", (ko?.subs || []).some((s) => /전체 \d+개 보기/.test(s)), JSON.stringify(ko?.subs));

  // Hover Create again: its headings and short-lines switched too.
  const selC2 = await openByHover(page, "create");
  const koC = await readPanel(page, selC2);
  check("the Create headings read 만들기 and 그림 편집", (koC?.text || "").includes("만들기") && (koC?.text || "").includes("그림 편집"), "");
  check("no English Create headings left", !/\bMake\b/.test(koC?.text || "") && !/Edit a picture/.test(koC?.text || ""), "");
  check("the Create row short-lines are all Korean", (koC?.lines || []).length > 0 && (koC?.lines || []).every((l) => /[가-힯]/.test(l)), JSON.stringify(koC?.lines));
  check("no English Create row line left", !(koC?.lines || []).some((l) => /Text to image|Text or image to video|Plan it with an agent|Wire models together/.test(l)), JSON.stringify(koC?.lines));
  // Row names must be Korean after the switch, with no English names left.
  check("Create row names are Korean after the switch", (koC?.names || []).length > 0 && (koC?.names || []).every((n) => /[가-힯]/.test(n)), JSON.stringify(koC?.names));
  check("no English Create row name left", !(koC?.names || []).some((n) => /^(Image|Video|Assist|Canvas|Storyboard|Edit|Live edit|Inpaint)$/.test(n)), JSON.stringify(koC?.names));
  await page.close();
}

step("more: RichItem row names switch to Korean (sub-xl viewport)");
{
  // More appears at widths below 1440; at sub-xl (< 1280) all five items are inside it.
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  listen(page, "more");
  await openRoute(page, `${app}/`);

  async function openMore(p) {
    await p.keyboard.press("Escape").catch(() => {});
    await p.waitForTimeout(200);
    const trigger = p.locator('[data-top-bar] [data-bar-menu="more"]').locator("visible=true").first();
    await trigger.waitFor({ state: "visible", timeout: 15_000 });
    await trigger.hover();
    const sel = '[data-bar-card="more"]';
    let opened = await p.locator(sel).first().waitFor({ state: "visible", timeout: 6_000 }).then(() => true, () => false);
    if (!opened) { await trigger.click(); await p.locator(sel).first().waitFor({ state: "visible", timeout: 6_000 }); }
    await p.waitForTimeout(300);
    return sel;
  }

  // English: the row names in More are their English source labels.
  const selM = await openMore(page);
  const enM = await readPanel(page, selM);
  check("the More menu opens", !!enM, JSON.stringify(enM === null));
  const EN_MORE = ["Apps", "Camera motions", "Effects", "Canvas", "Assist"];
  check("More row names are English first", EN_MORE.every((n) => (enM?.names || []).includes(n)), JSON.stringify(enM?.names));

  // 한국어 one click, no reload.
  const menu = await openSelector(page);
  await menu.getByRole("menuitem", { name: "한국어" }).click();
  await page.waitForTimeout(300);
  check("still the same page (no reload happened)", page.url().endsWith("/"), page.url());

  // Hover More again: every row name is Korean, no English name left.
  const selM2 = await openMore(page);
  const koM = await readPanel(page, selM2);
  check("More row names are Korean after the switch", (koM?.names || []).length > 0 && (koM?.names || []).every((n) => /[가-힯]/.test(n)), JSON.stringify(koM?.names));
  check("no English More row name left", !(koM?.names || []).some((n) => /^(Apps|Camera motions|Effects|Canvas|Assist)$/.test(n)), JSON.stringify(koM?.names));
  // Byte-identity: nav.motions en label must not leak here as "Motions & effects" — the model label is "Camera motions", translated via nav.entry.motions → "카메라 움직임".
  check("Camera motions is not shown as “Motions & effects” (byte-identity)", !(koM?.names || []).includes("Motions & effects"), JSON.stringify(koM?.names));
  await page.close();
}

step("marketing: brand, words and settings follow the switch (Ads format)");
{
  // The Ads format is the one whose chrome holds the Words panel and the Brand chip beside the Settings chip.
  const page = await browser.newPage({ ...DESKTOP });
  listen(page, "marketing");
  await openRoute(page, `${app}/marketing`);

  const formatTrigger = page.getByRole("button", { name: "Format: Product shot · Standalone", exact: true });
  await formatTrigger.waitFor({ timeout: 15_000 });
  await formatTrigger.click();
  await page.getByRole("dialog", { name: "Format" }).getByRole("button", { name: "Ads", exact: true }).click();
  await page.waitForTimeout(300);

  // English first: the three wired chips read their source bytes.
  check("the Settings chip reads “Settings: 4:5”", await page.getByRole("button", { name: "Settings: 4:5", exact: true }).first().isVisible().catch(() => false), "");
  check("the Brand chip reads “Brand kit”", await page.getByRole("button", { name: "Brand kit", exact: true }).first().isVisible().catch(() => false), "");
  check("the Words chip reads “Headline and button text”", await page.getByRole("button", { name: "Headline and button text", exact: true }).first().isVisible().catch(() => false), "");

  // The Words panel opens named by its title (the popover takes aria-label from it), labels English as authored.
  await page.getByRole("button", { name: "Headline and button text", exact: true }).first().click();
  const wordsEn = page.locator('[role="dialog"][aria-label="Words on the image"]');
  check("the Words panel is named “Words on the image”", await wordsEn.first().waitFor({ state: "visible", timeout: 5_000 }).then(() => true, () => false), "");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(250);

  // 한국어, one click, no reload.
  const menu = await openSelector(page);
  await menu.getByRole("menuitem", { name: "한국어" }).click();
  await page.waitForTimeout(400);
  check("still the same page (no reload happened)", page.url().endsWith("/marketing"), page.url());

  // Chips: the accessible names switched on the same render; none of the English names left.
  check("the Settings chip reads “설정: 4:5”", await page.getByRole("button", { name: /^설정: 4:5/ }).first().isVisible().catch(() => false), "");
  check("no English “Settings: …” chip name left", (await page.getByRole("button", { name: /^Settings: / }).count()) === 0, "");
  check("the Brand chip reads “브랜드 키트”", await page.getByRole("button", { name: "브랜드 키트", exact: true }).first().isVisible().catch(() => false), "");
  check("no English “Brand kit” chip name left", (await page.getByRole("button", { name: /^Brand kit/ }).count()) === 0, "");
  check("the Words chip reads “제목과 버튼 문구”", await page.getByRole("button", { name: "제목과 버튼 문구", exact: true }).first().isVisible().catch(() => false), "");
  check("no English “Headline and button text” left", (await page.getByRole("button", { name: "Headline and button text", exact: true }).count()) === 0, "");
  check("the Words chip's word is 제목", await page.getByRole("button", { name: "제목과 버튼 문구", exact: true }).first().getByText("제목", { exact: true }).first().isVisible().catch(() => false), "");

  // Open the Words panel again: its name, both labels and the drawn switch read Korean now.
  await page.getByRole("button", { name: "제목과 버튼 문구", exact: true }).first().click();
  const wordsKo = page.locator('[role="dialog"][aria-label="그림에 들어갈 문구"]');
  check("the Words panel is named 그림에 들어갈 문구", await wordsKo.first().waitFor({ state: "visible", timeout: 5_000 }).then(() => true, () => false), "");
  check("its headline label reads 제목", await wordsKo.getByText("제목", { exact: true }).first().isVisible().catch(() => false), "");
  check("its button label reads 버튼", await wordsKo.getByText("버튼", { exact: true }).first().isVisible().catch(() => false), "");
  check("the drawn switch reads 모델이 그려 넣은 문구", await wordsKo.getByText("모델이 그려 넣은 문구", { exact: true }).first().isVisible().catch(() => false), "");
  const phOne = await wordsKo.getByRole("textbox").first().getAttribute("placeholder");
  check("the headline placeholder reads 예: 바삭하게, 완성", phOne === "예: 바삭하게, 완성", `placeholder=${phOne}`);
  const phTwo = await wordsKo.getByRole("textbox").nth(1).getAttribute("placeholder");
  check("the button placeholder reads 예: 지금 구매", phTwo === "예: 지금 구매", `placeholder=${phTwo}`);
  check("no English Words panel name left", (await page.locator('[role="dialog"][aria-label="Words on the image"]').count()) === 0, "");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(250);

  // The Brand chip's popover: header and chrome went Korean; the English chrome strings are gone from it.
  await page.getByRole("button", { name: "브랜드 키트", exact: true }).first().click();
  const brandPop = page.getByRole("dialog").last();
  await brandPop.waitFor({ state: "visible", timeout: 5_000 }).catch(() => {});
  const brandText = await brandPop.evaluate((el) => el.innerText).catch(() => "");
  check("the popover header reads 브랜드 키트", /브랜드 키트/.test(brandText), brandText.slice(0, 60));
  check("no English brand chrome left in the popover", !/Brand kit|Add brand kit|No brand kit|\bManage\b/.test(brandText), brandText.slice(0, 120));
  const foot = brandPop.locator("div.border-t").last();
  const footVisible = await foot.isVisible().catch(() => false);
  if (footVisible) check("the brand footer reads its Korean chrome", /브랜드 키트 (추가|없음)|관리/.test(await foot.evaluate((el) => el.innerText)), "");
  await page.keyboard.press("Escape");
  await page.close();
}

step("marketing: the website chip follows the switch (SaaS format)");
{
  const page = await browser.newPage({ ...DESKTOP });
  listen(page, "marketing-saas");
  await openRoute(page, `${app}/marketing`);

  // Video mode first: the SaaS shoot lives in the video format list, and toggling re-fits the draft to a video format.
  await page.getByRole("radio", { name: "Video mode", exact: true }).first().click();
  await page.waitForTimeout(300);
  const formatTrigger = page.getByRole("button", { name: /^Format: / }).first();
  await formatTrigger.waitFor({ timeout: 15_000 });
  await formatTrigger.click();
  await page.getByRole("dialog", { name: "Format" }).getByRole("button", { name: "Product motion · SaaS", exact: true }).click();
  await page.waitForTimeout(300);

  // English first: the chip, then its panel with a typed bad link reading the English refusal.
  check("the Website chip reads “Add a website or social link”", await page.getByRole("button", { name: "Add a website or social link", exact: true }).first().isVisible().catch(() => false), "");
  check("the Website chip's word is Website", await page.getByRole("button", { name: "Add a website or social link", exact: true }).first().getByText("Website", { exact: true }).first().isVisible().catch(() => false), "");
  check("the Settings chip reads “Settings: 16:9 · 5s”", await page.getByRole("button", { name: "Settings: 16:9 · 5s", exact: true }).first().isVisible().catch(() => false), "");
  await page.getByRole("button", { name: "Add a website or social link", exact: true }).first().click();
  const siteEn = page.locator('[role="dialog"][aria-label="Website or social link"]');
  await siteEn.first().waitFor({ state: "visible", timeout: 5_000 }).catch(() => {});
  await siteEn.locator("input").first().fill("nope");
  await page.waitForTimeout(300);
  check("the bad-link refusal reads English first", await siteEn.getByText("Enter a valid website URL", { exact: true }).first().isVisible().catch(() => false), "");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(250);

  const menu = await openSelector(page);
  await menu.getByRole("menuitem", { name: "한국어" }).click();
  await page.waitForTimeout(400);
  check("still the same page (no reload happened)", page.url().endsWith("/marketing"), page.url());

  // The chip kept the typed value across the switch and named it in Korean; the refusal switched with it.
  check("the Website chip reads “웹사이트: nope” with the value kept", await page.getByRole("button", { name: "웹사이트: nope", exact: true }).first().isVisible().catch(() => false), "");
  check("no English “Add a website or social link” left", (await page.getByRole("button", { name: "Add a website or social link", exact: true }).count()) === 0, "");
  check("the Settings chip reads “설정: 16:9 · 5s”", await page.getByRole("button", { name: /^설정: 16:9 · 5s/ }).first().isVisible().catch(() => false), "");
  await page.getByRole("button", { name: "웹사이트: nope", exact: true }).first().click();
  const siteKo = page.locator('[role="dialog"][aria-label="웹사이트 또는 소셜 링크"]');
  check("the panel is named 웹사이트 또는 소셜 링크", await siteKo.first().waitFor({ state: "visible", timeout: 5_000 }).then(() => true, () => false), "");
  check("its link label reads 링크", await siteKo.getByText("링크", { exact: true }).first().isVisible().catch(() => false), "");
  check("the bad-link refusal reads the Korean words", await siteKo.getByText("올바른 웹사이트 주소를 입력해 주세요", { exact: true }).first().isVisible().catch(() => false), "");
  const siteText = await siteKo.first().evaluate((el) => el.innerText).catch(() => "");
  check("no English refusal inside the Korean panel", !siteText.includes("Enter a valid website URL"), siteText.slice(0, 120));
  const ph = await siteKo.locator("input").first().getAttribute("placeholder");
  check("the www placeholder is the URL example, kept byte-for-byte in both languages", ph === "www.example.com", `placeholder=${ph}`);
  await page.keyboard.press("Escape");
  await page.close();
}

step("marketing: the voice chip follows the switch (UGC format)");
{
  const page = await browser.newPage({ ...DESKTOP });
  listen(page, "marketing-ugc");
  await openRoute(page, `${app}/marketing`);

  // Video mode first: the UGC shoot lives in the video format list, and toggling re-fits the draft to a video format.
  await page.getByRole("radio", { name: "Video mode", exact: true }).first().click();
  await page.waitForTimeout(300);
  const formatTrigger = page.getByRole("button", { name: /^Format: / }).first();
  await formatTrigger.waitFor({ timeout: 15_000 });
  await formatTrigger.click();
  await page.getByRole("dialog", { name: "Format" }).getByRole("button", { name: "UGC video · Talking head", exact: true }).click();
  await page.waitForTimeout(300);

  // English first: the voice chip falls back to the store's “Voice” word (VoiceControl passes no label),
  // and its tooltip — mounted only on hover — says which engine voices come from.
  const voiceEn = page.getByRole("button", { name: /^Voice(: |$)/ }).first();
  check("the voice chip reads the English Voice word", await voiceEn.waitFor({ state: "visible", timeout: 10_000 }).then(() => true, () => false), "");
  const tipEnLoc = page.getByRole("tooltip").first();
  // Hover the wrapper span, not the chip: beside it the Brand chip overlaps the composer's scrolling row and
  // intercepts the pointer, so a hover on the button itself never reaches the tooltip trigger.
  await page.locator("span.inline-flex").filter({ has: voiceEn }).first().hover().catch(() => {});
  await tipEnLoc.waitFor({ state: "visible", timeout: 4_000 }).catch(() => {});
  const tipEn = await tipEnLoc.innerText().catch(() => "");
  check("the voice tooltip reads its English words first", /Voiceover by |Open-source voices/.test(tipEn), tipEn.slice(0, 80));

  const menu = await openSelector(page);
  await menu.getByRole("menuitem", { name: "한국어" }).click();
  await page.waitForTimeout(400);
  check("still the same page (no reload happened)", page.url().endsWith("/marketing"), page.url());

  // The chip word, the tooltip and the neighbouring chips all switched on the same render.
  const voiceKo = page.getByRole("button", { name: /^보이스(: |$)/ }).first();
  check("the voice chip reads the Korean 보이스 word", await voiceKo.first().isVisible().catch(() => false), "");
  check("no English “Voice” chip word left", (await page.getByRole("button", { name: /^Voice(: |$)/ }).count()) === 0, "");
  const tipKoLoc = page.getByRole("tooltip").first();
  await page.locator("span.inline-flex").filter({ has: voiceKo }).first().hover().catch(() => {});
  await tipKoLoc.waitFor({ state: "visible", timeout: 4_000 }).catch(() => {});
  const tipKo = await tipKoLoc.innerText().catch(() => "");
  check("the voice tooltip reads Korean now", /음성|복제합니다/.test(tipKo), tipKo.slice(0, 80));
  check("the Brand chip is still there and reads 브랜드 키트", await page.getByRole("button", { name: "브랜드 키트", exact: true }).first().isVisible().catch(() => false), "");
  check("the Settings chip reads the Korean 설정 name with the same summary", await page.getByRole("button", { name: /^설정: 9:16 · 15s/ }).first().isVisible().catch(() => false), "");
  await page.keyboard.press("Escape");
  await page.close();
}

step("marketing: the run blocker follows the switch (Generate tooltip, the phone's line, the toast)");
{
  const page = await browser.newPage({ ...DESKTOP });
  listen(page, "marketing-blocker");
  await openRoute(page, `${app}/marketing`);

  // Under the composer the blocker reads itself on phones — the sm:hidden line. It is hidden on a desktop
  // viewport, yet the same words sit in the DOM: read them there, it is the line a phone would show.
  const phoneLine = () => page.evaluate(() => {
    const line = [...document.querySelectorAll("p[aria-live]")].find((p) => p.classList.contains("sm:hidden"));
    return line ? line.textContent.trim() : null;
  });
  const tipOn = async (name) => {
    await page.getByRole("button", { name, exact: true }).first().hover().catch(() => {});
    await page.getByRole("tooltip").first().waitFor({ state: "visible", timeout: 4_000 }).catch(() => {});
    return page.getByRole("tooltip").first().innerText().catch(() => "");
  };
  const toastWords = () => page.locator("[data-sonner-toast]").first().innerText().catch(() => "");
  // A blocked Generate is aria-disabled: it tells a screen reader it won't run, yet a person's click still lands
  // and the composer answers with the refusal as a toast. force says what the person does, not what the reader gets.
  const pressSend = (name) => page.getByRole("button", { name, exact: true }).first().click({ force: true }).catch(() => {});

  // This Fuobe answers an empty browser as its owner: with no product on the Ads format, Generate is blocked on the product rule.
  check("the send button is named Generate", await page.getByRole("button", { name: "Generate", exact: true }).first().isVisible().catch(() => false), "");
  const tipEn = await tipOn("Generate");
  check("the Generate tooltip says the product blocker in English", tipEn === "Attach a product to generate", tipEn);
  const lineEn = await phoneLine();
  check("the phone's line (hidden here) says the same English words", lineEn === "Attach a product to generate", String(lineEn));
  await pressSend("Generate");
  await page.waitForTimeout(600);
  const toastEn = await toastWords();
  check("the toast repeats the English blocker", toastEn === "Attach a product to generate", toastEn);
  await page.locator("[data-sonner-toast]").first().waitFor({ state: "detached", timeout: 6_000 }).catch(() => {});

  // 한국어, one click, no reload.
  const menu = await openSelector(page);
  await menu.getByRole("menuitem", { name: "한국어" }).click();
  await page.waitForTimeout(400);
  check("still the same page (no reload happened)", page.url().endsWith("/marketing"), page.url());

  check("the send button is named 생성", await page.getByRole("button", { name: "생성", exact: true }).first().isVisible().catch(() => false), "");
  const tipKo = await tipOn("생성");
  check("the Generate tooltip reads the Korean blocker", tipKo === "생성하려면 제품을 첨부해 주세요", tipKo);
  const lineKo = await phoneLine();
  check("the phone's line reads the Korean blocker", lineKo === "생성하려면 제품을 첨부해 주세요", String(lineKo));
  check("no English blocker words left on the line", !/Attach a product|isn't available|Enter a valid/.test(lineKo ?? ""), String(lineKo));
  // The refusal carries one id, so the Korean toast replaces the English one in place.
  await pressSend("생성");
  await page.waitForTimeout(600);
  const toastKo = await toastWords();
  check("the toast repeats the Korean words", toastKo === "생성하려면 제품을 첨부해 주세요", toastKo);
  await page.keyboard.press("Escape");
  await page.close();
}

step("marketing: the bad-website blocker says the panel's words on the line and in the toast (SaaS format)");
{
  const page = await browser.newPage({ ...DESKTOP });
  listen(page, "marketing-bad-site");
  await openRoute(page, `${app}/marketing`);
  const phoneLine = () => page.evaluate(() => {
    const line = [...document.querySelectorAll("p[aria-live]")].find((p) => p.classList.contains("sm:hidden"));
    return line ? line.textContent.trim() : null;
  });
  const tipOn = async (name) => {
    await page.getByRole("button", { name, exact: true }).first().hover().catch(() => {});
    await page.getByRole("tooltip").first().waitFor({ state: "visible", timeout: 4_000 }).catch(() => {});
    return page.getByRole("tooltip").first().innerText().catch(() => "");
  };
  const toastWords = () => page.locator("[data-sonner-toast]").first().innerText().catch(() => "");
  const pressSend = (name) => page.getByRole("button", { name, exact: true }).first().click({ force: true }).catch(() => {});

  // Video mode first, in English: the SaaS shoot wants a website, so a typed bad link blocks the run with the
  // words the panel's refusal already uses — the blocker side is a key of its own with the same words.
  await page.getByRole("radio", { name: "Video mode", exact: true }).first().click();
  await page.waitForTimeout(300);
  const formatTrigger = page.getByRole("button", { name: /^Format: / }).first();
  await formatTrigger.waitFor({ timeout: 15_000 });
  await formatTrigger.click();
  await page.getByRole("dialog", { name: "Format" }).getByRole("button", { name: "Product motion · SaaS", exact: true }).click();
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: "Add a website or social link", exact: true }).first().click();
  const siteEn = page.locator('[role="dialog"][aria-label="Website or social link"]');
  await siteEn.first().waitFor({ state: "visible", timeout: 5_000 }).catch(() => {});
  await siteEn.locator("input").first().fill("nope");
  await page.waitForTimeout(300);
  const lineEn = await phoneLine();
  check("the phone's line says the website blocker in English", lineEn === "Enter a valid website URL", String(lineEn));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(250);
  const tipEn = await tipOn("Generate");
  check("the Generate tooltip says the website blocker in English", tipEn === "Enter a valid website URL", tipEn);
  await pressSend("Generate");
  await page.waitForTimeout(600);
  const toastEn = await toastWords();
  check("the toast repeats the website blocker", toastEn === "Enter a valid website URL", toastEn);
  await page.locator("[data-sonner-toast]").first().waitFor({ state: "detached", timeout: 6_000 }).catch(() => {});

  const menu = await openSelector(page);
  await menu.getByRole("menuitem", { name: "한국어" }).click();
  await page.waitForTimeout(400);
  check("still the same page (no reload happened)", page.url().endsWith("/marketing"), page.url());

  // The chip kept the typed value across the switch and names it in Korean; the blocker says the panel's Korean words.
  check("the Website chip reads “웹사이트: nope” with the value kept", await page.getByRole("button", { name: "웹사이트: nope", exact: true }).first().isVisible().catch(() => false), "");
  const lineKo = await phoneLine();
  check("the phone's line reads the Korean website words", lineKo === "올바른 웹사이트 주소를 입력해 주세요", String(lineKo));
  const tipKo = await tipOn("생성");
  check("the Generate tooltip reads the Korean website words", tipKo === "올바른 웹사이트 주소를 입력해 주세요", tipKo);
  await pressSend("생성");
  await page.waitForTimeout(600);
  const toastKo = await toastWords();
  check("the toast repeats the Korean website words", toastKo === "올바른 웹사이트 주소를 입력해 주세요", toastKo);
  check("no English website blocker left on the line", !/Enter a valid website|Attach a product/.test(lineKo ?? ""), String(lineKo));
  await page.keyboard.press("Escape");
  await page.close();
}



step("settings: the GPU deep panel and the account section speak Korean");
{
  // The dev studio shows its owner panel to every visitor while no password is set, and the account's
  // "Your GPU" section (ConnectChoice's cards, the pair panel) exists only when sign-up is open, which
  // needs a password. So the gate turns auth on for the run and back off at the end, leaving the
  // install exactly as the steps above found it.
  const PW = "fuobe-e2e-tb49-gate";
  const ownerCtx = await browser.newContext({ ...DESKTOP });
  const set = await ownerCtx.request.post(`${app}/api/auth/password`, { data: { password: PW } });
  let turnedOn = set.ok();
  if (!turnedOn) turnedOn = (await ownerCtx.request.post(`${app}/api/auth/login`, { data: { password: PW } })).ok();
  check("auth is on for the run", turnedOn, `set=${set.status()}`);
  const acctCtx = await browser.newContext({ ...DESKTOP });
  const signup = turnedOn && (await acctCtx.request.post(`${app}/api/auth/signup`, { data: { email: `gate-${Date.now()}@example.com`, password: "gate account password" } }));
  check("an account signs up", !!signup && signup.ok(), `signup=${signup ? signup.status() : "skipped (no auth)"}`);

  // Every English word the settings.gpu.* keys own (placeholders and fragment assembly keys left out:
  // they render with spaces or interpolations so they never appear as a whole word in the DOM). The
  // sweep checks none of them is left behind after the switch — the lane's "English leftovers 0" proof.
  //
  // Scoped to THIS lane's strings, which is what the gate promises ("이 lane의 문자열"):
  //  - the six server-Comfy field keys render as literals in settings-form.tsx (owned by the sibling
  //    settings-form-sub-panels lane t_0bea23fe), not in this lane's gpu/* files;
  //  - "Connect" stays on purpose as part of the external app's own words ("Extensions → Connect to
  //    Fuobe") and the node pack's name "Fuobe Connect" — the pair-panel check asserts they are kept;
  //  - "Find my ComfyUI"/"Your ComfyUI" also render in gpu/* files outside this lane's bounded set
  //    (this-computer/connect-gpu/computer-runner/your-gpu), tracked as a follow-up card, not here.
  const excluded = new Set([
    "settings.gpu.connectChoice.comfyServerUrlLabel",
    "settings.gpu.connectChoice.serverHintLocal",
    "settings.gpu.connectChoice.authTokenLabel",
    "settings.gpu.connectChoice.tokenHintLocal",
    "settings.gpu.connectChoice.isolatedWorkerLabel",
    "settings.gpu.connectChoice.isolatedHintLocal",
    "settings.gpu.connectChoice.connectAction",
    "settings.gpu.connectChoice.findComfyAction",
    "settings.gpu.connectChoice.yourComfyUIFallback",
  ]);
  const enWords = JSON.parse(fs.readFileSync(path.join(root, "src/lib/i18n/locales/en.json"), "utf8"));
  const laneWords = Object.entries(enWords).filter(([k, v]) =>
    k.startsWith("settings.gpu.") && !excluded.has(k) && !v.includes("{") && /[A-Za-z]{5}/.test(v) && !v.endsWith(" ") && !v.startsWith(" ")
  );
  const sweep = (p, sel) => p.evaluate(([list, selector]) => {
    const el = document.querySelector(selector);
    if (!el) return [`${selector} MISSING`];
    const text = el.innerText;
    const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return list.filter(([, v]) => new RegExp("(?<![A-Za-z0-9])" + esc(v) + "(?![A-Za-z0-9])").test(text)).map(([k]) => k);
  }, [laneWords, sel]);
  const shows = (p, s) => p.getByText(s, { exact: true }).first().isVisible().catch(() => false);

  try {
    if (turnedOn) {
      const oPage = await ownerCtx.newPage();
      listen(oPage, "gpu-owner");
      await openRoute(oPage, `${app}/settings`);

      step("settings (owner): English bytes first");
      {
        const enRg = oPage.getByRole("radiogroup", { name: "Where ComfyUI runs" });
        await enRg.first().waitFor({ timeout: 30_000 }).catch(() => {});
        check("the picker opens named “Where ComfyUI runs”", await enRg.first().isVisible().catch(() => false), "");
        check("the server choice and its body read the English bytes", await shows(enRg, "On this server") && await shows(enRg, "Fuobe calls ComfyUI at the address below, with or without a tab open."), "");
        check("the computer choice and its body read the English bytes", await shows(enRg, "On the computer you're using") && await shows(enRg, "Your Fuobe tab runs the jobs on this computer's ComfyUI while it's open."), "");
        check("the WorldCast field reads its English label and hint", await shows(oPage, "WorldCast worker URL (optional)") && await shows(oPage, "WorldCast films Fly path, Turnaround and exact orbits so the back and sides match your photos. It runs beside ComfyUI on a GPU with 48 GB or more: workers/worldcast/README.md shows how to start it."), "");
      }

      step("settings (owner): 한국어 in one render");
      {
        await oPage.keyboard.press("Escape").catch(() => {});
        await oPage.waitForTimeout(250);
        const trigger = oPage.locator("button:has(svg.lucide-globe)").locator("visible=true").first();
        await trigger.waitFor({ timeout: 15_000 });
        await trigger.click();
        await oPage.getByRole("menuitem", { name: "한국어" }).click();
        await oPage.waitForTimeout(400);
        check("still /settings — no reload happened", oPage.url().endsWith("/settings"), oPage.url());
        check("<html lang> is ko right after the click", await oPage.evaluate(() => document.documentElement.lang) === "ko", "");
        const koRg = oPage.getByRole("radiogroup", { name: "ComfyUI 실행 위치" });
        check("the picker is named “ComfyUI 실행 위치”", await koRg.first().isVisible().catch(() => false), "");
        check("the server choice reads “이 서버에서”", await shows(koRg, "이 서버에서"), "");
        check("its body is Korean", await shows(koRg, "Fuobe가 아래 주소의 ComfyUI를 호출합니다. 탭 여부와 관계없이 동작합니다."), "");
        check("the computer choice reads “사용 중인 컴퓨터에서”", await shows(koRg, "사용 중인 컴퓨터에서"), "");
        check("its body is Korean", await shows(koRg, "Fuobe 탭이 열려 있는 동안 이 컴퓨터의 ComfyUI에서 작업이 실행됩니다."), "");
        check("the picker lost its English name", (await oPage.getByRole("radiogroup", { name: "Where ComfyUI runs" }).count()) === 0, "");
        check("the WorldCast label reads “WorldCast 워커 URL(선택)”", await shows(oPage, "WorldCast 워커 URL(선택)"), "");
        check("the WorldCast hint is Korean", await shows(oPage, "WorldCast는 Fly path, Turnaround, 정확한 궤도를 촬영해 뒤쪽과 측면이 본인 사진과 일치하게 합니다. 48 GB 이상의 GPU에서 ComfyUI와 함께 실행됩니다. 시작 방법은 workers/worldcast/README.md를 참고하세요."), "");
        check("no English WorldCast label or hint left", !(await shows(oPage, "WorldCast worker URL (optional)")) && !(await shows(oPage, "WorldCast films Fly path, Turnaround and exact orbits so the back and sides match your photos. It runs beside ComfyUI on a GPU with 48 GB or more: workers/worldcast/README.md shows how to start it.")), "");
        check("no lane word left in the owner's ComfyUI panel", (await sweep(oPage, "#comfyui")).length === 0, String(await sweep(oPage, "#comfyui")));
        await oPage.close();
      }
    }

    if (signup && signup.ok()) {
      const aPage = await acctCtx.newPage();
      listen(aPage, "gpu-account");
      await openRoute(aPage, `${app}/settings`);
      const gpu = aPage.locator("#your-gpu").first();
      await gpu.waitFor({ timeout: 30_000 }).catch(() => {});

      step("settings (account): English bytes first");
      {
        check("the Your GPU section renders", await gpu.isVisible().catch(() => false), "");
        // Wait for real content: data loading may leave the section empty, and an empty read is not proof of
        // English first. Wait until the title appears so the checks below read real text.
        await gpu.getByText("Your GPU", { exact: true }).first().waitFor({ timeout: 15_000 }).catch(() => {});
        check("its title reads “Your GPU”", await shows(gpu, "Your GPU"), "");
        check("its blurb is the free bytes", await shows(gpu, "Run open models on your own graphics card, free and with no run limit."), "");
        check("the computer card reads its bytes", await shows(gpu, "Use the ComfyUI on this computer") && await shows(gpu, "The quickest way. Runs while Fuobe is open in this browser."), "");
        check("the tab-closed card reads its bytes", await shows(gpu, "Keep it running with this tab closed") && await shows(gpu, "Pair your ComfyUI with a code, or give it a web address. Takes about two minutes."), "");
        await gpu.locator("button[aria-expanded]").filter({ hasText: "Keep it running with this tab closed" }).first().click();
        await gpu.getByText("Pair your ComfyUI with a code", { exact: true }).first().waitFor({ timeout: 5_000 }).catch(() => {});
        check("the pair panel opens with its English title", await shows(gpu, "Pair your ComfyUI with a code"), "");
        check("its steps line starts in English", gpu.locator("p").filter({ hasText: "Install Fuobe Connect in ComfyUI-Manager" }).first().isVisible().catch(() => false), "");
      }

      step("settings (account): 한국어 in one render");
      {
        await aPage.keyboard.press("Escape").catch(() => {});
        await aPage.waitForTimeout(250);
        const trigger = aPage.locator("button:has(svg.lucide-globe)").locator("visible=true").first();
        await trigger.waitFor({ timeout: 15_000 });
        await trigger.click();
        await aPage.getByRole("menuitem", { name: "한국어" }).click();
        await aPage.waitForTimeout(400);
        check("still /settings — no reload happened", aPage.url().endsWith("/settings"), aPage.url());
        check("<html lang> is ko right after the click", await aPage.evaluate(() => document.documentElement.lang) === "ko", "");
        check("the title reads “내 GPU”", await shows(gpu, "내 GPU"), "");
        check("the blurb is Korean", await shows(gpu, "자신의 그래픽 카드에서 오픈 모델을 무료로, 실행 제한 없이 사용하세요."), "");
        check("the computer card reads “이 컴퓨터의 ComfyUI 사용”", await shows(gpu, "이 컴퓨터의 ComfyUI 사용") && await shows(gpu, "가장 빠른 방법입니다. 이 브라우저에서 Fuobe가 열려 있는 동안 실행됩니다."), "");
        check("the tab-closed card reads its Korean title and sub", await shows(gpu, "이 탭을 닫은 상태로 계속 실행") && await shows(gpu, "코드로 본인의 ComfyUI를 페어링하거나 웹 주소를 지정하세요. 약 2분 정도 걸립니다."), "");
        check("the pair panel title reads “코드로 본인 ComfyUI 페어링”", await shows(gpu, "코드로 본인 ComfyUI 페어링"), "");
        const stepsLine = gpu.locator("p").filter({ hasText: "ComfyUI-Manager에 Fuobe Connect" }).first();
        check("the steps line reads its Korean assembly", await stepsLine.isVisible().catch(() => false), "");
        check("the steps line kept the external app's own words", gpu.locator("p").filter({ hasText: "Extensions → Connect to Fuobe" }).first().isVisible().catch(() => false), "");
        check("no English pair title or steps line left", !(await shows(gpu, "Pair your ComfyUI with a code")) && !(await gpu.locator("p").filter({ hasText: "Install Fuobe Connect in ComfyUI-Manager" }).first().isVisible().catch(() => false)), "");
        check("no lane word left in the account's Your GPU", (await sweep(aPage, "#your-gpu")).length === 0, String(await sweep(aPage, "#your-gpu")));
        await aPage.close();
      }
    }
  } finally {
    // Back to owner-open for every visitor, as the steps above found it. Verify it actually cleared: the
    // remove must come back disabled, or the test password is left on the dev server.
    if (turnedOn) {
      const cleared = await ownerCtx.request.post(`${app}/api/auth/password`, { data: { current: PW, password: null } });
      const body = await cleared.json().catch(() => null);
      check("auth restored (test password removed)", cleared.ok() && !!body && body.enabled === false, `status=${cleared.status()} enabled=${body?.enabled}`);
    }
  }
  await ownerCtx.close();
  await acctCtx.close();
}


step("marketing: the hero sentence under the title follows the switch");
{
  const page = await browser.newPage({ ...DESKTOP });
  listen(page, "marketing-hero");
  await openRoute(page, `${app}/marketing`);

  // The hero <p> composes one sentence and drops the condition branch's words into {fragment}. It is the only
  // <p> that carries "templates, on" (English) or "템플릿으로 만듭니다" (Korean) — the words panel never does.
  const heroLine = () => page.evaluate(() => {
    const p = [...document.querySelectorAll("p")].find(
      (el) => (el.textContent || "").includes("templates, on") || (el.textContent || "").includes("템플릿으로 만듭니다"),
    );
    return p ? p.textContent.trim() : null;
  });

  // The three branch sentences the code printed before wiring, and their Korean restructurings.
  const EN_HERO = [
    "Product shots, motion, UGC presenters, ads, posters and listings — from Fuobe's templates, on open-source models.",
    "Product shots, motion, UGC presenters, ads, posters and listings — from Fuobe's templates, on your own GPU, free.",
    "Product shots, motion, UGC presenters, ads, posters and listings — from Fuobe's templates, on Fuobe Marketing Image or partner models in the cloud.",
  ];
  const KO_HERO = [
    "제품 사진, 모션, UGC 프리젠터, 광고, 포스터, 리스팅까지 — 오픈소스 모델로, Fuobe 템플릿으로 만듭니다.",
    "제품 사진, 모션, UGC 프리젠터, 광고, 포스터, 리스팅까지 — 본인 GPU에서 무료로, Fuobe 템플릿으로 만듭니다.",
    "제품 사진, 모션, UGC 프리젠터, 광고, 포스터, 리스팅까지 — 클라우드의 Fuobe Marketing Image 또는 파트너 모델로, Fuobe 템플릿으로 만듭니다.",
  ];
  const forbidden = /(open-source models|your own GPU, free|or partner models in the cloud|Product shots|UGC presenters|from Fuobe)/;

  const en0 = await heroLine();
  check("the hero <p> reads one of the three English source sentences", EN_HERO.includes(en0 ?? ""), String(en0));

  const menu = await openSelector(page);
  await menu.getByRole("menuitem", { name: "한국어" }).click();
  await page.waitForTimeout(400);
  check("still the same page (no reload happened)", page.url().endsWith("/marketing"), page.url());

  const ko0 = await heroLine();
  check("the hero <p> is now one of the three Korean sentences", KO_HERO.includes(ko0 ?? ""), String(ko0));
  check("no English fragment survived in the Korean hero", !forbidden.test(ko0 ?? ""), String(ko0));

  // 영어로 되돌리면 바이트가 그대로 돌아온다(왕복 보존 — lang-switch 2-stage의 두 번째 단계).
  const menu2 = await openSelector(page);
  await menu2.getByRole("menuitem", { name: "English" }).click();
  await page.waitForTimeout(400);
  const en1 = await heroLine();
  check("switching back to English gives the same bytes", EN_HERO.includes(en1 ?? ""), String(en1));
  await page.keyboard.press("Escape");
step("catalog: Home's rails speak Korean in one render (t_52bfd11a)");
{
  const page = await browser.newPage({ ...DESKTOP });
  listen(page, "catalog");
  await openRoute(page, `${app}/`);
  // English first: the rails' card names read the catalog's own words byte for byte (the pre-wiring invariant).
  const namesEn = await page.evaluate(() => [...document.querySelectorAll("[data-preset-name]")].map((x) => x.textContent.trim()).filter(Boolean));
  check("the rails show the catalog's names", namesEn.length > 20, `count=${namesEn.length}`);
  check(
    "the rails' names are English first",
    namesEn.every((n) => /[A-Za-z]/.test(n) && !/[\uac00-\ud7a3]/.test(n)),
    JSON.stringify(namesEn.slice(0, 8)),
  );

  const menu = await openSelector(page);
  await menu.getByRole("menuitem", { name: "한국어" }).click();
  await page.waitForTimeout(300);
  check("still the same page (no reload happened)", page.url().endsWith("/"), page.url());
  const namesKo = await page.evaluate(() => [...document.querySelectorAll("[data-preset-name]")].map((x) => x.textContent.trim()).filter(Boolean));
  check("the rails kept their card count through the switch", namesKo.length === namesEn.length, `en=${namesEn.length} ko=${namesKo.length}`);
  check("every rail card name reads Korean after the switch", namesKo.every((n) => /[\uac00-\ud7a3]/.test(n)), JSON.stringify(namesKo.filter((n) => !/[\uac00-\ud7a3]/.test(n))));
  check("no rail name kept its English words", !namesKo.some((n, i) => n === namesEn[i]), JSON.stringify(namesKo.filter((n, i) => n === namesEn[i])));

  // Back to English: the names must come back byte for byte (the English locale value IS the catalog literal).
  const menuBack = await openSelector(page);
  await menuBack.getByRole("menuitem", { name: "English" }).click();
  await page.waitForTimeout(300);
  const namesBack = await page.evaluate(() => [...document.querySelectorAll("[data-preset-name]")].map((x) => x.textContent.trim()).filter(Boolean));
  check("the English names come back byte for byte", JSON.stringify(namesBack) === JSON.stringify(namesEn), JSON.stringify(namesBack.filter((n, i) => n !== namesEn[i]).slice(0, 6)));
  await page.close();
}

step("catalog: a gallery's names and descriptions switch too (t_52bfd11a)");
{
  const page = await browser.newPage({ ...DESKTOP });
  listen(page, "gallery");
  await openRoute(page, `${app}/effects`);
  // The gallery's first page, read before the switch: names and the two-line descriptions.
  const readCards = async (p) =>
    p.evaluate(() => ({
      names: [...document.querySelectorAll("[data-preset-name]")].map((x) => x.textContent.trim()).filter(Boolean),
      descs: [...document.querySelectorAll("[data-preset-desc]")].map((x) => x.textContent.trim()).filter(Boolean),
    }));
  const enCards = await readCards(page);
  check("the gallery shows names and descriptions", enCards.names.length > 10 && enCards.descs.length > 10, `names=${enCards.names.length} descs=${enCards.descs.length}`);
  check("both read English first", enCards.names.every((n) => /[A-Za-z]/.test(n) && !/[\uac00-\ud7a3]/.test(n)) && enCards.descs.every((d) => /[A-Za-z]/.test(d) && !/[\uac00-\ud7a3]/.test(d)), "");

  const menu = await openSelector(page);
  await menu.getByRole("menuitem", { name: "한국어" }).click();
  await page.waitForTimeout(300);
  check("still the gallery page (no reload happened)", page.url().endsWith("/effects"), page.url());
  const koCards = await readCards(page);
  check("the names and descriptions kept their counts", koCards.names.length === enCards.names.length && koCards.descs.length === enCards.descs.length, "");
  check("every card name is Korean after the switch", koCards.names.every((n) => /[\uac00-\ud7a3]/.test(n)), JSON.stringify(koCards.names.filter((n) => !/[\uac00-\ud7a3]/.test(n))));
  check("every card description is Korean after the switch", koCards.descs.every((d) => /[\uac00-\ud7a3]/.test(d)), JSON.stringify(koCards.descs.filter((d) => !/[\uac00-\ud7a3]/.test(d)).slice(0, 6)));
  check("no card text kept its English words", !koCards.names.some((n, i) => n === enCards.names[i]) && !koCards.descs.some((d, i) => d === enCards.descs[i]), "");

  const menuBack = await openSelector(page);
  await menuBack.getByRole("menuitem", { name: "English" }).click();
  await page.waitForTimeout(300);
  const backCards = await readCards(page);
  check("the English names come back byte for byte", JSON.stringify(backCards.names) === JSON.stringify(enCards.names), JSON.stringify(backCards.names.filter((n, i) => n !== enCards.names[i]).slice(0, 6)));
  check("the English descriptions come back byte for byte", JSON.stringify(backCards.descs) === JSON.stringify(enCards.descs), JSON.stringify(backCards.descs.filter((d, i) => d !== enCards.descs[i]).slice(0, 4)));
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
