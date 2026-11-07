import type { Metadata } from "next";
import { AccountsAdmin } from "@/components/accounts-admin";
import { AccountGpuSection } from "@/components/gpu/account-gpu-section";
import { AccountKeysSection } from "@/components/keys/your-keys";
import { OwnerSettings, SettingsIntro } from "@/components/owner-settings";
import { PageHeader, PageShell } from "@/components/page-shell";
import { SettingsForm } from "@/components/settings-form";
import { starterPriceLine } from "@/lib/starter-prices";
import { getServerLang } from "@/lib/i18n/server-lang";
import { translate } from "@/lib/i18n/store";

export const metadata: Metadata = { title: "Settings" };

export default async function Page() {
  const lang = await getServerLang();
  const t = (key: string, params?: { [k: string]: string | number }) => translate(lang, key, params);
  const prices = starterPriceLine();
  return (
    <PageShell>
      <PageHeader title={t("studio.settings.settings")} description={<SettingsIntro />} />
      <AccountGpuSection />
      <AccountKeysSection prices={prices} />
      <OwnerSettings>
        <SettingsForm prices={prices} />
      </OwnerSettings>
      <AccountsAdmin />
    </PageShell>
  );
}
