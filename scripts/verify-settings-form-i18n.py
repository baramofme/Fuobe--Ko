#!/usr/bin/env python3
"""Check the i18n table's English values against the pre-wiring HEAD source, byte for byte.

Decodes the JSX HTML entities (&rsquo; &ldquo; &rdquo; &apos; &amp;), collapses newline-whitespace
(the JSX text collapse), then asks whether each table value (or its {param}-free pieces) is present.
Fragments and static values must be found verbatim; templates by their pieces.
"""
import html
import importlib.util
import json
import re
import subprocess
import sys

TABLE_PATH = "scripts/add-settings-form-i18n.py"
FILES = [
    "src/components/settings-form.tsx",
    "src/components/connect-field.tsx",
    "src/lib/connections.ts",
]
BASE = "c9d6ec7d"

# The setup lines are assembled from fragments with mono commands between them.
# A part starting with "=" is a rendered literal (it carries no brackets).
ASSEMBLIES = {
    "ollama": ["settings.form.llm.setupOllamaPre", "=ollama pull qwen3:8b", "settings.form.llm.setupOllamaPost"],
    "lms": [
        "settings.form.llm.setupLmsPre",
        "=lms server start",
        "settings.form.llm.setupLmsMid",
        "=lms get qwen/qwen3-8b",
        "settings.form.llm.setupLmsPost",
    ],
    "unsloth": ["settings.form.llm.setupUnsloth"],
    "custom": ["settings.form.llm.setupCustomPre", "=/v1", "settings.form.llm.setupCustomPost"],
}


def brackets(s: str) -> str:
    """Return "" when the brackets balance: never close before open, none left open at the end."""
    depth = 0
    for ch in s:
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
            if depth < 0:
                return "a ) with no matching ( in front"
    return "" if depth == 0 else f"{depth} ( left unclosed"


def asm(table: dict, parts: list, lang: int) -> str:
    return "".join(p[1:] if p.startswith("=") else table[p][lang] for p in parts)


def norm(src: str) -> str:
    s = html.unescape(src)  # covers &rsquo; &ldquo; &rdquo; &apos; &amp; &#…;
    # {" "} renders as one space: fold it in so fragment boundaries are contiguous text.
    s = s.replace('{" "}', " ")
    # JSX collapses whitespace runs that contain a newline into a single space.
    s = re.sub(r"\n[ \t]*", " ", s)
    return s


def load_table(path: str) -> dict:
    spec = importlib.util.spec_from_file_location("table", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.TABLE


def main() -> int:
    table = load_table(TABLE_PATH)
    blob = "\n".join(norm(subprocess.run(["git", "show", f"{BASE}:{f}"], capture_output=True, text=True, check=True).stdout) for f in FILES)

    missing = []
    for key, (en, _ko) in table.items():
        if "{" in en:  # a template: check its literal pieces
            pieces = [p for p in re.split(r"\{\w+\}", en) if p]
            for p in pieces:
                if p not in blob:
                    missing.append((key, p))
        elif en not in blob:
            missing.append((key, en))

    hanja = []
    for key, (_en, ko) in table.items():
        if re.search(r"[\u4e00-\u9fff\u3400-\u4dbf]", ko):
            hanja.append((key, [c for c in ko if re.match(r"[\u4e00-\u9fff\u3400-\u4dbf]", c)]))

    # Assembled setup lines must carry balanced brackets in both languages.
    brace = []
    for name, parts in ASSEMBLIES.items():
        for lang, label in ((0, "en"), (1, "ko")):
            bad = brackets(asm(table, parts, lang))
            if bad:
                brace.append(f"{name} ({label}): {bad} -> {asm(table, parts, lang)!r}")

    # The table and the shipped locale files must say the same thing (no drift).
    drift = []
    for loc_path, lang in (("src/lib/i18n/locales/en.json", 0), ("src/lib/i18n/locales/ko.json", 1)):
        with open(loc_path, encoding="utf-8") as fh:
            locale = json.load(fh)
        for key, pair in table.items():
            if locale.get(key) != pair[lang]:
                drift.append((key, loc_path))

    if missing:
        print(f"BYTE MISMATCH {len(missing)}:")
        for k, p in missing:
            print(f"  {k} -> {p!r}")
    if hanja:
        print(f"HANJA IN KO {len(hanja)}:")
        for k, cs in hanja:
            print(f"  {k} -> {''.join(cs)!r}")
    if brace:
        print(f"UNBALANCED BRACKETS {len(brace)}:")
        for b in brace:
            print(f"  {b}")
    if drift:
        print(f"TABLE/JSON DRIFT {len(drift)}:")
        for k, pth in drift:
            print(f"  {k} in {pth}")
    if missing or hanja or brace or drift:
        return 1
    print(f"all {len(table)} English values byte-identical to HEAD; hanja 0; assembled brackets balanced (en·ko); TABLE/JSON drift 0")
    return 0


if __name__ == "__main__":
    sys.exit(main())
