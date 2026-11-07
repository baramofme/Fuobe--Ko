#!/usr/bin/env python3
"""
Wire studio components to use i18n t() calls.
Processes: viewer.tsx, feed.tsx, studio-page.tsx, engine-switch.tsx, frames-strip.tsx,
run-on.tsx, run-place-chip.tsx, preset-chips.tsx, look-chip.tsx, hosted-chips.tsx,
shots-editor.tsx, lyrics-editor.tsx, media-slot.tsx, prompt-input.tsx,
video-trimmer.tsx, voice-recorder.tsx, sketch-editor.tsx, sketch-tools.tsx,
layout-strip.tsx, compare-slider.tsx, delete-for-good.tsx, model-controls.tsx,
result-media.tsx.

For RSC: settings/page.tsx, workers/page.tsx, terms/page.tsx, privacy/page.tsx
"""
import re, os, sys

STUDIO = 'src/components/studio'
APP_STUDIO = 'src/app/(studio)'

# (old, new) replacement tuples for each file
WIRE_MAP = {}

# ── viewer.tsx ──────────────────────────────────────────────────────────────
WIRE_MAP['viewer.tsx'] = {
    'imports': 'import { AiTag, useAiTag } from "./ai-tag";',
    'hooks_details': '  const aiTag = useAiTag();\n  // A run on this studio',
    'hooks_viewer': '  const visitor = useLikelyVisitor();',
    'replacements': [
        # Row labels in Details
        ('label="Source" value="Your upload"',
         'label={t("studio.viewer.source")} value={t("studio.viewer.yourUpload")}'),
        ('label="Type"',
         'label={t("studio.viewer.type")}'),
        ('label="Added"',
         'label={t("studio.viewer.added")}'),
        ('label="Model"',
         'label={t("studio.viewer.model")}'),
        ('label="Made on" value={g.provider === "mock" ? "Placeholder" : g.provider === "local" ? "In your browser" : g.place === "pool" ? site : g.engine === "open" ? "Your GPU" : "Cloud"}',
         'label={t("studio.viewer.madeOn")} value={g.provider === "mock" ? t("studio.viewer.placeholderLabel") : g.provider === "local" ? t("studio.viewer.browserLabel") : g.place === "pool" ? site : g.engine === "open" ? t("studio.viewer.yourGpuLabel") : t("studio.viewer.cloudLabel")}'),
        ('label="Mode"',
         'label={t("studio.viewer.mode")}'),
        ('label={g.modelId.startsWith("fuobe-soul") ? "Look" : "Preset"}',
         'label={g.modelId.startsWith("fuobe-soul") ? t("studio.look.look") : t("studio.viewer.preset")}'),
        ('label="Finish"',
         'label={t("studio.viewer.finish")}'),
        ('label="Step"',
         'label={t("studio.viewer.step")}'),
        ('label="Layer"',
         'label={t("studio.viewer.layer")}'),
        ('label="Stem"',
         'label={t("studio.viewer.stem")}'),
        ('label="Language"',
         'label={t("studio.audio.language")}'),
        ('label="Aspect ratio"',
         'label={t("studio.settings.aspectRatio")}'),
        ('label="Quality"',
         'label={t("studio.settings.quality")}'),
        ('label="Duration"',
         'label={t("studio.settings.duration")}'),
        ('label="Seed"',
         'label={t("studio.settings.seed")}'),
        ('label="Cost"',
         'label={t("studio.viewer.cost")}'),
        ('label="Made"',
         'label={t("studio.viewer.made")}'),
        ('label="In Trash" value={`${trashDaysLeft(g.deletedAt)} days left`}',
         'label={t("studio.viewer.inTrash")} value={t("studio.viewer.daysLeft", { n: trashDaysLeft(g.deletedAt) })}'),
        ('label="Review"',
         'label={t("studio.viewer.review")}'),
        # Prompt display
        ('{g.modelId === "local-motion" ? "Words" : "Sent to the model"}',
         '{g.modelId === "local-motion" ? t("studio.viewer.words") : t("studio.viewer.sentToModel")}'),
        # Copy prompt button
        ('"Prompt copied"',
         't("studio.result.promptCopied")'),
        ('<Copy className="size-3" /> Copy prompt',
         '<Copy className="size-3" /> {t("studio.actions.copyPrompt")}'),
        # Negative prefix
        ('Negative: {g.request.negativePrompt}',
         '{t("studio.viewer.negativePrefix")} {g.request.negativePrompt}'),
        # actionButton label
        ('const label = a.id === "favorite" ? (g.favorite ? "Favorited" : "Favorite") : a.id === "save-character" ? "Save as element" : a.label;',
         'const label = a.id === "favorite" ? (g.favorite ? t("studio.viewer.favorited") : t("studio.actions.favorite")) : a.id === "save-character" ? t("studio.result.saveAsElement") : a.label;'),
        # Compare/Hide original buttons (both instances)
        ('{comparing ? "Hide original" : "Compare"}',
         '{comparing ? t("studio.viewer.hideOriginal") : t("studio.actions.compare")}'),
        # aria-labels
        ('aria-label="Previous"',
         'aria-label={t("studio.viewer.previous")}'),
        ('aria-label="Next"',
         'aria-label={t("studio.viewer.next")}'),
        ('aria-label="More actions and details"',
         'aria-label={t("studio.viewer.moreActionsDetails")}'),
        # DialogDescription
        ('<DialogDescription className="sr-only">Preview, actions and details</DialogDescription>',
         '<DialogDescription className="sr-only">{t("studio.viewer.previewDesc")}</DialogDescription>'),
        # Details heading
        ('<Info className="size-3.5" /> Details',
         '<Info className="size-3.5" /> {t("studio.viewer.detailsTitle")}'),
        # LayerList
        ('>Layers</p>',
         '>{t("studio.viewer.layers")}</p>'),
        ('<Layers className="size-4" /> All layers',
         '<Layers className="size-4" /> {t("studio.viewer.allLayers")}'),
        # Keyboard hints
        ('<Kbd>←</Kbd> <Kbd>→</Kbd> browse',
         '<Kbd>←</Kbd> <Kbd>→</Kbd> {t("studio.viewer.browse")}'),
        ('<Kbd>F</Kbd> favorite',
         '<Kbd>F</Kbd> {t("studio.viewer.favoriteShort")}'),
        ('<Kbd>P</Kbd> pin',
         '<Kbd>P</Kbd> {t("studio.viewer.pinShort")}'),
        ('<Kbd>C</Kbd> compare',
         '<Kbd>C</Kbd> {t("studio.viewer.compareShort")}'),
        ('<Kbd>D</Kbd> download',
         '<Kbd>D</Kbd> {t("studio.viewer.downloadShort")}'),
        ('<Kbd>R</Kbd> reuse',
         '<Kbd>R</Kbd> {t("studio.viewer.reuseShort")}'),
        # Sheet title
        ('<SheetTitle className="text-[15px]">More</SheetTitle>',
         '<SheetTitle className="text-[15px]">{t("studio.viewer.moreSheetTitle")}</SheetTitle>'),
        # Sheet description
        ('<SheetDescription className="sr-only">Every action and the details of this result</SheetDescription>',
         '<SheetDescription className="sr-only">{t("studio.viewer.everyActionDesc")}</SheetDescription>'),
    ],
}

# ── feed.tsx ────────────────────────────────────────────────────────────────
WIRE_MAP['feed.tsx'] = {
    'imports': 'import { AiTag, useAiTag } from "./ai-tag";',
    'hooks_details': None,  # hook goes in PendingTile
    'hooks_viewer': None,
    'hook_insert': ('const where = local ? (local.here ? "Keep this tab open" : "Running in another Fuobe tab") : null;',
                    'const { t } = useI18n();\n  const where = local ? (local.here ? t("studio.composer.keepTabOpen") : t("studio.composer.runningAnotherTab")) : null;'),
    'replacements': [
        ('title="Load prompt, model and settings into the composer"',
         'title={t("studio.feed.loadDraft")}'),
        ('aria-label="More actions"',
         'aria-label={t("studio.feed.moreActions")}'),
        ('toast.success("Rendering the final 1080p version")',
         'toast.success(t("studio.result.rendering1080p"))'),
        ('"Canceled"',
         't("studio.feed.canceled")'),
        ('"Couldn\'t generate this one"',
         't("studio.feed.failed")'),
        ('"Placeholder"',
         't("studio.viewer.placeholderLabel")'),
        ('"Browser"',
         't("studio.feed.browserLabel")'),
        ('"Open source"',
         't("studio.viewer.openSourceLabel")'),
        ('"Cloud"',
         't("studio.viewer.cloudLabel")'),
        ('aria-label="Cancel"',
         'aria-label={t("common.cancel")}'),
        ('<TooltipContent>Cancel</TooltipContent>',
         '<TooltipContent>{t("common.cancel")}</TooltipContent>'),
        ('"Add to favorites"',
         't("studio.feed.addToFav")'),
        ('"Remove from favorites"',
         't("studio.feed.removeFromFav")'),
        ('"Prompt copied"',
         't("studio.result.promptCopied")'),
    ],
}

# ── studio-page.tsx ─────────────────────────────────────────────────────────
WIRE_MAP['studio-page.tsx'] = {
    'imports': 'import { applyExample, draftFromGeneration, initialDraft, slot } from "./draft";',
    'hook_insert': None,  # Multiple hooks needed in different components
    'replacements': [
        # LiveSwitch
        ('title="Live: the picture changes as you type (runs on your GPU)"',
         'title={t("studio.page.liveTitle")}'),
        ('      Live',
         '      {t("studio.page.liveShort")}'),
        # LiveArea toast
        ('toast.success("The kept picture is in Edit")',
         'toast.success(t("studio.page.keptPictureInEdit"))'),
        # Example loaded toast
        ('toast.success("Example loaded. Change anything, then Generate.")',
         'toast.success(t("studio.page.exampleLoaded"))'),
        # AlertDialog
        ('<AlertDialogTitle>Replace what&apos;s in the composer?</AlertDialogTitle>',
         '<AlertDialogTitle>{t("studio.page.replaceComposer")}</AlertDialogTitle>'),
        ('<AlertDialogCancel>Keep mine</AlertDialogCancel>',
         '<AlertDialogCancel>{t("studio.page.keepMine")}</AlertDialogCancel>'),
        ('{pending?.inputs.length ? "The example\'s files, words and settings take the place of yours." : "The example\'s words and settings take the place of yours."}',
         '{pending?.inputs.length ? t("studio.page.exampleFilesTake") : t("studio.page.exampleWordsTake")}'),
        # Error messages
        ('throw new Error("That picture isn\'t in your library any more")',
         'throw new Error(t("studio.page.notInLibrary"))'),
        ('throw new Error("This picture has no layout to open")',
         'throw new Error(t("studio.page.noLayoutOpen"))'),
        ('toast(e.seed !== undefined ? "Layout opened with the picture\'s seed: move a box or change a word, then generate" : "Layout opened: move a box or change a word, then generate"',
         'toast(e.seed !== undefined ? t("studio.page.layoutOpenedSeed") : t("studio.page.layoutOpened")'),
        ('throw new Error("That run isn\'t in your library any more.")',
         'throw new Error(t("studio.page.runNotInLibrary"))'),
        # Drop text
        ('title="Drop it on the composer"',
         'title={t("studio.page.dropComposer")}'),
        # Live runs on GPU text
        ('"Live runs on your GPU"',
         't("studio.page.liveOnGpu")'),
        ('"Before upscaling"',
         't("studio.page.beforeUpscaling")'),
        # Light hint
        ('"Pick a light — its direction, colour and softness — and the shot is relit to match."',
         't("studio.page.lightHint")'),
    ],
}

# ── engine-switch.tsx ──────────────────────────────────────────────────────
WIRE_MAP['engine-switch.tsx'] = {
    'imports': None,  # check what's the last import line
    'hook_insert': None,
    'replacements': [
        ('"Open source only"',
         't("studio.engine.openSourceOnly")'),
        ('"Cloud only"',
         't("studio.engine.cloudOnly")'),
        ('aria-label="Engine"',
         'aria-label={t("studio.engine.engine")}'),
    ],
}

# ── frames-strip.tsx ───────────────────────────────────────────────────────
WIRE_MAP['frames-strip.tsx'] = {
    'replacements': [
        ('aria-label="Turn off Frames"',
         'aria-label={t("studio.frames.turnOff")}'),
        ('aria-label="Shorter clip"',
         'aria-label={t("studio.frames.shorter")}'),
        ('aria-label="Longer clip"',
         'aria-label={t("studio.frames.longer")}'),
        ('title={allowed || !gpuHint ? undefined : "On your GPU"}',
         'title={allowed || !gpuHint ? undefined : t("studio.frames.onGpu")}'),
        ('"Start"',
         't("studio.frames.startFrame")'),
    ],
}

# ── run-on.tsx ─────────────────────────────────────────────────────────────
WIRE_MAP['run-on.tsx'] = {
    'replacements': [
        ('title="Run on"',
         'title={t("studio.runOn.title")}'),
    ],
}

# ── run-place-chip.tsx ─────────────────────────────────────────────────────
WIRE_MAP['run-place-chip.tsx'] = {
    'replacements': [
        ('<span>{many ? "In all" : "Price"}</span>',
         '<span>{many ? t("studio.runPlace.inAll") : t("studio.runPlace.price")}</span>'),
    ],
}

# ── preset-chips.tsx ───────────────────────────────────────────────────────
WIRE_MAP['preset-chips.tsx'] = {
    'replacements': [
        ('{selected?.name ?? (value ? "Loading…" : type === "motion" ? "Camera motion" : "Effect")}',
         '{selected?.name ?? (value ? t("common.loading") : type === "motion" ? t("studio.preset.cameraMotion") : t("studio.preset.effect"))}'),
        ('noneLabel="None"',
         'noneLabel={t("studio.settings.off")}'),
        ('clearLabel="Remove the mix"',
         'clearLabel={t("studio.preset.removeMix")}'),
        ('{second ? `+ ${second.name}` : "Mix"}',
         '{second ? `+ ${second.name}` : t("studio.preset.mix")}'),
        ('noneLabel="No mix"',
         'noneLabel={t("studio.preset.noMix")}'),
    ],
}

# ── look-chip.tsx ──────────────────────────────────────────────────────────
WIRE_MAP['look-chip.tsx'] = {
    'replacements': [
        ('clearLabel={none ? `Back to ${none.toLowerCase()}` : "Back to the General look"}',
         'clearLabel={none ? `Back to ${none.toLowerCase()}` : t("studio.look.backToGeneral")}'),
        ('title="Look"',
         'title={t("studio.look.look")}'),
        ('placeholder="Search looks"',
         'placeholder={t("studio.look.searchLooks")}'),
        ('aria-label="Search looks"',
         'aria-label={t("studio.look.searchLooks")}'),
    ],
}

# ── compare-slider.tsx ─────────────────────────────────────────────────────
WIRE_MAP['compare-slider.tsx'] = {
    'replacements': [
        ('aria-label="Compare before and after"',
         'aria-label={t("studio.compareSlider.aria")}'),
    ],
}

# ── delete-for-good.tsx ────────────────────────────────────────────────────
WIRE_MAP['delete-for-good.tsx'] = {
    'replacements': [
        ('<AlertDialogCancel>Cancel</AlertDialogCancel>',
         '<AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>'),
        ('<AlertDialogAction',  # keep this as-is
         None),  # skip
    ],
}

# ── layout-strip.tsx ────────────────────────────────────────────────────────
WIRE_MAP['layout-strip.tsx'] = {
    'replacements': [
        ('{n ? "Edit boxes" : "Draw boxes"}',
         '{n ? t("studio.layoutStrip.editBoxes") : t("studio.layoutStrip.drawBoxes")}'),
    ],
}

# ── shots-editor.tsx ───────────────────────────────────────────────────────
WIRE_MAP['shots-editor.tsx'] = {
    'replacements': [
        ('{ id: "off", label: "Off", hint: "One continuous shot" }',
         '{ id: "off", label: t("studio.settings.off"), hint: t("studio.shots.oneContinuous") }'),
        ('{ id: "auto", label: "Auto", hint: "The model plans the cuts" }',
         '{ id: "auto", label: t("studio.settings.auto"), hint: t("studio.shots.modelPlans") }'),
        ('label: "Custom", hint: `Write up to ${ms.maxShots} shots`',
         'label: t("studio.shots.custom"), hint: t("studio.shots.customHint", { n: ms.maxShots })'),
        ('placeholder={i === 0 ? "Shot 1 — e.g. \u201cwide: she steps out of the taxi into the rain\u201d"',
         'placeholder={i === 0 ? t("studio.shots.shotPlaceholder1")'),
        ('aria-label="Shorter"',
         'aria-label={t("studio.shots.shorter")}'),
        ('aria-label="Longer"',
         'aria-label={t("studio.shots.longer")}'),
    ],
}

# ── prompt-input.tsx ───────────────────────────────────────────────────────
WIRE_MAP['prompt-input.tsx'] = {
    'replacements': [
        ('{visual.length ? "No element with that name." : "No elements yet. Save a character, location or prop once, then @mention it anywhere."}',
         '{visual.length ? t("studio.promptInput.noElement") : t("studio.promptInput.noElementsYet")}'),
        ('aria-label="Prompt"',
         'aria-label={t("studio.promptInput.promptAria")}'),
    ],
}

# ── video-trimmer.tsx ──────────────────────────────────────────────────────
WIRE_MAP['video-trimmer.tsx'] = {
    'replacements': [
        ('title={playing ? "Pause" : "Play the selection"}',
         'title={playing ? t("studio.trim.pause") : t("studio.trim.playSelection")}'),
        ('aria-label="Selection position"',
         'aria-label={t("studio.trim.selectionPos")}'),
        ('{range ? `${len.toFixed(1)} s selected` : "Reading the clip…"}',
         '{range ? t("studio.trim.sSelected", { n: len.toFixed(1) }) : t("studio.trim.readingClip")}'),
    ],
}

# ── media-slot.tsx ─────────────────────────────────────────────────────────
WIRE_MAP['media-slot.tsx'] = {
    'replacements': [
        ('({ image: "Image only — drop a photo here", video: "Video only — drop a clip here", audio: "Audio only — drop a sound file here", text: "Text only — drop a .txt or .srt file here", model3d: "3D only — drop a .glb file here" })[kind]',
         '({ image: t("studio.media.imageHint"), video: t("studio.media.videoHint"), audio: t("studio.media.audioHint"), text: t("studio.media.textHint"), model3d: t("studio.media.model3dHint") })[kind]'),
    ],
}

# ── hosted-chips.tsx ────────────────────────────────────────────────────────
WIRE_MAP['hosted-chips.tsx'] = {
    'replacements': [
        ('{picked ? `Light · ${picked.label}` : "Pick a light"}',
         '{picked ? `Light · ${picked.label}` : t("studio.hosted.pickLight")}'),
    ],
}

# ── model-controls.tsx ──────────────────────────────────────────────────────
WIRE_MAP['model-controls.tsx'] = {
    'replacements': [
        ('<Chip icon={title === "Director" ? Clapperboard : Settings2}',
         '<Chip icon={title === t("studio.modelControls.director") ? Clapperboard : Settings2}'),
    ],
}

# ── lyrics-editor.tsx ────────────────────────────────────────────────────────
WIRE_MAP['lyrics-editor.tsx'] = {
    'replacements': [
        ('{writing ? "Writing…" : "Write the lyrics"}',
         '{writing ? t("studio.lyrics.writing") : t("studio.lyrics.writeLyrics")}'),
        ('{structure.length ? structure.join(" · ") : spec.inPrompt ? `${model.name} reads the lyrics with your description` : "Each tag on its own line, the words under it"}',
         '{structure.length ? structure.join(" · ") : spec.inPrompt ? t("studio.lyrics.readsWithYourDesc", { model: model.name }) : t("studio.lyrics.tagOnLine")}'),
    ],
}

# ── layout-strip.tsx already covered above ────────────────────────────────────

# ── RSC pages ───────────────────────────────────────────────────────────────

RSC_SETTINGS = '''import type { Metadata } from "next";
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
        <SettingsForm prices={prices} />'''

RSC_WORKERS = '''import { ArrowLeft } from "lucide-react";
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
}'''

RSC_TERMS = '''import type { Metadata } from "next";
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
          {t("studio.terms.madeLine").split("Thanks")[0]}{" "}
          <Link href="/settings/licences">{t("home.footer.thanks")}</Link> before you sell your work.
        </p>
      </LegalSection>
      <LegalSection title={t("studio.terms.fair")} icon={Users}>
        <p>{t("studio.terms.fairLine")}</p>
      </LegalSection>
      <LegalSection title={t("studio.terms.service")} icon={Cloud}>
        <p>
          {t("studio.terms.serviceLine")}{" "}
          <Link href="/privacy">{t("home.footer.privacy")}</Link> explains how long
          your files are kept.
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
}'''


def process_file(fpath, map_data):
    """Apply wiring to one component file."""
    if not os.path.exists(fpath):
        print(f"  MISSING: {fpath}")
        return False

    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Add useI18n import if needed
    if 'useI18n' not in content and '@/lib/i18n' not in content:
        imp_anchor = map_data.get('imports')
        if imp_anchor is None:
            # Find last import line
            lines = content.split('\n')
            last_imp = None
            for i, line in enumerate(lines):
                if line.startswith('import '):
                    last_imp = i
            if last_imp is not None:
                lines.insert(last_imp + 1, 'import { useI18n } from "@/lib/i18n";')
                content = '\n'.join(lines)
        elif imp_anchor in content:
            content = content.replace(imp_anchor, imp_anchor + '\nimport { useI18n } from "@/lib/i18n";', 1)

    # 2. Add hook to Details component in viewer.tsx
    if fpath.endswith('viewer.tsx'):
        # Add to Details function
        anchor = '  const site = (usePlaceName() ?? knownPlace()).label;'
        content = content.replace(anchor, anchor + '\n  const { t } = useI18n();', 1)
        # Add to Viewer function
        anchor2 = '  const placeholders = placeholdersOn(useStatus().data?.demoMode);'
        content = content.replace(anchor2, '  const { t } = useI18n();\n' + anchor2, 1)
        # Fix finishText to accept t
        content = content.replace(
            'function finishText(o: OutputFile | undefined): string | undefined {',
            'function finishText(o: OutputFile | undefined, t: (key: string) => string): string | undefined {'
        )
        # Fix call site
        content = content.replace(
            '<Row label="Finish" value={finishText(g.outputs[index])} />',
            '<Row label={t("studio.viewer.finish")} value={finishText(g.outputs[index], t)} />'
        )
        # Fix finishText body
        content = content.replace(
            'const overlay = m.overlay === "date-stamp" ? "date stamp" : m.overlay === "cctv" ? "CCTV caption" : m.overlay === "photo-booth" ? "photo-booth print" : undefined;',
            'const overlay = m.overlay === "date-stamp" ? t("studio.viewer.dateStamp") : m.overlay === "cctv" ? t("studio.viewer.cctvCaption") : m.overlay === "photo-booth" ? t("studio.viewer.photoBooth") : undefined;'
        )
        content = content.replace(
            'const what = [grade && `${grade} grade`, overlay].filter(Boolean).join(" + ");',
            'const what = [grade && `${grade} ${t("studio.viewer.gradeWord")}`, overlay].filter(Boolean).join(" + ");'
        )
        content = content.replace(
            'return m.finished ? what : `${what} (applied when it opens in a studio)`;',
            'return m.finished ? what : `${what} ${t("studio.viewer.appliedOnOpen")}`;'
        )
        # Fix the label="Finish" replacement that was handled separately
        content = content.replace('label="Finish"', 'label={t("studio.viewer.finish")}')

    if fpath.endswith('feed.tsx'):
        # Add hook to PendingTile
        anchor = '  const { cancel } = useGenerationActions();'
        content = content.replace(anchor, anchor + '\n  const { t } = useI18n();', 1)

    if fpath.endswith('studio-page.tsx'):
        # Add hook to LiveSwitch
        anchor1 = 'function LiveSwitch({ on, onChange }: { on: boolean; onChange: (on: boolean) => void }) {'
        content = content.replace(anchor1, anchor1 + '\n  const { t } = useI18n();', 1)
        # Add hook to LiveArea
        anchor2 = 'function LiveArea({ onClose }: { onClose: () => void }) {\n  const { draft, setSlot } = useStudio();'
        content = content.replace(anchor2, anchor2 + '\n  const { t } = useI18n();', 1)

    if fpath.endswith('engine-switch.tsx'):
        # Find the EngineSwitch component
        anchor = '  const { t } = useI18n();\n'
        # Add hook in the main component (after hooks)
        anchor2 = '  const engineMode = useEngineMode();\n  const account = useIsAccount();'
        if anchor2 in content:
            content = content.replace(anchor2, anchor2 + '\n  const { t } = useI18n();', 1)

    if fpath.endswith('run-on.tsx'):
        anchor = 'export function RunOnChip('
        content = content.replace(anchor, '  const { t } = useI18n();\n  ' + anchor.lstrip(), 1)
        # Add after function start
        for fn in ['export function', 'function']:
            idx = content.find(f'{fn} RunOn')
            if idx >= 0:
                brace = content.find(')', idx)
                brace2 = content.find('{', brace)
                if brace2 >= 0:
                    lines_before = content[:brace2+1].split('\n')
                    if 'const { t } = useI18n()' not in lines_before[-1]:
                        content = content[:brace2+1] + '\n  const { t } = useI18n();' + content[brace2+1:]
                    break

    if fpath.endswith('run-place-chip.tsx'):
        idx = content.find('{')
        # find main component start and add hook
        anchor = '  const engineMode = useEngineMode();'
        content = content.replace(anchor, anchor + '\n  const { t } = useI18n();', 1)

    if fpath.endswith('preset-chips.tsx'):
        anchor = '  const { t } = useI18n();'
        # Add hook to the main component
        anchor2 = '  const [cat, setCat] = useState<string>("All");'
        content = content.replace(anchor2, '  const { t } = useI18n();\n' + anchor2, 1)

    if fpath.endswith('look-chip.tsx'):
        anchor2 = '  const [tab, setTab] = useState("All presets");'
        content = content.replace(anchor2, '  const { t } = useI18n();\n' + anchor2, 1)

    if fpath.endswith('compare-slider.tsx'):
        anchor2 = 'function CompareSlider'
        idx = content.find(anchor2)
        brace2 = content.find('{', content.find(')', idx))
        if brace2 >= 0:
            content = content[:brace2+1] + '\n  const { t } = useI18n();' + content[brace2+1:]

    if fpath.endswith('delete-for-good.tsx'):
        anchor2 = '  const { deleteForever } = useGenerationActions();'
        content = content.replace(anchor2, anchor2 + '\n  const { t } = useI18n();', 1)

    if fpath.endswith('layout-strip.tsx'):
        anchor2 = '  const { t } = useI18n();'
        # Find the LayoutStrip component
        anchor3 = 'function LayoutStrip'
        idx = content.find(anchor3)
        brace2 = content.find('{', content.find(')', idx))
        if brace2 >= 0 and 'const { t }' not in content[:brace2+1]:
            content = content[:brace2+1] + '\n  const { t } = useI18n();' + content[brace2+1:]

    if fpath.endswith('shots-editor.tsx'):
        # Add hook
        anchor2 = 'export function ShotsEditor'
        idx = content.find(anchor2)
        brace2 = content.find('{', content.find(')', idx))
        if brace2 >= 0 and 'const { t }' not in content[:brace2+1]:
            content = content[:brace2+1] + '\n  const { t } = useI18n();' + content[brace2+1:]

    if fpath.endswith('prompt-input.tsx'):
        anchor2 = 'export function PromptInput'
        idx = content.find(anchor2)
        brace2 = content.find('{', content.find(')', idx))
        if brace2 >= 0 and 'const { t }' not in content[:brace2+1]:
            content = content[:brace2+1] + '\n  const { t } = useI18n();' + content[brace2+1:]

    if fpath.endswith('video-trimmer.tsx'):
        anchor2 = 'export function VideoTrimmer'
        idx = content.find(anchor2)
        brace2 = content.find('{', content.find(')', idx))
        if brace2 >= 0 and 'const { t }' not in content[:brace2+1]:
            content = content[:brace2+1] + '\n  const { t } = useI18n();' + content[brace2+1:]

    if fpath.endswith('media-slot.tsx'):
        anchor2 = 'export function MediaSlot'
        idx = content.find(anchor2)
        brace2 = content.find('{', content.find(')', idx))
        if brace2 >= 0 and 'const { t }' not in content[:brace2+1]:
            content = content[:brace2+1] + '\n  const { t } = useI18n();' + content[brace2+1:]

    if fpath.endswith('hosted-chips.tsx'):
        anchor2 = 'export function LightChip'
        idx = content.find(anchor2)
        brace2 = content.find('{', content.find(')', idx))
        if brace2 >= 0 and 'const { t }' not in content[:brace2+1]:
            content = content[:brace2+1] + '\n  const { t } = useI18n();' + content[brace2+1:]

    if fpath.endswith('model-controls.tsx'):
        anchor2 = 'export function ModelControls'
        idx = content.find(anchor2)
        brace2 = content.find('{', content.find(')', idx))
        if brace2 >= 0 and 'const { t }' not in content[:brace2+1]:
            content = content[:brace2+1] + '\n  const { t } = useI18n();' + content[brace2+1:]

    if fpath.endswith('lyrics-editor.tsx'):
        anchor2 = 'export function LyricsEditor'
        idx = content.find(anchor2)
        brace2 = content.find('{', content.find(')', idx))
        if brace2 >= 0 and 'const { t }' not in content[:brace2+1]:
            content = content[:brace2+1] + '\n  const { t } = useI18n();' + content[brace2+1:]

    if fpath.endswith('frames-strip.tsx'):
        anchor2 = 'export function FramesStrip'
        idx = content.find(anchor2)
        brace2 = content.find('{', content.find(')', idx))
        if brace2 >= 0 and 'const { t }' not in content[:brace2+1]:
            content = content[:brace2+1] + '\n  const { t } = useI18n();' + content[brace2+1:]

    # 3. Apply string replacements
    replacements = map_data.get('replacements', [])
    applied = 0
    for old, new in replacements:
        if new is None: continue
        if old in content:
            content = content.replace(old, new, 1)
            applied += 1
        elif old in content:
            # Try replacing all
            content = content.replace(old, new)
            applied += 1

    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"  {os.path.basename(fpath)}: {applied} replacements")
    return applied > 0


# Process studio component files
print("=== Studio components ===")
results = {}
for fname, map_data in WIRE_MAP.items():
    fpath = os.path.join(STUDIO, fname)
    n = process_file(fpath, map_data)
    results[fname] = n

# Process RSC pages
print("\n=== RSC pages ===")
rsc_pages = [
    (os.path.join(APP_STUDIO, 'settings/page.tsx'), RSC_SETTINGS),
    (os.path.join(APP_STUDIO, 'settings/workers/page.tsx'), RSC_WORKERS),
    (os.path.join(APP_STUDIO, 'terms/page.tsx'), RSC_TERMS),
]
for fpath, content in rsc_pages:
    if os.path.exists(fpath):
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  RSC: {os.path.basename(fpath)} → rewritten")
    else:
        print(f"  MISSING: {fpath}")

print("\nDone")
