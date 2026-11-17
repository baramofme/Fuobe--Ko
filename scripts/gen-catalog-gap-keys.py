#!/usr/bin/env python3
"""
Add the catalog gap key t_52bfd11a found by the catalog-wide key probe.

Every one of the 495 catalog presets reads its card's name and description through a derived key
(`preset.<snake(name)>.name`, `preset.<snake(description)>.description`) — the scheme the launcher's
names already use. The probe (tests/preset-card-i18n.test.ts) found exactly one hole: Mugshot's
description "A police booking-scene video" had no key in either locale, so its card fell back to the
English author's words on the Korean page. English is the catalog literal byte for byte; the Korean
follows the sibling "A playful police booking shot" ("장난기 있는 체포 기록 사진"), which fixes
"police booking" as 체포 기록 — no hanja, snapshot style.

Keys sit next to that sibling, so the block stays readable; both files keep the same key order.
Idempotent: running it twice changes nothing. --check reports without writing.
"""
import argparse, json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EN_PATH = ROOT / "src/lib/i18n/locales/en.json"
KO_PATH = ROOT / "src/lib/i18n/locales/ko.json"

# key -> (en, ko): the English is the catalog literal, the Korean is authored in the sibling's style.
NEW_KEYS: dict[str, tuple[str, str]] = {
    "preset.a_police_booking_scene_video.description": ("A police booking-scene video", "체포 기록 장면의 영상"),
    # t_3913855f 병합에서 뒤늦게 드러난 두 갭: 카탈로그 설명 문구가 달라져(스위퍼가 옛 키를 정리하고
    # 새 문구의 파생 키는 아직 생성되지 않아) 카드가 한국어 페이지에서 영문 저자 글로 떨어졌다.
    # 한국어는 형제 키들의 어투를 따른다(menu.line.your_3d_body_twin "내 3D 체형 쌍둥이",
    # menu.line.soft_or_smeared_faces "흐릿거나 번진 얼굴").
    "preset.your_3d_body_twin_from_a_photo_a_clip_or_your_camera.description": (
        "Your 3D body twin from a photo, a clip or your camera",
        "사진, 클립 또는 카메라로 만든 내 3D 체형 쌍둥이",
    ),
    "preset.soft_or_smeared_faces_in_a_video_redrawn_sharp_and_true.description": (
        "Soft or smeared faces in a video, redrawn sharp and true",
        "영상의 흐리거나 번진 얼굴을 선명하고 사실처럼 다시 그린다",
    ),
}

# Insert after this key so the new entry sits with its block (both files get the same position).
ANCHOR = "preset.the_moving_scene_is_drawn_in_graphite_lines_on_white_paper_lines_redrawn_every_frame.description"


def load(path: Path) -> dict[str, str]:
    return json.loads(path.read_text(encoding="utf-8"))


def save(path: Path, data: dict[str, str]) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def insert(data: dict[str, str], key: str, value: str, anchor: str) -> dict[str, str]:
    """Rebuild the dict with `key` right after `anchor` (or at the tail when the anchor is gone)."""
    out: dict[str, str] = {}
    placed = False
    for k, v in data.items():
        out[k] = v
        if k == anchor:
            out[key] = value
            placed = True
    if not placed:
        out[key] = value
    return out


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--check", action="store_true", help="report only, write nothing")
    args = p.parse_args()

    en = load(EN_PATH)
    ko = load(KO_PATH)

    added_en = added_ko = 0
    skipped = 0
    conflicts: list[str] = []

    en_changed = ko_changed = False
    for key, (en_val, ko_val) in NEW_KEYS.items():
        if key in en and key in ko:
            if en[key] != en_val:
                conflicts.append(f"{key}: existing en={en[key]!r} != wanted {en_val!r}")
            if ko[key] != ko_val:
                conflicts.append(f"{key}: existing ko={ko[key]!r} != wanted {ko_val!r}")
            skipped += 1
            continue
        if key in en or key in ko:
            conflicts.append(f"{key}: exists in one locale only")
            skipped += 1
            continue
        en = insert(en, key, en_val, ANCHOR)
        ko = insert(ko, key, ko_val, ANCHOR)
        added_en += 1
        added_ko += 1
        en_changed = ko_changed = True

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
        print("CONFLICTS (nothing written):")
        for c in conflicts:
            print(f"  {c}")
        return 1
    if en_changed:
        save(EN_PATH, en)
    if ko_changed:
        save(KO_PATH, ko)
    print(f"added en {added_en}, ko {added_ko}; skipped {skipped}; order match {order_match}")
    print(f"en: {len(en)} keys, ko: {len(ko)} keys")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
