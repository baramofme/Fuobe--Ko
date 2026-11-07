"use client";

import { useQueries } from "@tanstack/react-query";
import { Info, Loader2, Workflow } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SkillIcon } from "@/components/assist/skill-icon";
import { useSkills } from "@/components/assist/hooks";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { recipeToCanvas } from "@/lib/catalog/canvas-recipe";
import type { RecipeView } from "@/lib/recipe";
import { toastError } from "@/lib/refusals";
import { useI18n } from "@/lib/i18n/use-i18n";
import { useCanvasActions } from "./use-canvas";

/** The fallback a skill's recipe gets when its own error text is missing (the data-layer original; the render site
 * resolves the sibling key, so a language switch re-renders it — byte-identical under vitest's default English). */
const UNREADABLE = "This skill can't be read";

/**
 * Canvas → Skills (package W5): the skills that run by themselves, each drawn as a canvas on request ("Open as canvas"
 * makes a new canvas of its steps, to change a model or a link visually and save it back as a skill). A skill whose steps
 * a canvas can't hold yet says why instead.
 */
export function SkillCanvases({ visitor }: { visitor: boolean }) {
  const { t } = useI18n();
  const skills = useSkills();
  const router = useRouter();
  const { create } = useCanvasActions();
  const [busy, setBusy] = useState<string | null>(null);
  const list = (skills.data ?? []).filter((s) => s.recipe);
  const views = useQueries({
    queries: list.map((s) => ({
      queryKey: ["assist-recipe", s.name],
      retry: false,
      queryFn: async () => {
        const res = await fetch(`/api/assist/skills/${encodeURIComponent(s.name)}/recipe`);
        if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? UNREADABLE);
        return (await res.json()) as RecipeView;
      },
    })),
  });
  const open = async (view: RecipeView) => {
    setBusy(view.name);
    try {
      const { graph } = recipeToCanvas(view.recipe);
      const c = await create({ name: view.title.slice(0, 80), graph });
      router.push(`/canvas/${c.id}`);
    } catch (e) {
      toastError(e);
      setBusy(null);
    }
  };
  if (skills.isLoading)
    return (
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    );
  if (!list.length)
    return (
      <div className="mt-6 rounded-2xl border border-dashed px-5 py-8 text-center">
        <p className="text-[15px] font-medium">{t("canvas.skillCanvases.emptyTitle")}</p>
        <p className="mx-auto mt-1 max-w-md text-[13px] text-muted-foreground">{t("canvas.skillCanvases.emptyNote")}</p>
      </div>
    );
  return (
    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" data-skill-canvases>
      {list.map((s, i) => {
        const q = views[i];
        const drawn = q.data ? recipeToCanvas(q.data.recipe) : null;
        return (
          <article key={s.name} className="flex flex-col gap-3 rounded-xl border bg-card p-4">
            <div className="flex items-start gap-3">
              <SkillIcon name={s.name} icon={s.icon} />
              <div className="min-w-0 flex-1">
                <h3 className="text-[14px] font-medium break-words">{s.title}</h3>
                <p className="line-clamp-2 text-[13px] text-muted-foreground">{s.description}</p>
              </div>
            </div>
            {q.isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : q.isError ? (
              <p className="text-[12px] text-muted-foreground">{(q.error as Error).message === UNREADABLE ? t("canvas.skillCanvases.unreadable") : (q.error as Error).message}</p>
            ) : drawn?.readOnly ? (
              <p className="flex items-start gap-1.5 text-[12px] text-muted-foreground">
                <Info className="mt-px size-3.5 shrink-0" aria-hidden /> {drawn.readOnly}.
              </p>
            ) : (
              <div className="mt-auto flex flex-wrap items-center gap-2">
                <span className="text-[12px] text-muted-foreground">
                  {t(q.data!.recipe.steps.length === 1 ? "canvas.skillCanvases.stepSingular" : "canvas.skillCanvases.stepPlural", { count: q.data!.recipe.steps.length })}
                  {t(q.data!.recipe.params.length === 1 ? "canvas.skillCanvases.inputSingular" : "canvas.skillCanvases.inputPlural", { count: q.data!.recipe.params.length })}
                </span>
                {!visitor && (
                  <Button size="sm" className="ml-auto rounded-full" onClick={() => void open(q.data!)} disabled={!!busy}>
                    {busy === s.name ? <Loader2 className="animate-spin" /> : <Workflow />} {t("canvas.skillCanvases.openAsCanvas")}
                  </Button>
                )}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
