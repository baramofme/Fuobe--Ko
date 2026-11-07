#!/usr/bin/env python3
"""
Add i18n keys for the marketing bottom-chrome components (t_63fdb0f8):
BrandChip, TextPanel, WebsitePanel, VoiceControl, SettingsPanel (marketing).
Inserted right after the existing "studio.settings.videos" key — a stable anchor
far from the tail, so a sibling's tail-append merges cleanly. Same position and
order in en.json and ko.json (parity invariant). Idempotent; --check for a dry run.
"""
import argparse, json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EN_PATH = ROOT / "src/lib/i18n/locales/en.json"
KO_PATH = ROOT / "src/lib/i18n/locales/ko.json"

ANCHOR = "studio.settings.videos"  # insert this block right after this key

# key -> (en, ko)
NEW_KEYS: dict[str, tuple[str, str]] = {
    # BrandChip (brand-dialog.tsx)
    "marketing.brand.kit": ("Brand kit", "브랜드 키트"),
    "marketing.brand.ariaSelected": ("Brand kit: {name}", "브랜드 키트: {name}"),
    "marketing.brand.emptyOwner": (
        "No brand kit added yet — paste a link or create one manually to get started.",
        "아직 브랜드 키트를 추가하지 않았습니다 — 링크를 붙여넣거나 직접 만들어 시작하세요.",
    ),
    "marketing.brand.emptyOther": ("Brand kits aren't available here.", "여기서는 브랜드 키트를 사용할 수 없습니다."),
    "marketing.brand.add": ("Add brand kit", "브랜드 키트 추가"),
    "marketing.brand.none": ("No brand kit", "브랜드 키트 없음"),
    "marketing.brand.manage": ("Manage", "관리"),
    # TextPanel (marketing-studio.tsx)
    "marketing.words.panelTitle": ("Words on the image", "그림에 들어갈 문구"),
    "marketing.words.panelDesc": (
        "Set exactly, letter for letter: Fuobe Marketing Image and open-source results get them set on top in your brand fonts; GPT Image, Ideogram and Recraft draw them.",
        "한 글자씩 그대로 정합니다: Fuobe Marketing Image와 오픈소스 결과는 브랜드 글꼴로 문구를 위에 얹고, GPT Image, Ideogram, Recraft는 그림 속으로 그려 넣습니다.",
    ),
    "marketing.words.triggerAria": ("Headline and button text", "제목과 버튼 문구"),
    "marketing.words.headline": ("Headline", "제목"),
    "marketing.words.button": ("Button", "버튼"),
    "marketing.words.headlinePlaceholder": ("e.g. Crunch, sorted", "예: 바삭하게, 완성"),
    "marketing.words.ctaPlaceholder": ("e.g. Shop now", "예: 지금 구매"),
    "marketing.words.placeholderProduct": ("your product", "내 제품"),
    "marketing.words.placeholderBrand": ("your brand", "내 브랜드"),
    "marketing.words.drawnLabel": ("Words drawn by the model", "모델이 그려 넣은 문구"),
    "marketing.words.drawnHint": (
        "The headline and button are drawn into the picture, in their places. Off: they're set on top in your brand fonts, letter for letter.",
        "제목과 버튼이 그림의 제자리에 그려 넣습니다. 끄면: 브랜드 글꼴로 한 글자씩 위에 얹습니다.",
    ),
    # WebsitePanel (marketing-studio.tsx)
    "marketing.website.panelTitle": ("Website or social link", "웹사이트 또는 소셜 링크"),
    "marketing.website.panelDesc": (
        "What the video is about when there's no product photo: your site or a social profile.",
        "제품 사진이 없을 때 영상의 주제입니다: 웹사이트나 소셜 프로필.",
    ),
    "marketing.website.ariaNone": ("Add a website or social link", "웹사이트 또는 소셜 링크 추가"),
    "marketing.website.ariaValue": ("Website: {value}", "웹사이트: {value}"),
    "marketing.website.word": ("Website", "웹사이트"),
    "marketing.website.linkLabel": ("Link", "링크"),
    "marketing.website.badUrl": ("Enter a valid website URL", "올바른 웹사이트 주소를 입력해 주세요"),
    # VoiceControl tooltip (pickers.tsx)
    "marketing.voiceover.openHint": (
        "Open-source voices are cloned from a short sample (Chatterbox)",
        "오픈소스 목소리는 짧은 샘플로 복제합니다 (Chatterbox)",
    ),
    "marketing.voiceover.byModel": ("Voiceover by {model}", "{model} 음성"),
    # SettingsPanel — marketing composer (marketing-studio.tsx)
    "marketing.output.tooltip": ("Aspect ratio, length, batch and model", "화면 비율, 길이, 개수, 모델"),
    "marketing.output.triggerAria": ("Settings: {summary}", "설정: {summary}"),
    "marketing.output.lengthLine": ("Length · {seconds}s", "길이 · {seconds}초"),
    "marketing.output.ugcLengthNote": (
        "The whole video: the script is sized to what's left after the hook and the product close-up",
        "영상 전체의 길이입니다: 훅과 제품 클로즈업 뒤 남은 분량에 맞춰 대본을 조정합니다",
    ),
    "marketing.output.lengthSecondsAria": ("Length in seconds", "초 단위 길이"),
    "marketing.output.versions": ("Versions", "버전"),
    "marketing.output.batchAria": ("Batch size", "배치 크기"),
    "marketing.output.model": ("Model", "모델"),
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
    if missing_en or missing_ko:
        en2, ko2 = load(EN_PATH), load(KO_PATH)
        print(f"Added en={len(missing_en)}, ko={len(missing_ko)}. en={len(en2)}, ko={len(ko2)}. Order match: {list(en2.keys()) == list(ko2.keys())}")
    else:
        print(f"All {len(NEW_KEYS)} keys already present. Nothing to write.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
