"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useGenerationActions } from "@/lib/api";
import type { Generation } from "@/lib/catalog/types";
import { useI18n } from "@/lib/i18n";

/**
 * An account's "Delete for good…" on a result (its ⋯ menu, in any feed or the viewer): an account has no Trash, so the
 * delete can't be undone, and it is asked first. One host (in the app's providers) answers every menu.
 */

const EVENT = "fuobe:delete-for-good";

interface Ask {
  gs: Generation[];
  after?: () => void;
}

/** Ask before an account's results are deleted for good; `after` runs once it's confirmed (a viewer closes). */
export function askDeleteForGood(gs: Generation[], after?: () => void): void {
  if (gs.length) window.dispatchEvent(new CustomEvent<Ask>(EVENT, { detail: { gs, after } }));
}

const running = (g: Generation) => g.status === "queued" || g.status === "running";

export function DeleteForGoodHost() {
  const actions = useGenerationActions();
  const { t } = useI18n();
  const [ask, setAsk] = useState<Ask | null>(null);
  useEffect(() => {
    const on = (e: Event) => setAsk((e as CustomEvent<Ask>).detail);
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);
  const n = ask?.gs.length ?? 0;
  const active = ask?.gs.some(running) ?? false;
  return (
    <AlertDialog open={!!ask} onOpenChange={(v) => !v && setAsk(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{n === 1 ? t("studio.deleteForGood.titleOne") : t("studio.deleteForGood.title", { count: n })}</AlertDialogTitle>
          <AlertDialogDescription>
            {n === 1 ? t("studio.deleteForGood.descOne") : t("studio.deleteForGood.descMany")}
            {active && (n === 1 ? t("studio.deleteForGood.runningOne") : t("studio.deleteForGood.runningMany"))}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              if (!ask) return;
              void actions.deleteOwn(ask.gs).then((done) => done && toast(done === 1 ? t("studio.deleteForGood.deletedOne") : t("studio.deleteForGood.deletedMany", { count: done })));
              ask.after?.();
            }}
          >
            {t("studio.deleteForGood.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
