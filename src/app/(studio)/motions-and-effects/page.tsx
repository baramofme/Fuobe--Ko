import type { Metadata } from "next";
import { AREA_SECTION, AreaBody, AreaHero, AreaJsonLd, AreaPage, MoreInFuobe } from "@/components/areas/area-page";
import type { AreaTab } from "@/components/areas/area-islands";
import { PresetRail, SectionHead, ShowcaseWall } from "@/components/home/home-sections";
import { PILL, PILL_TAP } from "@/components/home/pill";
import { IntentLink } from "@/components/intent-link";
import { motionsAreaShowcase } from "@/lib/area-showcase";
import { cn } from "@/lib/utils";
import { getServerLang } from "@/lib/i18n/server-lang";
import { translate } from "@/lib/i18n/store";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getServerLang();
  return {
    title: translate(lang, "mae.metaTitle"),
    description: translate(lang, "mae.metaDesc"),
    alternates: { canonical: "/motions-and-effects" },
  };
}

const categoryHref = (gallery: string, c: string) => `${gallery}?category=${encodeURIComponent(c)}`;

/** A gallery's row: its heading with "See all", Home's preset cards, then every category as a pill. */
function GalleryRow({
  id,
  title,
  line,
  href,
  data,
  pillsLabel,
}: {
  id: string;
  title: string;
  line: string;
  href: string;
  data: Awaited<ReturnType<typeof motionsAreaShowcase>>["motions"];
  pillsLabel: string;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} data-reveal className={AREA_SECTION}>
      <SectionHead id={`${id}-title`} title={title} count={data.count} all={href} line={line} />
      {/* Four a row, as the other area pages' cards, so every line under a picture shows whole. */}
      <PresetRail items={data.row} className="sm:grid-cols-4" />
      <h3 className="mt-6 mb-2 font-sans text-[13px] text-muted-foreground">{pillsLabel}</h3>
      <ul className="flex flex-wrap gap-1.5">
        {data.categories.map((c) => (
          <li key={c}>
            <IntentLink href={categoryHref(href, c)} className={cn(PILL, PILL_TAP)}>
              {c}
            </IntentLink>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Both preset galleries on one page: a playing wall of the best, then each gallery's first row and its categories. */
export default async function Page() {
  const lang = await getServerLang();
  const { wall, motions, effects } = await motionsAreaShowcase();
  const tabs: AreaTab[] = [
    { href: "#camera-motions", label: translate(lang, "mae.tabMotions"), icon: "Film", section: "camera-motions" },
    { href: "#effects", label: translate(lang, "mae.tabEffects"), icon: "Sparkles", section: "effects" },
  ];
  return (
    <AreaPage>
      <AreaHero id="motions" count={motions.count + effects.count} />
      <AreaBody id="motions" tabs={tabs}>
        <ShowcaseWall wall={wall} label={translate(lang, "mae.showcaseLabel")} foot={false} />
        <GalleryRow
          id="camera-motions"
          title={translate(lang, "mae.tabMotions")}
          line={translate(lang, "mae.motionsLine")}
          href="/motions"
          data={motions}
          pillsLabel={translate(lang, "mae.motionsPills")}
        />
        <GalleryRow id="effects" title={translate(lang, "mae.tabEffects")} line={translate(lang, "mae.effectsLine")} href="/effects" data={effects} pillsLabel={translate(lang, "mae.effectsPills")} />
      </AreaBody>
      <MoreInFuobe current="motions" />
      <AreaJsonLd
        id="motions"
        items={[
          { label: "Camera motions", href: "/motions" },
          { label: "Effects", href: "/effects" },
          ...wall.map((t) => ({ label: t.card.name, href: t.href })),
        ]}
      />
    </AreaPage>
  );
}
