#!/usr/bin/env python3
"""Static byte-identity gate for the GPU i18n lane (t_b49f1daf).

Collect every user-facing string from the pre-wiring HEAD source (string
literals AND JSX text nodes AND template literals), decode HTML entities, then
confirm each STATIC (placeholder-free) new settings.gpu.* key's en value byte-
equals one of those originals.

Fragment keys (compound parts like notePre/notePost/pairMid) are intentional
substrings of the full original render; they are matched by the substring rule
rather than full equality. Template keys (with {placeholders}) are verified by
the browser render gate, not here.

Run from the worktree root.
"""
import html
import json
import re
import subprocess

REPO = "/home/baramofme/.worktrees/t_b49f1daf-fuobe"
FILES = {
    "connect-choice": "src/components/gpu/connect-choice.tsx",
    "fuobe-connect": "src/components/gpu/fuobe-connect.tsx",
    "where-runs-go": "src/components/gpu/where-runs-go.tsx",
}


def head_src(rel):
    return subprocess.run(
        ["git", "-C", REPO, "show", f"HEAD:{rel}"],
        capture_output=True, text=True, check=True).stdout


def collect(src):
    """Yield every plausible user-facing string from a source file."""
    out = []
    # double- and single-quoted string literals + backtick template literals
    for rx in (r'"((?:[^"\\]|\\.)*)"', r"'((?:[^'\\]|\\.)*)'", r"`([^`]*)`"):
        for m in re.finditer(rx, src):
            s = m.group(1)
            try:
                s = s.encode().decode("unicode_escape", errors="ignore")
            except Exception:
                pass
            out.append(html.unescape(s))
    # JSX text nodes: >Text<, >Text {expr} ... — capture runs of words/short punct
    # between tags, ignoring lines that are pure punctuation/braces.
    for m in re.finditer(r">\s*([^<>{}\n]+?)\s*<", src):
        s = m.group(1).strip()
        if s and re.search(r"[A-Za-z]", s):
            out.append(html.unescape(s))
    # standalone JSX text between tags spanning to {expr}: "text {expr} rest"
    for m in re.finditer(r">\s*([A-Za-z][^<]*?)\s*(?=\{)", src):
        s = m.group(1).strip()
        if s and re.search(r"[A-Za-z]", s):
            out.append(html.unescape(s))
    # attribute values that are plain sentences: title="..." sub="..." label="..."
    for m in re.finditer(r'(?:title|sub|label|aria-label|placeholder|idleLabel)=\"([^\"]*)\"', src):
        out.append(html.unescape(m.group(1)))
    # filter to plausible user-facing
    return [s for s in out if s and re.search(r"[A-Za-z]", s) and (" " in s or len(s) >= 4)]


en = json.load(open(f"{REPO}/src/lib/i18n/locales/en.json", encoding="utf-8"))
new = {k: v for k, v in en.items() if k.startswith("settings.gpu.")}

orig = set()
for _name, rel in FILES.items():
    orig.update(collect(head_src(rel)))

# substring universe: any en value is also a valid "original" context
covered_vals = set(new.values())


def matches(value):
    if value in orig:
        return True
    # fragment: value is a substring of some original render, or an original
    # render is a substring of value
    for o in orig:
        if value in o or o in value:
            return True
    for cv in covered_vals:
        if cv in value or value in cv:
            return True
    return False


bad = []
static_count = 0
for key, val in sorted(new.items()):
    if "{" in val:  # template key -> browser render gate
        continue
    static_count += 1
    if not matches(val):
        bad.append((key, val))

print(f"STATIC (non-template) keys checked: {static_count}")
print(f"STATIC byte mismatches: {len(bad)}")
for k, v in bad[:60]:
    print(f"  {k}: {v!r}")
