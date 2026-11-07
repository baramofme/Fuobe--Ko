#!/usr/bin/env python3
"""
Bulk-add new i18n keys to en.json and ko.json for studio components.
Each key must be added to both files. ko must cover 100% of en keys.
"""
import json, sys

NEW_KEYS = {
    # === viewer.tsx (Details panel, action bar, keyboard hints) ===
    "studio.viewer.source":            ("Source",            "출처"),
    "studio.viewer.yourUpload":        ("Your upload",       "내 업로드"),
    "studio.viewer.type":              ("Type",              "종류"),
    "studio.viewer.added":             ("Added",             "추가 시각"),
    "studio.viewer.model":             ("Model",             "모델"),
    "studio.viewer.madeOn":            ("Made on",           "제작 위치"),
    "studio.viewer.mode":              ("Mode",              "모드"),
    "studio.viewer.preset":            ("Preset",            "프리셋"),
    "studio.viewer.finish":            ("Finish",            "마감"),
    "studio.viewer.step":              ("Step",              "단계"),
    "studio.viewer.layer":             ("Layer",             "레이어"),
    "studio.viewer.stem":              ("Stem",              "스텀"),
    "studio.viewer.review":            ("Review",            "검토"),
    "studio.viewer.cost":              ("Cost",              "비용"),
    "studio.viewer.made":              ("Made",              "제작 시각"),
    "studio.viewer.inTrash":           ("In Trash",          "휴지통"),
    "studio.viewer.daysLeft":          ("{n} days left",     "{n}일 남음"),
    "studio.viewer.negativePrefix":    ("Negative:",         "네거티브:"),
    "studio.viewer.words":             ("Words",             "문구"),
    "studio.viewer.sentToModel":       ("Sent to the model", "모델로 전송"),
    "studio.viewer.favorited":         ("Favorited",         "즐겨찾기됨"),
    "studio.viewer.hideOriginal":      ("Hide original",     "원본 숨기기"),
    "studio.viewer.previous":          ("Previous",          "이전"),
    "studio.viewer.next":              ("Next",              "다음"),
    "studio.viewer.moreActionsDetails":("More actions and details", "추가 작업과 상세"),
    "studio.viewer.previewDesc":       ("Preview, actions and details", "미리보기, 작업 및 상세"),
    "studio.viewer.everyActionDesc":   ("Every action and the details of this result", "이 결과의 모든 작업과 상세"),
    "studio.viewer.browse":            ("browse",            "이동"),
    "studio.viewer.favoriteShort":     ("favorite",          "즐겨찾기"),
    "studio.viewer.pinShort":          ("pin",               "고정"),
    "studio.viewer.compareShort":      ("compare",           "비교"),
    "studio.viewer.downloadShort":     ("download",          "다운로드"),
    "studio.viewer.reuseShort":        ("reuse",             "재사용"),
    "studio.viewer.dateStamp":         ("date stamp",        "날짜 각인"),
    "studio.viewer.cctvCaption":       ("CCTV caption",      "CCTV 자막"),
    "studio.viewer.photoBooth":        ("photo-booth print", "포토부트 인화"),
    "studio.viewer.appliedOnOpen":     ("(applied when it opens in a studio)", "(스튜디오에서 열 때 적용)"),
    "studio.viewer.gradeWord":         ("grade",             "그레이드"),
    "studio.viewer.gradePlus":         ("grade +",           "그레이드 +"),
    "studio.viewer.layers":            ("Layers",            "레이어"),
    "studio.viewer.allLayers":         ("All layers",        "모든 레이어"),
    "studio.viewer.detailsTitle":      ("Details",           "상세"),
    "studio.viewer.moreSheetTitle":    ("More",              "더보기"),
    "studio.viewer.placeholderLabel":  ("Placeholder",       "자리표시"),
    "studio.viewer.browserLabel":      ("In your browser",   "브라우저에서"),
    "studio.viewer.yourGpuLabel":      ("Your GPU",          "내 GPU"),
    "studio.viewer.cloudLabel":        ("Cloud",             "클라우드"),
    "studio.viewer.openSourceLabel":   ("Open source",       "오픈소스"),
    "studio.viewer.copyPromptShort":   ("Copy prompt",       "문구 복사"),
    "studio.viewer.aiTag":             ("AI-generated",      "AI 생성"),

    # === feed.tsx ===
    "studio.feed.canceled":            ("Canceled",          "취소됨"),
    "studio.feed.failed":              ("Couldn't generate this one", "이 실행을 만들 수 없습니다"),
    "studio.feed.addToFav":            ("Add to favorites",  "즐겨찾기 추가"),
    "studio.feed.removeFromFav":       ("Remove from favorites", "즐겨찾기 해제"),

    # === studio-page.tsx ===
    "studio.page.liveTitle":           ("Live: the picture changes as you type (runs on your GPU)",
                                        "라이브: 타이핑하는 즉시 그림이 바뀝니다 (내 GPU에서 실행)"),
    "studio.page.liveShort":           ("Live",              "라이브"),
    "studio.page.keptPictureInEdit":   ("The kept picture is in Edit", "저장한 그림이 편집에 들어갔습니다"),
    "studio.page.replaceComposer":     ("Replace what's in the composer?", "컴포저의 내용을 교체할까요?"),
    "studio.page.keepMine":            ("Keep mine",         "내 것 유지"),
    "studio.page.exampleFilesTake":    ("The example's files, words and settings take the place of yours.",
                                        "예시의 파일·문구·설정이 내 것을 대체합니다."),
    "studio.page.exampleWordsTake":    ("The example's words and settings take the place of yours.",
                                        "예시의 문구와 설정이 내 것을 대체합니다."),
    "studio.page.exampleLoaded":       ("Example loaded. Change anything, then Generate.",
                                        "예시 로드 완료. 수정한 뒤 생성하세요."),
    "studio.page.dropComposer":        ("Drop it on the composer", "컴포저에 올려놓기"),
    "studio.page.liveOnGpu":           ("Live runs on your GPU", "라이브는 내 GPU에서 실행됩니다"),
    "studio.page.beforeUpscaling":     ("Before upscaling",  "업스케일 전"),
    "studio.page.notInLibrary":        ("That picture isn't in your library any more",
                                        "그 그림은 더 이상 라이브러리에 없습니다"),
    "studio.page.noLayoutOpen":        ("This picture has no layout to open",
                                        "이 그림에는 열 레이아웃이 없습니다"),
    "studio.page.layoutOpenedSeed":    ("Layout opened with the picture's seed: move a box or change a word, then generate",
                                        "그림의 시드로 레이아웃을 열었습니다: 상자를 옮기거나 단어를 바꾼 뒤 생성하세요"),
    "studio.page.layoutOpened":        ("Layout opened: move a box or change a word, then generate",
                                        "레이아웃을 열었습니다: 상자를 옮기거나 단어를 바꾼 뒤 생성하세요"),
    "studio.page.runNotInLibrary":     ("That run isn't in your library any more.",
                                        "그 실행은 더 이상 라이브러리에 없습니다."),
    "studio.page.lightHint":           ("Pick a light — its direction, colour and softness — and the shot is relit to match.",
                                        "조명의 방향·색·부드러움을 고르면 화면이 그에 맞게 다시 비춥니다."),

    # === engine-switch.tsx ===
    "studio.engine.openSourceOnly":    ("Open source only",  "오픈소스만"),
    "studio.engine.cloudOnly":         ("Cloud only",        "클라우드만"),
    "studio.engine.cloudDesc":         ("Frontier paid models via your fal.ai / Replicate key",
                                        "최신 유료 모델을 내 fal.ai/Replicate 키로 실행"),
    "studio.engine.openSourceDesc":    ("Open-weight models running on your ComfyUI server",
                                        "오픈 가중치 모델이 내 ComfyUI 서버에서 실행"),

    # === preset-chips.tsx ===
    "studio.preset.cameraMotion":      ("Camera motion",     "카메라 모션"),
    "studio.preset.effect":            ("Effect",            "효과"),
    "studio.preset.removeMix":         ("Remove the mix",    "믹스 해제"),
    "studio.preset.mix":               ("Mix",               "믹스"),
    "studio.preset.noMix":             ("No mix",            "믹스 없음"),
    "studio.preset.pickSecond":        ("Pick a second motion or effect to combine with it:",
                                        "두 번째 모션 또는 효과를 골라 조합하세요:"),
    "studio.preset.swapSecond":        ("Swap the second preset:", "두 번째 프리셋을 교체:"),

    # === look-chip.tsx ===
    "studio.look.allPresets":          ("All presets",       "전체 프리셋"),
    "studio.look.general":             ("General",           "일반"),
    "studio.look.backToGeneral":       ("Back to the General look", "일반 룩으로 돌아가기"),
    "studio.look.description":         ("Soul's looks on open weights: words, LoRAs and a grade",
                                        "오픈 가중치에 적용되는 Soul 룩: 문구, LoRA, 그레이드"),

    # === finish-choices.tsx ===
    "studio.finish.watching":          ("Watching the clip…", "클립 보는 중…"),
    "studio.finish.describeClip":      ("Describe the clip for me", "클립을 설명해 주세요"),

    # === frames-strip.tsx ===
    "studio.frames.endFrameLabel":     ("End frame",         "끝 프레임"),
    "studio.frames.middleFrameLabel":  ("Middle frame",      "중간 프레임"),
    "studio.frames.onGpu":             ("On your GPU",       "내 GPU에서"),
    "studio.frames.fasterHint":        ("Faster keeps every 2nd, 3rd or 4th frame, for a snappier move.",
                                        "빠름: 2·3·4번째 프레임을 건너뛰어 더 경쾌한 움직임"),

    # === run-place-chip.tsx ===
    "studio.runPlace.inAll":           ("In all",            "총액"),
    "studio.runPlace.price":           ("Price",             "가격"),
    "studio.runPlace.details":         ("Details",           "상세"),
    "studio.runPlace.detailsEngine":   ("Details and engine","상세 및 엔진"),
    "studio.runPlace.runLabel":        ("Run",               "실행"),
    "studio.runPlace.renderLabel":     ("Render",            "렌더"),

    # === run-on.tsx ===
    "studio.runOn.title":              ("Run on",            "실행 위치"),

    # === media-slot.tsx drop hints ===
    "studio.media.imageHint":          ("Image only — drop a photo here", "이미지 전용 — 사진을 여기에 놓으세요"),
    "studio.media.videoHint":          ("Video only — drop a clip here",  "영상 전용 — 클립을 여기에 놓으세요"),
    "studio.media.audioHint":          ("Audio only — drop a sound file here", "오디오 전용 — 소리 파일을 여기에 놓으세요"),
    "studio.media.textHint":           ("Text only — drop a .txt or .srt file here", "텍스트 전용 — .txt 또는 .srt 파일을 여기에 놓으세요"),
    "studio.media.model3dHint":        ("3D only — drop a .glb file here", "3D 전용 — .glb 파일을 여기에 놓으세요"),
    "studio.media.uploadFailed":       ("Upload failed. Please try again.", "업로드 실패. 다시 시도해 주세요."),
    "studio.media.addClip":            ("Add clip",          "클립 추가"),
    "studio.media.addVoice":           ("Add voice",         "목소리 추가"),

    # === hosted-chips.tsx ===
    "studio.hosted.couldNotDraw":      ("Couldn't draw the light", "조명을 묘사할 수 없습니다"),
    "studio.hosted.couldNotSet":       ("Couldn't set the light",  "조명을 설정할 수 없습니다"),
    "studio.hosted.pickLight":         ("Pick a light",      "조명 선택"),
    "studio.hosted.settingLight":      ("Setting the light", "조명 설정 중"),
    "studio.hosted.newMomentStart":    ("New moment starts", "새 장면 시작"),
    "studio.hosted.clipPicksUp":       ("Clip picks up again","클립 다시 이어짐"),
    "studio.hosted.readingClip":       ("Reading the clip…", "클립 읽는 중…"),

    # === layout-editor.tsx ===
    "studio.layoutEditor.object":      ("Object",            "피사체"),
    "studio.layoutEditor.character":   ("Character",         "캐릭터"),
    "studio.layoutEditor.single":      ("Single",            "단일"),
    "studio.layoutEditor.panels":      ("Panels",            "패널"),
    "studio.layoutEditor.collage":     ("Collage",           "콜라주"),
    "studio.layoutEditor.noLayoutFound": ("No layout found there: paste a Fuobe or ComfyUI layout, a MOSS-Image prompt or bounding boxes",
                                         "레이아웃을 찾지 못했습니다: Fuobe 또는 ComfyUI 레이아웃, MOSS-Image 프롬프트, 바운딩 박스를 붙여넣으세요"),
    "studio.layoutEditor.describeFirst": ("Describe the whole picture first, then plan its layout",
                                         "전체 그림을 먼저 묘사한 뒤 레이아웃을 짜세요"),
    "studio.layoutEditor.couldNotPlan": ("Couldn't plan a layout. Try again, or draw the boxes",
                                        "레이아웃을 짤 수 없습니다. 다시 시도하거나 박스를 그리세요"),
    "studio.layoutEditor.styleTagsEx": ("Style tags (optional): poster, flat design",
                                        "스타일 태그 (선택): poster, flat design"),
    "studio.layoutEditor.autoSquare":  ("Auto (square canvas)","자동 (정사각 캔버스)"),
    "studio.layoutEditor.layoutCopied": ("Layout copied",    "레이아웃 복사됨"),
    "studio.layoutEditor.noBoxesYet":  ("No boxes yet",      "아직 상자가 없습니다"),
    "studio.layoutEditor.readsWords":  ("This model reads the layout as words, not exact positions.",
                                        "이 모델은 레이아웃을 정확한 위치가 아닌 문구로 읽습니다"),
    "studio.layoutEditor.undoHint":    ("Control+Z Meta+Z",  "Control+Z Meta+Z"),
    "studio.layoutEditor.promptCopied":("{model} prompt copied", "{model} 프롬프트 복사됨"),

    # === lyrics-editor.tsx ===
    "studio.lyrics.intro":             ("Intro",             "인트로"),
    "studio.lyrics.verse":             ("Verse",             "벌스"),
    "studio.lyrics.preChorus":         ("Pre-Chorus",        "프리코러스"),
    "studio.lyrics.chorus":            ("Chorus",            "후렴"),
    "studio.lyrics.bridge":            ("Bridge",            "브리지"),
    "studio.lyrics.outro":             ("Outro",             "아웃트로"),
    "studio.lyrics.instrumental":      ("Instrumental",      "연주"),
    "studio.lyrics.describeSongFirst": ("Describe the song first: its subject, mood and style. The lyrics are written from it",
                                        "곡의 주제·분위기·스타일을 먼저 묘사하세요. 가사는 그것을 토대로 작성됩니다"),
    "studio.lyrics.writeLyrics":       ("Write the lyrics",  "가사 작성"),
    "studio.lyrics.writing":           ("Writing…",          "작성 중…"),
    "studio.lyrics.tagOnLine":         ("Each tag on its own line, the words under it",
                                        "각 태그는 한 줄, 가사는 그 아래에"),
    "studio.lyrics.readsWithYourDesc": ("{model} reads the lyrics with your description",
                                        "{model}이 가사와 묘사된 내용을 함께 읽습니다"),

    # === sketch-editor.tsx ===
    "studio.sketch.couldNotLoad":      ("Couldn't load the image", "이미지를 불러올 수 없습니다"),
    "studio.sketch.couldNotExport":    ("Couldn't export the drawing", "그림을 내보낼 수 없습니다"),
    "studio.sketch.paintWhatChanges":  ("Paint what should change", "바꿀 부분을 칠하세요"),
    "studio.sketch.drawYourEdit":      ("Draw your edit",    "편집 그리기"),
    "studio.sketch.brushHint":         ("Brush over the area to replace. Everything you don't paint stays as it is.",
                                        "바꿀 영역을 붓으로 칠하세요. 칠하지 않은 부분은 그대로 유지됩니다."),
    "studio.sketch.sketchHint":        ("Sketch arrows, shapes or write short notes — the model follows them and removes the marks.",
                                        "화살표·도형을 그리거나 짧은 메모를 적으세요. 모델이 그 지시를 따르고 흔적을 지웁니다."),
    "studio.sketch.brushTool":         ("Brush",             "붓"),
    "studio.sketch.eraserTool":        ("Eraser",            "지우개"),
    "studio.sketch.addNoteTool":       ("Add a note",        "메모 추가"),
    "studio.sketch.brushSize":         ("Brush size",        "붓 크기"),
    "studio.sketch.noteText":          ("Note text",         "메모 내용"),
    "studio.sketch.typeNote":          ("Type a note, ↵",    "메모를 입력하고 ↵"),
    "studio.sketch.useDrawing":        ("Use this drawing",  "이 그림 사용"),
    "studio.sketch.useMask":           ("Use this mask",     "이 마스크 사용"),

    # === sketch-tools.tsx ===
    "studio.sketchTools.editDrawing":  ("Edit the drawing",  "그림 편집"),
    "studio.sketchTools.editPaintArea":("Edit the painted area", "칠한 영역 편집"),
    "studio.sketchTools.drawing":      ("Drawing",           "그림"),
    "studio.sketchTools.touchUpDraw":  ("Touch up the drawing", "그림 보정"),
    "studio.sketchTools.touchUpArea":  ("Touch up the painted area", "칠한 영역 보정"),
    "studio.sketchTools.removeDrawing":("Remove drawing",    "그림 제거"),
    "studio.sketchTools.paintArea":    ("Paint area",        "영역 칠하기"),
    "studio.sketchTools.brushInpaint": ("Brush over what should change (inpaint)", "바꿀 부분을 칠하세요 (inpaint)"),
    "studio.sketchTools.sketchFollow": ("Sketch arrows and notes for the model to follow", "모델이 따르도록 화살표와 메모를 그리세요"),

    # === shots-editor.tsx ===
    "studio.shots.oneContinuous":      ("One continuous shot","원테이크"),
    "studio.shots.modelPlans":         ("The model plans the cuts", "모델이 컷을 짭니다"),
    "studio.shots.custom":             ("Custom",            "사용자 지정"),
    "studio.shots.shorter":            ("Shorter",           "더 짧게"),
    "studio.shots.longer":             ("Longer",            "더 길게"),
    "studio.shots.shotPlaceholder1":   ("Shot 1 — e.g. \u201cwide: she steps out of the taxi into the rain\u201d",
                                        "컷 1 — 예: \u201c와이드: 그녀가 택시에서 비 오는 거리로 나간다\u201d"),
    "studio.shots.shotPlaceholderN":   ("Shot {n} — e.g. \u201cclose-up: she looks up at the neon sign\u201d",
                                        "컷 {n} — 예: \u201c클로즈업: 그녀가 네온 간판을 올려다본다\u201d"),

    # === voice-recorder.tsx ===
    "studio.voice.micRequired":        ("Fuobe needs microphone access to record — allow it in your browser, or upload a file instead.",
                                        "녹음하려면 마이크 권한이 필요합니다 — 브라우저에서 허용하거나 파일을 업로드하세요."),
    "studio.voice.recording":          ("Recording",         "녹음"),
    "studio.voice.recordingCleaned":   ("Recording · cleaned","녹음 · 정리됨"),
    "studio.voice.couldNotClean":      ("Couldn't clean the voice, so the original is kept",
                                        "음성 정리에 실패하여 원본을 그대로 둡니다"),
    "studio.voice.couldNotSave":       ("Couldn't save the recording", "녹음을 저장할 수 없습니다"),
    "studio.voice.useOriginal":        ("Use the original recording now", "원본 녹음을 바로 사용"),
    "studio.voice.cleaningSkip":       ("Cleaning… · Skip",  "정리 중… · 건너뛰기"),
    "studio.voice.recordBtn":          ("Record",            "녹음"),
    "studio.voice.saving":             ("Saving…",           "저장 중…"),

    # === video-trimmer.tsx ===
    "studio.trim.partOfClip":          ("Part of the clip",  "클립 일부"),
    "studio.trim.pause":               ("Pause",             "일시정지"),
    "studio.trim.playSelection":       ("Play the selection","선택 구간 재생"),
    "studio.trim.unmute":              ("Unmute",            "소리 켜기"),
    "studio.trim.selectionPos":        ("Selection position","선택 위치"),
    "studio.trim.startOfSelection":    ("Start of selection","선택 시작"),
    "studio.trim.endOfSelection":      ("End of selection",  "선택 끝"),
    "studio.trim.readingClip":         ("Reading the clip…", "클립 읽는 중…"),
    "studio.trim.sSelected":           ("{n} s selected",    "{n}초 선택됨"),

    # === prompt-input.tsx ===
    "studio.promptInput.noElement":    ("No element with that name.", "그 이름의 요소가 없습니다."),
    "studio.promptInput.noElementsYet":("No elements yet. Save a character, location or prop once, then @mention it anywhere.",
                                        "아직 요소가 없습니다. 캐릭터·장소·소품을 한 번 저장하면 어디서나 @로 호출할 수 있습니다."),
    "studio.promptInput.promptAria":   ("Prompt",            "프롬프트"),

    # === model-controls.tsx ===
    "studio.modelControls.director":   ("Director",          "디렉터"),
    "studio.modelControls.directorCtrl":("Director controls","디렉터 제어"),

    # === result-media.tsx ===
    "studio.resultMedia.videoFile":    ("Video file",        "영상 파일"),
    "studio.resultMedia.orbitAria":    ("Orbit video of the splat", "스플랫 궤도 영상"),
    "studio.resultMedia.splatSubject": ("The subject the splat was made from", "스플랫의 원본 피사체"),

    # === layout-strip.tsx ===
    "studio.layoutStrip.drawLayout":   ("Draw the layout",   "레이아웃 그리기"),
    "studio.layoutStrip.drawBoxes":    ("Draw boxes",        "박스 그리기"),
    "studio.layoutStrip.editBoxes":    ("Edit boxes",        "박스 편집"),

    # === compare-slider.tsx ===
    "studio.compareSlider.aria":       ("Compare before and after", "비교: 전후"),

    # === delete-for-good.tsx ===
    "studio.deleteDialog.nResults":    ("{n} results",       "{n}개 결과"),

    # === model-picker.tsx (new badge labels) ===
    "studio.model.paidWithOwnKey":     ("Paid models · with your own key", "유료 모델 · 내 키로"),

    # === attach-menu.tsx ===
    "studio.attach.ctrlHint":          ("Ctrl+V",            "Ctrl+V"),

    # === hub-chrome.tsx ===
    "studio.hub.modesLabel":           ("Modes",             "모드"),

    # === hold-files.tsx ===
    "studio.holdFiles.guestBanner":    ("Free to look around. A free account runs it.",
                                        " 둘러보기는 무료. 무료 계정으로 실행하세요."),
    "studio.holdFiles.howWorksTitle":  ("How Fuobe works",   "Fuobe 작동 방식"),
    "studio.holdFiles.howWorksLine":   ("Look around without an account. A free account lets you run it.",
                                        "계정 없이 둘러보세요. 무료 계정으로 실행할 수 있습니다."),

    # === engine-switch.tsx ===
    "studio.engine.freeShort":         ("Free",              "무료"),
    "studio.engine.keyShort":          ("Key",               "키"),
    "studio.engine.seeLabel":          ("See",               "보기"),
    "studio.engine.okLabel":           ("OK",                "확인"),

    # === settings-panel.tsx ===
    "studio.settings.detectAuto":      ("Detect automatically","자동 감지"),

    # === pool-note.tsx ===
    "studio.pool.readyInSec":          ("Ready in seconds",  "몇 초 내 준비"),
    "studio.pool.readyInMin":          ("Ready in about 2 min", "약 2분 내 준비"),
    "studio.pool.startsWhenFree":      ("Starts when a GPU is free", "GPU가 비면 시작"),
    "studio.pool.startsAfter":         ("Starts after your other runs", "다른 실행 뒤에 시작"),
    "studio.pool.lotsWaiting":         ("Lots of runs in line", "대기 실행이 많습니다"),

    # === made-note.tsx ===
    "studio.made.addPattern":          ("Add a pattern",     "패턴 추가"),

    # === prompt-input element hint ===
    "studio.promptInput.elementName":  ("{name} · type @", "{name} · @ 입력"),

    # === fit-notes.tsx ===
    "studio.fitNotes.useAspect":       ("Use 4:3",           "4:3 사용"),
    "studio.fitNotes.useModel":        ("Use {model}",       "{model} 사용"),

    # === reference-tray.tsx ===
    "studio.ref.addFile":              ("Add file",          "파일 추가"),
    "studio.ref.pickFile":             ("Pick",              "선택"),

    # === studio.tsx loading state ===
    "studio.studio.loading":           ("Loading the studio…", "스튜디오 불러오는 중…"),

    # === result-actions.tsx (remaining hardcoded) ===
    "studio.resultActions.moreActionsLabel": ("More actions","추가 작업"),
    "studio.resultActions.newCharacter":     ("New character","새 캐릭터"),

    # === example-row.tsx ===
    "studio.example.moreToTry":        ("More to try",       "더 시도해 보기"),

    # === place-intro.tsx ===
    "studio.place.whatRuns":           ("What runs where",   "어디서 무엇이 실행되는지"),

    # === RSC page strings (server-rendered page headers) ===
    "studio.workers.title":            ("Workers",           "워커"),
    "studio.workers.desc":             ("Share your GPUs with other machines.", "내 GPU를 다른 기기와 공유하세요."),
    "studio.terms.title":              ("Terms",             "이용약관"),
    "studio.terms.lead":               ("Simple terms for a creative studio.", "크리에이티브 스튜디오를 위한 쉬운 약관."),
    "studio.terms.using":              ("Using Fuobe",       "Fuobe 사용"),
    "studio.terms.usingLine":          ("Fuobe is a free, open-source creative studio. Make whatever you can imagine.",
                                        "Fuobe는 무료 오픈소스 크리에이티브 스튜디오입니다. 상상하는 것은 무엇이든 만드세요."),
    "studio.terms.upload":             ("What you upload",   "올리는 것"),
    "studio.terms.uploadLine":         ("Upload things you own or have permission to use.",
                                        "직접 소유하거나 사용 권한이 있는 것만 올리세요."),
    "studio.terms.made":               ("What you make",     "만든 것"),
    "studio.terms.madeLine":           ("You own everything you make. Read Thanks & licences before you sell your work.",
                                        "만든 것의 권리는 모두 당신에게 있습니다. 판매 전 감사 & 라이선스를 읽어 주세요."),
    "studio.terms.fair":               ("Fair use",          "공정 사용"),
    "studio.terms.fairLine":           ("Fair limits on storage and runs keep the studio fast for everyone. Anything that doesn't follow these terms may be taken down.",
                                        "저장과 실행의 공정한 제한이 모두에게 빠른 스튜디오를 유지합니다. 이 약관을 따르지 않는 콘텐츠는 삭제될 수 있습니다."),
    "studio.terms.service":            ("The service",       "서비스"),
    "studio.terms.serviceLine":        ("Fuobe keeps getting better, so features may change. It's offered as it is, and Privacy explains how long",
                                        "Fuobe는 계속 개선되어 기능이 바뀔 수 있습니다. 있는 그대로 제공되며, 개인정보 처리는 개인정보 보호 페이지에 안내됩니다"),
    "studio.terms.code":               ("The code",          "코드"),
    "studio.privacy.title":            ("Privacy",           "개인정보 보호"),
    "studio.privacy.lead":             ("What Fuobe stores and why.", "Fuobe가 무엇을, 왜 저장하는지."),
    "studio.privacy.who":              ("Who we are",        "우리 소개"),
    "studio.privacy.whoLine":          ("Fuobe is an open-source studio run by a small team. No ad network, no data broker.",
                                        "Fuobe는 소규모 팀이 운영하는 오픈소스 스튜디오입니다. 광고 네트워크도, 데이터 중개도 없습니다."),
    "studio.privacy.keys":             ("Your keys",         "내 키"),
    "studio.privacy.keysLine":         ("Provider keys are encrypted at rest and never sent to a third party.",
                                        "프로바이더 키는 저장 시 암호화되며 제3자에게 전송되지 않습니다."),
    "studio.privacy.uploads":          ("Your uploads",      "내 업로드"),
    "studio.privacy.uploadsLine":      ("Files you upload stay on your account's storage until you delete them.",
                                        "올린 파일은 삭제 전까지 계정 저장공간에 보관됩니다."),
    "studio.privacy.runs":             ("Your runs",         "내 실행"),
    "studio.privacy.runsLine":         ("Prompts and settings are kept so you can reuse them; results stay until you delete them.",
                                        "문구와 설정은 재사용을 위해 보관하며, 결과는 삭제 전까지 유지됩니다."),
    "studio.privacy.contact":          ("Contact",           "문의"),
    "studio.privacy.contactLine":      ("Write to us if you have a question about your data.",
                                        "내 데이터에 질문이 있으면 문의해 주세요."),
    "studio.privacy.yourRights":       ("Your rights",       "권리"),
    "studio.privacy.yourRightsLine":   ("Export or delete your data at any time from Settings.",
                                        "설정에서 언제든 데이터를 내보내거나 삭제할 수 있습니다."),
}

# Load current files
with open('src/lib/i18n/locales/en.json', 'r', encoding='utf-8') as f:
    en = json.load(f)
with open('src/lib/i18n/locales/ko.json', 'r', encoding='utf-8') as f:
    ko = json.load(f)

added_en = 0
added_ko = 0
skipped = 0

for key, (en_val, ko_val) in NEW_KEYS.items():
    if key in en and key in ko:
        skipped += 1
        continue
    en[key] = en_val
    ko[key] = ko_val
    added_en += 1
    added_ko += 1

# Sort keys alphabetically (stable, flat dot-namespaced)
en_sorted = dict(sorted(en.items()))
ko_sorted = dict(sorted(ko.items()))

with open('src/lib/i18n/locales/en.json', 'w', encoding='utf-8') as f:
    json.dump(en_sorted, f, ensure_ascii=False, indent=2)
    f.write('\n')

with open('src/lib/i18n/locales/ko.json', 'w', encoding='utf-8') as f:
    json.dump(ko_sorted, f, ensure_ascii=False, indent=2)
    f.write('\n')

print(f"Added {added_en} keys to en.json, {added_ko} keys to ko.json")
print(f"Skipped {skipped} (already present)")
print(f"Total: en={len(en_sorted)}, ko={len(ko_sorted)}")
# Verify parity
assert set(en_sorted.keys()) == set(ko_sorted.keys()), "KEY PARITY FAIL"
print("Key parity OK ✓")
