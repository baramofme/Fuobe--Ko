#!/usr/bin/env python3
"""
Marketing Studio 실행 차단(run blocker) 문자열 3종의 i18n 키 삽입(t_1f971eb9, 후속 of t_63fdb0f8):
marketing.blocker.unavailable · marketing.blocker.attachProduct · marketing.blocker.badUrl
(marketing.brand|words|website|voiceover|output과 동격 계보 — 카드에 못 박힌 결정).

직전 블록(marketing chrome 35종)의 마지막 키 marketing.output.model 바로 뒤에 삽입한다 —
같은 블록 안에서 연속 배치하므로 en/ko 순서 패리티(동순·동수)가 보존되고, 형제 레인의 꼬리
추가와 충돌하지 않는다. en은 소스 리터럴과 바이트 동일(lang-switch의 영어 리터럴 선택기 결속
보존), ko는 전량 한글(nav.marketing의 established 명칭 "마케팅 스튜디오" 사용).
재실행 멱등: 이미 있고 값이 같으면 건너뛴다. --check은 드라이 런.
"""
import argparse, json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EN_PATH = ROOT / "src/lib/i18n/locales/en.json"
KO_PATH = ROOT / "src/lib/i18n/locales/ko.json"

ANCHOR = "marketing.output.model"  # insert this block right after this key

# key -> (en, ko)
NEW_KEYS: dict[str, tuple[str, str]] = {
    # Generate tooltip · the sm:hidden mobile line · the SelfHostNote under it — one string, all surfaces.
    "marketing.blocker.unavailable": (
        "Marketing Studio isn't available here",
        "여기서는 마케팅 스튜디오를 사용할 수 없습니다.",
    ),
    # no product yet, the format wants one required
    "marketing.blocker.attachProduct": ("Attach a product to generate", "생성하려면 제품을 첨부해 주세요"),
    # the blocker side of the bad website (marketing.website.badUrl는 패널 쪽 이미 배선 — 같은 단어, 다른 계보)
    "marketing.blocker.badUrl": ("Enter a valid website URL", "올바른 웹사이트 주소를 입력해 주세요"),
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
