import type { Metadata } from "next";
import { AreaBody, AreaHero, areaIds, AreaJsonLd, AreaPage, AreaSections, MoreInFuobe, sectionTabs } from "@/components/areas/area-page";
import { areaShowcase } from "@/lib/area-showcase";
import { getServerLang } from "@/lib/i18n/server-lang";
import { translate } from "@/lib/i18n/store";
import { studioCount } from "@/lib/nav-model";

/** Server-rendered metadata: the title and description follow the cookie's language on the server. */
export async function generateMetadata(): Promise<Metadata> {
  const lang = await getServerLang();
  return {
    title: translate(lang, "meta.studios.title"),
    description: translate(lang, "meta.studios.description", { n: studioCount() }),
    alternates: { canonical: "/studios" },
  };
}

/** Every studio, grouped as the bar's launcher groups them, each with its cover and line, then its tools. */
export default async function Page() {
  const { count, sections } = await areaShowcase("studios");
  const tabs = await sectionTabs(sections);
  return (
    <AreaPage>
      <AreaHero id="studios" count={count} search={areaIds(sections)} />
      <AreaBody id="studios" tabs={tabs}>
        <AreaSections sections={sections} />
      </AreaBody>
      <MoreInFuobe current="studios" />
      <AreaJsonLd id="studios" items={sections.flatMap((s) => [...s.cards, ...s.pills])} />
    </AreaPage>
  );
}
