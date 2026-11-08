#!/usr/bin/env python3
"""Add the /settings SettingsForm + ConnectField + connections.ts chrome keys (en byte-identical, ko 100%).

Run from the repo root. Checks duplicates first (parent/sibling keys are reused, never re-added here).
en values must equal the pre-wiring rendered English byte-for-byte; verify-settings-form-i18n.py proves it.
"""
import json
from collections import OrderedDict
import pathlib

EN_PATH = pathlib.Path("src/lib/i18n/locales/en.json")
KO_PATH = pathlib.Path("src/lib/i18n/locales/ko.json")

# key -> (en, ko)
TABLE: dict[str, tuple[str, str]] = {
    # ---- settings-form.tsx: StatusStrip + Section chrome -------------------
    "settings.form.linkToAria": ("Link to {name}", "{name} 섹션으로 가는 링크"),
    "settings.form.loadingAria": ("Loading settings", "설정을 불러오는 중"),
    "settings.form.connectionsAria": ("Connections", "연결 상태"),
    "settings.form.stripNotUsed": ("Not used", "사용하지 않음"),
    "settings.form.stripEngineChip": ("Engine", "엔진"),
    "settings.form.stripSetupGuide": ("Setup guide", "설정 가이드"),
    "settings.form.savedToast": ("Saved", "저장했습니다"),
    # ---- Engine mode section ------------------------------------------------
    "settings.form.engine.title": ("Engine mode", "엔진 모드"),
    "settings.form.engine.desc": (
        "Choose what this install runs: fully open source, only paid APIs, or both side by side. "
        "The mode is enforced on the server, so a locked engine can't be used from the API either.",
        "이 설치가 실행할 대상을 선택하세요: 완전히 오픈소스, 유료 API만, 또는 나란히 둘 다. 모드는 서버에서 강제되므로 잠긴 엔진은 API로도 쓸 수 없습니다.",
    ),
    "settings.form.engine.envPre": ("Also settable with the ", "이것은 "),
    "settings.form.engine.envPost": (
        " environment variable (both · open · cloud).",
        " 환경 변수로도 설정할 수 있습니다(both · open · cloud).",
    ),
    "settings.form.engine.groupAria": ("Engine mode", "엔진 모드"),
    "settings.form.engine.needsLine": ("Needs: {needs}", "요건: {needs}"),
    "settings.form.engineMode.bothTitle": ("Open source + paid APIs", "오픈소스 + 유료 API"),
    "settings.form.engineMode.bothBody": (
        "Every studio gets a Cloud / Open source switch. Use frontier paid models when you want them, your own GPU when you don't.",
        "모든 스튜디오에 Cloud / 오픈소스 전환이 있습니다. 원할 때는 최신 유료 모델을, 아닐 때는 자신의 GPU를 쓰세요.",
    ),
    "settings.form.engineMode.bothNeeds": ("A fal.ai or Replicate key and/or a ComfyUI server", "fal.ai 또는 Replicate 키, 그리고/또는 ComfyUI 서버"),
    "settings.form.engineMode.openTitle": ("Open source only", "오픈소스만"),
    "settings.form.engineMode.openBody": (
        "Only open-weight models on your ComfyUI server. Paid models are hidden and blocked on the server, and nothing is sent to paid APIs.",
        "ComfyUI 서버에서 오픈 가중치 모델만 실행합니다. 유료 모델은 숨겨지고 서버에서 차단되며, 유료 API로 아무것도 전송되지 않습니다.",
    ),
    "settings.form.engineMode.openNeeds": ("A ComfyUI server", "ComfyUI 서버"),
    "settings.form.engineMode.cloudTitle": ("Paid APIs only", "유료 API만"),
    "settings.form.engineMode.cloudBody": (
        "Only hosted frontier models (Nano Banana, Seedance, Kling, Veo…). No GPU needed; open-source models are hidden.",
        "호스팅되는 최신 모델만(Nano Banana, Seedance, Kling, Veo…). GPU가 필요 없고 오픈소스 모델은 숨겨집니다.",
    ),
    "settings.form.engineMode.cloudNeeds": ("A fal.ai or Replicate key", "fal.ai 또는 Replicate 키"),
    "settings.form.inactiveOpenOnly": ("Not used in Open source only mode", "오픈소스 전용 모드에서는 사용하지 않습니다"),
    "settings.form.inactiveCloudOnly": ("Not used in Paid APIs only mode", "유료 API 전용 모드에서는 사용하지 않습니다"),
    # ---- Paid API section ---------------------------------------------------
    "settings.form.cloud.title": ("Paid API configuration", "유료 API 설정"),
    "settings.form.cloud.desc": (
        "One fal.ai key runs the Fuobe Originals in the cloud (Soul, DoP, Genjutsu, Cinema: open weights with their LoRAs) "
        "and the partner models: Nano Banana, Seedream, GPT Image, FLUX, Kling, Seedance, Veo 3.1, Wan, MiniMax, avatars and more. "
        "Replicate hosts a subset and is used as a fallback (or first, if you prefer it). Save & test checks a key before saving it.",
        "fal.ai 키 하나로 클라우드의 Fuobe 오리지널(Soul, DoP, Genjutsu, Cinema: 오픈 가중치에 각자의 LoRA를 얹은 모델)과 파트너 모델(Nano Banana, Seedream, GPT Image, FLUX, Kling, Seedance, Veo 3.1, Wan, MiniMax, 아바타 등)을 실행합니다. Replicate는 일부를 호스팅하며 대체 수단으로(원한다면 우선으로) 쓰입니다. 저장 및 테스트는 저장 전에 키를 확인합니다.",
    ),
    "settings.form.cloud.falLabel": ("fal.ai API key", "fal.ai API 키"),
    "settings.form.cloud.getKey": ("Get a key", "키 발급"),
    "settings.form.cloud.replicateLabel": ("Replicate API token", "Replicate API 토큰"),
    "settings.form.cloud.getToken": ("Get a token", "토큰 발급"),
    "settings.form.cloud.providerLabel": ("Preferred provider", "선호 제공업체"),
    "settings.form.provider.autoLabel": ("Automatic", "자동"),
    "settings.form.provider.autoHint": (
        "Tries fal.ai, then Replicate when a model is on both. Models only one provider hosts always use that one.",
        "두 제공업체에 모두 있는 모델은 fal.ai를 먼저 시도하고 Replicate로 전환합니다. 한 제공업체만 호스팅하는 모델은 언제나 그 업체를 씁니다.",
    ),
    "settings.form.provider.falLabel": ("fal.ai first", "fal.ai 우선"),
    "settings.form.provider.falHint": (
        "fal.ai whenever it hosts the model. Models only one provider hosts always use that one.",
        "해당 모델을 fal.ai가 호스팅하면 언제나 fal.ai를 씁니다. 한 제공업체만 호스팅하는 모델은 언제나 그 업체를 씁니다.",
    ),
    "settings.form.provider.replicateLabel": ("Replicate first", "Replicate 우선"),
    "settings.form.provider.replicateHint": (
        "Replicate whenever it hosts the model. Models only one provider hosts always use that one.",
        "해당 모델을 Replicate가 호스팅하면 언제나 Replicate를 씁니다. 한 제공업체만 호스팅하는 모델은 언제나 그 업체를 씁니다.",
    ),
    # ---- ComfyUI section ----------------------------------------------------
    "settings.form.comfy.title": ("Open-source engine · ComfyUI", "오픈소스 엔진 · ComfyUI"),
    "settings.form.comfy.hostedPre": (
        "Run every open-source workflow on your own graphics card. See ",
        "모든 오픈소스 워크플로를 자신의 그래픽 카드로 실행하세요. ",
    ),
    "settings.form.comfy.localPre": (
        "Run every open-source workflow on your own GPU (or a rented one). Fuobe talks to ComfyUI's HTTP API and uploads inputs for you. See ",
        "모든 오픈소스 워크플로를 자신의 GPU(또는 빌린 GPU)로 실행하세요. Fuobe가 ComfyUI의 HTTP API로 대화하고 입력을 대신 업로드합니다. ",
    ),
    "settings.form.comfy.workflowsLink": ("the ComfyUI workflows", "ComfyUI 워크플로"),
    "settings.form.comfy.tail": (
        " for the models each one needs.",
        "에서 각 워크플로가 필요로 하는 모델을 확인하세요.",
    ),
    "settings.form.comfy.workersNote": ("ComfyUI jobs run on your workers now.", "이제 ComfyUI 작업이 워커에서 실행됩니다."),
    "settings.form.comfy.urlLabel": ("ComfyUI server URL", "ComfyUI 서버 URL"),
    "settings.form.comfy.urlHint": (
        "Where ComfyUI listens; a local install is http://127.0.0.1:8188.",
        "ComfyUI가 대기하는 주소입니다. 로컬 설치는 http://127.0.0.1:8188입니다.",
    ),
    "settings.form.comfy.tokenLabel": ("Auth token (optional)", "인증 토큰(선택)"),
    "settings.form.comfy.tokenHint": (
        "Sent as a Bearer token, for ComfyUI behind a proxy.",
        "프록시 뒤에 있는 ComfyUI에 Bearer 토큰으로 전송됩니다.",
    ),
    "settings.form.comfy.isoLabel": ("Isolated worker URL (optional)", "격리 워커 URL(선택)"),
    "settings.form.comfy.isoHint": (
        "A second ComfyUI for LatentSync 1.6 and ThinkSound, whose node packs can't share the main install. scripts/comfy/README.md shows how to start one.",
        "LatentSync 1.6과 ThinkSound용 두 번째 ComfyUI입니다. 이 둘의 노드 팩은 메인 설치와 공유할 수 없으며, 실행 방법은 scripts/comfy/README.md에 있습니다.",
    ),
    # ---- LoRAs section ------------------------------------------------------
    "settings.form.loras.title": ("LoRAs · looks, motions, effects and adapters", "LoRA · 룩, 모션, 효과, 어댑터"),
    "settings.form.loras.desc": (
        "Looks, camera moves and effects add LoRA files to open models, on your GPU and in the cloud; "
        "an adapter is the LoRA an Original always loads (Fuobe Try-On's). Fuobe fetches the pinned version a run needs and shows each file's licence; "
        "what may run where is your call in Models & licences.",
        "룩, 카메라 무브, 효과는 오픈 모델에 LoRA 파일을 더합니다. 자신의 GPU와 클라우드에서 모두; 어댑터는 오리지널이 언제나 불러오는 LoRA(Fuobe Try-On의 것)입니다. "
        "Fuobe는 실행에 필요한 고정 버전을 가져오고 각 파일의 라이선스를 표시합니다. 어디서 무엇을 실행할지는 모델 & 라이선스에서 직접 정하세요.",
    ),
    "settings.form.loras.onComputer": (
        "Your ComfyUI is on your computer: put LoRA files in its models/loras folder. Fuobe tells you which ones a run needs.",
        "ComfyUI가 자신의 컴퓨터에 있다면: LoRA 파일을 models/loras 폴더에 넣으세요. 실행에 필요한 파일을 Fuobe가 알려줍니다.",
    ),
    # ---- Training section ---------------------------------------------------
    "settings.form.training.title": ("Training · AI-Toolkit", "학습 · AI-Toolkit"),
    "settings.form.training.pre": (
        "Train Soul IDs and Fuobe looks (LoRAs) on your own GPU with ",
        "Soul ID와 Fuobe 룩(LoRA)을 ",
    ),
    "settings.form.training.link": ("AI-Toolkit", "AI-Toolkit"),
    "settings.form.training.post": (
        ": free, and the file stays yours. Without it, train in the cloud on fal.ai, or download a training kit from the Train dialog.",
        "(으)로 자신의 GPU에서 학습하세요. 무료이며 파일은 소유자의 것입니다. 없다면 fal.ai에서 클라우드로 학습하거나 Train 대화상자에서 학습 키트를 다운로드하세요.",
    ),
    "settings.form.training.urlLabel": ("AI-Toolkit URL", "AI-Toolkit URL"),
    "settings.form.training.urlHint": (
        "Where AI-Toolkit's UI listens (in ai-toolkit/ui: npm run build_and_start). Test checks it answers.",
        "AI-Toolkit UI가 대기하는 주소입니다(ai-toolkit/ui에서 npm run build_and_start). 테스트가 응답하는지 확인합니다.",
    ),
    "settings.form.training.tokenLabel": ("Auth token (optional)", "인증 토큰(선택)"),
    "settings.form.training.tokenHint": (
        "The AI_TOOLKIT_AUTH the trainer was started with, if any.",
        "학습기를 시작할 때 지정한 AI_TOOLKIT_AUTH(있는 경우).",
    ),
    "settings.form.training.dirLabel": ("Photos folder (optional)", "사진 폴더(선택)"),
    "settings.form.training.dirHint": (
        "Where Fuobe writes the training photos. Blank: Fuobe's data folder, for an AI-Toolkit on this machine; on another machine, a folder both can read.",
        "Fuobe가 학습 사진을 저장하는 위치입니다. 비워 두면: 이 기계의 AI-Toolkit용이면 Fuobe의 데이터 폴더; 다른 기계라면 양쪽 모두 읽을 수 있는 폴더.",
    ),
    # ---- AI helper section --------------------------------------------------
    "settings.form.textAi.title": ("AI helper · models and providers", "AI 도우미 · 모델과 제공업체"),
    "settings.form.textAi.desc": (
        "The LLMs that write for Fuobe. Use (below) picks the one for the Enhance toggle, storyboards, translations and scripts, ad copy and brand research: "
        "Claude, a local model (Ollama, LM Studio, Unsloth Studio or another OpenAI-compatible server: fully open source), or the built-in offline rewriter. "
        "The Assist agent can also plan with the providers you add a key for (OpenAI, Gemini, DeepSeek, Kimi, GLM, OpenRouter and more). "
        "In Open source only mode, Automatic skips Claude. Save & test checks a key or address before saving it.",
        "Fuobe를 위해 글을 쓰는 LLM입니다. 아래 사용 선택은 Enhance 전환, 스토리보드, 번역과 각본, 광고 문구, 브랜드 조사를 담당할 모델을 고릅니다: "
        "Claude, 로컬 모델(Ollama, LM Studio, Unsloth Studio 또는 다른 OpenAI 호환 서버: 완전 오픈소스), 또는 내장 오프라인 재작성기. "
        "어시스트 에이전트는 키를 추가한 제공업체(OpenAI, Gemini, DeepSeek, Kimi, GLM, OpenRouter 등)로도 계획할 수 있습니다. "
        "오픈소스 전용 모드에서는 자동이 Claude를 건너뜁니다. 저장 및 테스트는 저장 전에 키 또는 주소를 확인합니다.",
    ),
    "settings.form.textAi.useLabel": ("Use", "사용"),
    "settings.form.enhancer.autoHint": ("Claude when a key is set, then a local model, then the offline rewriter.", "키가 설정되면 Claude, 다음으로 로컬 모델, 그다지 오프라인 재작성기를 씁니다."),
    "settings.form.enhancer.claudeLabel": ("Claude", "Claude"),
    "settings.form.enhancer.claudeHint": ("Claude through your Anthropic key (paid per use).", "Anthropic 키로 쓰는 Claude(사용 건마다 과금)."),
    "settings.form.enhancer.localLabel": ("Local model only", "로컬 모델만"),
    "settings.form.enhancer.localHint": (
        "A local, open-source model (Ollama, LM Studio, Unsloth Studio or your own server). Claude is never called.",
        "로컬 오픈소스 모델(Ollama, LM Studio, Unsloth Studio 또는 자신의 서버). Claude는 결코 호출되지 않습니다.",
    ),
    "settings.form.enhancer.offlineLabel": ("Offline rewriter", "오프라인 재작성기"),
    "settings.form.enhancer.offlineHint": ("Built-in rules, no LLM. Text steps (translate, write) are off.", "내장 규칙만 사용, LLM 없음. 텍스트 단계(번역, 작성)는 꺼집니다."),
    "settings.form.textAi.anthropicLabel": ("Anthropic API key", "Anthropic API 키"),
    "settings.form.textAi.anthropicHint": ("Test checks the key with a free model list call.", "테스트가 무료 모델 목록 호출로 키를 확인합니다."),
    # ---- Assist connectors / notifications / security ----------------------
    "settings.form.connectors.title": ("Assist · connectors", "어시스트 · 커넥터"),
    "settings.form.connectors.desc": (
        "Give Claude in Assist the tools of your other apps — docs, tasks, CRM, analytics — through their MCP servers (a URL and, usually, a token). Only Claude chats use them.",
        "어시스트의 Claude에게 다른 앱의 도구(문서, 작업, CRM, 분석)를 해당 MCP 서버로 건네세요(URL과, 보통은 토큰). Claude 대화만 이들을 씁니다.",
    ),
    "settings.form.notifications.title": ("Notifications", "알림"),
    "settings.form.notifications.desc": (
        "Get a heads-up from your browser when something you started finishes while you're in another tab or app. Saved in this browser; nothing is sent anywhere.",
        "시작한 작업이 다른 탭이나 앱에 있는 동안 끝나면 브라우저로 알림을 받으세요. 이 브라우저에만 저장되며 어디로도 전송되지 않습니다.",
    ),
    "settings.form.security.title": ("Security", "보안"),
    "settings.form.security.desc": (
        "Protect this studio with a password, and create API tokens for scripts and agents. Off by default for local use.",
        "비밀번호로 이 스튜디오를 보호하고, 스크립트와 에이전트용 API 토큰을 만드세요. 로컬 사용을 위해 기본으로 꺼져 있습니다.",
    ),
    # ---- Placeholder results section ----------------------------------------
    "settings.form.demo.title": ("Placeholder results", "플레이스홀더 결과"),
    "settings.form.demo.desc": (
        "Off unless you turn it on. For giving a tour of this studio without keys or a GPU: runs cost nothing and make stand-in media instead of the real thing.",
        "켜기 전까지는 꺼져 있습니다. 키나 GPU 없이 이 스튜디오를 둘러보게 하도록: 실행은 비용이 들지 않고 실제 대신 대신용 미디어를 만듭니다.",
    ),
    "settings.form.demo.settingName": ("Show placeholder results (for a tour)", "플레이스홀더 결과 표시(투어용)"),
    "settings.form.demo.body": (
        "While it\u2019s on, every run makes a placeholder labelled \u201cPlaceholder\u201d, even with keys or ComfyUI connected, and the top bar says \u201cPlaceholders on\u201d. "
        "While it\u2019s off, a run with nothing connected asks you to connect ComfyUI or add a key.",
        "켜 두면 키나 ComfyUI가 연결된 상태에서도 모든 실행이 \u201c자리표시\u201d라고 표시된 플레이스홀더를 만들고, 상단 바에 \u201cPlaceholders on\u201d라고 나옵니다. "
        "꺼 두면 아무것도 연결되지 않은 실행은 ComfyUI 연결이나 키 추가를 요청합니다.",
    ),
    # ---- Auto image model section -------------------------------------------
    "settings.form.autoImage.title": ("Auto image model", "자동 이미지 모델"),
    "settings.form.autoImage.desc": (
        "Auto is the Image studio's first pick on the open engine: Ideogram 4 for most pictures and for lettering, Qwen-Image 2.1 for edits, and Krea 2 Realism for the prompts below, "
        "which Ideogram 4's safety filter often declines. When Ideogram 4 declines a run anyway, Krea 2 Realism, FIBO 2 Dev, then MOSS-Image make it.",
        "자동은 오픈 엔진에서 Image 스튜디오가 첫 번째로 고르는 선택입니다: 대부분의 그림과 글자 삽입은 Ideogram 4, 편집은 Qwen-Image 2.1, "
        "아래 프롬프트는 Krea 2 Realism(Ideogram 4의 안전 필터가 자주 거르기 때문). 그래도 Ideogram 4가 실행을 거절하면 Krea 2 Realism, FIBO 2 Dev, 그다지 MOSS-Image가 맡습니다.",
    ),
    # ---- Models & licences / About sections ---------------------------------
    "settings.form.models.desc": (
        "Every model, LoRA and node pack with its licence, as information. Everything is on: switch off a model, a whole kind of licence (say, all non-commercial ones), a provider or a node pack, and it leaves the pickers and is refused on the server.",
        "모든 모델, LoRA, 노드 팩을 라이선스와 함께 정보로 보여줍니다. 전부 켜진 상태입니다. 모델 하나, 라이선스 종류 전체(예: 비영리 전체), 제공업체 또는 노드 팩을 끄면 선택 목록에서 사라지고 서버에서 거절됩니다.",
    ),
    "settings.form.models.openLink": ("Open Models & licences", "모델 & 라이선스 열기"),
    "settings.form.about.desc": (
        "The open models, LoRAs and code Fuobe is built on, who made them and their licences, and Fuobe's own source code.",
        "Fuobe가 기반하는 오픈 모델, LoRA, 코드와 그 제작자 및 라이선스, 그리고 Fuobe의 자체 소스 코드.",
    ),
    # ---- Local LLM settings (Settings -> AI helper) -------------------------
    "settings.form.llm.serverLabel": ("Local model server", "로컬 모델 서버"),
    "settings.form.llm.serverAutomatic": ("Automatic", "자동"),
    "settings.form.llm.serverOllama": ("Ollama", "Ollama"),
    "settings.form.llm.serverLmStudio": ("LM Studio", "LM Studio"),
    "settings.form.llm.serverUnsloth": ("Unsloth Studio", "Unsloth Studio"),
    "settings.form.llm.serverOther": ("Other", "기타"),
    "settings.form.llm.autoHint": (
        "Uses the first server that answers with a model, in this order: Ollama, LM Studio, Unsloth Studio, then the Other server.",
        "모델로 응답하는 첫 서버를 이 순서로 씁니다: Ollama, LM Studio, Unsloth Studio, 그다지 기타 서버.",
    ),
    "settings.form.llm.pinnedHint": ("Only this server is used; the others are ignored.", "이 서버만 사용되고 나머지는 무시됩니다."),
    "settings.form.llm.foundOnMachine": ("Found on this machine", "이 컴퓨터에서 찾은 서버"),
    "settings.form.llm.checkAgain": ("Check again", "다시 확인"),
    "settings.form.llm.inUse": ("In use", "사용 중"),
    "settings.form.llm.otherServer": ("Other server (OpenAI-compatible)", "기타 서버(OpenAI 호환)"),
    "settings.form.llm.notSetUp": ("Not set up", "설정되지 않음"),
    "settings.form.llm.notRunningAt": ("Not running at {url}", "{url}에서 실행 중이 아닙니다"),
    "settings.form.llm.loaded": ("loaded", "로드됨"),
    "settings.form.llm.loadsOnFirstUse": ("loads on first use", "첫 사용 시 로드"),
    "settings.form.llm.contextCount": ("{k} context", "컨텍스트 {k}"),
    "settings.form.llm.reloadWith": ("Reload with {n} context", "컨텍스트 {n}(으)로 다시 로드"),
    "settings.form.llm.urlLabel": ("URL", "URL"),
    "settings.form.llm.modelLabel": ("Model", "모델"),
    "settings.form.llm.apiKey": ("API key", "API 키"),
    "settings.form.llm.apiKeyOptional": ("API key (optional)", "API 키(선택)"),
    "settings.form.llm.lmstudioTokenLabel": ("API token (only with Require Authentication on)", "API 토큰(Require Authentication을 켠 때만)"),
    "settings.form.llm.keyHint": ("Only sent to this server.", "이 서버에만 전송됩니다."),
    "settings.form.llm.contextLabel": ("Context (tokens)", "컨텍스트(토큰)"),
    "settings.form.llm.contextHint": (
        "How much text the local model reads at once: Ollama gets it as num_ctx, and LM Studio loads models with it. Assist needs about 16,384. 0 leaves it to the server.",
        "로컬 모델이 한 번에 읽는 텍스트의 양입니다: Ollama는 num_ctx로 받고, LM Studio는 이 값으로 모델을 로드합니다. 어시스트에는 약 16,384가 필요합니다. 0이면 서버에 맡깁니다.",
    ),
    "settings.form.llm.sharesGpu": (
        "The local model shares the GPU with ComfyUI. A 4\u20138B model leaves room for generations.",
        "로컬 모델은 GPU를 ComfyUI와 공유합니다. 4\u20138B 모델이면 생성할 자리가 남습니다.",
    ),
    "settings.form.llm.ollamaUrlHint": ("Test checks Ollama answers and has the model.", "테스트가 Ollama의 응답과 모델 보유를 확인합니다."),
    "settings.form.llm.ollamaModelHint": (
        "A model with tool calling for Assist, such as qwen3:8b. Pull it first: ollama pull qwen3:8b",
        "어시스트용 도구 호출 지원 모델, 예를 들어 qwen3:8b. 먼저 가져오세요: ollama pull qwen3:8b",
    ),
    "settings.form.llm.lmstudioUrlHint": ("Test checks LM Studio answers and has the model.", "테스트가 LM Studio의 응답과 모델 보유를 확인합니다."),
    "settings.form.llm.lmstudioModelHint": (
        "Empty: the loaded model, else one trained for tool use. A model that isn't loaded is loaded with the context below.",
        "비워 두면 로드된 모델, 아니면 도구 사용에 맞게 학습된 모델. 아직 로드되지 않은 모델은 아래 컨텍스트로 로드됩니다.",
    ),
    "settings.form.llm.unslothUrlHint": ("Test checks Unsloth Studio answers and has a model loaded.", "테스트가 Unsloth Studio의 응답과 모델 로드를 확인합니다."),
    "settings.form.llm.unslothModelHint": ("Empty: the model loaded in Unsloth Studio.", "비워 두면 Unsloth Studio에 로드된 모델."),
    "settings.form.llm.customUrlHint": ("Test checks the server answers with a model list.", "테스트가 서버가 모델 목록으로 응답하는지 확인합니다."),
    "settings.form.llm.customModelHint": ("Empty: the first model the server lists.", "비워 두면 서버가 목록에 담은 첫 모델."),
    "settings.form.llm.setupOllamaPre": ("Install Ollama, then run ", "Ollama를 설치한 다음 "),
    "settings.form.llm.setupOllamaPost": (". Fuobe gives it the context below.", "(을)를 실행하세요. 아래 컨텍스트를 Fuobe가 전달합니다."),
    "settings.form.llm.setupLmsPre": ("In LM Studio, open Developer and start the server (or run ", "LM Studio에서 개발자 탭을 열어 서버를 시작하거나 "),
    "settings.form.llm.setupLmsMid": ("), and download a model in Discover (or ", "(을)를 실행하고, Discover에서 모델을 다운로드하세요(또는 "),
    "settings.form.llm.setupLmsPost": (
        "). Models without thinking (instruct models) answer faster. Without Require Authentication, anyone on your network can use LM Studio's server.",
        "). thinking 없는 모델(instruct 모델)이 더 빨리 응답합니다. Require Authentication을 끄지 않으면 네트워크의 누구나 LM Studio 서버를 쓸 수 있습니다.",
    ),
    "settings.form.llm.setupUnsloth": (
        "Start Unsloth Studio and load a model on its Chat page (Select model), then make a key: avatar \u2192 Settings \u2192 API \u2192 Create. Fuobe always turns Unsloth's server-side tools (Python, terminal, web search) off.",
        "Unsloth Studio를 시작해 Chat 페이지에서 모델을 로드(모델 선택)한 다음 키를 만드세요: 아바타 \u2192 설정 \u2192 API \u2192 만들기. Fuobe는 Unsloth의 서버 쪽 도구(Python, 터미널, 웹 검색)를 언제나 끕니다.",
    ),
    "settings.form.llm.setupCustomPre": (
        "Any OpenAI-compatible server: llama.cpp's llama-server, vLLM, Jan\u2026 Give its base URL as its docs do (it usually ends in ",
        "OpenAI 호환 서버라면 무엇이든 가능합니다: llama.cpp의 llama-server, vLLM, Jan\u2026 문서가 안내하는 대로 기본 URL을 입력하세요(보통 끝에 ",
    ),
    "settings.form.llm.setupCustomPost": (").", "로 끝나는 경우가 많습니다).",
    ),
    "settings.form.llm.sendTest": ("Send a test message", "테스트 메시지 보내기"),
    # ---- ConnectField -------------------------------------------------------
    "settings.connect.test": ("Test", "테스트"),
    "settings.connect.save": ("Save", "저장"),
    "settings.connect.saveAndTest": ("Save & test", "저장 및 테스트"),
    "settings.connect.saveAndTestAria": ("Save and test", "저장 및 테스트"),
    "settings.connect.clear": ("Clear", "지우기"),
    "settings.connect.clearAria": ("Clear {name}", "{name} 지우기"),
    "settings.connect.nameSaved": ("{name} saved", "{name} 저장됨"),
    "settings.connect.nameCleared": ("{name} cleared", "{name} 지워짐"),
    "settings.connect.savedNotYet": ("Saved \u2014 it didn't connect yet", "저장했습니다 \u2014 아직 연결되지는 않았습니다"),
    "settings.connect.connected": ("Connected", "연결됨"),
    "settings.connect.andSaved": (" and saved", " 및 저장됨"),
    "settings.connect.savedNotConnected": ("Saved, not connected yet", "저장됨, 아직 연결되지 않음"),
    "settings.connect.saveAnyway": ("Save anyway", "일단 저장"),
    "settings.connect.fromEnvHosted": ("Set on the server. A value saved here replaces it. ", "서버에 설정된 값입니다. 여기에 저장한 값이 이를 대체합니다. "),
    "settings.connect.fromEnvLocal": ("Set from an environment variable; a value saved here wins. ", "환경 변수로 설정된 값입니다. 여기에 저장한 값이 우선합니다. "),
    # ---- connections.ts (settings-visible data) -----------------------------
    "settings.connection.engineLabel.both": ("Open source + paid", "오픈소스 + 유료"),
    "settings.connection.engineLabel.open": ("Open source only", "오픈소스만"),
    "settings.connection.engineLabel.cloud": ("Paid APIs only", "유료 API만"),
    "settings.connection.label.fal": ("fal.ai", "fal.ai"),
    "settings.connection.label.replicate": ("Replicate", "Replicate"),
    "settings.connection.label.comfyui": ("ComfyUI", "ComfyUI"),
    "settings.connection.label.aiHelper": ("AI helper", "AI 도우미"),
    "settings.connection.text.keySet": ("Key set", "키 설정됨"),
    "settings.connection.text.notSet": ("Not set", "설정되지 않음"),
    "settings.connection.text.online": ("Online", "온라인"),
    "settings.connection.text.offline": ("Offline", "오프라인"),
    "settings.connection.text.connect": ("Connect", "연결"),
    "settings.connection.text.on": ("On", "켜짐"),
    "settings.connection.text.off": ("Off", "꺼짐"),
    "settings.connection.yourComputerWords": ("Your computer \u00b7 {words}", "내 컴퓨터 \u00b7 {words}"),
    "settings.connection.computer.down": ("ComfyUI not running", "ComfyUI 실행 중 아님"),
    "settings.connection.computer.needsSetting": ("Needs a setting", "설정 필요"),
    "settings.connection.problem.useHttpLike": ("Use an http:// or https:// address, like {example}", "http:// 또는 https:// 주소를 사용하세요. 예: {example}"),
    "settings.connection.problem.addHttpFront": ("Add http:// in front: http://{value}", "앞에 http://를 붙이세요: http://{value}"),
    "settings.connection.problem.notWebAddress": ("That isn't a web address \u2014 try {example}", "웹 주소가 아닙니다 \u2014 {example}(으)로 해 보세요."),
    "settings.connection.problem.falBothHalves": ("Both halves of key_id:key_secret are needed, without spaces \u2014 copy the key again", "key_id:key_secret의 두 부분을 공백 없이 모두 입력해야 합니다 \u2014 키를 다시 복사하세요"),
    "settings.connection.problem.falWholeKey": ("fal.ai keys look like key_id:key_secret \u2014 paste the whole key, with the part after the colon", "fal.ai 키는 key_id:key_secret 형식입니다 \u2014 콜론 뒤 부분을 포함해 키 전체를 붙여넣으세요"),
    "settings.connection.problem.replicateR8": ("Replicate tokens start with r8_", "Replicate 토큰은 r8_로 시작합니다"),
    "settings.connection.problem.anthropicSk": ("Anthropic keys start with sk-ant-", "Anthropic 키는 sk-ant-로 시작합니다"),
    "settings.connection.problem.fullPath": ("Use a full path, like /mnt/shared/datasets", "/mnt/shared/datasets처럼 전체 경로를 사용하세요"),
    "settings.connection.problem.qwenWorkspace": (
        "Use the workspace id from Model Studio's Workspace page (lowercase letters, digits and hyphens), not an address",
        "Model Studio의 Workspace 페이지에 있는 워크스페이스 ID(소문자, 숫자, 하이픈)를 쓰세요. 주소를 쓰는 게 아닙니다",
    ),
}


def load(path: pathlib.Path) -> OrderedDict:
    data = json.loads(path.read_text(encoding="utf-8"))
    return OrderedDict(data)


def main() -> None:
    en = load(EN_PATH)
    ko = load(KO_PATH)

    dupes = [k for k in TABLE if k in en]
    if dupes:
        raise SystemExit(f"keys already present in en.json: {dupes}")

    for k, (en_value, ko_value) in TABLE.items():
        en[k] = en_value
        ko[k] = ko_value

    if len(en) != len(ko):
        raise SystemExit(f"key count mismatch en={len(en)} ko={len(ko)}")

    EN_PATH.write_text(json.dumps(en, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    KO_PATH.write_text(json.dumps(ko, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"added {len(TABLE)} keys; en={len(en)} ko={len(ko)}")


if __name__ == "__main__":
    main()
