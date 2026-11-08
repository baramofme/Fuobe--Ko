#!/usr/bin/env python3
"""
menu.line.* 키를 en.json과 ko.json에 멱등으로 추가한다 — 런처 패널(mega-panel)의 LeadCard/Row/Tile이
보여주는 한 줄(line)을 렌더 시점에 번역 가능하게 하는 키들 (t_5e0620ec, 결정문 t_945498cb §2).

- 키는 렌더된 문장에서 유도한다: `menu.line.<keySnake(line)>` — id 유도 아님. (keySnake과 같은 규칙:
  소문자화 후 non-alphanumerics 덩어리를 _ 하나로, 앞뒤 _ 제거.)
- en 값은 그 라인을 만들어 낸 **그 값**과 문자 단위 동일하다. 원천은 드리프트 없이 세 곳:
  1) 실행 중인 서버의 wire — `{base}/nav-menus/{apps,motions,canvas}`의 lead/rows `line`
     (shortLine/presetLine을 python에서 재구현하지 않는다 — 정답은 서버 출력에 이미 있다.)
  2) nav-model.ts의 `what:` 리터럴 (Studios 패널의 라인은 이 문자열 그 자체).
  3) OWNER_STATIC — 오너 리센트 보드(mega-canvas-owner.tsx의 editLineIn)가 렌더하는 정적 문구
     2줄. 세 wire와 nav-model 어디에도 없는 라인이라 여기서 직접 선언한다(t_6b958c1a).
- ko 값은 아래 KO_MAP에서 가져온다. 새 라인에 ko가 없으면 스크립트는 실패한다 — ko 100%를 강제한다.
- 두 파일의 키 순서가 서로 같다는 관례를 지킨다: 새 키만 꼬리에, 같은 순서로 추가하고 재정리하지 않는다.
  (tests/i18n.test.ts:67-72 — en의 모든 키가 ko에 문자열 + len 동일 → ko 단독 키는 이 스크립트가 원천 차단.)
- 재실행 멱등: 이미 있는 키는 건드리지 않는다. 통합자(t_b47d39c1 계열)는 머지된 트리에서
  형제 카드의 gen-countline-keys.py와 이 스크립트를 순서대로 다시 실행해 키를 재생성한다.

사용법: python3 scripts/gen-menu-line-keys.py [--base http://localhost:3020] [--check]
  --check: 아무것도 쓰지 않고 발견·검증만 보고한다.
"""
import argparse
import json
import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EN_PATH = ROOT / "src/lib/i18n/locales/en.json"
KO_PATH = ROOT / "src/lib/i18n/locales/ko.json"
NAV_MODEL = ROOT / "src/lib/nav-model.ts"

# keySnake과 1:1동작하는 python판 (store.ts:153-155)
def keysnake(v: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "_", v.lower())
    return re.sub(r"^_+|_+$", "", s)


# 오너 컬럼(mega-canvas-owner.tsx)이 렌더하되 세 소스(서버 wire·nav-model의 `what:` 리터럴) 어디에도
# 잡히지 않는 정적 문구(t_6b958c1a의 편집 줄 2줄 + t_c373d4a4의 크롬 3줄·스킬 행의 `what`). 동적 `Edited {X}`는
# gen-countline-keys.py가 소유하고, 여기는 wire에 없는 정적만 소유한다 — 키는 렌더된 영문 문장 그대로의 keySnake.
# `Assist's skills, drawn as boards`는 feature()의 위치 인자라 `what:` 정규식이 놓친다 — 슈퍼셋에 들게 여기서 선언한다.
OWNER_STATIC = [
    "Never edited",
    "Edited just now",
    "New board",
    "Your recent boards",
    "All your boards",
    "Assist's skills, drawn as boards",
]

def owner_lines():
    return [(f"menu.line.{keysnake(l)}", l) for l in OWNER_STATIC]


# ko 값 인벤토리 — 키가 없으면 실패한다(번역 강요). 줄임표·개행 금지, 한글 1자 이상,
# en과 불일치, LINE_MAX(26) 이내(레이아웃은 자르지만 title에 전체가 떠서 길면 마우스오버가 어색하다).
KO_MAP: dict[str, str] = {
    # ── apps wire (48) ──
    "menu.line.the_film_set_behind_a_shot": "촬영 뒤의 영화 세트장",
    "menu.line.relight_any_photo": "어떤 사진이든 재조명",
    "menu.line.re_shoot_from_any_angle": "어떤 각도로 다시 촬영",
    "menu.line.storyboard_from_one_photo": "사진 하나로 스토리보드",
    "menu.line.match_a_shot_s_lighting": "그 컷의 조명에 맞춤",
    "menu.line.match_a_reference_s_colors": "레퍼런스 색에 맞춤",
    "menu.line.nine_zooms_macro_to_wide": "아홉 줌, 접사부터 와이드까지",
    "menu.line.where_the_story_goes_next": "다음 이야기로",
    "menu.line.extreme_close_up_product": "극접사 제품 컷",
    "menu.line.your_product_relit": "내 제품을 다시 비추기",
    "menu.line.a_freeze_frame_360_spin": "정지한 장면을 360° 회전",
    "menu.line.a_frozen_360_water_splash": "얼어붙은 360° 물보라",
    "menu.line.color_shifting_morph": "색이 변하는 모프",
    "menu.line.your_product_in_any_scene": "내 제품을 어떤 장면에",
    "menu.line.a_product_link_to_an_ad": "제품 링크를 광고로",
    "menu.line.clean_e_commerce_photos": "깔끔한 쇼핑몰 사진",
    "menu.line.film_grades_in_one_click": "원클릭 필름 그레이드",
    "menu.line.a_sketch_to_a_real_photo": "스케치를 실제 사진으로",
    "menu.line.clears_text_logos": "글자와 로고 제거",
    "menu.line.an_image_split_into_parts": "이미지를 부분으로 분할",
    "menu.line.black_white_to_color": "흑백을 색으로",
    "menu.line.erase_anything_you_name": "지목한 것은 무엇이든 삭제",
    "menu.line.sharper_larger_images": "더 선명하고 크게",
    "menu.line.old_prints_sharp_clean": "오래된 인화를 선명하고 깔끔하게",
    "menu.line.see_yourself_younger": "더 젊은 나로",
    "menu.line.wear_a_photo_s_outfit": "사진 속 옷 입어보기",
    "menu.line.apply_a_makeup_look": "메이크업 룩 적용",
    "menu.line.recolor_one_piece_you_tap": "탭한 한 벌 재채색",
    "menu.line.copy_a_reference_s_look": "레퍼런스 룩 복사",
    "menu.line.clothes_to_a_photoshoot": "옷을 화보로 촬영",
    "menu.line.try_a_new_haircut_or_color": "새 헤어컷·염색 시도",
    "menu.line.an_instant_outfit_makeover": "즉석 스타일 변신",
    "menu.line.put_a_face_into_any_video": "얼굴을 어떤 영상에",
    "menu.line.cut_out_a_video_s_subject": "영상 속 피사체 오려내기",
    "menu.line.a_clean_voice_no_echo": "울림 없는 맑은 목소리",
    "menu.line.outfit_changes_in_the_city": "도시를 배경으로 의상 변신",
    "menu.line.subtle_motion_for_a_photo": "사진에 은은한 움직임",
    "menu.line.make_anyone_dance": "누구나 춤추게",
    "menu.line.a_selfie_to_an_outfit_clip": "셀카로 의상 클립을",
    "menu.line.sparkling_sticker": "반짝이는 스티커",
    "menu.line.your_photo_as_a_mural": "내 사진, 벽화로",
    "menu.line.a_bold_japanese_poster": "과감한 일본식 포스터",
    "menu.line.a_70s_italian_horror_scene": "70년대 이탈리아 호러",
    "menu.line.glossy_black_latex_look": "윤기 나는 블랙 라텍스",
    "menu.line.a_sand_worm_behind_you": "당신 뒤에 모래 지렁이",
    "menu.line.a_storm_beast_behind_you": "당신 뒤에 폭풍의 짐승",
    "menu.line.a_renaissance_portrait": "르네상스풍 초상",
    "menu.line.you_as_a_spinning_3d_model": "회전하는 3D 모델로 나를",
    # ── motions wire (48) ──
    "menu.line.a_slow_push_in_toward_them": "천천히 피사체에 다가가",
    "menu.line.travels_alongside_them": "나란히 따라 이동",
    "menu.line.a_slow_steady_zoom_in": "느리고 안정적으로 줌인",
    "menu.line.glides_along_with_them": "미끄러지듯 나란히",
    "menu.line.wide_to_extreme_close_up": "광각에서 극접사로",
    "menu.line.close_up_to_wide_fast": "클로즈업에서 광각으로 빠르게",
    "menu.line.a_crash_zoom_into_the_face": "얼굴로 급격히 줌인",
    "menu.line.a_fast_zoom_out_from_them": "그들에게서 빠르게 줌아웃",
    "menu.line.rises_to_reveal_the_scene": "상승해 장면을 드러냄",
    "menu.line.a_fast_glam_arc": "빠르고 화려한 아크",
    "menu.line.a_fast_fpv_drone_dive": "빠른 FPV 드론 다이빙",
    "menu.line.cranes_down_to_eye_level": "크레인이 눈높이로 하강",
    "menu.line.arcs_left_around_them": "왼쪽으로 감아 도는 아크",
    "menu.line.an_aerial_pull_back_and_up": "공중에서 뒤로 물러나 상승",
    "menu.line.rises_over_their_head": "머리 위로 상승",
    "menu.line.a_turntable_spin": "턴테이블처럼 회전",
    "menu.line.a_confident_runway_walk": "자신감 있는 런웨이 워킹",
    "menu.line.locked_off_painterly": "고정된 컷, 회화처럼",
    "menu.line.every_droplet_slowed": "모든 물방울을 느리게",
    "menu.line.camera_rigged_to_them": "피사체에 장착한 카메라",
    "menu.line.handheld_with_snap_zooms": "핸드헬드, 순간 줌",
    "menu.line.a_still_tripod_shot": "고정된 삼각대 컷",
    "menu.line.a_dreamy_floating_camera": "꿈같은 부유하는 카메라",
    "menu.line.sweeping_epic_moves": "장엄한 와이드 무브",
    "menu.line.a_wall_of_sand_sweeps_in": "모래의 벽이 밀려온다",
    "menu.line.they_float_off_the_ground": "바닥에서 떠오른다",
    "menu.line.flowers_overgrow_it_all": "꽃이 모두 뒤덮는다",
    "menu.line.girl_with_a_pearl_earring": "진주 귀고리를 한 소녀",
    "menu.line.a_gale_sweeps_back_hair": "거센 바람에 머리가 젖혀짐",
    "menu.line.sinking_into_the_deep_blue": "깊은 파랑 속으로 가라앉음",
    "menu.line.they_fade_away_completely": "완전히 사라진다",
    "menu.line.glass_shatters_slow_mo": "유리가 깨진다, 슬로",
    "menu.line.a_spin_into_a_new_outfit": "회전하며 새 의상으로",
    "menu.line.a_product_splits_apart": "제품이 분해된다",
    "menu.line.push_into_a_screen_s_scene": "화면 속 장면으로 진입",
    "menu.line.a_train_rushes_past_behind": "기차가 뒤로 지나쳐간다",
    "menu.line.a_coastal_road_drive": "해안 도로를 달리기",
    "menu.line.graceful_ballet_turns": "우아한 발레 회전",
    "menu.line.a_column_flip_transition": "기둥이 넘어가는 전환",
    "menu.line.a_rain_of_vivid_paint": "선명한 물감의 비",
    "menu.line.an_anamorphic_flare": "애너모픽 플레어",
    "menu.line.a_printed_editorial_spread": "인쇄된 에디토리얼 지면",
    "menu.line.graded_like_35mm_film": "35mm 필름 색으로",
    "menu.line.rain_beads_on_the_lens": "렌즈에 맺힌 빗방울",
    "menu.line.inky_blacks_luxe_gloss": "먹빛 검정, 고급스러운 광택",
    "menu.line.deep_reds_in_the_shadows": "그림자의 짙은 빨강",
    "menu.line.sun_washed_golden_tones": "햇빛에 바랜 황금색",
    "menu.line.steel_blue_icy_light": "강철빛 차가운 조명",
    # ── canvas wire (9: 리드 1 + 보드 8) ──
    "menu.line.your_photo_a_scene_a_film": "내 사진, 장면, 영화",
    "menu.line.a_golden_age_portrait": "황금기 스타일 초상",
    "menu.line.into_a_monet_lily_pond": "모네의 수련 연못으로",
    "menu.line.on_stage_under_spotlights": "스포트라이트 아래 무대",
    "menu.line.a_fairytale_castle_rises": "동화 속 성이 솟아난다",
    "menu.line.you_drift_in_deep_blue": "깊은 파랑 속을 표류",
    "menu.line.you_ride_a_dolphin": "돌고래를 타고",
    "menu.line.a_dog_on_a_skateboard": "스케이트보드를 타는 강아지",
    "menu.line.as_tall_as_the_buildings": "건물만큼 거대하게",
    # ── Studios 패널 (nav-model의 `group` 항목 `what` — 30; kind 무관, 슈퍼셋) ──
    # ko는 기존 nav.<id>.what의 번역과 같은 문구로 수확했다(단 아래 세 개는 English 누수/품질을 교정,
    # 마지막 둘은 nav 키가 아예 없어 새로 지었다).
    "menu.line.direct_shots_like_a_film_set": "영화 세트처럼 컷을 연출",
    "menu.line.plan_a_film_frame_by_frame": "장면마다 프레임별 기획",
    "menu.line.copy_any_dance_or_pose": "춤이나 자세를 복사",
    "menu.line.make_a_clip_longer": "클립을 더 길게",
    "menu.line.any_shape_vertical_first": "모든 비율, 세로 우선",
    "menu.line.restyle_a_clip_with_words": "문장으로 클립을 리스타일",
    "menu.line.cut_clips_into_a_story": "클립을 스토리로 편집",
    # 교정: 게시-ready → 순수 한국어 (이전에 수확된 값의 English 누수)
    "menu.line.vertical_reels_ready_to_post": "게시 준비된 세로 릴",
    "menu.line.a_channel_without_a_face": "얼굴 없는 채널",
    "menu.line.a_series_from_one_brief": "한 기획에서 시리즈로",
    "menu.line.a_photo_that_talks": "말하는 사진",
    "menu.line.slides_into_a_video": "슬라이드를 영상으로",
    "menu.line.score_your_first_3_seconds": "첫 3초 점수",
    "menu.line.ugc_and_product_films": "UGC와 제품 필름",
    "menu.line.campaigns_in_every_size": "모든 크기의 캠페인",
    "menu.line.brand_motion_graphics": "브랜드 모션 그래픽",
    "menu.line.collage_paint_and_photo": "콜라주·채색·사진",
    "menu.line.lock_a_look_reuse_it": "룩을 고정하고 재사용",
    "menu.line.a_photo_pack_of_one_person": "한 사람의 사진 모음",
    "menu.line.outfits_try_ons_lookbooks": "의상·입어보기·룩북",
    "menu.line.build_a_character": "캐릭터를 제작",
    "menu.line.one_face_every_angle": "한 얼굴, 모든 각도",
    "menu.line.insert_or_swap_anyone": "누구든 삽입 또는 교체",
    "menu.line.your_people_places_props": "당신의 인물·장소·소품",
    # 교정: 이전에 수확된 값이 26자 초과(28) → 압축
    "menu.line.sharper_images_and_video": "이미지·영상 더 선명하게",
    "menu.line.a_model_you_can_turn": "돌려 볼 수 있는 모델",
    # group은 있으나 슬라이스 파서가 놓쳤던 복줄 항목들 (테스트 t_5e0620ec가 렌더 집합으로 검출):
    "menu.line.voice_music_and_dubbing": "음성·음악·더빙",
    "menu.line.swap_the_star_of_a_clip": "클립의 주인공 교체",
    # nav.<id>.what 키가 없는 항목 — 번역 새로 작성:
    "menu.line.trim_matte_depth_captions": "자르기·배경 제거·깊이·자막",
    # bar의 Apps 항목의 라인(지금은 검색에서 보이나, 같은 문장 키로 통일):
    "menu.line.one_tap_photo_and_clip_tools": "원탭 사진·클립 도구",

    # ── 오너 컬럼의 정적 문구 (OWNER_STATIC — wire 없음, t_6b958c1a·t_c373d4a4) ──
    "menu.line.never_edited": "수정한 적 없음",
    "menu.line.edited_just_now": "방금 수정",
    # 크롬 3줄 (t_c373d4a4): en 값은 렌더된 영문 그대로, ko는 간결한 대등어.
    "menu.line.new_board": "새 보드",
    "menu.line.your_recent_boards": "최근 보드",
    "menu.line.all_your_boards": "모든 보드",
    # 스킬 행의 `what` — feature() 위치 인자라 `what:` 정규식이 놓친 것을 OWNER_STATIC로 수확(t_c373d4a4).
    "menu.line.assist_s_skills_drawn_as_boards": "어시스트의 스킬을 보드로",

    # ── nav-model.ts의 모든 `what:` 리터럴(슈퍼셋 97 — 30을 포함) ──
    # ko는 en의 nav.*.what 중 값이 문자 단위 같은 키에서 수확했다. 아래 5개는 그런 키가 없어 새로 지었다:
    # (카메라 움직임·효과 / 모든 스튜디오, 미리보기로 / 만들고 편집하는 모든 방법 / 설정 / 자르기·배경 제거·깊이·자막)
    "menu.line.10_bit_hdr_from_any_clip": "모든 클립에서 10비트 HDR",  # value-harvest
    "menu.line.a_conversation_one_voice_each": "각각 다른 목소리의 대화",  # value-harvest
    "menu.line.a_depth_map_of_every_frame": "모든 프레임의 깊이 맵",  # value-harvest
    "menu.line.a_fresh_composer_on_home": "홈의 새 콤비저",  # value-harvest
    "menu.line.a_new_voice_from_a_few_words": "몇 단어로 새 목소리",  # value-harvest
    "menu.line.a_track_from_a_few_words": "몇 단어로 트랙",  # value-harvest
    "menu.line.account_gpu_and_preferences": "계정·GPU·기본 설정",  # value-harvest
    "menu.line.back_to_your_account": "계정으로 돌아오기",  # value-harvest
    "menu.line.burned_in_captions": "번인 자막",  # value-harvest
    "menu.line.camera_moves_and_effects": "카메라 움직임·효과",  # authored
    "menu.line.change_a_picture_with_words": "문장으로 그림을 바꾸기",  # value-harvest
    "menu.line.change_the_words_keep_the_voice": "문장 바꾸고 목소리 유지",  # value-harvest
    "menu.line.changes_as_you_type": "치는 동안 바로 변화",  # value-harvest
    "menu.line.cinematic_effects_from_one_photo": "한 장의 사진으로 영화적 효과",  # value-harvest
    "menu.line.crane_and_drone_moves_for_any_shot": "모든 컷의 크레인·드론 무브",  # value-harvest
    "menu.line.cut_a_clip_to_length": "클립을 길이로 자르기",  # value-harvest
    "menu.line.cut_clips_together": "클립을 이어 붙이기",  # value-harvest
    "menu.line.cut_out_the_background": "배경 지우기",  # value-harvest
    "menu.line.dub_into_any_language": "모든 언어로 더빙",  # value-harvest
    "menu.line.email_sign_out_delete": "이메일·로그아웃·삭제",  # value-harvest
    "menu.line.erase_anything_from_a_clip": "클립에서 무엇이든 지우기",  # value-harvest
    "menu.line.every_studio_with_previews": "모든 스튜디오, 미리보기로",  # authored
    "menu.line.every_way_to_make_or_edit": "만들고 편집하는 모든 방법",  # authored
    "menu.line.everything_you_have_made": "내가 만든 모든 것",  # value-harvest
    "menu.line.extend_remix_or_split_a_song": "곡을 연장·리믹스·분리",  # value-harvest
    "menu.line.from_a_product_link_to_an_ad": "제품 링크에서 광고로",  # value-harvest
    "menu.line.grade_and_match_colors": "색을 다듬고 맞춤",  # value-harvest
    "menu.line.join_sounds_into_one": "소리를 하나로",  # value-harvest
    "menu.line.keep_the_sound_lose_the_words": "소리는 두고 말만 없애기",  # value-harvest
    "menu.line.key_out_a_green_screen": "크로마키 합성",  # value-harvest
    "menu.line.loop_or_lengthen_a_track": "트랙을 반복·연장",  # value-harvest
    "menu.line.match_colors_to_a_picture": "그림에 색을 맞춤",  # value-harvest
    "menu.line.new_light_on_any_clip": "모든 클립에 새 빛",  # value-harvest
    "menu.line.old_footage_sharp_and_in_color": "오래된 필름을 선명하고 색으로",  # value-harvest
    "menu.line.one_ad_in_many_versions": "하나의 광고를 여러 버전으로",  # value-harvest
    "menu.line.one_shot_that_morphs_over_time": "시간에 따라 변하는 한 컷",  # value-harvest
    "menu.line.open_source_mit": "오픈소스, MIT",  # value-harvest
    "menu.line.paint_over_a_part": "일부를 칠해서 다시",  # value-harvest
    "menu.line.plan_it_with_an_agent": "에이전트와 함께 기획",  # value-harvest
    "menu.line.prores_and_lossless_files": "ProRes·무손실 파일",  # value-harvest
    "menu.line.remove_noise_and_echo": "소음과 에코 제거",  # value-harvest
    "menu.line.reusable_recipes": "재사용 레시피",  # value-harvest
    "menu.line.run_on_your_own_comfyui": "내 ComfyUI로 실행",  # value-harvest
    "menu.line.run_on_your_own_comfyui_free": "내 ComfyUI로 실행, 무료",  # value-harvest
    "menu.line.save_your_work_run_more": "작업을 저장하고 더 실행",  # value-harvest
    "menu.line.see_it_from_any_angle": "어떤 각도에서든 보기",  # value-harvest
    "menu.line.settings": "설정",  # authored
    "menu.line.sharper_larger_clips": "더 크고 선명한 클립",  # value-harvest
    "menu.line.sharper_larger_pictures": "더 크고 선명한 사진",  # value-harvest
    "menu.line.smoother_motion": "더 매끄러운 움직임",  # value-harvest
    "menu.line.sound_effects_from_words": "문장에서 효과음",  # value-harvest
    "menu.line.sound_that_fits_the_picture": "화면에 맞는 소리",  # value-harvest
    "menu.line.split_a_picture_into_layers": "그림을 레이어로 분리",  # value-harvest
    "menu.line.start_from_words_or_a_picture": "문장이나 그림으로 시작",  # value-harvest
    "menu.line.swap_the_voice_keep_the_timing": "목소리 교체, 타이밍 유지",  # value-harvest
    "menu.line.switch_light_and_dark": "밝게·어둡게 전환",  # value-harvest
    "menu.line.switch_models_on_or_off": "모델을 켜고 끄기",  # value-harvest
    "menu.line.take_a_person_out_of_a_clip": "클립에서 인물 빼기",  # value-harvest
    "menu.line.text_or_image_to_video": "문장이나 그림을 영상으로",  # value-harvest
    "menu.line.text_to_image": "문장에서 이미지를",  # value-harvest
    "menu.line.text_to_speech_in_any_voice": "모든 음성으로 문장 낭독",  # value-harvest
    "menu.line.the_ones_you_starred": "별표 붙인 것",  # value-harvest
    "menu.line.the_open_models_fuobe_is_built_on": "Fuobe를 만든 오픈 모델",  # value-harvest
    "menu.line.voice_and_music_apart": "음성과 음악 분리",  # value-harvest
    "menu.line.wire_models_together": "모델을 이어 연결",  # value-harvest
    "menu.line.words_from_any_clip": "모든 클립에서 문장",  # value-harvest
    "menu.line.your_own_paid_model_keys": "내가 낸 유료 모델 키",  # value-harvest
}


LINE_MAX = 26  # mega-menus.server.ts의 LINE_MAX와 같은 값 (테스트가 같은 규칙을 단정한다)
HANGUL = re.compile(r"[\uac00-\ud7a3]")


def fail(msg: str) -> None:
    print(f"FAIL: {msg}", file=sys.stderr)
    sys.exit(1)


def wire_lines(base: str):
    """서버가 만들어 낸 라인이 그 값: 실행 중인 세 wire의 lead/rows에서 직접 읽는다."""
    out = []  # (key, en_value) 순서 유지, 중복 제거는 호출 측에서
    for mid in ("apps", "motions", "canvas"):
        with urllib.request.urlopen(f"{base}/nav-menus/{mid}", timeout=20) as r:
            menu = json.load(r)
        for c in menu["columns"]:
            lead = c.get("lead")
            if lead and lead.get("line"):
                out.append((f"menu.line.{keysnake(lead['line'])}", lead["line"]))
            for row in c.get("rows", []):
                if row.get("line"):
                    out.append((f"menu.line.{keysnake(row['line'])}", row["line"]))
    return out


def studio_lines():
    """nav-model.ts의 모든 `what:` 리터럴(슈퍼셋 — 렌더 집합의 미래 변경에도 항상 완비).
    Studios 패널의 lead/rows 라인은 이 파일의 `what:`에서 온다(NAV_ENTRIES + STUDIO_SUBS),
    group 필터·모델 실행 없이 결정적으로 전수 수집한다. 초깃값은 렌더 집합의 약식 검증으로
    잡은 것(테스트 t_5e0620ec가 렌더 집합 ⊆ 이 집합을 매 실행 확인)이며, 새 리터럴은
    KO_MAP 추가를 요구한다(아래 '실패' 규칙)."""
    src = NAV_MODEL.read_text(encoding="utf-8")
    lits = sorted({m.replace('\\"', '"') for m in re.findall(r'what:\s*"((?:[^"\\]|\\.)*)"', src)})
    return [(f"menu.line.{keysnake(w)}", w) for w in lits]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="http://localhost:3020", help="실행 중인 fuobe (wire의 라인 정답)")
    ap.add_argument("--check", action="store_true", help="쓰기 없이 발견·검증만")
    args = ap.parse_args()

    found = wire_lines(args.base) + studio_lines() + owner_lines()

    # 문장이 다르고 키가 같은 충돌은 바이트 동일성을 깨므로 원천 차단한다.
    by_key: dict[str, str] = {}
    for key, en_val in found:
        prev = by_key.get(key)
        if prev is not None and prev != en_val:
            fail(f"키 충돌: {key} ← {prev!r} vs {en_val!r} (서로 다른 문장이 같은 키로)")
        by_key[key] = en_val

    en = json.loads(EN_PATH.read_text(encoding="utf-8"))
    ko = json.loads(KO_PATH.read_text(encoding="utf-8"))

    # ko 값 규칙 사전 검증(KO_MAP 자체) + en과 동일 문장인지
    new_keys = []
    missing_ko = []
    for key, en_val in by_key.items():
        if key in en:
            # 이미 있으면: en 값이 오늘의 그 라인과 문자 단위 같아야 한다(낡은 값의 조용한 회귀 방지).
            if en[key] != en_val:
                fail(f"stale en value: {key} = {en[key]!r} 그러나 라인은 {en_val!r}")
            continue
        kv = KO_MAP.get(key)
        if kv is None:
            missing_ko.append((key, en_val))
            continue
        problems = []
        if not HANGUL.search(kv): problems.append("한글 0자")
        if "…" in kv: problems.append("줄임표")
        if "\n" in kv: problems.append("개행")
        if len(kv) > LINE_MAX: problems.append(f"{len(kv)}자 > LINE_MAX")
        if kv == en_val: problems.append("en과 동일")
        if problems:
            fail(f"ko 품질 규칙 위반: {key} = {kv!r} ({', '.join(problems)})")
        new_keys.append((key, en_val, kv))

    if missing_ko:
        lines_ = "\n".join(f"  {k}  ← en {e!r}" for k, e in missing_ko)
        fail(f"KO_MAP에 번역이 없는 새 라인 {len(missing_ko)}개:\n{lines_}")

    print(f"발견 {len(by_key)}개 키 (wire {len(wire_lines(args.base))} + studios {len(studio_lines())} + owner {len(OWNER_STATIC)})")
    if not new_keys:
        print("이미 전부 존재 — 쓸 것 없음 (멱동 확인)")

    if args.check:
        print(f"--check: 신규 {len(new_keys)}개, 검증 통과")
        return

    if new_keys:
        for key, en_val, kv in new_keys:  # 두 파일에 같은 순서로 꼬리에
            en[key] = en_val
            ko[key] = kv

    EN_PATH.write_text(json.dumps(en, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    KO_PATH.write_text(json.dumps(ko, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    # 관례·퍼테리 자체 검증
    assert list(en.keys()) == list(ko.keys()), "KEY ORDER MISMATCH"
    assert len(en) == len(ko), "KEY COUNT MISMATCH"
    print(f"완료: en={len(en)} ko={len(ko)} 신규추가={len(new_keys)} 순서·개수 일치")


if __name__ == "__main__":
    main()
