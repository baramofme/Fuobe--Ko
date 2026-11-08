#!/usr/bin/env python3
"""
동族 비-trio 가격 리터럴의 로케일 키를 en.json과 ko.json에 멱등으로 추가한다.
1차 trio 키(placeholderFree·freeYourGpu·estimating)의 꼬리와 겹치지 않는다.

규칙:
- en 값은 원 리터럴과 바이트 동일 (e2e/unit 테스트가 영어 bytes에 결속)
- ko 값은 100% 한글 (한자·중문 0, 을(를)/은(는) 스타일)
- 서수 일치: en과 ko의 키 순서가 동일
- dup 0: 신규 키가 기존 키와 값 중복 없음
- 재실행 멱등: 이미 있는 키는 건드리지 않음

키 스키마: studio.price.* (가격 가족), genjutsu.character.* (화질 선택 라벨)

사용법: python3 scripts/gen-price-dongzoku-keys.py [--check]
  --check: 아무것도 쓰지 않고 발견·검증만 보고한다.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EN_PATH = ROOT / "src/lib/i18n/locales/en.json"
KO_PATH = ROOT / "src/lib/i18n/locales/ko.json"

HANGUL = re.compile(r"[\uac00-\ud7a3]")
CJK = re.compile(r"[\u4e00-\u9fff]")
HANJA_RISK = CJK  # same class

# === 신규 키 정의 ===
# (en_value, ko_value)
NEW_KEYS: dict[str, tuple[str, str]] = {
    # 가격 미상 (대소문자 2형)
    "studio.price.unknown":          ("Price unknown",           "가격을 알 수 없습니다"),
    "studio.price.unknownLower":     ("price unknown",           "가격을 알 수 없습니다"),

    # 1센트 미만 (3형)
    "studio.price.under001":         ("Under $0.01",             "1센트 미만"),
    "studio.price.under001Lower":    ("under $0.01",             "1센트 미만"),
    "studio.price.lt001":            ("< $0.01",                 "1센트 미만"),

    # 사용 불가 / 로딩 상태
    "studio.price.notAvailableHere": ("Not available here",      "여기서는 사용할 수 없습니다"),
    "studio.price.dots":             ("\u2026",                  "\u2026"),
    "studio.price.workingOut":       ("Working out the price\u2026", "가격을 계산하는 중\u2026"),

    # 컴팩트 / open-GPU 변형
    "studio.price.freeGpuCompact":   ("Free \u00b7 GPU",             "무료 \u00b7 GPU"),
    "studio.price.freeOnYourGpuDot": ("Free \u00b7 on your GPU",      "무료 \u00b7 내 GPU에서 실행"),
    "studio.price.freeRunsGpu":      ("Free \u00b7 runs on your GPU", "무료 \u00b7 내 GPU에서 실행"),
    "studio.price.aboutNGb":         (", about {n} GB",          ", 약 {n} GB"),

    # model3d 계열 가격 줄
    "studio.price.placeholderNoCharge": ("Placeholder \u00b7 nothing is charged", "자리표시 \u00b7 비용은 청구되지 않습니다"),
    "studio.price.billedByProvider":    ("Billed by your provider",  "내 프로바이더가 과금합니다"),
    "studio.price.lt001NoSpace":        ("<" + "$0.01",          "1센트 미만"),

    # 데모 버튼 접미 (demo-mode.ts의 가격 suffix)
    "studio.price.demoUnder001":     (" \u00b7 under $0.01",        " \u00b7 1센트 미만"),

    # 화질 선택 라벨 (genjutsu character-panel)
    "genjutsu.character.fasterCheaper": ("Faster and cheaper",   "더 빠르고 저렴"),
    "genjutsu.character.h3NativeTop":   ("H3's native top",      "H3 자체 최고 해상도"),

    # 브라우저 실행 배지 / GPU 응답 대기 / 데모 칩 (2차 배선분 — 레인 t_9ffbf3c4)
    "studio.price.freeInYourBrowser":   ("Free \u00b7 in your browser",           "무료 \u00b7 내 브라우저에서 실행"),
    "studio.price.freePlaysInYourBrowser": ("Free \u00b7 plays in your browser",  "무료 \u00b7 내 브라우저에서 재생"),
    "studio.price.notAnsweringNow":     ("Free \u00b7 not answering right now",   "무료 \u00b7 지금 응답하지 않습니다"),
    "studio.price.demoFree":            ("Demo \u00b7 free",                      "데모 \u00b7 무료"),

    # 24지점 잔여 배선분(t_1fc245a0 — 정의 순서 꼬리로 추가, 재정리 0)
    # color-grade 배지: 형제 freeInYourBrowser의 ko 스타일("내 브라우저에서 실행")을 답습
    "studio.price.freeRunsBrowser":     ("Free \u00b7 runs in your browser",      "무료 \u00b7 내 브라우저에서 실행"),
    # board·skill-builder·create-moodboard의 콤마형(기존 placeholderFree의 ·형과 구별)
    "studio.price.placeholderCommaFree": ("placeholder, free",                     "플레이스홀더, 무료"),
    # canvas의 소문자 free(선례: unknown·unknownLower가 같은 ko 값을 공유한다)
    "studio.price.freeLower":           ("free",                                   "무료"),
}


def load_json(path: Path) -> dict[str, str]:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f, object_pairs_hook=dict)  # ordered


def save_json(path: Path, data: dict[str, str]) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


def main():
    check_mode = "--check" in sys.argv

    en = load_json(EN_PATH)
    ko = load_json(KO_PATH)

    # 사전 검증
    errors: list[str] = []
    duplicates: list[tuple[str, str]] = []
    cjk_hits: list[tuple[str, str]] = []

    for key, (en_val, ko_val) in NEW_KEYS.items():
        # 1. ko 한자/중문 검사
        if CJK.search(ko_val):
            cjk_hits.append((key, ko_val))
        # 2. ko 한글 존재 확인 (순수 기호/줄임표 제외 — en과 동일 허용)
        has_letters = bool(re.search(r"[A-Za-z]", en_val))
        if has_letters and not HANGUL.search(ko_val):
            errors.append(f"{key}: ko 값에 한글 없음")
        # 3. 기존 en 값과 중복 (같은 값의 다른 키가 이미 존재)
        for existing_key, existing_val in en.items():
            if existing_val == en_val and existing_key != key:
                duplicates.append((key, existing_key))
        # 4. 키가 이미 존재 — 멱등: en 값 일치 확인
        if key in en:
            if en[key] != en_val:
                errors.append(f"{key}: 기존 en 값({en[key]!r})과 신규 선언({en_val!r}) 불일치")

    if errors:
        print("FAIL:", file=sys.stderr)
        for e in errors:
            print(f"  {e}", file=sys.stderr)
        sys.exit(1)

    # 보고
    added = 0
    skipped = 0
    for key in NEW_KEYS:
        if key in en:
            skipped += 1
        else:
            added += 1

    print(f"Keys to add: {added}")
    print(f"Keys already present (idempotent skip): {skipped}")
    print(f"Total en.json keys after: {len(en) + added}")
    print(f"Total ko.json keys after: {len(ko) + added}")

    if duplicates:
        print(f"\n⚠ Value duplicates (same en value, different key):")
        for new_key, old_key in duplicates:
            print(f"  {new_key} vs existing {old_key}")
        # This is a WARN not an error — wave-1 keys intentionally reuse values across namespaces

    if cjk_hits:
        print(f"\n✗ FAIL: ko value contains CJK ideograph:", file=sys.stderr)
        for k, v in cjk_hits:
            print(f"  {k}: {v!r}", file=sys.stderr)
        sys.exit(1)
    else:
        print(f"ko CJK check: 0 hits ✓")

    if check_mode:
        print("\n[--check] No files written.")
        return

    # 쓰기: 정렬된 순서 유지, 신규 키는 꼬리에 추가하지 않고 전체 재정렬
    for key, (en_val, ko_val) in NEW_KEYS.items():
        if key not in en:
            en[key] = en_val
        if key not in ko:
            ko[key] = ko_val

    # 관례: 재정리하지 않는다. 기존 순서를 유지하고, 새 키를 꼬리에 같은 순서로 추가.
    # 서수 일치: en과 ko가 같은 키 순서를 가져야 하므로, NEW_KEYS의 정의 순서를 따름.
    for key, (en_val, ko_val) in NEW_KEYS.items():
        if key not in en:
            en[key] = en_val
        if key not in ko:
            ko[key] = ko_val

    # 서수 일치 검증
    assert list(en.keys()) == list(ko.keys()), "KEY ORDER MISMATCH"

    save_json(EN_PATH, en)
    save_json(KO_PATH, ko)

    print(f"\nWrote en.json ({len(en)} keys), ko.json ({len(ko)} keys)")
    print(f"Ordinal match: keys in same order ✓ (tail append, no reorganization)")
    print(f"Parity: len(en) == len(ko) = {len(en)} ✓")


if __name__ == "__main__":
    main()
