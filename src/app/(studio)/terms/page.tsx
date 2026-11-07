import type { Metadata } from "next";
import Link from "next/link";
import { Cloud, CodeXml, ImageUp, Palette, Sparkles, Users } from "lucide-react";
import { LegalPage, LegalSection } from "@/components/legal-page";
import { FUOBE_REPO } from "@/lib/connections";
import { getServerLang } from "@/lib/i18n/server-lang";
import { translate } from "@/lib/i18n/store";

export const metadata: Metadata = { title: "Terms", description: "Simple terms for a creative studio." };

export default async function Page() {
  const lang = await getServerLang();
  const t = (key: string, params?: { [k: string]: string | number }) => translate(lang, key, params);
  return (
    <LegalPage title={t("studio.terms.title")} lead={t("studio.terms.lead")} updated="3 November 2026" cards>
      <LegalSection title={t("studio.terms.using")} icon={Sparkles}>
        <p>{t("studio.terms.usingLine")}</p>
      </LegalSection>
      <LegalSection title={t("studio.terms.upload")} icon={ImageUp}>
        <p>{t("studio.terms.uploadLine")}</p>
      </LegalSection>
      <LegalSection title={t("studio.terms.made")} icon={Palette}>
        <p>
          {t("studio.terms.madePre")}{" "}
          <Link href="/settings/licences">{t("home.footer.thanks")}</Link> {t("studio.terms.madePost")}
        </p>
      </LegalSection>
      <LegalSection title={t("studio.terms.fair")} icon={Users}>
        <p>{t("studio.terms.fairLine")}</p>
      </LegalSection>
      <LegalSection title={t("studio.terms.service")} icon={Cloud}>
        <p>
          {t("studio.terms.servicePre")}{" "}
          <Link href="/privacy">{t("home.footer.privacy")}</Link> {t("studio.terms.servicePost")}
        </p>
      </LegalSection>
      <LegalSection title={t("studio.terms.code")} icon={CodeXml}>
        <p>
          Fuobe is open source under the MIT licence, and you&apos;re welcome to{" "}
          <a href={FUOBE_REPO} target="_blank" rel="noopener">
            run your own
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}