#!/usr/bin/env python3
"""
SelfHostNote의 마침표 변형(t_85502228, 후속 of t_1f971eb9) i18n 키 삽입:
marketing.blocker.unavailableNote — line 500의 방문자(note) 리터럴을 배선한다.

계보는 직전 레인(t_1f971eb9)의 차단 블록 꼬리 marketing.blocker.badUrl 바로 뒤 —
같은 블록 안에서 연속 배치하므로 en/ko 순서 패리티(동순·동수)가 보존되고,
gen-marketing-blocker-keys.py의 앵커(marketing.output.model)를 건드리지 않아도
계보 순서가 깨지지 않는다(카드에 못 박힌 결정).

en은 소스 리터럴과 바이트 동일 — 끝 마침표 포함 "Marketing Studio isn't available here."
kinetic-templates.mjs lines 153·302·316의 getByText가 이 마침표 버전에 결속되어 있으므로
바이트 보존이 필수이다. ko는 이미 확립된 문장의 마침표형으로 통일한다.
재실행 멱등: 이미 있고 값이 같으면 건너뛴다. --check은 드라이 런.
"""
import argparse, json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EN_PATH = ROOT / "src/lib/i18n/locales/en.json"
KO_PATH = ROOT / "src/lib/i18n/locales/ko.json"

ANCHOR = "marketing.blocker.badUrl"  # insert right after the blocker block's tail

# key -> (en, ko)
NEW_KEYS: dict[str, tuple[str, str]] = {
    # SelfHostNote (line 500) — the visitor's note under the ready shoots. A distinct byte from
    # marketing.blocker.unavailable: that one is the Generate blocker (no period), this is the note (period).
    "marketing.blocker.unavailableNote": (
        "Marketing Studio isn't available here.",
        "여기서는 마케팅 스튜디오를 사용할 수 없습니다.",
    ),
}


def load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def insert_after(d: dict, anchor: str, pairs: dict[str, str]) -> dict:
    """Rebuild the dict preserving order, placing `pairs` right after `anchor`."""
    out: dict[str, str] = {}
    for k, v in d.items():
        out[k] = v
        if k == anchor:
            for nk, nv in pairs.items():
                out[nk] = nv
    return out


def save(path: Path, d: dict) -> None:
    path.write_text(json.dumps(d, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="dry run: report what would change")
    args = ap.parse_args()

    en, ko = load(EN_PATH), load(KO_PATH)

    conflicts = []
    for k, (ev, kv) in NEW_KEYS.items():
        if k in en and en[k] != ev:
            conflicts.append(f"en {k}: present value differs from {ev!r}")
        if k in ko and ko[k] != kv:
            conflicts.append(f"ko {k}: present value differs from {kv!r}")

    missing_en = [k for k in NEW_KEYS if k not in en]
    missing_ko = [k for k in NEW_KEYS if k not in ko]
    skipped = len(NEW_KEYS) - len(missing_en)
    order_match = list(en.keys()) == list(ko.keys())
    anchor_ok = ANCHOR in en and ANCHOR in ko

    if args.check:
        print(f"en: {len(en)} keys, ko: {len(ko)} keys, order match: {order_match}, anchor present: {anchor_ok}")
        print(f"would add en={len(missing_en)}, ko={len(missing_ko)}, skip {skipped} (already present)")
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
    if not anchor_ok:
        print(f"anchor key {ANCHOR!r} missing from a locale — refusing")
        return 1

    if missing_en:
        save(EN_PATH, insert_after(en, ANCHOR, {k: NEW_KEYS[k][0] for k in NEW_KEYS if k in missing_en}))
    if missing_ko:
        save(KO_PATH, insert_after(ko, ANCHOR, {k: NEW_KEYS[k][1] for k in NEW_KEYS if k in missing_ko}))
    print(f"added en={len(missing_en)}, ko={len(missing_ko)}, skipped {skipped}")
    # parity: same key count and the same order in both files, re-read from disk.
    en2, ko2 = load(EN_PATH), load(KO_PATH)
    if list(en2.keys()) != list(ko2.keys()):
        print("ORDER PARITY BROKEN after write — investigate")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
