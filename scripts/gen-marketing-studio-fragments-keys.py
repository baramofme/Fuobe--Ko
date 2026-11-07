#!/usr/bin/env python3
"""
Marketing Studio 히어로 문장(<p>, marketing-studio.tsx line 489)의 조건 분기 파편 3종을
합성 문자열로 배선하기 위한 i18n 키 삽입(t_1a8eb7d1, 후속 of t_1f971eb9):
marketing.studio.productLine · marketing.studio.fragmentOpenSource ·
marketing.studio.fragmentOwnGpu · marketing.studio.fragmentCloud
(marketing.blocker|brand|words|website|voiceover|output과 동격의 marketing.<group>.<camel> 계보 —
이 문장의 조감은 marketing.studio 그룹에 산다).

합성 설계: 문장 전체를 productLine 한 키로 감되 조건 분기 어구만 fragment 키로 떼어,
t("marketing.studio.productLine", { fragment })가 {fragment} 자리에 조각을 끼워 넣는다.
en의 productLine 가치는 배선 전 원 리터럴(렌더된 문장)과 문자 단위 동일 — {fragment}에
각 fragment en 가치를 대입하면 세 분기 문장이 바이트 그대로 재조립된다(lang-switch의
영어 리터럴 결속 보존). ko는 문장을 재배열하되 {fragment}가 어느 자리에도 문법적으로
붙도록 조각마다 조사를 씌워 넣었다(en 파편과 달리 ko fragment는 "-로/-에서" 형태로 종결).
그래서 ko productLine는 "{fragment}, Fuobe 템플릿으로 만듭니다." 순서로 재구성해도 각
분기마다 자연스러운 한 문장이 된다. ko는 전량 한글 + 관례상 남기는 외래 표기만 유지
(GPU·UGC는 한국어에서도 쓰는 기술/약어, Fuobe Marketing Image는 제품·모델 고유명사).

앵커는 marketing.generate — marketing 네임스페이스의 마지막 키. 그 바로 뒤에 이 4종을
연속 삽입하므로 블록이 붙어 있고, en/ko를 같은 앵커에 넣어 동순·동수 패리티가 보존된다.
재실행 멱등: 이미 있고 값이 같으면 건너뛴다. --check은 드라이 런.
"""
import argparse, json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EN_PATH = ROOT / "src/lib/i18n/locales/en.json"
KO_PATH = ROOT / "src/lib/i18n/locales/ko.json"

ANCHOR = "marketing.generate"  # insert this block right after this key

# key -> (en, ko)
NEW_KEYS: dict[str, tuple[str, str]] = {
    # The whole hero sentence. {fragment} is the condition branch's words, dropped in.
    # en value == the rendered pre-wiring sentence byte-for-byte (apostrophe is the ASCII
    # apostrophe that &apos; renders to; the dash is U+2014 em dash).
    "marketing.studio.productLine": (
        "Product shots, motion, UGC presenters, ads, posters and listings — from Fuobe's templates, on {fragment}.",
        "제품 사진, 모션, UGC 프리젠터, 광고, 포스터, 리스팅까지 — {fragment}, Fuobe 템플릿으로 만듭니다.",
    ),
    # engine === "open" and a visitor: the open-weights way.
    "marketing.studio.fragmentOpenSource": ("open-source models", "오픈소스 모델로"),
    # engine === "open" and the owner: self-hosted, no cloud bill.
    "marketing.studio.fragmentOwnGpu": ("your own GPU, free", "본인 GPU에서 무료로"),
    # not open: the hosted way. Fuobe Marketing Image is the product's own model name — kept.
    "marketing.studio.fragmentCloud": (
        "Fuobe Marketing Image or partner models in the cloud",
        "클라우드의 Fuobe Marketing Image 또는 파트너 모델로",
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
