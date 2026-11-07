#!/usr/bin/env python3
"""
menu.countLine.* 키 4개(apps/motions/canvas/studios)를 en.json과 ko.json에 멱등으로 추가한다
— 런처 헤더의 카운트 라인을 렌더 시점 번역 가능하게 하는 키들 (t_ca378163, 결정문 t_945498cb §1.2).

Option C: 서버가 countLineKey + countLineParams를 실어 나르고, 렌더 지점(mega-panel.tsx의 카운트 라인)에서
`translateOr(lang, model.countLineKey, model.countLine, model.countLineParams)`로 해석한다.

- en 값은 **현재 출력과 문자 단위 동일**해야 한다(바이트 동일성, 결정문 §5의 hard_constraint). translateOr은
  en.json에 키가 있는 순간 그 키값을 fallback보다 먼저 채택하므로(store.ts:144-150), en 값이 곧 출력이 된다.
  {n}/{m} 토큰은 반드시 유지한다(이름은 n, m 뿐 — 결정문 §1.2의 표).
- ko 100% 강제: 4 키를 양쪽 파일에 넣는다. tests/i18n.test.ts:67-72는 en의 모든 키가 ko에 문자열로 존재
  かつ len(ko)==len(en)을 요구하므로 ko 단독 키는 불법이다.
- 두 파일의 키 순서가 서로 같다는 관례(결정문 §4): 새 키만 꼬리에, 같은 순서로 추가하고 재정리하지 않는다.
- 재실행 멱등: 이미 있는 키는 건드리지 않는다. 통합자(t_b47d39c1)는 머지된 트리에서 형제 카드의
  gen-menu-line-keys.py와 이 스크립트를 순서대로 다시 실행해 키를 재생성한다.

사용법: python3 scripts/gen-countline-keys.py [--check]
  --check: 아무것도 쓰지 않고 발견·검증만 보고한다.
"""
import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EN_PATH = ROOT / "src/lib/i18n/locales/en.json"
KO_PATH = ROOT / "src/lib/i18n/locales/ko.json"

# (key) -> (en 값, ko 값). en 값은 카운트 라인 리터럴과 문자 단위 동일({n}/{m}로 숫자를 대체).
# 순서 = 두 파일에 꼬리에 추가할 순서(양쪽 동일). ko는 {n}/{m} 토큰 유지, 줄임표·개행 없음, 한글 1자 이상.
NEW_KEYS = {
    "menu.countLine.apps": (
        "{n} apps, grouped by what they change",
        "{n}개의 앱, 무엇이 바뀌는지로 묶었습니다",
    ),
    "menu.countLine.motions": (
        "{n} camera motions and {m} effects, for any photo",
        "{n}개의 카메라 무브와 {m}개의 효과, 어떤 사진에나",
    ),
    "menu.countLine.canvas": (
        "{n} ready boards that run as they are",
        "{n}개의 완성 보드, 그대로 실행됩니다",
    ),
    # studios의 ko는 lang-switch.mjs:449가 단정하는 기존 문구와 문자 단위 동일해야 한다(결정문 제안을 실측으로 교정).
    "menu.countLine.studios": (
        "{n} studios, grouped by what you want to make",
        "만들고 싶은 것별로 모은 스튜디오 {n}개",
    ),
}


def load(path: Path) -> dict:
    # json.load는 dict을 삽입 순서대로 유지한다(Python 3.7+) — 관례 "두 파일의 키 순서 일치"를 지킨다.
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="읽기·검증만, 쓰지 않는다")
    args = ap.parse_args()

    en = load(EN_PATH)
    ko = load(KO_PATH)

    added = []
    skipped = []
    for key, (en_val, ko_val) in NEW_KEYS.items():
        if key in en and key in ko:
            skipped.append(key)
            continue
        en[key] = en_val
        ko[key] = ko_val
        added.append(key)

    # 관례: 두 파일의 키 순서가 서로 같아야 한다(재정리하지 않고 같은 순서로 꼬리에 추가했으므로 성립).
    en_keys = list(en.keys())
    ko_keys = list(ko.keys())
    if en_keys != ko_keys:
        print("KEY ORDER MISMATCH — 두 파일의 키 순서가 다르다(관례 위반)", file=sys.stderr)
        return 1

    # ko 100% 게이트(tests/i18n.test.ts:67-72): en의 모든 키가 ko에 문자열 + len 동일.
    missing = [k for k in en if not isinstance(ko.get(k), str)]
    if missing or len(ko) != len(en):
        print(f"KEY PARITY FAIL: missing={missing} len(en)={len(en)} len(ko)={len(ko)}", file=sys.stderr)
        return 1

    # Hangul + 토큰 보존 검증(자기 게이트의 판정 기준과 같은 눈으로 미리 확인).
    for key, (_en_val, ko_val) in NEW_KEYS.items():
        if not any("\uac00" <= ch <= "\ud7a3" for ch in ko[key]):
            print(f"KO HANGUL MISSING: {key}", file=sys.stderr)
            return 1
        if "{n}" not in ko[key]:
            print(f"KO TOKEN {{n}} MISSING: {key}", file=sys.stderr)
            return 1
        if key.endswith("motions") and "{m}" not in ko[key]:
            print(f"KO TOKEN {{m}} MISSING: {key}", file=sys.stderr)
            return 1
        if ko[key] == en[key]:
            print(f"KO EQUALS EN: {key}", file=sys.stderr)
            return 1
        del ko_val

    print(f"added={len(added)} skipped={len(skipped)} en={len(en)} ko={len(ko)}")
    for key in added:
        print(f"  + {key}")

    if args.check:
        print("(--check: 쓰지 않음)")
        return 0

    for path, data in ((EN_PATH, en), (KO_PATH, ko)):
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.write("\n")
    print("wrote en.json and ko.json ✓")
    return 0


if __name__ == "__main__":
    sys.exit(main())
