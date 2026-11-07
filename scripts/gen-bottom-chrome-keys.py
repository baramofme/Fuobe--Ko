#!/usr/bin/env python3
"""
Add i18n keys for sticky bottom-chrome strings (t_61746aa3).
Tail-append both en.json and ko.json, same order. Idempotent.
"""
import argparse, json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EN_PATH = ROOT / "src/lib/i18n/locales/en.json"
KO_PATH = ROOT / "src/lib/i18n/locales/ko.json"

# key -> (en, ko)
NEW_KEYS: dict[str, tuple[str, str]] = {
    # script-review.tsx — save-status bar inside sticky bottom-chrome
    "faceless.review.saving": ("Saving…", "저장 중…"),
    "faceless.review.unsaved": ("Unsaved", "저장되지 않음"),
    "faceless.review.saved": ("Saved", "저장됨"),
    "faceless.review.renderEpisode": ("Render episode", "에피소드 렌더"),
    # episode-wizard.tsx — step bar inside sticky bottom-chrome
    "faceless.wizard.topicBack": ("Topic", "주제"),
    "faceless.wizard.splitScenes": ("Split into scenes", "신으로 나누기"),
    "faceless.wizard.writeScript": ("Write the script", "대본 작성"),
    "faceless.wizard.topicLine": ("Topic: {topic}", "주제: {topic}"),
    "faceless.wizard.scriptReady": ("Your script is ready to split", "대본을 나눌 준비가 끝났습니다"),
    "faceless.wizard.pickTopic": ("Pick a topic to continue", "계속하려면 주제를 선택하세요"),
    "faceless.wizard.next": ("Next", "다음"),
    # studio-page.tsx — offscreen results pill
    "studio.page.offscreenGenerating": ("{n} generating", "{n}개 생성 중"),
    "studio.page.offscreenOne": ("{n} new result", "새 결과 {n}개"),
    "studio.page.offscreenMany": ("{n} new results", "새 결과 {n}개"),
    # kinetic/editor.tsx — save bar + notes inside sticky bottom-chrome
    "kinetic.save.another": ("Saving another one…", "다른 작업 저장 중…"),
    "kinetic.save.toLibrary": ("Save to Library", "라이브러리에 저장"),
    "kinetic.save.toRuns": ("Save to your runs", "실행 목록에 저장"),
    "kinetic.export.optionsAria": ("Export options", "내보내기 옵션"),
    "kinetic.save.mp4NoBrowser": (
        "This browser can't make MP4 here. Pick WebM in Export options.",
        "이 브라우저에서는 MP4를 만들 수 없습니다. 내보내기 옵션에서 WebM을 선택하세요.",
    ),
    "kinetic.save.shortenBrand": ("Shorten the brand name to fit", "브랜드 이름을 줄이세요"),
    "kinetic.shortenField": ("Shorten the {field} to fit", "{field}(을)를 줄이세요"),
    "kinetic.job.saving": ("Saving…", "저장 중…"),
    "kinetic.job.rendering": ("Rendering {done} of {total}", "렌더링 {done}/{total}"),
    # marketing-studio.tsx — composer inside sticky bottom-chrome
    "marketing.clearTemplateAria": ("Clear template", "템플릿 지우기"),
    "marketing.referenceLabel": ("Reference", "참고"),
    "marketing.placeholderEdit": ("Describe your edit (optional)", "수정 내용을 설명해 주세요 (선택)"),
    "marketing.placeholderDifferent": ("What should look different? (optional)", "무엇이 달라지길 원하시나요? (선택)"),
    "marketing.promptAria": ("Prompt", "프롬프트"),
    "marketing.modeAria": ("Mode", "모드"),
    "marketing.imageModeAria": ("Image mode", "이미지 모드"),
    "marketing.videoModeAria": ("Video mode", "비디오 모드"),
    "marketing.imageLabel": ("Image", "이미지"),
    "marketing.videoLabel": ("Video", "비디오"),
    "marketing.recreateTemplate": ("Recreate template", "템플릿 재생성"),
    "marketing.generate": ("Generate", "생성"),
}


def load(path: Path) -> dict[str, str]:
    data = json.loads(path.read_text(encoding="utf-8"))
    return data


def save(path: Path, data: dict[str, str]) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--check", action="store_true", help="report only, write nothing")
    args = p.parse_args()

    en = load(EN_PATH)
    ko = load(KO_PATH)

    added_en = added_ko = 0
    skipped = 0
    conflicts: list[str] = []

    for key, (en_val, ko_val) in NEW_KEYS.items():
        if key in en and key in ko:
            if en[key] != en_val:
                conflicts.append(f"{key}: existing en={en[key]!r} != wanted {en_val!r}")
            if ko[key] != ko_val:
                conflicts.append(f"{key}: existing ko={ko[key]!r} != wanted {ko_val!r}")
            skipped += 1
            continue
        if key in en:
            conflicts.append(f"{key}: exists in en only, ko missing")
            skipped += 1
            continue
        if key in ko:
            conflicts.append(f"{key}: exists in ko only, en missing")
            skipped += 1
            continue
        en[key] = en_val
        ko[key] = ko_val
        added_en += 1
        added_ko += 1

    order_match = list(en.keys()) == list(ko.keys())

    if args.check:
        print(f"en: {len(en)} keys, ko: {len(ko)} keys, order match: {order_match}")
        print(f"would add {added_en}, skip {skipped} (already present)")
        if conflicts:
            print("CONFLICTS:")
            for c in conflicts:
                print(f"  {c}")
            return 1
        return 0

    if conflicts:
        print("CONFLICTS (refusing to write):")
        for c in conflicts:
            print(f"  {c}")
        return 1

    if not args.check and added_en:
        save(EN_PATH, en)
        save(KO_PATH, ko)
        print(f"Added {added_en} keys. en={len(en)}, ko={len(ko)}. Order match: {list(en.keys()) == list(ko.keys())}")
    elif skipped:
        print(f"All {skipped} keys already present. Nothing to write.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
