import { Suspense } from "react";
import {
  AppsSection,
  AssistSection,
  EffectsSection,
  HomeFooter,
  LiveEditSection,
  MotionsSection,
  OpenSourceSection,
  StartSection,
  StudiosSection,
} from "@/components/home/home-sections";
import {
  AppsSkeleton,
  AssistSkeleton,
  EffectsSkeleton,
  HomeFooterSkeleton,
  LiveEditSkeleton,
  MotionsSkeleton,
  OpenSourceSkeleton,
  StartSkeleton,
  StudiosSkeleton,
} from "@/components/home/home-skeletons";
import { HomeBento } from "@/components/home/home-bento";
import { HomeView } from "@/components/home-view";
import { GoalRow } from "@/components/nav/goal-row";
import { ASSIST_SUGGESTIONS } from "@/lib/assist";
import { getPreset } from "@/lib/catalog";
import { HOME_TRY, homeShowcase, roundedDown, type HomeShowcase } from "@/lib/home-showcase";
import { GOALS } from "@/lib/nav-model";
import { startQuotes, starterPriceLine } from "@/lib/starter-prices";
import { getServerLang } from "@/lib/i18n/server-lang";

/** The goal bands' one-tap presets by name, read here so the catalog stays on the server. */
function goalTapNames(): Record<string, string> {
  return Object.fromEntries(
    GOALS.flatMap((g) =>
      g.taps.map((t) => {
        const p = getPreset(t.preset);
        if (!p) throw new Error(`The goal row names ${t.preset}, which isn't in the catalog`);
        return [t.preset, p.name];
      }),
    ),
  );
}

/**
 * Studios' cards and pills name themselves in the language the visitor saved. Read it here, inside the section's
 * own boundary: the cookie stays out of the page's top level, so the shell prerenders and the labels stream in
 * when the request arrives.
 */
async function StudiosWithLang(props: Pick<HomeShowcase, "facts" | "studios" | "audioTools" | "pills">) {
  const lang = await getServerLang();
  return <StudiosSection lang={lang} {...props} />;
}

/**
 * The catalog stays on the server: Home gets slim cards, the numbers it quotes (each computed, lib/home-showcase.ts),
 * and what Start and the first-run guide cost. The first screen and the sections under the composer are server components.
 *
 * The words under the composer follow the visitor's saved language, which lives in a cookie — one per visitor, so it
 * can't be prerendered with the page. Every section that reads it sits under its own <Suspense> with a static shell
 * (home-skeletons.tsx): the build exports the page's shell from the cached showcase and those shells, and each
 * section's words stream in with the request. Reading a cookie at this component's top level would take the whole
 * page out of the prerender (Cache Components), which is why the language is read inside the boundaries instead.
 */
export default async function Page() {
  const home = await homeShowcase();
  return (
    <HomeView
      openModels={roundedDown(home.facts.openModels)}
      chips={HOME_TRY}
      assist={{ label: "Plan a perfume ad with Assist", href: `/assist?prompt=${encodeURIComponent(ASSIST_SUGGESTIONS[0])}` }}
      goals={<GoalRow names={goalTapNames()} />}
      bento={<HomeBento bento={home.bento} />}
      prices={starterPriceLine()}
      quotes={startQuotes()}
    >
      {/* Live edit is the highlight: its own section comes first, right under the first screen and the composer. */}
      <Suspense fallback={<LiveEditSkeleton />}>
        <LiveEditSection />
      </Suspense>
      {/* Camera motions, then Effects. */}
      <Suspense fallback={<MotionsSkeleton />}>
        <MotionsSection facts={home.facts} motions={home.motions} />
      </Suspense>
      <Suspense fallback={<EffectsSkeleton />}>
        <EffectsSection facts={home.facts} effects={home.effects} />
      </Suspense>
      <Suspense fallback={<AppsSkeleton />}>
        <AppsSection facts={home.facts} beforeAfter={home.beforeAfter} reveals={home.reveals} />
      </Suspense>
      <Suspense fallback={<StudiosSkeleton />}>
        <StudiosWithLang facts={home.facts} studios={home.studios} audioTools={home.audioTools} pills={home.pills} />
      </Suspense>
      <Suspense fallback={<AssistSkeleton />}>
        <AssistSection facts={home.facts} skills={home.skills} />
      </Suspense>
      <Suspense fallback={<OpenSourceSkeleton />}>
        <OpenSourceSection facts={home.facts} newModels={home.newModels} />
      </Suspense>
      <Suspense fallback={<StartSkeleton />}>
        <StartSection />
      </Suspense>
      <Suspense fallback={<HomeFooterSkeleton />}>
        <HomeFooter />
      </Suspense>
    </HomeView>
  );
}
