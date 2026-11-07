#!/usr/bin/env python3
"""
Correct wiring: targets COMPLETE JSX attribute patterns including attr="..." 
to produce attr={t("key")} — not broken attr=t("key").
"""
import re, os, sys

STUDIO = 'src/components/studio'

def apply(fp, replacements, hook_after=None):
    """Apply string replacements; add hook after anchor if needed."""
    if not os.path.exists(fp): return 0
    with open(fp, 'r', encoding='utf-8') as f:
        content = f.read()

    # Add useI18n import if missing
    if 'useI18n' not in content:
        lines = content.split('\n')
        last_imp = max((i for i,l in enumerate(lines) if l.startswith('import ')), default=None)
        if last_imp is not None:
            lines.insert(last_imp + 1, 'import { useI18n } from "@/lib/i18n";')
            content = '\n'.join(lines)

    # Add hook after anchor
    if hook_after:
        anchor = hook_after[0]
        hook = hook_after[1]
        if anchor in content and hook not in content:
            content = content.replace(anchor, anchor + '\n  ' + hook, 1)

    n = 0
    for old, new in replacements:
        if old in content:
            content = content.replace(old, new)
            n += 1
    if n > 0:
        with open(fp, 'w', encoding='utf-8') as f:
            f.write(content)
    return n

# ── viewer.tsx ──────────────────────────────────────────────────────────────
vfp = STUDIO + '/viewer.tsx'
vn = apply(vfp, [
    # Row labels in Details — complete attr pattern
    ('label="Source" value="Your upload"', 'label={t("studio.viewer.source")} value={t("studio.viewer.yourUpload")}'),
    ('label="Type"', 'label={t("studio.viewer.type")}'),
    ('label="Added"', 'label={t("studio.viewer.added")}'),
    ('label="Model"', 'label={t("studio.viewer.model")}'),
    ('label="Made on" value={g.provider === "mock" ? "Placeholder" : g.provider === "local" ? "In your browser" : g.place === "pool" ? site : g.engine === "open" ? "Your GPU" : "Cloud"}',
     'label={t("studio.viewer.madeOn")} value={g.provider === "mock" ? t("studio.viewer.placeholderLabel") : g.provider === "local" ? t("studio.viewer.browserLabel") : g.place === "pool" ? site : g.engine === "open" ? t("studio.viewer.yourGpuLabel") : t("studio.viewer.cloudLabel")}'),
    ('label="Mode"', 'label={t("studio.viewer.mode")}'),
    ('label={g.modelId.startsWith("fuobe-soul") ? "Look" : "Preset"}',
     'label={g.modelId.startsWith("fuobe-soul") ? t("studio.look.look") : t("studio.viewer.preset")}'),
    ('label="Finish"', 'label={t("studio.viewer.finish")}'),
    ('label="Step"', 'label={t("studio.viewer.step")}'),
    ('label="Layer"', 'label={t("studio.viewer.layer")}'),
    ('label="Stem"', 'label={t("studio.viewer.stem")}'),
    ('label="Language"', 'label={t("studio.audio.language")}'),
    ('label="Aspect ratio"', 'label={t("studio.settings.aspectRatio")}'),
    ('label="Quality"', 'label={t("studio.settings.quality")}'),
    ('label="Duration"', 'label={t("studio.settings.duration")}'),
    ('label="Seed"', 'label={t("studio.settings.seed")}'),
    ('label="Cost"', 'label={t("studio.viewer.cost")}'),
    ('label="Made"', 'label={t("studio.viewer.made")}'),
    ('label="In Trash" value={`${trashDaysLeft(g.deletedAt)} days left`}',
     'label={t("studio.viewer.inTrash")} value={t("studio.viewer.daysLeft", { n: trashDaysLeft(g.deletedAt) })}'),
    ('label="Review"', 'label={t("studio.viewer.review")}'),
    # Prompt display
    ('{g.modelId === "local-motion" ? "Words" : "Sent to the model"}',
     '{g.modelId === "local-motion" ? t("studio.viewer.words") : t("studio.viewer.sentToModel")}'),
    # Copy prompt toast
    ('void copyWithToast(g.prompt ?? "", "Prompt copied")',
     'void copyWithToast(g.prompt ?? "", t("studio.result.promptCopied"))'),
    ('<Copy className="size-3" /> Copy prompt',
     '<Copy className="size-3" /> {t("studio.actions.copyPrompt")}'),
    # Negative prefix
    ('Negative: {g.request.negativePrompt}',
     '{t("studio.viewer.negativePrefix")} {g.request.negativePrompt}'),
    # actionButton label
    ('const label = a.id === "favorite" ? (g.favorite ? "Favorited" : "Favorite") : a.id === "save-character" ? "Save as element" : a.label;',
     'const label = a.id === "favorite" ? (g.favorite ? t("studio.viewer.favorited") : t("studio.actions.favorite")) : a.id === "save-character" ? t("studio.result.saveAsElement") : a.label;'),
    # Compare buttons
    ('{comparing ? "Hide original" : "Compare"}',
     '{comparing ? t("studio.viewer.hideOriginal") : t("studio.actions.compare")}'),
    # aria-labels
    ('aria-label="Previous"', 'aria-label={t("studio.viewer.previous")}'),
    ('aria-label="Next"', 'aria-label={t("studio.viewer.next")}'),
    ('aria-label="More actions and details"', 'aria-label={t("studio.viewer.moreActionsDetails")}'),
    ('aria-label="Close"', 'aria-label={t("common.close")}'),
    # DialogDescription
    ('<DialogDescription className="sr-only">Preview, actions and details</DialogDescription>',
     '<DialogDescription className="sr-only">{t("studio.viewer.previewDesc")}</DialogDescription>'),
    # Details heading
    ('<Info className="size-3.5" /> Details',
     '<Info className="size-3.5" /> {t("studio.viewer.detailsTitle")}'),
    # LayerList
    ('>Layers</p>', '>{t("studio.viewer.layers")}</p>'),
    ('<Layers className="size-4" /> All layers',
     '<Layers className="size-4" /> {t("studio.viewer.allLayers")}'),
    # Keyboard hints
    ('<Kbd>←</Kbd> <Kbd>→</Kbd> browse', '<Kbd>←</Kbd> <Kbd>→</Kbd> {t("studio.viewer.browse")}'),
    ('<Kbd>F</Kbd> favorite', '<Kbd>F</Kbd> {t("studio.viewer.favoriteShort")}'),
    ('<Kbd>P</Kbd> pin', '<Kbd>P</Kbd> {t("studio.viewer.pinShort")}'),
    ('<Kbd>C</Kbd> compare', '<Kbd>C</Kbd> {t("studio.viewer.compareShort")}'),
    ('<Kbd>D</Kbd> download', '<Kbd>D</Kbd> {t("studio.viewer.downloadShort")}'),
    ('<Kbd>R</Kbd> reuse', '<Kbd>R</Kbd> {t("studio.viewer.reuseShort")}'),
    # Sheet title
    ('<SheetTitle className="text-[15px]">More</SheetTitle>',
     '<SheetTitle className="text-[15px]">{t("studio.viewer.moreSheetTitle")}</SheetTitle>'),
    ('<SheetDescription className="sr-only">Every action and the details of this result</SheetDescription>',
     '<SheetDescription className="sr-only">{t("studio.viewer.everyActionDesc")}</SheetDescription>'),
], hook_after=None)

# viewer.tsx hooks: add after aiTag line
with open(vfp, 'r', encoding='utf-8') as f: content = f.read()
content = content.replace(
    '  const site = (usePlaceName() ?? knownPlace()).label;',
    '  const { t } = useI18n();\n  const site = (usePlaceName() ?? knownPlace()).label;', 1)
content = content.replace(
    '  const placeholders = placeholdersOn(useStatus().data?.demoMode);',
    '  const { t } = useI18n();\n  const placeholders = placeholdersOn(useStatus().data?.demoMode);', 1)
# Fix finishText to accept t
content = content.replace(
    'function finishText(o: OutputFile | undefined): string | undefined {',
    'function finishText(o: OutputFile | undefined, t: (key: string) => string): string | undefined {', 1)
content = content.replace(
    '<Row label={t("studio.viewer.finish")} value={finishText(g.outputs[index])} />',
    '<Row label={t("studio.viewer.finish")} value={finishText(g.outputs[index], t)} />', 1)
# Fix finishText body
content = content.replace(
    'const overlay = m.overlay === "date-stamp" ? "date stamp" : m.overlay === "cctv" ? "CCTV caption" : m.overlay === "photo-booth" ? "photo-booth print" : undefined;',
    'const overlay = m.overlay === "date-stamp" ? t("studio.viewer.dateStamp") : m.overlay === "cctv" ? t("studio.viewer.cctvCaption") : m.overlay === "photo-booth" ? t("studio.viewer.photoBooth") : undefined;', 1)
content = content.replace(
    'const what = [grade && `${grade} grade`, overlay].filter(Boolean).join(" + ");',
    'const what = [grade && `${grade} ${t("studio.viewer.gradeWord")}`, overlay].filter(Boolean).join(" + ");', 1)
content = content.replace(
    'return m.finished ? what : `${what} (applied when it opens in a studio)`;',
    'return m.finished ? what : `${what} ${t("studio.viewer.appliedOnOpen")}`;', 1)
# LayerList hook
content = content.replace(
    'function LayerList({ g, index, all, onPick, onAll }: { g: Generation; index: number; all: boolean; onPick: (i: number) => void; onAll: () => void }) {',
    'function LayerList({ g, index, all, onPick, onAll }: { g: Generation; index: number; all: boolean; onPick: (i: number) => void; onAll: () => void }) {\n  const { t } = useI18n();', 1)
with open(vfp, 'w', encoding='utf-8') as f: f.write(content)
print(f'viewer.tsx: {vn} replacements + hooks')

# ── feed.tsx ────────────────────────────────────────────────────────────────
ffp = STUDIO + '/feed.tsx'
fn = apply(ffp, [
    ('title="Load prompt, model and settings into the composer"', 'title={t("studio.feed.loadDraft")}'),
    ('aria-label="More actions"', 'aria-label={t("studio.feed.moreActions")}'),
    ('toast.success("Rendering the final 1080p version")', 'toast.success(t("studio.result.rendering1080p"))'),
    ('const where = local ? (local.here ? "Keep this tab open" : "Running in another Fuobe tab") : null;',
     'const where = local ? (local.here ? t("studio.composer.keepTabOpen") : t("studio.composer.runningAnotherTab")) : null;'),
    ('{onSuccess: () => toast.success("Rendering the final 1080p version")',
     '{onSuccess: () => toast.success(t("studio.result.rendering1080p"))'),
    ('aria-label="Cancel"', 'aria-label={t("common.cancel")}'),
    ('<TooltipContent>Cancel</TooltipContent>', '<TooltipContent>{t("common.cancel")}</TooltipContent>'),
    ('title="Load prompt, model and settings into the composer"', 'title={t("studio.feed.loadDraft")}'),  # second instance
], hook_after=('  const { cancel } = useGenerationActions();', 'const { t } = useI18n();'))
print(f'feed.tsx: {fn} replacements')

# ── studio-page.tsx ─────────────────────────────────────────────────────────
sfp = STUDIO + '/studio-page.tsx'
sn = apply(sfp, [
    # LiveSwitch title attr
    ('title="Live: the picture changes as you type (runs on your GPU)"',
     'title={t("studio.page.liveTitle")}'),
    ('      Live\n', '      {t("studio.page.liveShort")}\n'),
    # LiveArea toast
    ('toast.success("The kept picture is in Edit")', 'toast.success(t("studio.page.keptPictureInEdit"))'),
    # ExampleLoader dialog
    ("<AlertDialogTitle>Replace what&apos;s in the composer?</AlertDialogTitle>",
     '<AlertDialogTitle>{t("studio.page.replaceComposer")}</AlertDialogTitle>'),
    ('{pending?.inputs.length ? "The example\'s files, words and settings take the place of yours." : "The example\'s words and settings take the place of yours."}',
     '{pending?.inputs.length ? t("studio.page.exampleFilesTake") : t("studio.page.exampleWordsTake")}'),
    ('<AlertDialogCancel>Keep mine</AlertDialogCancel>',
     '<AlertDialogCancel>{t("studio.page.keepMine")}</AlertDialogCancel>'),
    # StudioSubtitle light hint
    ('"Pick a light — its direction, colour and softness — and the shot is relit to match."',
     't("studio.page.lightHint")'),
    # StudioBody: title= attr (complete pattern)
    ('title="Live runs on your GPU"', 'title={t("studio.page.liveOnGpu")}'),
    ('aria-label="Before upscaling"', 'aria-label={t("studio.page.beforeUpscaling")}'),
], hook_after=None)

# studio-page.tsx hooks: multiple functions need t
with open(sfp, 'r', encoding='utf-8') as f: content = f.read()
# LiveSwitch hook
content = content.replace(
    'function LiveSwitch({ on, onChange }: { on: boolean; onChange: (on: boolean) => void }) {\n  return (',
    'function LiveSwitch({ on, onChange }: { on: boolean; onChange: (on: boolean) => void }) {\n  const { t } = useI18n();\n  return (', 1)
# LiveArea hook
content = content.replace(
    'const [seed] = useState(() => ({ image: draft.slots.image?.ref, text: draft.prompt }));',
    'const { t } = useI18n();\n  const [seed] = useState(() => ({ image: draft.slots.image?.ref, text: draft.prompt }));', 1)
# ExampleLoader hook: needs t, check what function uses the dialog
el_anchor = 'const [pending, setPending] = useState<ExampleCard | null>(null);'
if el_anchor in content:
    content = content.replace(el_anchor, 'const { t } = useI18n();\n  ' + el_anchor, 1)
# StudioSubtitle hook
ss_anchor = '  const sphere = !!catalog.getModel(draft.modelId)?.options.lightSphere;'
if ss_anchor in content:
    content = content.replace(ss_anchor, '  const { t } = useI18n();\n' + ss_anchor, 1)
# StudioBody hook - uses title= and aria-label=
sb_anchor = '  const [live, setLive] = useState(false);'
if sb_anchor in content:
    content = content.replace(sb_anchor, '  const { t } = useI18n();\n  ' + sb_anchor, 1)
# LayoutHandoff hook
lh_anchor = '  const opened = useRef<string | null>(null);'
if lh_anchor in content:
    content = content.replace(lh_anchor, '  const { t } = useI18n();\n  ' + lh_anchor, 1)
# ReuseHandoff hook  
rh_anchor = '  const opened = useRef<string | null>(null);'
if content.count(rh_anchor) > 1:
    # Replace only the second occurrence (ReuseHandoff)
    first_pos = content.find(rh_anchor)
    second_pos = content.find(rh_anchor, first_pos + 1)
    if second_pos >= 0:
        content = content[:second_pos] + '  const { t } = useI18n();\n  ' + content[second_pos + 2:]
with open(sfp, 'w', encoding='utf-8') as f: f.write(content)
print(f'studio-page.tsx: {sn} replacements + hooks')

# ── engine-switch.tsx ───────────────────────────────────────────────────────
esfp = STUDIO + '/engine-switch.tsx'
esn = apply(esfp, [
    ('const text = locked?.text ?? (mode === "open" ? "Open source only" : "Cloud only");',
     'const text = locked?.text ?? (mode === "open" ? t("studio.engine.openSourceOnly") : t("studio.engine.cloudOnly"));'),
    ('aria-label="Engine"', 'aria-label={t("studio.engine.engine")}'),
], hook_after=None)

# engine-switch hooks: add in the main component
with open(esfp, 'r', encoding='utf-8') as f: content = f.read()
hook_anchor = '  const locked = useEngineLock();'
if hook_anchor in content:
    content = content.replace(hook_anchor, hook_anchor + '\n  const { t } = useI18n();', 1)
with open(esfp, 'w', encoding='utf-8') as f: f.write(content)
print(f'engine-switch.tsx: {esn} replacements')

# ── frames-strip.tsx ────────────────────────────────────────────────────────
fsfp = STUDIO + '/frames-strip.tsx'
fsn = apply(fsfp, [
    ('aria-label="Turn off Frames"', 'aria-label={t("studio.frames.turnOff")}'),
    ('aria-label="Shorter clip"', 'aria-label={t("studio.frames.shorter")}'),
    ('aria-label="Longer clip"', 'aria-label={t("studio.frames.longer")}'),
    ('title={allowed || !gpuHint ? undefined : "On your GPU"}',
     'title={allowed || !gpuHint ? undefined : t("studio.frames.onGpu")}'),
], hook_after=('  const { t } = useI18n();', None))

# Add hook to FramesStrip function
with open(fsfp, 'r', encoding='utf-8') as f: content = f.read()
# Find the function body start
anchor = '  const titleId = useId();'
if anchor in content:
    content = content.replace(anchor, '  const { t } = useI18n();\n' + anchor, 1)
    with open(fsfp, 'w', encoding='utf-8') as f: f.write(content)
print(f'frames-strip.tsx: {fsn} replacements')

# ── layout-strip.tsx ────────────────────────────────────────────────────────
lfp = STUDIO + '/layout-strip.tsx'
ln = apply(lfp, [
    ('{n ? "Edit boxes" : "Draw boxes"}', '{n ? t("studio.layoutStrip.editBoxes") : t("studio.layoutStrip.drawBoxes")}'),
    ('aria-label="Layout off"', 'aria-label={t("studio.layout.off")}'),
], hook_after=None)
# Add hook after ratioOf call inside function
with open(lfp, 'r', encoding='utf-8') as f: content = f.read()
anchor = '  const ratio = ratioOf(aspect ?? layout.aspect);'
if anchor in content:
    content = content.replace(anchor, anchor + '\n  const { t } = useI18n();', 1)
    with open(lfp, 'w', encoding='utf-8') as f: f.write(content)
print(f'layout-strip.tsx: {ln} replacements')

# ── run-on.tsx ──────────────────────────────────────────────────────────────
rop = STUDIO + '/run-on.tsx'
ron = apply(rop, [
    ('title="Run on"', 'title={t("studio.runOn.title")}'),
], hook_after=None)
with open(rop, 'r', encoding='utf-8') as f: content = f.read()
anchor = '  const [open, setOpen] = useState(false);'
if anchor in content:
    content = content.replace(anchor, anchor + '\n  const { t } = useI18n();', 1)
    with open(rop, 'w', encoding='utf-8') as f: f.write(content)
print(f'run-on.tsx: {ron} replacements')

# ── run-place-chip.tsx ──────────────────────────────────────────────────────
rpcp = STUDIO + '/run-place-chip.tsx'
rpcn = apply(rpcp, [
    ('<span>{many ? "In all" : "Price"}</span>',
     '<span>{many ? t("studio.runPlace.inAll") : t("studio.runPlace.price")}</span>'),
], hook_after=None)
with open(rpcp, 'r', encoding='utf-8') as f: content = f.read()
anchor = '  const engineMode = useEngineMode();'
if anchor in content:
    content = content.replace(anchor, anchor + '\n  const { t } = useI18n();', 1)
    with open(rpcp, 'w', encoding='utf-8') as f: f.write(content)
print(f'run-place-chip.tsx: {rpcn} replacements')

# ── preset-chips.tsx ────────────────────────────────────────────────────────
pcp = STUDIO + '/preset-chips.tsx'
pcn = apply(pcp, [
    ('{selected?.name ?? (value ? "Loading…" : type === "motion" ? "Camera motion" : "Effect")}',
     '{selected?.name ?? (value ? t("common.loading") : type === "motion" ? t("studio.preset.cameraMotion") : t("studio.preset.effect"))}'),
    ('noneLabel="None"', 'noneLabel={t("studio.settings.off")}'),
    ('clearLabel="Remove the mix"', 'clearLabel={t("studio.preset.removeMix")}'),
    ('{second ? `+ ${second.name}` : "Mix"}',
     '{second ? `+ ${second.name}` : t("studio.preset.mix")}'),
    ('noneLabel="No mix"', 'noneLabel={t("studio.preset.noMix")}'),
], hook_after=None)
with open(pcp, 'r', encoding='utf-8') as f: content = f.read()
anchor = '  const [cat, setCat] = useState<string>("All");'
if anchor in content:
    content = content.replace(anchor, '  const { t } = useI18n();\n' + anchor, 1)
    with open(pcp, 'w', encoding='utf-8') as f: f.write(content)
print(f'preset-chips.tsx: {pcn} replacements')

# ── look-chip.tsx ───────────────────────────────────────────────────────────
lcp = STUDIO + '/look-chip.tsx'
lcn = apply(lcp, [
    ('clearLabel={none ? `Back to ${none.toLowerCase()}` : "Back to the General look"}',
     'clearLabel={none ? `Back to ${none.toLowerCase()}` : t("studio.look.backToGeneral")}'),
    ('title="Look"', 'title={t("studio.look.look")}'),
    ('placeholder="Search looks"', 'placeholder={t("studio.look.searchLooks")}'),
    ('aria-label="Search looks"', 'aria-label={t("studio.look.searchLooks")}'),
], hook_after=None)
with open(lcp, 'r', encoding='utf-8') as f: content = f.read()
anchor = '  const [tab, setTab] = useState("All presets");'
if anchor in content:
    content = content.replace(anchor, '  const { t } = useI18n();\n' + anchor, 1)
    with open(lcp, 'w', encoding='utf-8') as f: f.write(content)
print(f'look-chip.tsx: {lcn} replacements')

# ── compare-slider.tsx ──────────────────────────────────────────────────────
csfp = STUDIO + '/compare-slider.tsx'
csn = apply(csfp, [
    ('aria-label="Compare before and after"', 'aria-label={t("studio.compareSlider.aria")}'),
], hook_after=None)
with open(csfp, 'r', encoding='utf-8') as f: content = f.read()
anchor = '  const [pos, setPos] = useState(0.5);'
if anchor in content:
    content = content.replace(anchor, anchor + '\n  const { t } = useI18n();', 1)
    with open(csfp, 'w', encoding='utf-8') as f: f.write(content)
print(f'compare-slider.tsx: {csn} replacements')

# ── delete-for-good.tsx ─────────────────────────────────────────────────────
dfp = STUDIO + '/delete-for-good.tsx'
dfn = apply(dfp, [
    ('<AlertDialogCancel>Cancel</AlertDialogCancel>', '<AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>'),
], hook_after=('  const { deleteForever } = useGenerationActions();', 'const { t } = useI18n();'))
print(f'delete-for-good.tsx: {dfn} replacements')

# ── prompt-input.tsx ────────────────────────────────────────────────────────
pfp = STUDIO + '/prompt-input.tsx'
pn = apply(pfp, [
    ('{visual.length ? "No element with that name." : "No elements yet. Save a character, location or prop once, then @mention it anywhere."}',
     '{visual.length ? t("studio.promptInput.noElement") : t("studio.promptInput.noElementsYet")}'),
    ('aria-label="Prompt"', 'aria-label={t("studio.promptInput.promptAria")}'),
], hook_after=None)
with open(pfp, 'r', encoding='utf-8') as f: content = f.read()
anchor = '  const [matches, setMatches] = useState<string[]>([]);'
if anchor in content:
    content = content.replace(anchor, '  const { t } = useI18n();\n' + anchor, 1)
    with open(pfp, 'w', encoding='utf-8') as f: f.write(content)
print(f'prompt-input.tsx: {pn} replacements')

# ── video-trimmer.tsx ───────────────────────────────────────────────────────
vtfp = STUDIO + '/video-trimmer.tsx'
vtn = apply(vtfp, [
    ('title={playing ? "Pause" : "Play the selection"}',
     'title={playing ? t("studio.trim.pause") : t("studio.trim.playSelection")}'),
    ('aria-label="Selection position"', 'aria-label={t("studio.trim.selectionPos")}'),
    ('{range ? `${len.toFixed(1)} s selected` : "Reading the clip…"}',
     '{range ? t("studio.trim.sSelected", { n: len.toFixed(1) }) : t("studio.trim.readingClip")}'),
], hook_after=None)
with open(vtfp, 'r', encoding='utf-8') as f: content = f.read()
anchor = '  const [playing, setPlaying] = useState(false);'
if anchor in content:
    content = content.replace(anchor, anchor + '\n  const { t } = useI18n();', 1)
    with open(vtfp, 'w', encoding='utf-8') as f: f.write(content)
print(f'video-trimmer.tsx: {vtn} replacements')

# ── media-slot.tsx ──────────────────────────────────────────────────────────
msfp = STUDIO + '/media-slot.tsx'
msn = apply(msfp, [
    ('({ image: "Image only — drop a photo here", video: "Video only — drop a clip here", audio: "Audio only — drop a sound file here", text: "Text only — drop a .txt or .srt file here", model3d: "3D only — drop a .glb file here" })[kind]',
     '({ image: t("studio.media.imageHint"), video: t("studio.media.videoHint"), audio: t("studio.media.audioHint"), text: t("studio.media.textHint"), model3d: t("studio.media.model3dHint") })[kind]'),
], hook_after=None)
# Add hook where kindHint is computed
with open(msfp, 'r', encoding='utf-8') as f: content = f.read()
anchor = '  const kindHint = kind ? ('
if anchor in content:
    content = content.replace(anchor, '  const { t } = useI18n();\n  ' + anchor, 1)
    with open(msfp, 'w', encoding='utf-8') as f: f.write(content)
print(f'media-slot.tsx: {msn} replacements')

# ── model-controls.tsx ──────────────────────────────────────────────────────
mcfp = STUDIO + '/model-controls.tsx'
mcn = apply(mcfp, [
    ('<Chip icon={title === "Director" ? Clapperboard : Settings2}',
     '<Chip icon={title === t("studio.modelControls.director") ? Clapperboard : Settings2}'),
], hook_after=None)
print(f'model-controls.tsx: {mcn} replacements')

# ── lyrics-editor.tsx ───────────────────────────────────────────────────────
lefp = STUDIO + '/lyrics-editor.tsx'
len_ = apply(lefp, [
    ('{writing ? "Writing…" : "Write the lyrics"}',
     '{writing ? t("studio.lyrics.writing") : t("studio.lyrics.writeLyrics")}'),
    ('{structure.length ? structure.join(" · ") : spec.inPrompt ? `${model.name} reads the lyrics with your description` : "Each tag on its own line, the words under it"}',
     '{structure.length ? structure.join(" · ") : spec.inPrompt ? t("studio.lyrics.readsWithYourDesc", { model: model.name }) : t("studio.lyrics.tagOnLine")}'),
], hook_after=None)
with open(lefp, 'r', encoding='utf-8') as f: content = f.read()
anchor = '  const [writing, setWriting] = useState(false);'
if anchor in content:
    content = content.replace(anchor, '  const { t } = useI18n();\n  ' + anchor, 1)
    with open(lefp, 'w', encoding='utf-8') as f: f.write(content)
print(f'lyrics-editor.tsx: {len_} replacements')

# ── hosted-chips.tsx ────────────────────────────────────────────────────────
hcfp = STUDIO + '/hosted-chips.tsx'
hcn = apply(hcfp, [
    ('{picked ? `Light · ${picked.label}` : "Pick a light"}',
     '{picked ? `Light · ${picked.label}` : t("studio.hosted.pickLight")}'),
], hook_after=None)
print(f'hosted-chips.tsx: {hcn} replacements')

# ── shots-editor.tsx ────────────────────────────────────────────────────────
sefp = STUDIO + '/shots-editor.tsx'
sen = apply(sefp, [
    ('{ id: "off", label: "Off", hint: "One continuous shot" }',
     '{ id: "off", label: t("studio.settings.off"), hint: t("studio.shots.oneContinuous") }'),
    ('{ id: "auto", label: "Auto", hint: "The model plans the cuts" }',
     '{ id: "auto", label: t("studio.settings.auto"), hint: t("studio.shots.modelPlans") }'),
    ('aria-label="Shorter"', 'aria-label={t("studio.shots.shorter")}'),
    ('aria-label="Longer"', 'aria-label={t("studio.shots.longer")}'),
], hook_after=None)
print(f'shots-editor.tsx: {sen} replacements')

# ── preset-chips.tsx custom hint ────────────────────────────────────────────
# Add custom hint key
print('\nDone')
