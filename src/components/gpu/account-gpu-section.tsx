"use client";

import { ConnectChoice } from "@/components/gpu/connect-choice";
import { PairedComfyUIs } from "@/components/gpu/fuobe-connect";
import { WhereRunsGo } from "@/components/gpu/where-runs-go";
import { useI18n } from "@/lib/i18n/use-i18n";
import { useHashAnchor } from "@/components/use-hash-anchor";
import { useHydrated, useStatus, useViewer } from "@/lib/api";

/**
 * Settings for an account (public sign-up): "Your GPU", at the top of the page (signing out is in Account, below).
 * Nothing for the owner or a guest, and nothing until hydrated: the server's HTML has none.
 */
export function AccountGpuSection() {
  const { t } = useI18n();
  const hydrated = useHydrated();
  const account = useViewer().data?.account;
  // Hosted runs: runs already work without a GPU of one's own, so connecting one is optional.
  const hosted = !!useStatus().data?.viewer?.hosted;
  const shown = hydrated && !!account;
  // A link to /settings#your-gpu arrives before this section exists: it is scrolled to once it does.
  useHashAnchor("your-gpu", shown);
  if (!shown) return null;
  return (
    <section id="your-gpu" aria-labelledby="your-gpu-title" className="grid scroll-mt-28 grid-cols-[minmax(0,1fr)] gap-6 border-b py-8 md:scroll-mt-20 md:grid-cols-[260px_minmax(0,1fr)]">
      <div className="min-w-0">
        <h2 id="your-gpu-title" className="text-[15px] font-semibold">
          {t("settings.gpu.title")}
        </h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {hosted ? t("settings.gpu.optional") : t("settings.gpu.free")}
        </p>
      </div>
      <div className="min-w-0 space-y-4">
        {/* Hosted runs: where the account's runs go, first. */}
        {hosted && <WhereRunsGo />}
        <ConnectChoice />
        <PairedComfyUIs className="sm:max-w-[36rem]" />
      </div>
    </section>
  );
}
