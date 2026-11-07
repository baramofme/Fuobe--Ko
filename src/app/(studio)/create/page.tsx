import type { Metadata } from "next";
import { AreaBody, AreaHero, areaIds, AreaJsonLd, AreaPage, AreaSections, MoreInFuobe, NewCreation, sectionTabs } from "@/components/areas/area-page";
import { getServerLang } from "@/lib/i18n/server-lang";
import { translate } from "@/lib/i18n/store";
import { areaShowcase } from "@/lib/area-showcase";

/** Server-rendered metadata: the title and description follow the cookie's language on the server. */
export async function generateMetadata(): Promise<Metadata> {
  const lang = await getServerLang();
  return {
    title: translate(lang, "meta.create.title"),
    description: translate(lang, "meta.create.description"),
    alternates: { canonical: "/create" },
  };
}

/** Everything in the Create menu and more: what makes something new, and what changes a picture, a clip or a sound. */
export default async function Page() {
  const { count, sections } = await areaShowcase("create");
  const tabs = await sectionTabs(sections);
  return (
    <AreaPage>
      <AreaHero id="create" count={count} search={areaIds(sections)} action={<NewCreation />} />
      <AreaBody id="create" tabs={tabs}>
        <AreaSections sections={sections} />
      </AreaBody>
      <MoreInFuobe current="create" />
      <AreaJsonLd id="create" items={sections.flatMap((s) => s.cards)} />
    </AreaPage>
  );
}
