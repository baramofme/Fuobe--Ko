#!/usr/bin/env python3
"""Add settings.gpu.* deep keys (this-computer/connect-gpu/computer-runner/your-gpu/guided-fix) to en+ko.

Rules: en value is byte-for-byte the original source literal (tests are bound to English literals);
ko covers en 100%, 을(를)/은(는) style, zero hanja. Ordered dict, json.dumps ensure_ascii=False indent=2 + newline.
Prints: en/ko totals, ko-missing, key conflicts against existing entries, and every ko value with a CJK ideograph.
"""
import json, re, sys, unicodedata
from collections import OrderedDict

ROOT = "/home/baramofme/.worktrees/t_0d2a20b6-fuobe"
EN = f"{ROOT}/src/lib/i18n/locales/en.json"
KO = f"{ROOT}/src/lib/i18n/locales/ko.json"

HANJA = re.compile(r"[\u4e00-\u9fff]")

# key -> (en, ko). en MUST equal the original source literal byte-for-byte.
KEYS = OrderedDict()

def K(key, en, ko):
    KEYS[key] = (en, ko)

# --- enumerated (this-computer :532, guided-fix :32/:33/:54) ---
K("settings.gpu.thisComputer.corsOpen",
  "Your ComfyUI lets every website in. To keep it private, use {origin} instead:",
  "본인 ComfyUI가 모든 웹사이트를 받아들입니다. 비공개로 유지하려면 대신 {origin}(으)로 시작하세요:")
K("settings.gpu.guidedFix.noManager",
  "Your ComfyUI doesn't have ComfyUI-Manager, the add-on that installs things for Fuobe. Run these in a terminal instead:",
  "본인 ComfyUI에 Fuobe를 위해 프로그램을 설치해주는 애드온인 ComfyUI-Manager가 없습니다. 대신 터미널에서 아래를 실행하세요:")
K("settings.gpu.guidedFix.manualOnly",
  "Run these in a terminal, then check again:",
  "터미널에서 아래를 실행한 뒤 다시 확인하세요:")
K("settings.gpu.guidedFix.comfyUpdateOlder",
  "Your ComfyUI is older than this tool needs. Updating it keeps your models and add-ons.",
  "본인 ComfyUI가 이 도구가 필요로 하는 버전보다 오래되었습니다. 업데이트해도 모델과 애드온은 그대로 남습니다:")

# --- your-gpu.tsx full sweep (the #your-gpu account panel) ---
K("settings.gpu.yourGpu.introHosted",
  "Runs on Your GPU reach your ComfyUI through this web address.",
  "내 GPU에서 실행되는 작업이 이 웹 주소를 통해 본인의 ComfyUI에 도달합니다.")
K("settings.gpu.yourGpu.introRunsGo",
  "Your runs go to your ComfyUI through this web address.",
  "본인의 작업이 이 웹 주소를 통해 본인의 ComfyUI로 전달됩니다.")
K("settings.gpu.yourGpu.introGiveAddress",
  "Your runs reach your ComfyUI through a web address. Here's how to give it one:",
  "본인의 작업이 웹 주소를 통해 ComfyUI에 도달합니다. 주소를 부여하는 방법은 다음과 같습니다:")
K("settings.gpu.yourGpu.offlineStatus",
  "Offline: your GPU isn't answering right now",
  "오프라인: GPU가 지금 응답하지 않습니다")
K("settings.gpu.yourGpu.connectedStatus",
  "Connected",
  "연결됨")
K("settings.gpu.yourGpu.withToken",
  " · with a token",
  " · 토큰 포함")
K("settings.gpu.yourGpu.checkNowAction",
  "Check now",
  "지금 확인")
K("settings.gpu.yourGpu.webAddressLabel",
  "Your ComfyUI's web address",
  "본인 ComfyUI의 웹 주소")
K("settings.gpu.yourGpu.connectAnotherLabel",
  "Connect another address",
  "다른 주소 연결")
K("settings.gpu.yourGpu.localAddressWarning",
  "That address only works on your own computer or network. Paste the one cloudflared shows, ending in trycloudflare.com.",
  "해당 주소는 본인의 컴퓨터나 네트워크에서만 동작합니다. cloudflared가 표시하는, trycloudflare.com으로 끝나는 주소를 붙여넣으세요.")
K("settings.gpu.yourGpu.accessTokenLabel",
  "Access token",
  "접속 토큰")
K("settings.gpu.yourGpu.optionalHint",
  "(optional)",
  "(선택)")
K("settings.gpu.yourGpu.tokenHint",
  "Only if your ComfyUI or its web address asks for a password or token.",
  "본인의 ComfyUI나 그 웹 주소가 비밀번호 또는 토큰을 요구하는 경우에만 필요합니다.")
K("settings.gpu.yourGpu.waitingLine",
  "Waiting for your GPU · checking again in {seconds} s",
  "GPU를 기다리는 중 · {seconds}초 후 다시 확인")
K("settings.gpu.yourGpu.checkingAgain",
  "Checking again…",
  "다시 확인 중…")
K("settings.gpu.yourGpu.stopAction",
  "Stop",
  "중지")
K("settings.gpu.yourGpu.checkAgainAction",
  "Check again",
  "다시 확인")
K("settings.gpu.yourGpu.answersNow",
  "Your GPU answers now. ",
  "GPU가 지금 응답합니다. ")
K("settings.gpu.yourGpu.comfyuiAnswered",
  "ComfyUI answered",
  "ComfyUI가 응답했습니다")
K("settings.gpu.yourGpu.connectNowButton",
  "Connect now",
  "지금 연결")
K("settings.gpu.yourGpu.testAction",
  "Test",
  "테스트")
K("settings.gpu.yourGpu.saveAnywayAction",
  "Save anyway",
  "그래도 저장")
K("settings.gpu.yourGpu.toastSavedHosted",
  "Your address is saved. Runs on Your GPU start as soon as it answers.",
  "주소가 저장되었습니다. 내 GPU 실행은 GPU가 응답하기 시작하면 바로 시작됩니다.")
K("settings.gpu.yourGpu.toastSavedRuns",
  "Your address is saved. Your runs start as soon as your GPU answers.",
  "주소가 저장되었습니다. 본인의 작업은 GPU가 응답하기 시작하면 바로 시작됩니다.")
K("settings.gpu.yourGpu.toastConnected",
  "Your GPU is connected.",
  "GPU가 연결되었습니다.")
K("settings.gpu.yourGpu.toastConnectedDesc",
  "You can change this any time from Free ▾, next to the run button.",
  "이 설정은 실행 버튼 옆의 Free ▾에서 언제든 변경할 수 있습니다.")
K("settings.gpu.yourGpu.toastUseItForRuns",
  "Use it for my runs",
  "본인 작업에 사용")
K("settings.gpu.yourGpu.toastConnectedRunsGo",
  "Your GPU is connected. Runs go to your ComfyUI now.",
  "GPU가 연결되었습니다. 작업이 지금 본인의 ComfyUI로 전달됩니다.")
K("settings.gpu.yourGpu.toastUseComputer",
  "Your runs go to the ComfyUI on this computer now. Keep a Fuobe tab open here.",
  "작업이 지금 이 컴퓨터의 ComfyUI로 전달됩니다. 이 창에서 Fuobe 탭을 열어 두세요.")
K("settings.gpu.yourGpu.useElsewhereSafari",
  "Use this computer works in Chrome, Edge or Firefox. Safari doesn't let a website reach programs on your Mac.",
  "이 컴퓨터 사용은 Chrome, Edge 또는 Firefox에서 동작합니다. Safari에서는 웹사이트가 Mac의 프로그램에 접근할 수 없습니다.")
K("settings.gpu.yourGpu.useElsewherePhone",
  "Use this computer works in a browser on your computer, not on a phone or tablet.",
  "이 컴퓨터 사용은 컴퓨터의 브라우저에서 동작하며, 폰이나 태블릿에서는 동작하지 않습니다.")
K("settings.gpu.yourGpu.useElsewhereHttp",
  "Use this computer needs a secure page, and your browser marks this one as not secure.",
  "이 컴퓨터 사용은 보안 페이지가 필요하지만, 현재 브라우저가 이 페이지를 안전하지 않음으로 표시하고 있습니다.")

def load(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f, object_pairs_hook=OrderedDict)

def dump(p, d):
    with open(p, "w", encoding="utf-8") as f:
        f.write(json.dumps(d, ensure_ascii=False, indent=2) + "\n")

def main():
    dry = "--check" in sys.argv
    en = load(EN); ko = load(KO)
    conflicts = []
    hanja_hits = []
    for key, (ev, kv) in KEYS.items():
        if key in en and en[key] != ev:
            conflicts.append(f"{key}: existing en={en[key]!r} new en={ev!r}")
        if key in ko and ko[key] != kv:
            conflicts.append(f"{key}: existing ko={ko[key]!r} new ko={kv!r}")
        if HANJA.search(kv):
            hanja_hits.append(f"{key}: {kv}")
    for key, (ev, kv) in KEYS.items():
        en[key] = ev
        ko[key] = kv
    ko_missing = [k for k in en if k not in ko]
    en_only = [k for k in ko if k not in en]
    print(f"added={len(KEYS)}")
    print(f"conflicts={len(conflicts)}")
    for c in conflicts: print("  CONFLICT", c)
    print(f"hanja_hits={len(hanja_hits)}")
    for h in hanja_hits: print("  HANJA", h)
    print(f"en_keys={len(en)} ko_keys={len(ko)}")
    print(f"ko_missing={len(ko_missing)} en_only={len(en_only)}")
    for k in ko_missing[:20]: print("  KO-MISS", k)
    for k in en_only[:20]: print("  EN-ONLY", k)
    if conflicts or hanja_hits or ko_missing or en_only:
        print("REFUSING (integrity check failed)")
        sys.exit(1)
    if not dry:
        dump(EN, en); dump(KO, ko)
        print(f"wrote en={len(en)} ko={len(ko)}")
    else:
        print("DRY RUN (--check): nothing written")

if __name__ == "__main__":
    main()
