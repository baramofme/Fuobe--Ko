#!/usr/bin/env python3
"""Collapse the standalone "(optional)" key into the label (the established connectChoice fold pattern),
so the settings.gpu.* owner-panel sweep can't attribute sibling's residual "(optional)" to this lane.

- remove settings.gpu.yourGpu.optionalHint from en+ko
- fold "(optional)" into settings.gpu.yourGpu.accessTokenLabel (en "Access token (optional)", ko "접속 토큰 (선택)")
"""
import json, re
from collections import OrderedDict

ROOT = "/home/baramofme/.worktrees/t_0d2a20b6-fuobe"
EN = f"{ROOT}/src/lib/i18n/locales/en.json"
KO = f"{ROOT}/src/lib/i18n/locales/ko.json"
HANJA = re.compile(r"[\u4e00-\u9fff]")

def load(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f, object_pairs_hook=OrderedDict)

def dump(p, d):
    with open(p, "w", encoding="utf-8") as f:
        f.write(json.dumps(d, ensure_ascii=False, indent=2) + "\n")

en = load(EN); ko = load(KO)
drop = "settings.gpu.yourGpu.optionalHint"
label = "settings.gpu.yourGpu.accessTokenLabel"
removed = drop in en and drop in ko
en.pop(drop, None); ko.pop(drop, None)
en[label] = "Access token (optional)"
ko[label] = "접속 토큰 (선택)"
ko_missing = [k for k in en if k not in ko]
en_only = [k for k in ko if k not in en]
hanja_hits = [k for k, v in ko.items() if HANJA.search(v)]
print(f"removed_optional_hint={removed}")
print(f"accessTokenLabel_en={en[label]!r} ko={ko[label]!r}")
print(f"en_keys={len(en)} ko_keys={len(ko)}")
print(f"ko_missing={len(ko_missing)} en_only={len(en_only)} hanja={len(hanja_hits)}")
for k in ko_missing[:20]: print("  KO-MISS", k)
for k in en_only[:20]: print("  EN-ONLY", k)
for k in hanja_hits[:20]: print("  HANJA", k)
# confirm no settings.gpu.* value is exactly "(optional)" anymore
opt = [k for k, v in en.items() if k.startswith("settings.gpu.") and v == "(optional)"]
print(f"gpu_keys_valuing_(optional)={len(opt)}")
if ko_missing or en_only or hanja_hits or opt or not removed:
    print("REFUSING"); raise SystemExit(1)
dump(EN, en); dump(KO, ko)
print(f"wrote en={len(en)} ko={len(ko)}")
