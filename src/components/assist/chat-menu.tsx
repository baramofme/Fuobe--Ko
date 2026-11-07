"use client";

import { BookmarkPlus, Check, FolderInput, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useId, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n/use-i18n";
import type { AssistThreadSummary } from "@/lib/assist";
import { cn } from "@/lib/utils";
import { toastError } from "@/lib/refusals";
import { useSkillBuilder } from "@/components/skills/skill-builder-provider";
import { useChatActions, useProjects } from "./hooks";
import { ProjectDot } from "./project-dot";

/**
 * A chat's menu (the rail row and the chat header): rename it, move it into a project or out of
 * one, save what ran in it as a skill, delete it. While a reply is running the server refuses a move, and says so in a toast.
 */
export function ChatMenu({
  chat,
  onDeleted,
  className,
  align = "end",
}: {
  chat: Pick<AssistThreadSummary, "id" | "title" | "projectId" | "status">;
  onDeleted?: () => void;
  className?: string;
  align?: "start" | "end";
}) {
  const { t: tr } = useI18n();
  const projects = useProjects();
  const actions = useChatActions();
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const builder = useSkillBuilder();
  const move = async (projectId: string | null) => {
    if ((chat.projectId ?? null) === projectId) return;
    try {
      await actions.patch(chat.id, { projectId });
      const p = projects.data?.find((x) => x.id === projectId);
      toast(p ? tr("assist.chatMenu.movedTo", { name: p.name }) : tr("assist.chatMenu.movedOut"), { duration: 1500 });
    } catch (e) {
      toastError(e);
    }
  };
  const remove = async () => {
    try {
      await actions.remove(chat.id);
      onDeleted?.();
      toast(tr("assist.chatMenu.deleted"), { duration: 1500 });
    } catch (e) {
      toastError(e);
    }
  };
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" className={cn("text-muted-foreground", className)} aria-label={tr("assist.chatMenu.moreFor", { title: chat.title })}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={align} className="w-52">
          <DropdownMenuItem onSelect={() => setRenaming(true)}>
            <Pencil /> {tr("assist.chatMenu.rename")}
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <FolderInput /> {tr("assist.chatMenu.moveToProject")}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="max-h-72 w-52 overflow-y-auto">
              <DropdownMenuItem onSelect={() => void move(null)}>
                <span className="size-2.5 shrink-0 rounded-full border border-dashed border-muted-foreground" aria-hidden />
                <span className="flex-1">{tr("assist.chatMenu.noProject")}</span>
                {!chat.projectId && <Check className="text-brand-text" aria-label={tr("assist.chatMenu.current")} />}
              </DropdownMenuItem>
              {projects.data?.length ? <DropdownMenuSeparator /> : null}
              {projects.data?.map((p) => (
                <DropdownMenuItem key={p.id} onSelect={() => void move(p.id)}>
                  <ProjectDot project={p} />
                  <span className="min-w-0 flex-1 truncate">{p.name}</span>
                  {chat.projectId === p.id && <Check className="text-brand-text" aria-label={tr("assist.chatMenu.current")} />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          {builder && (
            <DropdownMenuItem onSelect={() => builder.openChat(chat.id)}>
              <BookmarkPlus /> {tr("assist.chatMenu.saveSkill")}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(true)}>
            <Trash2 /> {tr("assist.chatMenu.deleteEllipsis")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={renaming} onOpenChange={setRenaming}>
        <DialogContent className="sm:max-w-[420px]">{renaming && <RenameForm chat={chat} onDone={() => setRenaming(false)} />}</DialogContent>
      </Dialog>
      <AlertDialog open={deleting} onOpenChange={setDeleting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tr("assist.chatMenu.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{tr("assist.chatMenu.deleteDesc", { title: chat.title })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tr("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => void remove()}>
              {tr("canvas.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function RenameForm({ chat, onDone }: { chat: Pick<AssistThreadSummary, "id" | "title">; onDone: () => void }) {
  const { t: tr } = useI18n();
  const actions = useChatActions();
  const id = useId();
  const [title, setTitle] = useState(chat.title);
  const [busy, setBusy] = useState(false);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (!t || t === chat.title) return onDone();
    setBusy(true);
    try {
      await actions.patch(chat.id, { title: t });
      onDone();
    } catch (err) {
      toastError(err);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={save} className="space-y-4">
      <DialogHeader>
        <DialogTitle className="font-heading text-[24px] font-normal">{tr("assist.chatMenu.renameTitle")}</DialogTitle>
        <DialogDescription className="sr-only">{tr("assist.chatMenu.renameDesc")}</DialogDescription>
      </DialogHeader>
      <div className="space-y-2">
        <Label htmlFor={id}>{tr("assist.chatMenu.name")}</Label>
        <Input id={id} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} autoFocus onFocus={(e) => e.currentTarget.select()} />
      </div>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onDone}>
          {tr("common.cancel")}
        </Button>
        <Button type="submit" disabled={busy || !title.trim()}>
          {tr("common.save")}
        </Button>
      </DialogFooter>
    </form>
  );
}
