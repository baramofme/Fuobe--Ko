import type { Metadata } from "next";
import { AreaBackLink } from "@/components/areas/area-page";
import { PageHeader, PageShell } from "@/components/page-shell";
import { PresetGallery } from "@/components/preset-gallery";
import { MOTIONS } from "@/lib/catalog";
import { toPresetCard } from "@/lib/preset-card-data";
import { featuredGallery } from "@/lib/preset-featured";
import { getServerLang } from "@/lib/i18n/server-lang";
import { translate } from "@/lib/i18n/store";

/** Server-rendered metadata: the title and description follow the cookie's language on the server. */
export async function generateMetadata(): Promise<Metadata> {
  const lang = await getServerLang();
  return {
    title: translate(lang, "motions.metaTitle"),
    description: translate(lang, "motions.metaDesc"),
    alternates: { canonical: "/motions" },
  };
}

export default async function Page() {
  const lang = await getServerLang();
  return (
    <PageShell>
      <AreaBackLink id="motions" />
      <PageHeader
        title={translate(lang, "motions.title")}
        description={translate(lang, "motions.line")}
      />
      <PresetGallery {...featuredGallery(MOTIONS.map(toPresetCard))} href="/video?preset={id}" noun="moves" />
    </PageShell>
  );
}
