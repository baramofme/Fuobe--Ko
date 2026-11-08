#!/usr/bin/env python3
"""Add marketing picker i18n keys (FormatChip, HookPicker, SettingPicker, ListPicker) to
en.json + ko.json. Tail-append both files in the same order. Idempotent; --check reports only.

en values are byte-identical to the source literals they replace; ko is hanja-free.
Every key goes into BOTH files — parity is strict in both directions (tests/i18n.test.ts).

Key scheme (matches the lookups in marketing-studio.tsx / pickers.tsx):
  chrome                       marketing.<ns>.<prop>
  catalog display names        marketing.<ns>.name.<snake>.name   (format · hook · setting, uniform)
  format card labels           marketing.format.card.<snake>
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EN_PATH = ROOT / "src/lib/i18n/locales/en.json"
KO_PATH = ROOT / "src/lib/i18n/locales/ko.json"

CJK = re.compile(r"[\u4e00-\u9fff]")


def key_snake(value: str) -> str:
    """Mirrors keySnake() in src/lib/i18n/store.ts exactly (the lookup builds keys with it)."""
    return re.sub(r"^_+|_+$", "", re.sub(r"[^a-z0-9]+", "_", value.lower()))


NEW_KEYS: dict[str, tuple[str, str]] = {}


def put(key: str, en: str, ko: str) -> None:
    assert key not in NEW_KEYS, f"duplicate key in script: {key}"
    if CJK.search(ko):
        sys.exit(f"HANJA in {key}: {ko}")
    NEW_KEYS[key] = (en, ko)


# ---- FormatChip chrome ----
put("marketing.format.title", "Format", "포맷")
put("marketing.format.aria", "Format: {detail}", "포맷: {detail}")

# chip primary word (cardLabel) and secondary word (name) come from the FORMATS catalog
FORMAT_CARD = {
    "Product shot": "제품 사진",
    "Product motion": "제품 모션",
    "UGC video": "UGC 영상",
    "TikTok": "틱톡",
    "Ads": "광고",
    "Poster": "포스터",
    "Marketplace": "마켓플레이스",
}
FORMAT_NAME = {
    "Standalone": "단품",
    "With model": "모델과 함께",
    "2D product motion": "2D 제품 모션",
    "Hypermotion": "하이퍼모션",
    "Mixed media": "복합 미디어",
    "SaaS": "SaaS",
    "Talking head": "토킹 헤드",
    "TikTok": "틱톡",
    "Ads": "광고",
    "Poster": "포스터",
    "Marketplace": "마켓플레이스",
}
for en_lit, ko_val in FORMAT_CARD.items():
    put(f"marketing.format.card.{key_snake(en_lit)}", en_lit, ko_val)
for en_lit, ko_val in FORMAT_NAME.items():
    put(f"marketing.format.name.{key_snake(en_lit)}.name", en_lit, ko_val)

# ---- HookPicker chrome (ListPicker labelKey=marketing.hook) ----
put("marketing.hook.seeAll", "See all hooks", "모든 훅 보기")
put("marketing.hook.none", "No hook", "훅 없음")
put("marketing.hook.ariaNone", "Hook: none", "훅: 없음")
put("marketing.hook.ariaName", "Hook: {name}", "훅: {name}")
put("marketing.hook.group.stunt", "Stunts", "스턴트")
put("marketing.hook.group.subtle", "Subtle", "잔잔한 연출")

HOOK_NAME = {
    "Product Hit": "제품 히트",
    "Spicy": "매혹",
    "Interview": "거리 인터뷰",
    "Random Object Mic": "갑작스런 마이크",
    "Product Crash": "제품 충돌",
    "Blizzard": "갑작스런 눈보라",
    "Camera Bump": "카메라 부딪힘",
    "Product Dodge": "제품 피하기",
    "Epic Fail": "대실패",
}
for en_lit, ko_val in HOOK_NAME.items():
    put(f"marketing.hook.name.{key_snake(en_lit)}.name", en_lit, ko_val)

# ---- SettingPicker chrome (ListPicker labelKey=marketing.setting) ----
put("marketing.setting.seeAll", "See all settings", "모든 설정 보기")
put("marketing.setting.none", "No setting", "설정 없음")
put("marketing.setting.ariaNone", "Setting: none", "설정: 없음")
put("marketing.setting.ariaName", "Setting: {name}", "설정: {name}")
put("marketing.setting.group.realistic", "Realistic", "현실적")
put("marketing.setting.group.unrealistic", "Unrealistic", "비현실적")

SETTING_NAME = {
    "Bedroom": "침실",
    "Nature": "자연",
    "Gym": "헬스장",
    "Bathroom": "욕실",
    "Kitchen": "주방",
    "In Car": "차 안",
    "Street": "거리",
    "Office": "사무실",
    "Airplane Wing": "비행기 날개",
    "Rooftop Edge": "옥상 끝",
    "Volcano Rim": "화산 분화구",
    "Tiny Reviewer": "작은 리뷰어",
    "Car Roof": "차 지붕",
    "Train Surf": "열차 질주",
}
for en_lit, ko_val in SETTING_NAME.items():
    put(f"marketing.setting.name.{key_snake(en_lit)}.name", en_lit, ko_val)


def load(path: Path) -> dict:
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def save(path: Path, data: dict) -> None:
    with path.open("w", encoding="utf-8") as f:
        f.write(json.dumps(data, ensure_ascii=False, indent=2) + "\n")


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--check", action="store_true", help="report only, write nothing")
    args = p.parse_args()

    en = load(EN_PATH)
    ko = load(KO_PATH)

    added = 0
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
        added += 1

    order_match = list(en.keys()) == list(ko.keys())

    if args.check:
        print(f"en: {len(en)} keys, ko: {len(ko)} keys, order match: {order_match}")
        print(f"would add {added}, skip {skipped} (already present)")
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

    if added:
        save(EN_PATH, en)
        save(KO_PATH, ko)
        print(f"Added {added} keys. en={len(en)}, ko={len(ko)}. Order match: {order_match}")
    else:
        print(f"All {skipped} keys already present. Nothing to write.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
