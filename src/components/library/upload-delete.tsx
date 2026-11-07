"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { UploadDeleteContext } from "@/components/studio/result-actions";
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
import { assetUsage, useDeleteUpload } from "@/lib/api";
import type { Generation } from "@/lib/catalog/types";
import { toastError } from "@/lib/refusals";
import { useI18n } from "@/lib/i18n/use-i18n";

type Check = { state: "checking" } | { state: "free" } | { state: "used"; usedBy: string } | { state: "error"; message: string };

/**
 * Deleting an upload (the Library's Uploads tab and its viewer): first ask the server where the
 * file is used. Nothing: confirm, then delete it for good (uploads skip the Trash, as in the parity research).
 * Something: say where, so the person knows what to remove first.
 */
export function UploadDeleteProvider({ children }: { children: React.ReactNode }) {
  const { t: tt } = useI18n();
  const remove = useDeleteUpload();
  const [pending, setPending] = useState<{ g: Generation; after?: () => void; check: Check } | null>(null);
  const ask = useCallback((g: Generation, after?: () => void) => {
    setPending({ g, after, check: { state: "checking" } });
    assetUsage(g.id)
      .then((u) => setPending((p) => (p?.g.id === g.id ? { ...p, check: u.usedBy ? { state: "used", usedBy: u.usedBy } : { state: "free" } } : p)))
      .catch((e: Error) => setPending((p) => (p?.g.id === g.id ? { ...p, check: { state: "error", message: e.message } } : p)));
  }, []);
  const check = pending?.check;
  const name = pending?.g.request.prompt?.trim() || tt("library.uploadDelete.thisUpload");
  return (
    <UploadDeleteContext.Provider value={ask}>
      {children}
      <AlertDialog open={!!pending} onOpenChange={(v) => !v && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="break-words">{check?.state === "used" ? tt("library.uploadDelete.inUse") : tt("library.uploadDelete.title", { name })}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                {check?.state === "checking" && (
                  <span className="inline-flex items-center gap-1.5">
                    <Loader2 className="size-3.5 animate-spin" /> {tt("library.uploadDelete.checking")}
                  </span>
                )}
                {check?.state === "free" && tt("library.uploadDelete.freeDesc")}
                {check?.state === "used" && (
                  <>
                    {tt("library.uploadDelete.usedDesc", { usedBy: check.usedBy })}
                  </>
                )}
                {check?.state === "error" && check.message}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {check?.state === "used" || check?.state === "error" ? (
              <AlertDialogCancel>{tt("library.ok")}</AlertDialogCancel>
            ) : (
              <>
                <AlertDialogCancel>{tt("common.cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  disabled={check?.state !== "free"}
                  onClick={() => {
                    if (!pending) return;
                    remove.mutate(pending.g.id, {
                      onSuccess: () => toast(tt("library.uploadDelete.deleted")),
                      onError: (e) => toastError(e),
                    });
                    pending.after?.();
                  }}
                >
                  {tt("library.uploadDelete.btn")}
                </AlertDialogAction>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </UploadDeleteContext.Provider>
  );
}
