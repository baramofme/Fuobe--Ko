import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/legal-page";
import { FUOBE_REPO } from "@/lib/connections";
import { getServerLang } from "@/lib/i18n/server-lang";
import { translate } from "@/lib/i18n/store";

export const metadata: Metadata = { title: "Privacy", description: "What Fuobe keeps when you use it, for how long, and how to remove it." };

export default async function Page() {
  const lang = await getServerLang();
  const t = (key: string, params?: { [k: string]: string | number }) => translate(lang, key, params);
  return (
    <LegalPage title={t("studio.privacy.title")} lead={t("studio.privacy.lead")} updated="1 November 2026">
      <LegalSection title={t("studio.privacy.kept")}>
        <p>{t("studio.privacy.keptLine")}</p>
      </LegalSection>
      <LegalSection title={t("studio.privacy.howLong")}>
        <p>{t("studio.privacy.howLongLine")}</p>
      </LegalSection>
      <LegalSection title={t("studio.privacy.whoSee")}>
        <p>{t("studio.privacy.whoSeeLine")}</p>
        <p>{t("studio.privacy.shareLine")}</p>
      </LegalSection>
      <LegalSection title={t("studio.privacy.gpuTitle")}>
        <p>{t("studio.privacy.gpuLine")}</p>
      </LegalSection>
      <LegalSection title={t("studio.privacy.cookies")}>
        <p>{t("studio.privacy.cookiesLine")}</p>
      </LegalSection>
      <LegalSection title={t("studio.privacy.deleteAccount")}>
        <p>
          <Link href="/settings">{t("studio.settings.settings")}</Link>{t("studio.privacy.deletePost")}
        </p>
      </LegalSection>
      <LegalSection title={t("studio.privacy.openTitle")}>
        <p>
          {t("studio.privacy.openLine")}{" "}
          <a href={FUOBE_REPO} target="_blank" rel="noopener">
            {t("studio.privacy.openLink")}
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
