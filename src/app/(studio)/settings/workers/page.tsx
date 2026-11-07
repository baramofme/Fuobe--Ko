import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, PageShell } from "@/components/page-shell";
import { WorkersAdmin } from "@/components/workers-admin";
import { getServerLang } from "@/lib/i18n/server-lang";
import { translate } from "@/lib/i18n/store";

export const metadata: Metadata = { title: "Workers" };

/** Settings → Workers (the owner only): the GPUs on other machines that run this studio's ComfyUI jobs. */
export default async function Page() {
  const lang = await getServerLang();
  const t = (key: string, params?: { [k: string]: string | number }) => translate(lang, key, params);
  return (
    <PageShell>
      <Link href="/settings" className="mb-3 inline-flex items-center gap-1.5 rounded-md text-[13px] text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> {t("studio.settings.settings")}
      </Link>
      <PageHeader title={t("studio.workers.title")} description={t("studio.workers.desc")} />
      <WorkersAdmin />
    </PageShell>
  );
}