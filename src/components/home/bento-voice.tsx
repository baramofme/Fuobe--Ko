"use client";

import { ArrowRight, Loader2, Pause, Play, RotateCcw, Volume2 } from "lucide-react";
import { useRef, useState } from "react";
import { useCleanVoiceDemo } from "@/components/audio-tools/use-clean-voice-demo";
import { IntentLink } from "@/components/intent-link";
import { isRunning, type DemoState } from "@/lib/av/clean-voice-demo";
import { useI18n } from "@/lib/i18n/use-i18n";
import type { BentoTile } from "@/lib/home-bento";
import { cn } from "@/lib/utils";
import { s } from "./home-bento-classes";

/** The play button's locale key, icon and spin flag in the tile, for each moment of the demo. */
export function voiceButton(st: DemoState): { label: string; labelKey: string; Icon: typeof Play; spin?: boolean } {
  switch (st.phase) {
    case "loading":
      return { label: "Loading…", labelKey: "home.bento.voice.loading", Icon: Loader2, spin: true };
    case "playing":
      return { label: "Pause", labelKey: "home.bento.voice.pause", Icon: Pause };
    case "paused":
      return { label: "Resume", labelKey: "home.bento.voice.resume", Icon: Play };
    case "done":
      return { label: "Play again", labelKey: "home.bento.voice.playAgain", Icon: RotateCcw };
    case "failed":
      return { label: "Try again", labelKey: "home.bento.voice.tryAgain", Icon: RotateCcw };
    default:
      return { label: "Tap to listen", labelKey: "home.bento.voice.tapToListen", Icon: Volume2 };
  }
}

/**
 * Home's Audio tile: Clean up voice's own demo, to hear on the spot. A woman talks in a noisy restaurant; one tap plays
 * the room as recorded, and a few seconds in the noise goes by itself while she keeps talking (the photo softens with
 * it). Noise on / Noise off switch between the two takes at the same moment in her speech. The sound is the studio's
 * own (use-clean-voice-demo.ts): nothing plays or downloads until the first tap, one sound plays on the page at a time,
 * and it pauses when the tile leaves the screen or the tab is hidden.
 *
 * Unlike the other tiles the whole tile isn't a link, as it holds the demo's buttons: its words are the link to the
 * studio, and a tap on the photo plays or pauses. `room`: the restaurant photo (from the server, on the first paint);
 * `quiet`: the same photo softened around her, added once the visitor reaches for the tile.
 */
export function BentoVoice({ tile, area, room, quiet }: { tile: BentoTile; area: string; room: React.ReactNode; quiet: React.ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const { state, tap, choose, barRef } = useCleanVoiceDemo({ view: box });
  const { t } = useI18n();
  // The softened photo is asked for once the visitor reaches for the tile (a pointer over it, a touch, the keyboard).
  const [armed, setArmed] = useState(false);
  const arm = () => setArmed(true);
  const playing = state.phase === "playing";
  const button = voiceButton(state);
  return (
    <div
      ref={box}
      role="group"
      aria-label={t("home.bento.voice.demoAria")}
      data-tile={tile.key}
      data-phase={state.phase}
      data-clean={state.clean || undefined}
      className={cn(s.tile, area, s.voice)}
      onPointerEnter={arm}
      onTouchStart={arm}
      onFocus={arm}
      // The photo plays and pauses too (its buttons and its link do their own).
      onClick={(e) => {
        if (!(e.target as Element).closest("a, button")) tap();
      }}
    >
      <span aria-hidden className={cn(s.voicePics, (isRunning(state) || state.phase === "done") && s.voiceNear)}>
        {room}
        <span className={s.voiceQuiet} data-on={state.clean || undefined}>
          {(armed || state.run > 0) && quiet}
        </span>
      </span>
      <span aria-hidden className={s.shade} />

      <div className={s.voiceUi}>
        <span className={s.voiceChip} aria-live="polite">
          <i aria-hidden className={s.voiceDot} data-live={(playing && !state.clean) || undefined} />
          <span data-demo-state>{t(state.clean ? "home.bento.voice.cleanState" : "home.bento.voice.noisyState")}</span>
        </span>

        <span role="group" aria-label={t("home.bento.voice.noiseGroup")} className={s.voiceSwitch}>
          {[
            { clean: false, labelKey: "home.bento.voice.noiseOn" },
            { clean: true,  labelKey: "home.bento.voice.noiseOff" },
          ].map((o) => (
            <button key={o.labelKey} type="button" aria-pressed={state.clean === o.clean} onClick={() => choose(o.clean)}>
              <span>{t(o.labelKey)}</span>
            </button>
          ))}
        </span>

        <button type="button" className={s.voicePlay} onClick={tap} aria-busy={state.phase === "loading" || undefined}>
          <button.Icon aria-hidden className={cn("size-4 shrink-0", button.spin && "animate-spin motion-reduce:animate-none", playing && "fill-current")} />
          <span>{t(button.labelKey)}</span>
        </button>

        <IntentLink href={tile.href} aria-label={tile.label} className={s.voiceLink}>
          <span aria-hidden className={s.voiceCopy}>
            <span className={s.meta}>{tile.meta}</span>
            <span className={s.title}>
              {/* "Studio-clean" stays whole when the title wraps. */}
              {tile.title.split(" ").map((w, i) => (
                <span key={i}>
                  {i > 0 && " "}
                  {w.includes("-") ? <span className="whitespace-nowrap">{w}</span> : w}
                </span>
              ))}
              <ArrowRight className={s.voiceGo} />
            </span>
            <span className={s.cta}>
              {tile.cta} <ArrowRight className="size-3.5" />
            </span>
          </span>
        </IntentLink>
      </div>

      <span aria-hidden className={s.voiceBar}>
        <i ref={barRef} />
      </span>
    </div>
  );
}
