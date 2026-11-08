#!/usr/bin/env python3
"""Check the i18n table's English values against the pre-wiring HEAD source, byte for byte.

Decodes the JSX HTML entities (&rsquo; &ldquo; &rdquo; &apos; &amp;), collapses newline-whitespace
(the JSX text collapse), then asks whether each table value (or its {param}-free pieces) is present.
Fragments and static values must be found verbatim; templates by their pieces.
"""
import html
import importlib.util
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

    if missing:
        print(f"BYTE MISMATCH {len(missing)}:")
        for k, p in missing:
            print(f"  {k} -> {p!r}")
    if hanja:
        print(f"HANJA IN KO {len(hanja)}:")
        for k, cs in hanja:
            print(f"  {k} -> {''.join(cs)!r}")
    if missing or hanja:
        return 1
    print(f"all {len(table)} English values byte-identical to HEAD; hanja 0")
    return 0


if __name__ == "__main__":
    sys.exit(main())
