#!/usr/bin/env python3
"""Add settings.gpu.* keys for the full sweep (this-computer/connect-gpu/computer-runner/guided-fix).

Rules: en value byte-for-byte identical to source literal (tests bound to English literals);
ko covers en 100%, 을(를)/은(는) style, zero hanja. Ordered dict, json.dumps ensure_ascii=False indent=2 + newline.
Prints: en/ko totals, ko-missing, key conflicts, CJK ideograph hits.
"""
import json, re, sys, unicodedata
from collections import OrderedDict

ROOT = "/home/baramofme/.worktrees/t_82db7922-fuobe"
EN = f"{ROOT}/src/lib/i18n/locales/en.json"
KO = f"{ROOT}/src/lib/i18n/locales/ko.json"

HANJA = re.compile(r"[\u4e00-\u9fff\u3400-\u4dbf]")

# key -> (en, ko)
KEYS = OrderedDict()

def K(key, en, ko):
    KEYS[key] = (en, ko)

# ──────────────────────────────────────────────────────────────────────
# this-computer.tsx — PromptPicture
# ──────────────────────────────────────────────────────────────────────
K("settings.gpu.thisComputer.promptWantsTo",
  "{host} wants to",
  "{host}이(가) 다음을 요청합니다")
K("settings.gpu.thisComputer.promptAccessApps",
  "Access other apps and services on this device",
  "이 기기의 다른 앱과 서비스 접근")
K("settings.gpu.thisComputer.promptBlock",
  "Block",
  "차단")
K("settings.gpu.thisComputer.promptAllow",
  "Allow",
  "허용")

# ──────────────────────────────────────────────────────────────────────
# this-computer.tsx — AllowNote
# ──────────────────────────────────────────────────────────────────────
K("settings.gpu.thisComputer.allowNote",
  "Your browser will ask to let Fuobe reach apps on this computer. Press Allow. Fuobe only talks to ComfyUI.",
  "브라우저가 이 컴퓨터의 앱에 접근하도록 Fuobe를 허용할지 묻습니다. 허용을 누르세요. Fuobe는 ComfyUI와만 통신합니다.")

# ──────────────────────────────────────────────────────────────────────
# this-computer.tsx — blockedSteps (data-path, ALL branches keyed)
# ──────────────────────────────────────────────────────────────────────
K("settings.gpu.thisComputer.blockedFirefox",
  "Click the icon to the left of the address and allow apps and services on this device, then reload.",
  "주소 왼쪽의 아이콘을 눌러 이 기기의 앱과 서비스 접근을 허용한 후 새로 고치세요.")
K("settings.gpu.thisComputer.blockedBrave",
  "Click the Brave icon and allow localhost access, then reload.",
  "Brave 아이콘을 눌러 localhost 접근을 허용한 후 새로 고치세요.")
K("settings.gpu.thisComputer.blockedDefault",
  "Click the icon to the left of the address, turn on Apps on device, then reload.",
  "주소 왼쪽의 아이콘을 눌러 기기의 앱을 켠 후 새로 고치세요.")

# ──────────────────────────────────────────────────────────────────────
# this-computer.tsx — UNSUPPORTED (guest) + UNSUPPORTED_OWNER (owner)
# ──────────────────────────────────────────────────────────────────────
K("settings.gpu.thisComputer.unsupportedPhone",
  "A phone or tablet can't reach the ComfyUI on your computer from a website. Give your ComfyUI a web address below, and your runs reach it from here.",
  "폰이나 태블릿에서는 웹사이트로 본인 컴퓨터의 ComfyUI에 접근할 수 없습니다. 아래에서 본인 ComfyUI에 웹 주소를 지정하면 여기서 실행할 수 있습니다.")
K("settings.gpu.thisComputer.unsupportedSafari",
  "Safari doesn't let a website talk to programs on your Mac, so this page can't reach your ComfyUI. Give your ComfyUI a web address below, and it works from Safari.",
  "Safari는 웹사이트가 Mac의 프로그램과 통신하는 것을 허용하지 않으므로 이 페이지에서 본인 ComfyUI에 접근할 수 없습니다. 아래에서 본인 ComfyUI에 웹 주소를 지정하면 Safari에서도 사용할 수 있습니다.")
K("settings.gpu.thisComputer.unsupportedHttp",
  "Your browser marks this page as not secure, so it doesn't let the page talk to programs on this computer, like ComfyUI. Give your ComfyUI a web address below, and it works from here.",
  "브라우저가 이 페이지를 안전하지 않음으로 표시하므로 이 페이지가 ComfyUI 같은 이 컴퓨터의 프로그램과 통신할 수 없습니다. 아래에서 본인 ComfyUI에 웹 주소를 지정하면 여기서 사용할 수 있습니다.")
K("settings.gpu.thisComputer.unsupportedOwnerPhone",
  "A phone or tablet can't reach the ComfyUI on your computer from a website. Use a ComfyUI on a server below, and your runs reach it from here.",
  "폰이나 태블릿에서는 웹사이트로 본인 컴퓨터의 ComfyUI에 접근할 수 없습니다. 아래에서 서버의 ComfyUI를 사용하면 여기서 실행할 수 있습니다.")
K("settings.gpu.thisComputer.unsupportedOwnerSafari",
  "Safari doesn't let a website talk to programs on your Mac, so this page can't reach your ComfyUI. Use a ComfyUI on a server below, and it works from Safari.",
  "Safari는 웹사이트가 Mac의 프로그램과 통신하는 것을 허용하지 않으므로 이 페이지에서 본인 ComfyUI에 접근할 수 없습니다. 아래에서 서버의 ComfyUI를 사용하면 Safari에서도 사용할 수 있습니다.")
K("settings.gpu.thisComputer.unsupportedOwnerHttp",
  "Your browser marks this page as not secure, so it doesn't let the page talk to programs on this computer, like ComfyUI. Use a ComfyUI on a server below, or give this studio a secure address.",
  "브라우저가 이 페이지를 안전하지 않음으로 표시하므로 이 페이지가 ComfyUI 같은 이 컴퓨터의 프로그램과 통신할 수 없습니다. 아래에서 서버의 ComfyUI를 사용하거나 이 스튜디오에 보안 주소를 지정하세요.")

# ──────────────────────────────────────────────────────────────────────
# this-computer.tsx — OTHER_BROWSERS (used in unsupportedWords)
# ──────────────────────────────────────────────────────────────────────
K("settings.gpu.thisComputer.otherBrowsersNote",
  "Chrome, Edge and Firefox allow this, so switching browser also works.",
  "Chrome, Edge, Firefox는 이를 허용하므로 다른 브라우저로 전환해도 사용할 수 있습니다.")

# ──────────────────────────────────────────────────────────────────────
# this-computer.tsx — GuardFix
# ──────────────────────────────────────────────────────────────────────
K("settings.gpu.thisComputer.downloadStartFile",
  "Download start file",
  "시작 파일 다운로드")
K("settings.gpu.thisComputer.downloadGuard",
  "Download Fuobe's guard",
  "Fuobe 가드 다운로드")
K("settings.gpu.thisComputer.liveNodesTitle",
  "For Live edit: change a picture as you type",
  "Live 편집: 입력하면서 이미지를 변경")
K("settings.gpu.thisComputer.liveNodesLabel",
  "Fuobe's live nodes",
  "Fuobe 라이브 노드")
K("settings.gpu.thisComputer.guardLiveNodesTail",
  " The live nodes go there too, for Live edit. Then restart ComfyUI.",
  " 라이브 노드도 같은 곳에 두세요(Live 편집용). 그 후 ComfyUI를 재시작하세요.")

# ──────────────────────────────────────────────────────────────────────
# this-computer.tsx — PickedNote
# ──────────────────────────────────────────────────────────────────────
K("settings.gpu.thisComputer.checkingPort",
  "Checking port {port}…",
  "포트 {port} 확인 중…")
K("settings.gpu.thisComputer.nothingAnswersPort",
  "Nothing answers on port {port} right now. Is ComfyUI still running there?",
  "포트 {port}에서 지금 응답이 없습니다. ComfyUI가 해당 포트에서 계속 실행 중인가요?")

# ──────────────────────────────────────────────────────────────────────
# this-computer.tsx — OtherPorts
# ──────────────────────────────────────────────────────────────────────
K("settings.gpu.thisComputer.otherPortsCount",
  "Other ports ({count})",
  "다른 포트({count})")
K("settings.gpu.thisComputer.somethingOnPort",
  "Something answers on port {port}",
  "포트 {port}에서 응답이 있습니다")
K("settings.gpu.thisComputer.useThisPort",
  "Use port {port}",
  "포트 {port} 사용")

# ──────────────────────────────────────────────────────────────────────
# this-computer.tsx — settingWords (data-path, ALL branches keyed)
# heading
# ──────────────────────────────────────────────────────────────────────
K("settings.gpu.thisComputer.headingBack",
  "ComfyUI is back, but it still doesn't let this page in.",
  "ComfyUI가 다시 시작되었지만 이 페이지는 아직 접근할 수 없습니다.")
K("settings.gpu.thisComputer.headingAgain",
  "ComfyUI is running, but Fuobe can't use it this time.",
  "ComfyUI가 실행 중이지만 이번에는 Fuobe가 사용할 수 없습니다.")
K("settings.gpu.thisComputer.headingComfyPort",
  "Something is running on port {port}, ComfyUI's usual port.",
  "ComfyUI의 일반 포트인 {port}에서 무언가 실행 중입니다.")
K("settings.gpu.thisComputer.headingRememberedPort",
  "Something is running on port {port}, where your ComfyUI was before.",
  "이전에 본인 ComfyUI가 실행되던 포트 {port}에서 무언가 실행 중입니다.")
K("settings.gpu.thisComputer.headingDesktopPort",
  "Something is running on port {port}, ComfyUI Desktop's usual port.",
  "ComfyUI Desktop의 일반 포트인 {port}에서 무언가 실행 중입니다.")
K("settings.gpu.thisComputer.headingSomeAnswers",
  "Something answers on port {port}.",
  "포트 {port}에서 응답이 있습니다.")

# ──────────────────────────────────────────────────────────────────────
# this-computer.tsx — settingWords (data-path, ALL branches keyed)
# why
# ──────────────────────────────────────────────────────────────────────
K("settings.gpu.thisComputer.whyTrust",
  "ComfyUI only answers the websites it's told to trust, so this page can't use it yet. One step lets Fuobe in:",
  "ComfyUI는 신뢰하도록 지정된 웹사이트에만 응답하므로 이 페이지는 아직 사용할 수 없습니다. 한 단계로 Fuobe를 허용할 수 있습니다:")
K("settings.gpu.thisComputer.whyBackPublished",
  "Did ComfyUI restart after the install? Fuobe Connect starts with ComfyUI.",
  "설치 후 ComfyUI를 재시작했나요? Fuobe Connect는 ComfyUI와 함께 시작됩니다.")
K("settings.gpu.thisComputer.whyBackNotPublished",
  "Did ComfyUI start again with Fuobe's setting? Check it below.",
  "Fuobe 설정으로 ComfyUI를 다시 시작했나요? 아래에서 확인하세요.")
K("settings.gpu.thisComputer.whyOtherPort",
  "Fuobe can't read this port yet. If it's ComfyUI, one step lets Fuobe in:",
  "Fuobe가 이 포트를 아직 읽을 수 없습니다. ComfyUI라면 한 단계로 허용할 수 있습니다:")

# ──────────────────────────────────────────────────────────────────────
# this-computer.tsx — WeakCandidate
# ──────────────────────────────────────────────────────────────────────
K("settings.gpu.thisComputer.noneOnComfyPort",
  "No ComfyUI found on port {port}, its usual port.",
  "ComfyUI의 일반 포트인 {port}에서 ComfyUI를 찾을 수 없습니다.")
K("settings.gpu.thisComputer.weakSomethingOnPort",
  "Something answers on port {port}, but Fuobe can't tell if it's ComfyUI. Start ComfyUI, then check again.",
  "포트 {port}에서 응답이 있지만 ComfyUI인지는 확인할 수 없습니다. ComfyUI를 시작하고 다시 확인하세요.")
K("settings.gpu.thisComputer.portIsMine",
  "Port {port} is my ComfyUI",
  "포트 {port}가 내 ComfyUI입니다")

# ──────────────────────────────────────────────────────────────────────
# this-computer.tsx — SettingFix (the non-heading/why parts)
# ──────────────────────────────────────────────────────────────────────
K("settings.gpu.thisComputer.orOneSetting",
  "Or start ComfyUI with one setting instead.",
  "또는 한 가지 설정으로 ComfyUI를 시작하세요.")
K("settings.gpu.thisComputer.showTheSetting",
  "Show the setting",
  "설정 보기")
K("settings.gpu.thisComputer.watchingConnect",
  "Fuobe connects by itself once ComfyUI lets this page in.",
  "ComfyUI가 이 페이지를 허용하면 Fuobe가 자동으로 연결합니다.")
K("settings.gpu.thisComputer.advancedSetting",
  "Advanced: a start setting instead",
  "고급: 대신 시작 설정")

# ──────────────────────────────────────────────────────────────────────
# this-computer.tsx — FlagFix
# ──────────────────────────────────────────────────────────────────────
K("settings.gpu.thisComputer.addressExact",
  "The address must be exactly {origin}, with nothing after it.",
  "주소는 정확히 {origin}이어야 하며 뒤에 아무것도 붙이면 안 됩니다.")
K("settings.gpu.thisComputer.nextTimeStartFile",
  "Next time, start ComfyUI with {file} (next to ComfyUI): it has the setting.",
  "다음에는 ComfyUI 옆의 {file}(으)로 ComfyUI를 시작하세요: 설정이 들어 있습니다.")
K("settings.gpu.thisComputer.guardStartFile",
  "On its own, this setting would also let other websites send work to your ComfyUI. The start file adds Fuobe's guard, which turns them away.",
  "이 설정만으로는 다른 웹사이트도 본인 ComfyUI로 작업을 보낼 수 있습니다. 시작 파일에 Fuobe 가드가 포함되어 차단합니다.")
K("settings.gpu.thisComputer.guardAddToo",
  "On its own, this setting would also let other websites send work to your ComfyUI. Add Fuobe's guard too: it turns them away.",
  "이 설정만으로는 다른 웹사이트도 본인 ComfyUI로 작업을 보낼 수 있습니다. Fuobe 가드도 추가하세요: 차단해 줍니다.")
K("settings.gpu.thisComputer.restartWarning",
  "Restarting stops anything ComfyUI is making right now. If Windows warns you about a file from the internet, press More info, then Run anyway.",
  "재시작하면 ComfyUI가 현재 생성 중인 작업이 중지됩니다. Windows가 인터넷에서 가져온 파일에 대해 경고하면 추가 정보를 누른 후 실행을 누르세요.")
K("settings.gpu.thisComputer.doYourself",
  "Rather do it yourself?",
  "직접 하시겠습니까?")
K("settings.gpu.thisComputer.addToEndLine",
  "Add this to the end of the line that starts ComfyUI in your start file, then start ComfyUI again:",
  "ComfyUI를 시작하는 줄 끝에 아래를 추가한 후 ComfyUI를 다시 시작하세요:")
K("settings.gpu.thisComputer.notWhatYouUse",
  "Not what you use?",
  "다른 것을 사용하시나요?")
K("settings.gpu.thisComputer.installTerminal",
  "Started from a terminal",
  "터미널에서 시작")
K("settings.gpu.thisComputer.installDesktop",
  "ComfyUI Desktop",
  "ComfyUI Desktop")
K("settings.gpu.thisComputer.installPortable",
  "Portable or Easy-Install",
  "Portable 또는 Easy-Install")
K("settings.gpu.thisComputer.installMatrix",
  "Stability Matrix",
  "Stability Matrix")
K("settings.gpu.thisComputer.labelSetting",
  "the setting",
  "설정")
K("settings.gpu.thisComputer.labelAddress",
  "the address",
  "주소")
K("settings.gpu.thisComputer.examplePrefix",
  "For example:",
  "예를 들어:")
K("settings.gpu.thisComputer.nothingAnsweredPast",
  "Nothing answered on port {port}.",
  "포트 {port}에서 응답이 없었습니다.")
K("settings.gpu.thisComputer.anotherAppAnswers",
  "Another app answers on port {port}, not ComfyUI.",
  "ComfyUI가 아닌 다른 앱이 포트 {port}에서 응답합니다.")
K("settings.gpu.thisComputer.comfyUIOnAnotherPort",
  "ComfyUI on another port?",
  "다른 포트의 ComfyUI인가요?")
K("settings.gpu.thisComputer.portAria",
  "ComfyUI's port",
  "ComfyUI 포트")
K("settings.gpu.thisComputer.lookAction",
  "Look",
  "찾기")
K("settings.gpu.thisComputer.enterPortHint",
  "Enter the port ComfyUI shows, like 8188.",
  "ComfyUI가 표시하는 포트를 입력하세요(예: 8188).")
K("settings.gpu.thisComputer.fuobeGuardSubject",
  "Fuobe's guard",
  "Fuobe 가드")
K("settings.gpu.thisComputer.noGuardText",
  "Other websites could also send work to your ComfyUI. Add Fuobe's guard to turn them away:",
  "다른 웹사이트도 본인 ComfyUI로 작업을 보낼 수 있습니다. Fuobe 가드를 추가해 차단하세요:")

# ──────────────────────────────────────────────────────────────────────
# this-computer.tsx — WaitingScreen
# ──────────────────────────────────────────────────────────────────────
K("settings.gpu.thisComputer.waitingStart",
  "Waiting for ComfyUI to start…",
  "ComfyUI 시작을 기다리는 중…")
K("settings.gpu.thisComputer.waitingShort",
  "This usually takes 10 to 30 seconds.",
  "보통 10초에서 30초 걸립니다.")
K("settings.gpu.thisComputer.waitingLong",
  "Still waiting. Is ComfyUI's window open? It says \u201cTo see the GUI go to: http://127.0.0.1:{port}\u201d when it's ready.",
  "계속 기다리는 중입니다. ComfyUI 창이 열려 있나요? 준비되면 \u201cTo see the GUI go to: http://127.0.0.1:{port}\u201d라고 표시됩니다.")
K("settings.gpu.thisComputer.checkAddress",
  "Check that the address is exactly {origin}, with nothing after it.",
  "주소가 정확히 {origin}인지, 뒤에 아무것도 없는지 확인하세요.")

# ──────────────────────────────────────────────────────────────────────
# this-computer.tsx — Screen cases
# ──────────────────────────────────────────────────────────────────────
K("settings.gpu.thisComputer.skipAlready",
  "Already have it? Skip this step.",
  "이미 설치하셨나요? 이 단계를 건너뛰세요.")
K("settings.gpu.thisComputer.lookingComfyUI",
  "Looking for ComfyUI on this computer…",
  "이 컴퓨터에서 ComfyUI를 찾는 중…")
K("settings.gpu.thisComputer.foundConnecting",
  "Found ComfyUI on port {port}. Connecting…",
  "포트 {port}에서 ComfyUI를 찾았습니다. 연결 중…")
K("settings.gpu.thisComputer.noneFound",
  "No ComfyUI found on this computer.",
  "이 컴퓨터에서 ComfyUI를 찾을 수 없습니다.")
K("settings.gpu.thisComputer.startThenCheck",
  "Start ComfyUI, then check again.",
  "ComfyUI를 시작하고 다시 확인하세요.")
K("settings.gpu.thisComputer.watchingLooks",
  "Fuobe also looks for it by itself every few seconds.",
  "Fuobe가 몇 초마다 자동으로 검색합니다.")
K("settings.gpu.thisComputer.dontHaveComfy",
  "Don't have ComfyUI?",
  "ComfyUI가 없으신가요?")
K("settings.gpu.thisComputer.getComfyDesktop",
  "Get ComfyUI Desktop",
  "ComfyUI Desktop 받기")
K("settings.gpu.thisComputer.blockedScreen",
  "Your browser is blocking Fuobe from reaching apps on this computer.",
  "브라우저가 Fuobe가 이 컴퓨터의 앱에 접근하는 것을 차단하고 있습니다.")
K("settings.gpu.thisComputer.reloadAction",
  "Reload",
  "새로 고침")

# ──────────────────────────────────────────────────────────────────────
# this-computer.tsx — Celebration
# ──────────────────────────────────────────────────────────────────────
K("settings.gpu.thisComputer.connectedTitle",
  "Your GPU is connected",
  "GPU가 연결되었습니다")
K("settings.gpu.thisComputer.guardKeepsOut",
  " keeps other websites out of your ComfyUI.",
  " 다른 웹사이트가 본인 ComfyUI에 접근하는 것을 차단합니다.")
K("settings.gpu.thisComputer.comfyUIVersion",
  "ComfyUI {version}",
  "ComfyUI {version}")
K("settings.gpu.thisComputer.checkingComfyHas",
  "Checking what your ComfyUI has…",
  "본인 ComfyUI의 구성을 확인 중…")
K("settings.gpu.thisComputer.seeThem",
  "See them",
  "목록 보기")
K("settings.gpu.thisComputer.startingKind",
  "Starting your {noun}…",
  "{noun} 실행 중…")
K("settings.gpu.thisComputer.runStartsMoment",
  "Your run starts in a moment.",
  "곧 실행이 시작됩니다.")
K("settings.gpu.thisComputer.notNow",
  "Not now",
  "나중에")
K("settings.gpu.thisComputer.doneDefault",
  "Done. Runs from the Image, Video and Audio studios now use your GPU. Keep a Fuobe tab open while they run.",
  "완료되었습니다. 이미지·비디오·오디오 스튜디오의 실행이 이제 본인 GPU를 사용합니다. 실행 중에는 Fuobe 탭을 열어 두세요.")

# readyLine fragments (data-path)
K("settings.gpu.thisComputer.readyPre",
  "Ready now: ",
  "현재 준비: ")
K("settings.gpu.thisComputer.readyOneStudio",
  "studio",
  "스튜디오")
K("settings.gpu.thisComputer.readyStudios",
  "studios",
  "스튜디오")
K("settings.gpu.thisComputer.readyNeedsOne",
  "needs a one-time download or setup",
  "한 번만 다운로드하거나 설정하면 됩니다")
K("settings.gpu.thisComputer.readyNeedsMany",
  "need a one-time download or setup",
  "한 번만 다운로드하거나 설정하면 됩니다")

# ──────────────────────────────────────────────────────────────────────
# this-computer.tsx — INSTALLS label (only "Started from a terminal" is translatable)
# others are proper nouns, kept as-is
# ──────────────────────────────────────────────────────────────────────
# (installTerminal added above)

# ──────────────────────────────────────────────────────────────────────
# connect-gpu.tsx — Step / Card
# ──────────────────────────────────────────────────────────────────────
K("settings.gpu.connectChoice.stepDone",
  "Done",
  "완료")
K("settings.gpu.connectChoice.stepOf",
  "Step {n} of {of}",
  "{of}단계 중 {n}단계")

# ──────────────────────────────────────────────────────────────────────
# connect-gpu.tsx — title / lead / done button
# ──────────────────────────────────────────────────────────────────────
K("settings.gpu.connectChoice.titleWelcome",
  "Welcome! Connect your GPU",
  "환영합니다! GPU를 연결하세요")
K("settings.gpu.connectChoice.titleConnect",
  "Connect your GPU",
  "GPU 연결")
K("settings.gpu.connectChoice.lead",
  "Make things on your own graphics card with ComfyUI. It's free, private and has no run limit. Fuobe checks what your ComfyUI has, and shows what each studio still needs.",
  "ComfyUI로 자신의 그래픽 카드에서물을 만드세요. 무료, 비공개, 실행 제한 없음. Fuobe가 본인 ComfyUI의 구성을 확인하고 각 스튜디오에 아직 필요한 것을 보여줍니다.")
K("settings.gpu.connectChoice.startCreating",
  "Start creating",
  "만들기 시작")
K("settings.gpu.connectChoice.notNow",
  "Not now",
  "나중에")

# ──────────────────────────────────────────────────────────────────────
# connect-gpu.tsx — pairing page
# ──────────────────────────────────────────────────────────────────────
K("settings.gpu.connectChoice.pairH1",
  "Connect your ComfyUI",
  "본인 ComfyUI 연결")
K("settings.gpu.connectChoice.pairLead",
  "Type the code that your own ComfyUI shows, check the computer, then approve it. Approve only a code you see on your own screen.",
  "본인 ComfyUI가 표시하는 코드를 입력하고, 컴퓨터를 확인한 후 승인하세요. 본인 화면에서 확인한 코드만 승인하세요.")
K("settings.gpu.connectChoice.pairSignIn",
  "Sign in to approve this ComfyUI. Its runs will be yours.",
  "이 ComfyUI를 승인하려면 로그인하세요. 해당 실행은 본인 것이 됩니다.")
K("settings.gpu.connectChoice.login",
  "Log in",
  "로그인")
K("settings.gpu.connectChoice.signUpFree",
  "Sign up free",
  "무료 가입")

# ──────────────────────────────────────────────────────────────────────
# connect-gpu.tsx — guest AI page
# ──────────────────────────────────────────────────────────────────────
K("settings.gpu.connectChoice.aiSetUpTitle",
  "Set it up with your AI",
  "AI로 설정하기")
K("settings.gpu.connectChoice.aiPhoneNote",
  "Started on your phone? Log in with the same account, and the setup goes on here.",
  "폰에서 시작하셨나요? 같은 계정으로 로그인하면 여기서 설정을 계속할 수 있습니다.")
K("settings.gpu.connectChoice.aiSetUpButton",
  "Set it up with my AI",
  "내 AI로 설정하기")

# ──────────────────────────────────────────────────────────────────────
# connect-gpu.tsx — guest main panel
# ──────────────────────────────────────────────────────────────────────
K("settings.gpu.connectChoice.guestLead",
  "Run every studio on your own graphics card.",
  "모든 스튜디오를 자신의 그래픽 카드에서 실행하세요.")
K("settings.gpu.connectChoice.guestBody",
  "Create a free account, then connect the ComfyUI on your computer. Fuobe checks your graphics card, models and add-ons, and shows which studios are ready, which need one more step, and which need a bigger GPU.",
  "무료 계정을 만든 후 본인 컴퓨터의 ComfyUI를 연결하세요. Fuobe가 그래픽 카드, 모델, 애드온을 확인하여 준비된 스튜디오, 한 단계가 더 필요한 스튜디오, 더 큰 GPU가 필요한 스튜디오를 보여줍니다.")

# ──────────────────────────────────────────────────────────────────────
# connect-gpu.tsx — owner setup / where is ComfyUI
# ──────────────────────────────────────────────────────────────────────
K("settings.gpu.connectChoice.whereRunning",
  "Where is ComfyUI running?",
  "ComfyUI가 어디서 실행 중인가요?")

# ──────────────────────────────────────────────────────────────────────
# connect-gpu.tsx — GPU check off
# ──────────────────────────────────────────────────────────────────────
K("settings.gpu.connectChoice.checkOff",
  "The GPU check is switched off on this studio (FUOBE_GPU_PREFLIGHT=0).",
  "이 스튜디오에서는 GPU 확인이 꺼져 있습니다(FUOBE_GPU_PREFLIGHT=0).")
K("settings.gpu.connectChoice.refusedAddress",
  "Fuobe can't use this address. Connect your own ComfyUI.",
  "Fuobe가 이 주소를 사용할 수 없습니다. 본인 ComfyUI를 연결하세요.")

# ──────────────────────────────────────────────────────────────────────
# connect-gpu.tsx — checking / change links / check button
# ──────────────────────────────────────────────────────────────────────
K("settings.gpu.connectChoice.checkingSetup",
  "Checking your setup",
  "설정 확인 중")
K("settings.gpu.connectChoice.changeWhereRuns",
  "Change where it runs",
  "실행 위치 변경")
K("settings.gpu.connectChoice.changeLink",
  "Change the link",
  "링크 변경")
K("settings.gpu.connectChoice.studioComfy",
  "The studio's ComfyUI",
  "스튜디오의 ComfyUI")
K("settings.gpu.connectChoice.checkMyGpu",
  "Check my GPU",
  "내 GPU 확인")
K("settings.gpu.connectChoice.checkedBoard",
  "Checked. The board below says what runs.",
  "확인 완료. 아래 보드에서 실행 가능한 항목을 확인하세요.")

# ──────────────────────────────────────────────────────────────────────
# connect-gpu.tsx — this computer URL value
# ──────────────────────────────────────────────────────────────────────

# ──────────────────────────────────────────────────────────────────────
# computer-runner.tsx — noteOf (data-path, ALL branches keyed)
# text keys
# ──────────────────────────────────────────────────────────────────────
K("settings.gpu.thisComputer.signedOut",
  "You're signed out on this computer. Log in to keep running your runs here.",
  "이 컴퓨터에서 로그아웃 상태입니다. 여기서 계속 실행하려면 로그인하세요.")
K("settings.gpu.thisComputer.heldElsewhere",
  "Fuobe on another computer is running your ComfyUI runs.",
  "다른 컴퓨터의 Fuobe가 본인 ComfyUI 실행을 처리하고 있습니다.")
K("settings.gpu.thisComputer.accessAsk",
  "Your runs are waiting for your ComfyUI. Run them from this browser?",
  "실행이 본인 ComfyUI를 기다리고 있습니다. 이 브라우저에서 실행할까요?")
K("settings.gpu.thisComputer.accessBlocked",
  "Your browser is blocking Fuobe from reaching ComfyUI on this computer.",
  "브라우저가 Fuobe가 이 컴퓨터의 ComfyUI에 접근하는 것을 차단하고 있습니다.")
K("settings.gpu.thisComputer.noSetting",
  "ComfyUI is running without Fuobe's setting.",
  "ComfyUI가 Fuobe 설정 없이 실행 중입니다.")
K("settings.gpu.thisComputer.relayComfyDown",
  "ComfyUI isn't answering. Start it again, and Fuobe goes on by itself.",
  "ComfyUI가 응답하지 않습니다. 다시 시작하면 Fuobe가 자동으로 계속 진행합니다.")
K("settings.gpu.thisComputer.gpuWorking",
  "Your GPU is working. Keep this tab open.",
  "GPU가 작동 중입니다. 이 탭을 열어 두세요.")

# action keys
K("settings.gpu.thisComputer.actionRunHere",
  "Run them here instead",
  "여기서 실행")

# ──────────────────────────────────────────────────────────────────────
# computer-runner.tsx — pill words
# ──────────────────────────────────────────────────────────────────────
K("settings.gpu.thisComputer.needsYou",
  "Needs you",
  "확인 필요")

# ──────────────────────────────────────────────────────────────────────
# computer-runner.tsx — toast
# ──────────────────────────────────────────────────────────────────────
K("settings.gpu.thisComputer.madeOn",
  "Made on your {gpu} in {secs} s.",
  "{gpu}에서 {secs}초 만에 생성 완료.")

# ──────────────────────────────────────────────────────────────────────
# computer-runner.tsx — aria sr-only line
# ──────────────────────────────────────────────────────────────────────
K("settings.gpu.thisComputer.ariaGpu",
  ", your computer's GPU",
  ", 본인 컴퓨터의 GPU")

# ──────────────────────────────────────────────────────────────────────
# guided-fix.tsx — itemLine (data-path, ALL branches keyed)
# ──────────────────────────────────────────────────────────────────────
K("settings.gpu.guidedFix.itemDownloadAgain",
  "to download again",
  "재다운로드")
K("settings.gpu.guidedFix.itemDownload",
  "to download",
  "다운로드")
K("settings.gpu.guidedFix.itemInstall",
  "to install",
  "설치")
K("settings.gpu.guidedFix.itemUpdate",
  "to update",
  "업데이트")
K("settings.gpu.guidedFix.itemRepair",
  "to repair",
  "복구")
K("settings.gpu.guidedFix.itemDo",
  "to do",
  "작업")

# ──────────────────────────────────────────────────────────────────────
# guided-fix.tsx — VERB (data-path)
# ──────────────────────────────────────────────────────────────────────
K("settings.gpu.guidedFix.verbDraw",
  "draw",
  "그리기")
K("settings.gpu.guidedFix.verbAnimate",
  "animate",
  "애니메이션")
K("settings.gpu.guidedFix.verbSpeak",
  "speak",
  "말하기")
K("settings.gpu.guidedFix.verbListen",
  "listen",
  "듣기")
K("settings.gpu.guidedFix.verbBuild",
  "build",
  "만들기")
K("settings.gpu.guidedFix.verbMakeThings",
  "make things",
  "만들기")

# ──────────────────────────────────────────────────────────────────────
# guided-fix.tsx — intro (data-path, ALL branches keyed)
# ──────────────────────────────────────────────────────────────────────
K("settings.gpu.guidedFix.introCoreMissing",
  "Some of ComfyUI's built-in nodes didn't load on your machine. The ComfyUI window says why.",
  "ComfyUI 내장 노드 일부가 본인 시스템에서 로드되지 않았습니다. ComfyUI 창에 원인이 표시됩니다.")
K("settings.gpu.guidedFix.introModelPre",
  "The model has to be on your computer before Fuobe can ",
  "모델을 본인 컴퓨터에 저장해야 Fuobe가 ")
K("settings.gpu.guidedFix.introModelPost",
  " with it. You only download it once.",
  " 할 수 있습니다. 한 번만 다운로드하면 됩니다.")
K("settings.gpu.guidedFix.introPackPre",
  " uses a free ComfyUI add-on. You only add it once.",
  "는 무료 ComfyUI 애드온을 사용합니다. 한 번만 추가하면 됩니다.")
K("settings.gpu.guidedFix.introGeneric",
  "Here's what it needs on your ComfyUI. You only do this once.",
  "본인 ComfyUI에 필요한 항목입니다. 한 번만 하면 됩니다.")

# ──────────────────────────────────────────────────────────────────────
# guided-fix.tsx — StepRow / Details / UseCloud
# ──────────────────────────────────────────────────────────────────────
K("settings.gpu.guidedFix.alreadyThere",
  "already there",
  "이미 설치됨")
K("settings.gpu.guidedFix.details",
  "Details (file names, folders, sources)",
  "세부 정보(파일 이름, 폴더, 소스)")
K("settings.gpu.guidedFix.openPage",
  "Open its page",
  "해당 페이지 열기")
K("settings.gpu.guidedFix.useCloud",
  "Use the cloud version",
  "클라우드 버전 사용")

# ──────────────────────────────────────────────────────────────────────
# guided-fix.tsx — PlanState
# ──────────────────────────────────────────────────────────────────────
K("settings.gpu.guidedFix.hfSizePre",
  "{bytes} from Hugging Face \u00b7 about ",
  "{bytes}(을)를 Hugging Face에서 \u00b7 약 ")
K("settings.gpu.guidedFix.hfSizeMid",
  " min on fast internet.",
  "분(고속 인터넷).")
K("settings.gpu.guidedFix.hfFreeSpace",
  "Make sure you have {bytes} free. It stays on your computer.",
  "{bytes}의 여유 공간이 있는지 확인하세요. 본인 컴퓨터에 저장됩니다.")
K("settings.gpu.guidedFix.restartNote",
  "ComfyUI loads new add-ons when it starts, so restart it once they're in. It doesn't touch your files.",
  "ComfyUI는 시작할 때 새 애드온을 로드하므로 설치 후 재시작하세요. 파일은 건드리지 않습니다.")
K("settings.gpu.guidedFix.firstRunNote",
  "The first run also downloads a small model by itself, so it takes a minute longer.",
  "첫 실행에서는 작은 모델도 자동으로 다운로드하므로 1분 더 걸립니다.")
K("settings.gpu.guidedFix.unobservableOne",
  "one file",
  "1개 파일")
K("settings.gpu.guidedFix.unobservableMany",
  "{count} files",
  "{count}개 파일")
K("settings.gpu.guidedFix.unobservablePre",
  "Fuobe can't check ",
  "Fuobe가 확인할 수 없는: ")
K("settings.gpu.guidedFix.unobservablePost",
  " this tool reads by itself.",
  "(이 도구가 자동으로 읽는 항목)")
K("settings.gpu.guidedFix.byHand",
  "Let's do this one by hand",
  "직접 해 봅시다")
K("settings.gpu.guidedFix.doneCheck",
  "I've done it. Check again",
  "완료했습니다. 다시 확인")
K("settings.gpu.guidedFix.runAnyway",
  "Run anyway",
  "강제 실행")

# ──────────────────────────────────────────────────────────────────────
# guided-fix.tsx — GpuState
# ──────────────────────────────────────────────────────────────────────
K("settings.gpu.guidedFix.gpuUsesPre",
  "{name} uses about ",
  "{name}에 약 ")
K("settings.gpu.guidedFix.gpuUsesMid",
  " GB of graphics memory.",
  " GB의 그래픽 메모리가 필요합니다.")
K("settings.gpu.guidedFix.gpuHasGpu",
  "Your {gpu} has {have} GB.",
  "본인 {gpu}에 {have} GB가 있습니다.")
K("settings.gpu.guidedFix.gpuNotFound",
  "Fuobe didn't find a graphics card it can use on your ComfyUI.",
  "Fuobe가 본인 ComfyUI에서 사용할 수 있는 그래픽 카드를 찾지 못했습니다.")
K("settings.gpu.guidedFix.graphicsCard",
  "graphics card",
  "그래픽 카드")
K("settings.gpu.guidedFix.fitsYourGpu",
  "These fit your GPU:",
  "본인 GPU에 맞는 항목:")
K("settings.gpu.guidedFix.oneStepAway",
  "One step away",
  "한 단계 거리")
K("settings.gpu.guidedFix.tryAnyway",
  "Try anyway",
  "강제 실행")
K("settings.gpu.guidedFix.fitTight",
  "It may be slow: ComfyUI borrows ordinary memory.",
  "느릴 수 있습니다: ComfyUI가 일반 메모리를 일시적으로 사용합니다.")
K("settings.gpu.guidedFix.fitSlow",
  "It may be very slow, or stop with \u201cout of memory\u201d.",
  "매우 느리거나 \u201cout of memory\u201d로 중지될 수 있습니다.")

# ──────────────────────────────────────────────────────────────────────
# guided-fix.tsx — titleOf (data-path, ALL branches keyed)
# ──────────────────────────────────────────────────────────────────────
K("settings.gpu.guidedFix.titleReady",
  "{name} is ready",
  "{name} 준비 완료")
K("settings.gpu.guidedFix.titleBiggerGpu",
  "{name} needs a bigger graphics card",
  "{name}에 더 큰 그래픽 카드가 필요합니다")
K("settings.gpu.guidedFix.titleRtx40",
  "{name} needs an NVIDIA RTX 40 series card or newer",
  "{name}에 NVIDIA RTX 40 시리즈 이상 카드가 필요합니다")
K("settings.gpu.guidedFix.titleRtx",
  "{name} needs an NVIDIA RTX card",
  "{name}에 NVIDIA RTX 카드가 필요합니다")
K("settings.gpu.guidedFix.titleSecondComfy",
  "{name} needs a second ComfyUI",
  "{name}에 두 번째 ComfyUI가 필요합니다")
K("settings.gpu.guidedFix.titleOneMore",
  "{name} needs one more thing",
  "{name}에 한 가지만 더 필요합니다")
K("settings.gpu.guidedFix.titleMany",
  "{name} needs {n} things",
  "{name}에 {n}가지가 필요합니다")

# ──────────────────────────────────────────────────────────────────────
# guided-fix.tsx — Body
# ──────────────────────────────────────────────────────────────────────
K("settings.gpu.guidedFix.setDefaultTool",
  "Set up this tool",
  "이 도구 설정")
K("settings.gpu.guidedFix.onGpu",
  "On your {gpu}",
  "본인 {gpu}에서")
K("settings.gpu.guidedFix.onComfy",
  "On your ComfyUI",
  "본인 ComfyUI에서")
K("settings.gpu.guidedFix.checkingGpu",
  "Checking your GPU",
  "GPU 확인 중")
K("settings.gpu.guidedFix.checkGpuLink",
  "Check your GPU",
  "GPU 확인")
K("settings.gpu.guidedFix.promptStill",
  "Your prompt is still here.",
  "프롬프트가 그대로 남아 있습니다.")
K("settings.gpu.guidedFix.everythingThere",
  "Everything it needs is on your ComfyUI.",
  "필요한 모든 것이 본인 ComfyUI에 있습니다.")
K("settings.gpu.guidedFix.tryAgain",
  "Try again",
  "재시도")
K("settings.gpu.guidedFix.doneBtn",
  "Done",
  "완료")
K("settings.gpu.guidedFix.backToBoard",
  "Back to the board",
  "보드로 돌아가기")
K("settings.gpu.guidedFix.unsupportedRtx40",
  "It runs on NVIDIA's RTX video engine, which only RTX 40 series cards and newer have",
  "NVIDIA의 RTX 영상 엔진에서 실행되며, RTX 40 시리즈 이상 카드만 지원됩니다")
K("settings.gpu.guidedFix.unsupportedRtx",
  "It runs on NVIDIA's RTX video engine, which only NVIDIA RTX cards have",
  "NVIDIA의 RTX 영상 엔진에서 실행되며, NVIDIA RTX 카드만 지원됩니다")
K("settings.gpu.guidedFix.unsupportedAndYours",
  ", and your {gpu} isn't one",
  ", 본인 {gpu}는 해당되지 않습니다")
K("settings.gpu.guidedFix.unsupportedPick",
  ". Pick another choice in this tool for this clip.",
  " 이 클립에서 다른 선택지를 골라주세요.")
K("settings.gpu.guidedFix.unsupportedNeed",
  "This one needs its own ComfyUI, so it can't run next to your other add-ons.",
  "이 도구는 자체 ComfyUI가 필요하므로 다른 애드온과 나란히 실행할 수 없습니다.")
K("settings.gpu.guidedFix.couldntCheck",
  "Fuobe couldn't check your ComfyUI this time.",
  "이번에 Fuobe가 본인 ComfyUI를 확인하지 못했습니다.")

# ──────────────────────────────────────────────────────────────────────
# guided-fix.tsx — aria live region
# ──────────────────────────────────────────────────────────────────────
# checkingGpu already added

# ──────────────────────────────────────────────────────────────────────
# guided-fix.tsx — Details label colon separator
# ──────────────────────────────────────────────────────────────────────
# {s.label}: {s.detail} — both from lib, outside scope


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
