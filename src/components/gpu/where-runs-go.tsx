"use client";

import { RunOnList } from "@/components/studio/run-on";
import { useStatus } from "@/lib/api";
import { useI18n } from "@/lib/i18n/use-i18n";
import { placeOf } from "@/lib/place-name";
import { placeRows } from "@/lib/run-place";
import { useSetRunOn } from "@/lib/run-on";
import { cn } from "@/lib/utils";

/**
 * Settings → Your GPU, at the top while hosted runs are on: "Where your runs go", the same rows as the Run on list (this
 * studio's GPUs, the account's GPU, its key), kept for every device. With nothing of its own, one line instead. Nothing
 * while hosted runs are off (self-hosters keep today's page).
 */
export function WhereRunsGo({ className }: { className?: string }) {
  const { t } = useI18n();
  const v = useStatus().data?.viewer;
  const setRunOn = useSetRunOn();
  if (!v?.hosted || v.kind !== "account") return null;
  const place = placeOf(v.placeName);
  const keys = v.paidAllowed === false ? [] : (v.keys ?? []);
  const provider = v.runKey && keys.includes(v.runKey) ? v.runKey : keys.includes("fal") ? "fal" : keys[0];
  const rows = placeRows(v, { key: provider ? { provider } : null, cloud: true });
  return (
    <div id="where-runs-go" className={cn("scroll-mt-28 space-y-1.5 rounded-xl border p-3 sm:max-w-[36rem] md:scroll-mt-20", className)}>
      <h3 className="px-2.5 text-[13px] font-semibold">{t("settings.gpu.whereRunsGo.title")}</h3>
      {rows ? (
        <>
          {/* No verb agrees with the place name (it may be one GPU or many). */}
          <p className="px-2.5 text-[12px] text-muted-foreground">{t("settings.gpu.whereRunsGo.runsOnNote", { place: place.text })}</p>
          <RunOnList
            rows={rows.rows}
            footer={null}
            label={t("settings.gpu.whereRunsGo.title")}
            disabled={setRunOn.isPending}
            onPick={(id) => setRunOn.mutate({ runOn: id, ...(id === "key" && provider && { key: provider }) })}
          />
        </>
      ) : (
        <p className="px-2.5 text-[12px] text-muted-foreground">{t("settings.gpu.whereRunsGo.goToNote", { place: place.text })}</p>
      )}
    </div>
  );
}
