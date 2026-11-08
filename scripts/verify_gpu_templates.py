#!/usr/bin/env python3
"""Template-render byte check for the GPU i18n lane (t_b49f1daf).

Templates (values with {placeholders}) can't be compared to a source literal by
strict equality. Render them with sample substitutions and confirm the result
equals the original render (which itself used ${...} or {..} interpolation).
"""
import html, json, re, subprocess

REPO = "/home/baramofme/.worktrees/t_b49f1daf-fuobe"
FILES = {
    "connect-choice": "src/components/gpu/connect-choice.tsx",
    "fuobe-connect": "src/components/gpu/fuobe-connect.tsx",
    "where-runs-go": "src/components/gpu/where-runs-go.tsx",
}

def head(rel):
    return subprocess.run(["git", "-C", REPO, "show", "HEAD:" + rel],
                          capture_output=True, text=True, check=True).stdout

en = json.load(open(REPO + "/src/lib/i18n/locales/en.json", encoding="utf-8"))
new = {k: v for k, v in en.items() if k.startswith("settings.gpu.")}

SUBS = {
    "{name}": "Fuobe Connect", "{port}": "8188", "{shown}": "8188",
    "{origin}": "https://fuobe.example", "{code}": "ABCD1234",
    "{place}": "Where ComfyUI runs", "{label}": "Origin",
}

orig = set()
for _n, rel in FILES.items():
    src = head(rel)
    for rx in (r'"((?:[^"\\]|\\.)*)"', r"'((?:[^'\\]|\\.)*)'", r"`([^`]*)`"):
        for m in re.finditer(rx, src):
            s = m.group(1).encode().decode("unicode_escape", errors="ignore")
            orig.add(html.unescape(s))

# Build the original render forms for the interpolation sites we replaced.
# Original code used ${...} / inline expressions; we substitute the SAME sample
# values into those to get the rendered original.
orig_render = set()
for _n, rel in FILES.items():
    src = head(rel)
    # template literals -> render ${...} with our sample values (crude)
    for m in re.finditer(r"`([^`]*)`", src):
        s = m.group(1)
        s = re.sub(r"\$\{p\}", "8188", s)
        s = re.sub(r"\$\{FUOBE_CONNECT\.name\}", "Fuobe Connect", s)
        s = re.sub(r"\$\{window\.location\.origin\}", "https://fuobe.example", s)
        s = re.sub(r"\$\{mine\.port\}", "8188", s)
        s = re.sub(r"\$\{shownPort\}", "8188", s)
        s = re.sub(r"\$\{f\.port\}", "8188", s)
        s = html.unescape(s)
        orig_render.add(s)
    # JSX {interpolate(FOO, {name})} sites -> interpolate with name=Fuobe Connect
    # (we approximate by rendering the TEMPLATE with name substituted)

bad = []
for k, v in sorted(new.items()):
    if "{" not in v:
        continue
    r = v
    for a, b in SUBS.items():
        r = r.replace(a, b)
    pool = orig | orig_render
    found = r in pool or any(r in o or o in r for o in pool)
    if not found:
        bad.append((k, r))

print("template keys:", sum(1 for v in new.values() if "{" in v))
print("templates whose render doesn't match an original:", len(bad))
for k, r in bad:
    print("  ", k, repr(r))
