#!/usr/bin/env python3
"""
범위 확장 크롬 문자열(t_dee3be02 — NAME 카드가 명시 제외, 오케스트레이터 포함 판정)의
로케일 키를 en.json과 ko.json에 멱등으로 꼬리에 추가한다. 로케일 손목지 금지 관례의 생성 경로
(gen-menu-line-keys.py의 OWNER_STATIC 선언 선례를 따른다).

네 문자열과 키 스킴(오케스트레이터 결정 — 이 카드 본문에 그대로 박혀 있다):
- `Start here` 헤드   → area.section.start.title        (렌더 site는 mega-panel.tsx의 MegaColumns가
  이미 `area.section.<id>.title`로 translateOr 해석 중 — 로케일 키만 채우면 배선이 끝난다)
- `Effect films` 헤드 → area.section.effect-films.title (같은 경로, c.id = 섹션 key)
- `See all ready boards` → nav.canvas.seeAllReadyBoards (크롬 링크 라벨 — menu.line이 아니라 nav.*)
- 에러 토스트 `Couldn't make a new board. Please try again.` → nav.canvas.newBoardError
  (wire 어디에도 없는 정적 신규 문구 — OWNER_STATIC처럼 여기서 직접 선언한다)

en 값의 원천(드리프트 없이 세 곳):
1) 실행 중인 서버의 wire — {base}/nav-menus/canvas의 start/effect-films column `label`과
   마지막 tiles column의 `more.label`. 정답은 서버 출력에 이미 있다(gen-menu-line-keys 교리).
2) nav-canvas-owner.tsx가 토스트에 넘기는 리터럴 그 자체(선언 정적).
서버가 안 떠 있으면 선언 리터럴로 대체하되, 떠 있는 한 wire과 문자 단위 일치해야 한다(불일치 시 실패).

ko 값 규칙: 한글 1자 이상, 줄임표·개행 금지, en과 동일 금지. ko가 없으면 스크립트가 실패한다
— ko 100% 강제. menu.line의 LINE_MAX(26)는 패널 행 레이아웃 규칙이라 이 nav./area. 키엔 적용하지
않는다(토스트·헤드는 잘림 규칙이 다르다). 단 두 헤드의 ko는 /apps와 /canvas가 이미 보여주는 문구와
같은 값으로 수확했다(같은 화면 안의 용어 통일).
두 파일의 키 순서가 서로 같다는 관례: 새 키만 두 파일에 같은 순서로 꼬리에, 재정리하지 않는다.
재실행 멱등: 이미 있는 키는 건드리지 않는다(다만 en이 오늘의 원천과 문자 단위 같아야 한다).

사용법: python3 scripts/gen-canvas-chrome-keys.py [--base http://localhost:3020] [--check]
  --check: 아무것도 쓰지 않고 발견·검증만 보고한다.
"""
import argparse
import json
import re
import sys
import urllib.request
from pathlib import Path
from typing import NoReturn

ROOT = Path(__file__).resolve().parent.parent
EN_PATH = ROOT / "src/lib/i18n/locales/en.json"
KO_PATH = ROOT / "src/lib/i18n/locales/ko.json"

HANGUL = re.compile(r"[\uac00-\ud7a3]")


def fail(msg: str) -> NoReturn:
    print(f"FAIL: {msg}", file=sys.stderr)
    sys.exit(1)


# 정적 선언(OWNER_STATIC 선례): wire 어디에도 없는 토스트 문구. en은 코드가 넘기는 리터럴 그 자체.
TOAST_STATIC = {
    "nav.canvas.newBoardError": "Couldn't make a new board. Please try again.",
}

# ko 인벤토리 — 키가 없으면 실패한다(번역 강요).
KO_MAP: dict[str, str] = {
    # 두 헤드는 이미 다른 페이지가 보여주는 ko 문구를 그대로 수확(용어 통일):
    # apps.startHere의 ko가 "여기서 시작", canvas.sections.effectFilms의 ko가 "효과 영화".
    "area.section.start.title": "여기서 시작",
    "area.section.effect-films.title": "효과 영화",
    "nav.canvas.seeAllReadyBoards": "준비된 보드 모두 보기",
    "nav.canvas.newBoardError": "새 보드를 만들지 못했습니다. 다시 시도해 주세요.",
}


def wire_bytes(base: str) -> dict[str, str]:
    """wire가 만들어 낸 라인이 그 값: 실행 중인 canvas 메뉴의 start/effect-films label과 more.label."""
    with urllib.request.urlopen(f"{base}/nav-menus/canvas", timeout=20) as r:
        menu = json.load(r)
    cols = {c["id"]: c for c in menu["columns"]}
    out: dict[str, str] = {}
    start = cols.get("start")
    if start is None or not start.get("label"):
        fail("wire의 start column에 label이 없습니다 — 서버 출력이 변했다(스크립트 선언을 갱신하세요)")
    out["area.section.start.title"] = start["label"]
    eff = cols.get("effect-films")
    if eff is None or not eff.get("label"):
        # 커버 없는 섹션은 필터로 빠질 수 있다(오늘 실측은 두 column). 빠진 날은 선언 리터럴로 대체.
        print("경고: wire에 effect-films column 없음 — 선언 리터럴로 대체", file=sys.stderr)
        out["area.section.effect-films.title"] = "Effect films"
    else:
        out["area.section.effect-films.title"] = eff["label"]
    tiles = [c for c in menu["columns"] if c.get("variant") == "tiles" and c.get("more")]
    if not tiles:
        fail("wire의 tiles column에 more가 없습니다 — 서버 출력이 변했다(스크립트 선언을 갱신하세요)")
    out["nav.canvas.seeAllReadyBoards"] = tiles[-1]["more"]["label"]
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="http://localhost:3020", help="실행 중인 fuobe (wire의 라벨 정답)")
    ap.add_argument("--check", action="store_true", help="쓰기 없이 발견·검증만")
    args = ap.parse_args()

    try:
        source = wire_bytes(args.base)
        verified = "wire"
    except Exception as e:  # 서버가 없어도 생성 경로는 성립한다(선언 리터럴 = 오늘 실측 바이트).
        source = {
            "area.section.start.title": "Start here",
            "area.section.effect-films.title": "Effect films",
            "nav.canvas.seeAllReadyBoards": "See all ready boards",
        }
        verified = f"declared (wire 없음: {type(e).__name__})"
    source.update(TOAST_STATIC)

    en = json.loads(EN_PATH.read_text(encoding="utf-8"))
    ko = json.loads(KO_PATH.read_text(encoding="utf-8"))

    new_keys = []
    for key, en_val in source.items():
        kv = KO_MAP.get(key)
        if kv is None:
            fail(f"KO_MAP에 번역이 없는 새 키: {key} ← en {en_val!r}")
        problems = []
        if not HANGUL.search(kv): problems.append("한글 0자")
        if "…" in kv: problems.append("줄임표")
        if "\n" in kv: problems.append("개행")
        if kv == en_val: problems.append("en과 동일")
        if problems:
            fail(f"ko 품질 규칙 위반: {key} = {kv!r} ({', '.join(problems)})")
        if key in en:
            # 이미 있으면: en 값이 오늘의 원천과 문자 단위 같아야 한다(낡은 값의 조용한 회귀 방지).
            if en[key] != en_val:
                fail(f"stale en value: {key} = {en[key]!r} 그러나 원천은 {en_val!r}")
            if key in ko and ko[key] != kv:
                fail(f"stale ko value: {key} = {ko[key]!r} 그러나 KO_MAP은 {kv!r}")
            continue
        if key in ko:
            fail(f"{key}: ko에만 있고 en에 없음(en=ko 관례 위반)")
        new_keys.append((key, en_val, kv))

    print(f"원천 검증: {verified} · 발견 {len(source)}개 키 · 신규 {len(new_keys)}개")
    if args.check:
        print(f"--check: 신규 {len(new_keys)}개, 검증 통과")
        return

    if new_keys:
        for key, en_val, kv in new_keys:  # 두 파일에 같은 순서로 꼬리에
            en[key] = en_val
            ko[key] = kv

    EN_PATH.write_text(json.dumps(en, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    KO_PATH.write_text(json.dumps(ko, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    # 관례·퍼테리 자체 검증
    assert list(en.keys()) == list(ko.keys()), "KEY ORDER MISMATCH"
    assert len(en) == len(ko), "KEY COUNT MISMATCH"
    print(f"완료: en={len(en)} ko={len(ko)} 신규추가={len(new_keys)} 순서·개수 일치")


if __name__ == "__main__":
    main()
