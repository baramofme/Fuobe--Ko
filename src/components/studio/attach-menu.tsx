"use client";

import { useI18n } from "@/lib/i18n";

import { ClipboardPaste, Plus, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { useAskBeforeUpload } from "@/lib/api";
import type { MediaKind } from "@/lib/catalog/types";
import { useModKey } from "@/lib/keys";
import { ACCEPT, LibraryGrid, type SlotValue } from "./media-slot";
import { ResponsivePanel } from "./responsive-panel";
import { useQueryClient } from "@tanstack/react-query";

const KIND_KEYS: Record<MediaKind, string> = { image: "studio.attach.kindImages", video: "studio.attach.kindVideos", audio: "studio.attach.kindAudio", text: "studio.attach.kindText", model3d: "studio.attach.kindModel3d" };

/**
 * Read pasteable media from the clipboard. Needs the browser's clipboard permission and a secure
 * origin (plain-http LAN addresses have no Clipboard API): when it fails, the caller suggests ⌘V / Ctrl+V.
 */
async function clipboardFiles(): Promise<File[]> {
  if (!navigator.clipboard?.read) throw new Error("No clipboard access here");
  const items = await navigator.clipboard.read();
  const files: File[] = [];
  for (const item of items) {
    const type = item.types.find((t) => /^(image|video|audio)\//.test(t));
    if (!type) continue;
    const blob = await item.getType(type);
    files.push(new File([blob], `pasted.${type.split("/")[1]?.replace("jpeg", "jpg") ?? "png"}`, { type }));
  }
  return files;
}

/**
 * The composer's "+": upload from the device, paste, or pick something you made or uploaded
 * before. Attachments land in the first empty slot of their kind, then in the references.
 */
export function AttachMenu({ kinds, onFiles, onPick }: { kinds: MediaKind[]; onFiles: (files: File[]) => void; onPick: (v: SlotValue) => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const mod = useModKey();
  const askFirst = useAskBeforeUpload();
  const qc = useQueryClient();
  /** Someone whose upload would be refused gets its card instead of the file chooser: the panel makes way for it. */
  const refused = () => {
    if (!askFirst()) return false;
    setOpen(false);
    return true;
  };
  const paste = async () => {
    if (refused()) return;
    try {
      const files = await clipboardFiles();
      if (!files.length) return toast(t("studio.attach.nothingToPaste"));
      onFiles(files);
      setOpen(false);
    } catch {
      toast(t("studio.attach.pasteHint", { mod: mod === "⌘" ? "⌘V" : "Ctrl+V" }));
    }
  };
  const words = kinds.map((k) => t(KIND_KEYS[k]));
  // The kinds read as one list: commas, then the language's own "or" before the last one.
  const kindsText = words.length < 2 ? words.join("") : words.slice(0, -1).join(", ") + t("studio.attach.orWord") + words[words.length - 1];
  return (
    <ResponsivePanel
      open={open}
      onOpenChange={(v) => {
        if (v) void qc.invalidateQueries({ queryKey: ["assets"] });
        setOpen(v);
      }}
      title={t("studio.attach.add")}
      description={t("studio.attach.describe", { kinds: kindsText })}
      className="w-[min(92vw,360px)] p-2.5"
      tooltip={t("studio.attach.tooltip")}
      trigger={
        <button
          type="button"
          aria-label={t("studio.attach.add")}
          className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground transition-colors outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <Plus className="size-4" />
        </button>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-1.5">
          <Button variant="secondary" className="h-10 justify-start gap-2" onClick={() => refused() || input.current?.click()}>
            <Upload /> {t("studio.attach.upload")}
          </Button>
          <Button variant="secondary" className="h-10 justify-start gap-2" onClick={paste}>
            <ClipboardPaste /> {t("studio.attach.paste")}
            <span className="ml-auto hidden items-center gap-0.5 sm:flex">
              <Kbd>{mod}</Kbd>
              <Kbd>V</Kbd>
            </span>
          </Button>
        </div>
        <input
          ref={input}
          type="file"
          multiple
          hidden
          accept={kinds.map((k) => ACCEPT[k]).join(",")}
          onChange={(e) => {
            const files = [...(e.target.files ?? [])];
            e.target.value = "";
            if (files.length) {
              onFiles(files);
              setOpen(false);
            }
          }}
        />
        <div className="space-y-1.5">
          <p className="text-[12px] font-medium text-muted-foreground">{t("studio.attach.fromLibrary")}</p>
          {open && (
            <LibraryGrid
              kinds={kinds}
              onPick={(v) => {
                onPick(v);
                setOpen(false);
              }}
            />
          )}
        </div>
      </div>
    </ResponsivePanel>
  );
}
