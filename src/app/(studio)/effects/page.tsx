import type { Metadata } from "next";
import { AreaBackLink } from "@/components/areas/area-page";
import { PageHeader, PageShell } from "@/components/page-shell";
import { PresetGallery } from "@/components/preset-gallery";
import { EFFECTS } from "@/lib/catalog";
import { toPresetCard } from "@/lib/preset-card-data";
import { featuredGallery } from "@/lib/preset-featured";
import { getServerLang } from "@/lib/i18n/server-lang";
import { translate } from "@/lib/i18n/store";

/** Server-rendered metadata: the title and description follow the cookie's language on the server. */
export async function generateMetadata(): Promise<Metadata> {
  const lang = await getServerLang();
  return {
    title: translate(lang, "effects.metaTitle"),
    description: translate(lang, "effects.metaDesc"),
    alternates: { canonical: "/effects" },
  };
}

export default async function Page() {
  const lang = await getServerLang();
  return (
    <PageShell>
      <AreaBackLink id="motions" />
      <PageHeader
        title={translate(lang, "effects.title")}
        description={translate(lang, "effects.line")}
      />
      <PresetGallery {...featuredGallery(EFFECTS.map(toPresetCard))} href="/video?preset={id}" noun="effects" />
    </PageShell>
  );
}
