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
    "Chat's skills, drawn as boards",  # main의 리브랜드(a266a804)로 Assist→Chat — 구 어시스트 키는 로케일에 잔존.
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
    # main이 Fuobe Angles에 더한 라인(app-fuobe-angles, t_cda7f80d 하베스트):
    "menu.line.turn_the_camera": "카메라를 돌리기",
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
    "menu.line.through_their_own_eyes": "본인의 눈으로 본 시점",
    "menu.line.seen_from_a_moving_object": "움직이는 사물의 시선",
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
    # main의 리브랜드(a266a804)로 카피가 Chat's로 바뀌었다 — 키·ko값도 새 브랜딩으로(교리②, t_cda7f80d).
    "menu.line.chat_s_skills_drawn_as_boards": "채팅의 스킬을 보드로",

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

    # ── t_7078cc96 하베스트 신규 394 ──
"menu.line.expand_the_frame": "프레임을 넓히기",  # en 'Expand the frame'
    "menu.line.extend_any_image_beyond": "이미지를 바깥로 확장",  # en 'Extend any image beyond'
    "menu.line.your_product_on_a_giant": "내 제품을 거대 배경에",  # en 'Your product on a giant'
    "menu.line.product_close_ups_inside": "제품 근접, 내부에",  # en 'Product close-ups inside'
    "menu.line.a_whispered_product_promo": "속삭이는 제품 홍보",  # en 'A whispered product promo'
    "menu.line.spin_your_product": "내 제품을 회전",  # en 'Spin your product'
    "menu.line.turn_a_product_into_a_bold": "제품을 과감한 포스터로",  # en 'Turn a product into a bold'
    "menu.line.a_button_press_triggers": "버튼 누름이 발동",  # en 'A button press triggers'
    "menu.line.turn_a_product_photo": "제품 사진을",  # en 'Turn a product photo'
    "menu.line.freeze_frame_360_rotation": "정지 프레임 360도 회전",  # en 'Freeze-frame 360° rotation'
    "menu.line.your_product_towers": "내 제품이 솟아오르기",  # en 'Your product towers'
    "menu.line.your_character_presents": "내 캐릭터가 발표",  # en 'Your character presents'
    "menu.line.product_link_9": "제품 링크 → 9",  # en 'Product link → 9'
    "menu.line.hands_unbox_your_product": "손이 제품을 언박싱",  # en 'Hands unbox your product'
    "menu.line.a_3d_model_of_your_product": "내 제품 3D 모델",  # en 'A 3D model of your product'
    "menu.line.your_photo_as_a_3d_model": "내 사진 3D 모델로",  # en 'Your photo as a 3D model'
    "menu.line.your_product_wrapped": "내 제품을 감싸기",  # en 'Your product wrapped'
    "menu.line.your_product_in_a_fresh": "내 제품을 새",  # en 'Your product in a fresh'
    "menu.line.turn_any_photo": "아떤 사진이든",  # en 'Turn any photo'
    "menu.line.your_photo_becomes": "내 사진이 되다",  # en 'Your photo becomes'
    "menu.line.unbothered_coffee_in_hand": "태연하게, 커피를 손에",  # en 'Unbothered, coffee in hand'
    "menu.line.your_product_sprayed": "내 제품에 분사",  # en 'Your product sprayed'
    "menu.line.your_product_erupts": "내 제품이 폭발",  # en 'Your product erupts'
    "menu.line.clean_cut_out_one_click": "깔끔한 오려내기 원클릭",  # en 'Clean cut-out, one click'
    "menu.line.restyle_a_photo_in_an_art": "사진을 한 예술로 재스타일",  # en 'Restyle a photo in an art'
    "menu.line.put_the_subject_somewhere": "피사체를 어딘가에",  # en 'Put the subject somewhere'
    "menu.line.turn_anyone": "아무나",  # en 'Turn anyone'
    "menu.line.change_any_text": "아떤 텍스트이든 바꾸기",  # en 'Change any text'
    "menu.line.turn_a_logo_icon": "로고, 아이콘",  # en 'Turn a logo, icon'
    "menu.line.clean_up_logos": "로고 지우기",  # en 'Clean up logos'
    "menu.line.turn_your_opening_frame": "시작 프레임을",  # en 'Turn your opening frame'
    "menu.line.a_holographic_glitter": "홀로그래피 반짝임",  # en 'A holographic glitter'
    "menu.line.make_cute_die_cut_stickers": "귀여운 다이컫 스티커",  # en 'Make cute die-cut stickers'
    "menu.line.turn_anyone_into_a_cuddly": "아무나 포근한",  # en 'Turn anyone into a cuddly'
    "menu.line.your_3d_body_twin": "내 3D 체형 쌍둥이",  # en 'Your 3D body twin'
    "menu.line.soft_or_smeared_faces": "흐릿거나 번진 얼굴",  # en 'Soft or smeared faces'
    "menu.line.your_face_on_another_photo": "내 얼굴을 다른 사진에",  # en 'Your face on another photo'
    "menu.line.a_creased_outfit": "구김 진 옷",  # en 'A creased outfit'
    "menu.line.put_your_whole_head": "머리 전체를",  # en 'Put your whole head'
    "menu.line.mix_clothes_poses": "옷, 포즈를 섞기",  # en 'Mix clothes, poses'
    "menu.line.swap_the_whole_person": "사람 전체를 교체",  # en 'Swap the whole person'
    "menu.line.studio_quality": "스튜디오 품질",  # en 'Studio-quality'
    "menu.line.natural_realistic_skin": "자연스럽고 리얼한 피부",  # en 'Natural, realistic skin'
    "menu.line.invent_an_original": "오리지널을 만들기",  # en 'Invent an original'
    "menu.line.dress_a_person": "옷 입히기",  # en 'Dress a person'
    "menu.line.change_someone_s": "누군가의",  # en "Change someone's"
    "menu.line.deconstruct_an_outfit": "옷을 분해",  # en 'Deconstruct an outfit'
    "menu.line.turn_your_selfie": "셀피를",  # en 'Turn your selfie'
    "menu.line.seamless_transition": "매끄러운 전환",  # en 'Seamless transition'
    "menu.line.make_a_photo_speak": "사진이 말하게",  # en 'Make a photo speak'
    "menu.line.swap_the_character": "캐릭터를 교체",  # en 'Swap the character'
    "menu.line.two_people_share_a_warm": "두 사람, 따뜻한",  # en 'Two people share a warm'
    "menu.line.turn_your_photo": "내 사진을",  # en 'Turn your photo'
    "menu.line.tactical_shooter_squad": "전술 슈터 분대",  # en 'Tactical-shooter squad'
    "menu.line.an_epic_fire_lit_sunset": "웅장한 불빛 노을",  # en 'An epic fire-lit sunset'
    "menu.line.you_as_an_open_world_game": "나를 오픈월드로",  # en 'You as an open-world game'
    "menu.line.classic_open_world_game": "클래식 오픈월드",  # en 'Classic open-world game'
    "menu.line.dissolve_into_a_trippy": "트레피한",  # en 'Dissolve into a trippy'
    "menu.line.you_in_the_iconic": "나를 상징적인",  # en 'You in the iconic'
    "menu.line.a_playful_police_booking": "장난스러운 경찰 연행",  # en 'A playful police booking'
    "menu.line.you_as_a_polished": "나를 세련된",  # en 'You as a polished'
    "menu.line.you_on_a_japanese_fashion": "나를 일본 패션",  # en 'You on a Japanese fashion'
    "menu.line.turn_yourself_into_a_brand": "나를 브랜드로",  # en 'Turn yourself into a brand'
    "menu.line.an_epic_rap_performance": "웅장한 랩 공연",  # en 'An epic rap performance'
    "menu.line.a_police_booking_scene": "경찰 연행 장면",  # en 'A police booking-scene'
    "menu.line.you_as_a_collectible": "나를 컬렉팅으로",  # en 'You as a collectible'
    "menu.line.become_a_k_pop_idol": "케이팝 아이돌로",  # en 'Become a K-pop idol'
    "menu.line.a_vintage_1960s": "빈티지 1960년대",  # en 'A vintage 1960s'
    "menu.line.life_sim_character_creator": "인생 시뮬 캐릭터 생성기",  # en 'Life-sim character creator'
    "menu.line.you_as_an_8_bit_hero": "나를 8비트 영웅으로",  # en 'You as an 8-bit hero'
    "menu.line.you_as_a_toy_brick_figure": "나를 레고 피규어로",  # en 'You as a toy brick figure'
    "menu.line.surround_yourself": "나를 둘둘",  # en 'Surround yourself'
    "menu.line.your_photo_inside_a_retro": "내 사진을 레트로",  # en 'Your photo inside a retro'
    "menu.line.your_photo_framed": "내 사진, 액자에",  # en 'Your photo framed'
    "menu.line.a_winner_style_celebration": "승리자 스타일 축하",  # en 'A winner-style celebration'
    "menu.line.you_in_an_animated_comic": "나를 애니메이션 만화에",  # en 'You in an animated comic'
    "menu.line.your_own_viral_eating_show": "나만의 먹방",  # en 'Your own viral eating show'
    "menu.line.ride_a_wild_roller_coaster": "격렬한 롤러코스터 타기",  # en 'Ride a wild roller coaster'
    "menu.line.a_calm_minimalist_banana": "차분한 미니멀 바나나",  # en 'A calm, minimalist banana'
    "menu.line.surf_dreamy_pink_clouds": "몽환 분홍 구름 서핑",  # en 'Surf dreamy pink clouds'
    "menu.line.you_in_iconic_video_game": "나를 상징적인 게임에",  # en 'You in iconic video-game'
    "menu.line.you_as_a_guest_on_a_retro": "나를 레트로",  # en 'You as a guest on a retro'
    "menu.line.your_own_k_pop_concert": "나만의 케이팝 콘서트",  # en 'Your own K-pop concert'
    "menu.line.a_slow_pan_across_a_scene": "느린 팬, 장면을",  # en 'A slow pan across a scene'
    "menu.line.pushes_in_rapidly_toward": "빠르게",  # en 'Pushes in rapidly toward'
    "menu.line.trucks_sideways": "옆으로 트랙",  # en 'Trucks sideways'
    "menu.line.dollies_smoothly": "부드러운 돌리",  # en 'Dollies smoothly'
    "menu.line.slowly_zooms": "천천히 줌",  # en 'Slowly zooms'
    "menu.line.dollies_forward": "앞으로 돌리",  # en 'Dollies forward'
    "menu.line.pulls_backward": "뒤로 당기",  # en 'Pulls backward'
    "menu.line.a_sudden_crash_zoom_snaps": "급작스러운 크래시 줌",  # en 'A sudden crash zoom snaps'
    "menu.line.a_smooth_optical_zoom": "부드러운 옵티컬 줌",  # en 'A smooth optical zoom'
    "menu.line.pans_smoothly_to_the_left": "부드럽게 왼쪽 팬",  # en 'Pans smoothly to the left'
    "menu.line.smoothly_dollies_backward": "부드럽게 뒤로 돌리",  # en 'Smoothly dollies backward'
    "menu.line.pans_smoothly_to_the_right": "부드럽게 오른쪽 팬",  # en 'Pans smoothly to the right'
    "menu.line.a_rapid_optical_zoom": "빠른 옵티컬 줌",  # en 'A rapid optical zoom'
    "menu.line.flies_forward": "앞으로 날아가",  # en 'Flies forward'
    "menu.line.a_fast_whip_pan_with_heavy": "빠른 whip 팬, 강하게",  # en 'A fast whip pan with heavy'
    "menu.line.pulls_back_rapidly": "급격히 뒤로 당기",  # en 'Pulls back rapidly'
    "menu.line.the_whole_frame_is_steeply": "프레임 전체가 가파르게",  # en 'The whole frame is steeply'
    "menu.line.reverse_vertigo_dolly_zoom": "역버티고 돌리줌",  # en 'Reverse vertigo dolly zoom'
    "menu.line.takes_a_big_bite_of_food": "크게 한 입",  # en 'Takes a big bite of food'
    "menu.line.rolls_into_a_tilted_dutch": "기울어진 더치 앵글",  # en 'Rolls into a tilted Dutch'
    "menu.line.zooms_quickly": "빨리 줌",  # en 'Zooms quickly'
    "menu.line.circles_high_overhead": "높이 원형",  # en 'Circles high overhead'
    "menu.line.camera_mounted_on_the_side": "측면 장착 카메라",  # en 'Camera mounted on the side'
    "menu.line.chasing_the_car_at_speed": "차를 빠르게 추격",  # en 'Chasing the car at speed'
    "menu.line.arcs_around_him_on_a_greek": "그 주위를 그리스",  # en 'Arcs around him on a Greek'
    "menu.line.rises_to_reveal_the_lagoon": "올라가며 석호를 드러내",  # en 'Rises to reveal the lagoon'
    "menu.line.a_short_jib_move_upward": "짧은 지브 위로",  # en 'A short jib move upward'
    "menu.line.spins_smoothly_360_degrees": "부드럽게 360도 회전",  # en 'Spins smoothly 360 degrees'
    "menu.line.precise_motion_control": "정밀한 모션 컨트롤",  # en 'Precise motion-control'
    "menu.line.turns_slowly_above": "위에서 천천히",  # en 'Turns slowly above'
    "menu.line.orbits_a_full_360_degrees": "360도 완전 궤도",  # en 'Orbits a full 360 degrees'
    "menu.line.high_speed_robotic_camera": "초고속 로봇 카메라",  # en 'High-speed robotic camera'
    "menu.line.extreme_low_angle": "극저 앵글",  # en 'Extreme low angle'
    "menu.line.the_action_freezes": "동작 정지",  # en 'The action freezes'
    "menu.line.a_short_jib_move_downward": "짧은 지브 아래로",  # en 'A short jib move downward'
    "menu.line.low_camera_skimming_just": "낮은 카메라, 스치듯",  # en 'Low camera skimming just'
    "menu.line.a_slow_graceful_partial": "느리고 우아한",  # en 'A slow, graceful partial'
    "menu.line.lowers_straight_down": "수직으로 내려",  # en 'Lowers straight down'
    "menu.line.flies_smoothly": "부드럽게 날아",  # en 'Flies smoothly'
    "menu.line.tilts_up_slowly": "천천히 위로 틸트",  # en 'Tilts up slowly'
    "menu.line.tilts_down_slowly": "천천히 아래로 틸트",  # en 'Tilts down slowly'
    "menu.line.a_close_quiet_observer": "가까이, 조용한 관찰자",  # en 'A close, quiet observer'
    "menu.line.single_continuous_oner": "원 테이크",  # en 'Single continuous oner'
    "menu.line.a_cold_precise_slide_down": "차갑고 정밀한 슬라이드",  # en 'A cold, precise slide down'
    "menu.line.sprints_at_full_speed": "전속력으로 달리기",  # en 'Sprints at full speed'
    "menu.line.the_two_people_lean": "두 사람이 기댄다",  # en 'The two people lean'
    "menu.line.chaotic_aggressive": "혼란, 공격적",  # en 'Chaotic, aggressive'
    "menu.line.holds_a_pose_as_hair": "포즈, 헤어",  # en 'Holds a pose as hair'
    "menu.line.rolls_forward": "앞으로 롤",  # en 'Rolls forward'
    "menu.line.casual_behind_the_scenes": "캐주얼 비하인드",  # en 'Casual behind-the-scenes'
    "menu.line.throws_quick_jabs": "빠른 잽",  # en 'Throws quick jabs'
    "menu.line.light_trails_swirl": "빛의 궤적 소용돌이",  # en 'Light trails swirl'
    "menu.line.lifts_off_and_flies": "이륙하여 날아가",  # en 'Lifts off and flies'
    "menu.line.a_skier_carves_fast": "스키어, 빠르게",  # en 'A skier carves fast'
    "menu.line.rack_focus": "랙 포커스",  # en 'Rack focus'
    "menu.line.a_snowboarder_lays_deep": "스노보더, 깊게",  # en 'A snowboarder lays deep'
    "menu.line.handheld_documentary": "핸드헬드 다큐",  # en 'Handheld documentary'
    "menu.line.timelapse_of_the_subject": "피사체 타임랩스",  # en 'Timelapse of the subject'
    "menu.line.sprints_leaps_high": "달리기, 높이",  # en 'Sprints, leaps high'
    "menu.line.impossible_camera_move": "불가능한 카메라",  # en 'Impossible camera move'
    "menu.line.low_angle_hero_shot": "로우 앵글 히어로",  # en 'Low-angle hero shot'
    "menu.line.natural_balanced": "자연스럽고 균형",  # en 'Natural, balanced'
    "menu.line.performs_a_smooth_moonwalk": "부드러운 문워크",  # en 'Performs a smooth moonwalk'
    "menu.line.clouds_stream": "구름 흐르기",  # en 'Clouds stream'
    "menu.line.tracks_the_subject_s_head": "피사체 머리 추적",  # en "Tracks the subject's head"
    "menu.line.moves_forward_while_time": "앞으로, 시간",  # en 'Moves forward while time'
    "menu.line.pops_a_clean_ollie": "깔끔한 폴리",  # en 'Pops a clean ollie'
    "menu.line.clouds_race_light_changes": "구름 질주, 빛 변화",  # en 'Clouds race, light changes'
    "menu.line.a_skier_floats": "스키어 떠다",  # en 'A skier floats'
    "menu.line.fast_first_person_ride": "빠른 1인칭",  # en 'Fast first-person ride'
    "menu.line.cruises_relaxed": "여유롭게",  # en 'Cruises relaxed'
    "menu.line.playful_wiggle_camera": "장난스러운 위글",  # en 'Playful wiggle camera'
    "menu.line.glides_smoothly": "부드럽게 미끄러",  # en 'Glides smoothly'
    "menu.line.a_snowboarder_surfs": "스노보더 서핑",  # en 'A snowboarder surfs'
    "menu.line.winds_up_and_delivers": "회수하고 전달",  # en 'Winds up and delivers'
    "menu.line.a_fist_flies_into_frame": "주먹이 프레임에",  # en 'A fist flies into frame'
    "menu.line.rap_music_video_camera": "랩 뮤직비디오",  # en 'Rap music video camera'
    "menu.line.ultra_wide_fisheye_lens": "초광각 어안",  # en 'Ultra-wide fisheye lens'
    "menu.line.they_crumble_into_dust": "먼지로 무너지다",  # en 'They crumble into dust'
    "menu.line.flames_ignite_and_engulf": "불꽃이 붙어 삼키다",  # en 'Flames ignite and engulf'
    "menu.line.turns_into_a_white_marble": "흰 대리석",  # en 'Turns into a white marble'
    "menu.line.thick_black_liquid_streams": "검은 액체",  # en 'Thick black liquid streams'
    "menu.line.ink_dark_smoke_rises": "먹빛 연기",  # en 'Ink-dark smoke rises'
    "menu.line.the_buildings_behind": "뒤의 건물",  # en 'The buildings behind'
    "menu.line.a_huge_wave_of_water": "거대한 물결",  # en 'A huge wave of water'
    "menu.line.she_crystallizes": "그녀 결정화",  # en 'She crystallizes'
    "menu.line.slides_sideways": "옆으로 슬라이드",  # en 'Slides sideways'
    "menu.line.water_and_candles_rise": "물, 양초",  # en 'Water and candles rise'
    "menu.line.peels_out_of_the_scene": "장면을",  # en 'Peels out of the scene'
    "menu.line.a_giant_boarding_pass": "거대한 탑승권",  # en 'A giant boarding pass'
    "menu.line.tips_backward_and_falls": "뒤로 넘어짐",  # en 'Tips backward and falls'
    "menu.line.snaps_their_fingers": "손가락 튕기기",  # en 'Snaps their fingers'
    "menu.line.a_bronze_clad_king_before": "청동 무장 왕",  # en 'A bronze-clad king before'
    "menu.line.a_rose_of_ice_grows": "얼음 장미",  # en 'A rose of ice grows'
    "menu.line.the_subject_s_skin_slowly": "피사체 피부",  # en "The subject's skin slowly"
    "menu.line.opens_their_mouth": "입을 열다",  # en 'Opens their mouth'
    "menu.line.the_scene_curls": "장면",  # en 'The scene curls'
    "menu.line.delicate_white_lace": "섬세한 흰 레이스",  # en 'Delicate white lace'
    "menu.line.a_soft_magical_light_wraps": "부드러운 마법 빛",  # en 'A soft magical light wraps'
    "menu.line.hands_and_strange_organic": "손, 기이한",  # en 'Hands and strange organic'
    "menu.line.frost_spreads": "서리",  # en 'Frost spreads'
    "menu.line.jerks_their_head": "고개를",  # en 'Jerks their head'
    "menu.line.vibrant_flowers_blossom": "선명한 꽃",  # en 'Vibrant flowers blossom'
    "menu.line.zooms_out_from_the_subject": "피사체에서",  # en 'Zooms out from the subject'
    "menu.line.a_lidar_scanning_wave": "라이다 스캔",  # en 'A lidar scanning wave'
    "menu.line.everyday_objects": "일상적인 물건",  # en 'Everyday objects'
    "menu.line.sweeps_their_arms": "팔을",  # en 'Sweeps their arms'
    "menu.line.dissolves": "녹아",  # en 'Dissolves'
    "menu.line.a_gust_of_wind_fills": "돌풍",  # en 'A gust of wind fills'
    "menu.line.grows_into_a_giant": "거인",  # en 'Grows into a giant'
    "menu.line.a_flock_of_pigeons_bursts": "비둘기",  # en 'A flock of pigeons bursts'
    "menu.line.the_subject_s_skin_turns": "피부",  # en "The subject's skin turns"
    "menu.line.flowers_and_greenery": "꽃, 초록",  # en 'Flowers and greenery'
    "menu.line.colossal_people_as_tall": "거대 인물",  # en 'Colossal people as tall'
    "menu.line.the_garden_turns": "정원",  # en 'The garden turns'
    "menu.line.panels_of_the_subject_s": "피사체의",  # en "Panels of the subject's"
    "menu.line.translucent_glowing": "반투명 발광",  # en 'Translucent glowing'
    "menu.line.mid_action_the_subject": "동작 중 피사체",  # en 'Mid-action the subject'
    "menu.line.breaks_down": "무너",  # en 'Breaks down'
    "menu.line.stage_lights_snap": "무대 조명",  # en 'Stage lights snap'
    "menu.line.performs_a_flawless": "완벽한",  # en 'Performs a flawless'
    "menu.line.clings_on_as_whatever_they": "붙잡다",  # en 'Clings on as whatever they'
    "menu.line.a_castle_rises": "성",  # en 'A castle rises'
    "menu.line.rises_to_colossal_size": "거대화",  # en 'Rises to colossal size'
    "menu.line.the_environment": "환경",  # en 'The environment'
    "menu.line.unleashes_a_flurry": "돌풍",  # en 'Unleashes a flurry'
    "menu.line.rides_on_the_back": "등을",  # en 'Rides on the back'
    "menu.line.the_building_behind_them": "뒤의 건물",  # en 'The building behind them'
    "menu.line.the_subject_s_body_turns": "몸",  # en "The subject's body turns"
    "menu.line.the_subject_s_skin_morphs": "피부",  # en "The subject's skin morphs"
    "menu.line.bioluminescent_fish_glide": "발광 물고기",  # en 'Bioluminescent fish glide'
    "menu.line.pushes_into_the_subject_s": "피사체",  # en "Pushes into the subject's"
    "menu.line.splits_into_several": "여러",  # en 'Splits into several'
    "menu.line.the_subject_s_face": "피사체 얼굴",  # en "The subject's face"
    "menu.line.a_car_near_the_subject": "피사체 옆 차",  # en 'A car near the subject'
    "menu.line.stomps_and_a_shockwave": "발구르, 충격파",  # en 'Stomps and a shockwave'
    "menu.line.melts_like_wax": "밀랍",  # en 'Melts like wax'
    "menu.line.light_blue_fish_swim": "연한 파랑 물고기",  # en 'Light blue fish swim'
    "menu.line.chaos_erupts": "혼란",  # en 'Chaos erupts'
    "menu.line.a_radiant_glow_builds": "눈부신",  # en 'A radiant glow builds'
    "menu.line.slimy_tentacles_emerge": "미끌더러운 촉수",  # en 'Slimy tentacles emerge'
    "menu.line.the_subject_s_head_gently": "머리",  # en "The subject's head gently"
    "menu.line.raises_their_hands": "손을",  # en 'Raises their hands'
    "menu.line.smoothly_morphs": "부드러운",  # en 'Smoothly morphs'
    "menu.line.with_a_flick_of_the_wrist": "손목",  # en 'With a flick of the wrist'
    "menu.line.looks_into_the_lens": "렌즈를",  # en 'Looks into the lens'
    "menu.line.a_burst_of_vivid_colored": "선명한",  # en 'A burst of vivid colored'
    "menu.line.breathes_out_a_powerful": "강력한",  # en 'Breathes out a powerful'
    "menu.line.the_subject_s_body": "몸",  # en "The subject's body"
    "menu.line.launches_into_a_huge": "거대",  # en 'Launches into a huge'
    "menu.line.crouches_and_launches": "웅크리고",  # en 'Crouches and launches'
    "menu.line.something_strikes": "무언가",  # en 'Something strikes'
    "menu.line.lightning_crackles": "번개",  # en 'Lightning crackles'
    "menu.line.and_scene_turn": "장면",  # en 'And scene turn'
    "menu.line.several_clones": "여러",  # en 'Several clones'
    "menu.line.a_glowing_portal_opens": "발광 포탈",  # en 'A glowing portal opens'
    "menu.line.the_subject_s_head_bursts": "머리",  # en "The subject's head bursts"
    "menu.line.summons_fire": "불을",  # en 'Summons fire'
    "menu.line.under_the_moonlight": "달빛",  # en 'Under the moonlight'
    "menu.line.pulls_back_to_reveal": "뒤로",  # en 'Pulls back to reveal'
    "menu.line.a_translucent_glowing_copy": "반투명 발광 복제",  # en 'A translucent glowing copy'
    "menu.line.cracks_of_glowing_molten": "발광",  # en 'Cracks of glowing molten'
    "menu.line.transforms_into_a_huge": "거대",  # en 'Transforms into a huge'
    "menu.line.the_scene_breaks": "장면",  # en 'The scene breaks'
    "menu.line.spreads_their_arms": "팔",  # en 'Spreads their arms'
    "menu.line.rocks_and_soil_rise": "바위, 흙",  # en 'Rocks and soil rise'
    "menu.line.walks_calmly_toward": "차분",  # en 'Walks calmly toward'
    "menu.line.clones_of_the_subject": "피사체",  # en 'Clones of the subject'
    "menu.line.the_subject_s_body_ignites": "몸에",  # en "The subject's body ignites"
    "menu.line.dark_ragged_wings_burst": "어두운",  # en 'Dark ragged wings burst'
    "menu.line.huge_feathered_angel_wings": "거대 깃털 천사",  # en 'Huge feathered angel wings'
    "menu.line.the_subject_s_two_eyes": "두 눈",  # en "The subject's two eyes"
    "menu.line.powers_up_with_a_golden": "황금",  # en 'Powers up with a golden'
    "menu.line.a_huge_friendly_monster": "거대",  # en 'A huge friendly monster'
    "menu.line.a_hair_flip_close_up": "헤어",  # en 'A hair flip, close up'
    "menu.line.a_splash_of_water_bursts": "물",  # en 'A splash of water bursts'
    "menu.line.pushes_through_a_detail": "세부",  # en 'Pushes through a detail'
    "menu.line.an_aurora_ripples": "오로라",  # en 'An aurora ripples'
    "menu.line.leaps_backward": "뒤로",  # en 'Leaps backward'
    "menu.line.a_flock_of_black_ravens": "검은",  # en 'A flock of black ravens'
    "menu.line.rides_along_a_sunny_beach": "맑은 해변",  # en 'Rides along a sunny beach'
    "menu.line.a_truck_drives": "트럭",  # en 'A truck drives'
    "menu.line.deflates_like_a_balloon": "풍선",  # en 'Deflates like a balloon'
    "menu.line.stretches_by_a_sunny": "맑은",  # en 'Stretches by a sunny'
    "menu.line.a_romantic_date_unfolds": "로맨틱 데이트",  # en 'A romantic date unfolds'
    "menu.line.a_hole_opens_in_the_middle": "한가운데",  # en 'A hole opens in the middle'
    "menu.line.a_hydraulic_press_crushes": "유압 프레스",  # en 'A hydraulic press crushes'
    "menu.line.the_phone_stays": "폰",  # en 'The phone stays'
    "menu.line.the_frame_shifts": "프레임",  # en 'The frame shifts'
    "menu.line.jumps_toward_the_camera": "카메라를",  # en 'Jumps toward the camera'
    "menu.line.takes_off_running": "달려",  # en 'Takes off running'
    "menu.line.relaxes_on_the_deck": "덱에서",  # en 'Relaxes on the deck'
    "menu.line.walks_the_red_carpet": "레드 카펫",  # en 'Walks the red carpet'
    "menu.line.the_start_frame_melts": "시작 프레임",  # en 'The start frame melts'
    "menu.line.rides_a_motorbike_down": "오토바이",  # en 'Rides a motorbike down'
    "menu.line.a_helicopter_swoops": "헬리콥터",  # en 'A helicopter swoops'
    "menu.line.a_hand_swipes": "손이",  # en 'A hand swipes'
    "menu.line.slides_on_a_pair": "두",  # en 'Slides on a pair'
    "menu.line.performs_on_a_huge_concert": "거대 콘서트",  # en 'Performs on a huge concert'
    "menu.line.thick_smoke_billows": "연기",  # en 'Thick smoke billows'
    "menu.line.fixes_their_hair": "머리",  # en 'Fixes their hair'
    "menu.line.mystical_runes_and_glowing": "신비한",  # en 'Mystical runes and glowing'
    "menu.line.shaky_phone_footage": "흔들리는 폰",  # en 'Shaky phone footage'
    "menu.line.a_huge_fantastical_beast": "거대 환상",  # en 'A huge fantastical beast'
    "menu.line.shows_off_their_outfit": "옷",  # en 'Shows off their outfit'
    "menu.line.gets_angrier_and_angrier": "점점",  # en 'Gets angrier and angrier'
    "menu.line.reaches_a_mountain_summit": "산 정상",  # en 'Reaches a mountain summit'
    "menu.line.colorful_fireworks_burst": "색색 불꽃",  # en 'Colorful fireworks burst'
    "menu.line.the_phone_camera_tilts": "폰",  # en 'The phone camera tilts'
    "menu.line.ink_tattoos_appear": "타투",  # en 'Ink tattoos appear'
    "menu.line.a_sweep_of_sand_blows": "모래",  # en 'A sweep of sand blows'
    "menu.line.front_facing_selfie_video": "정면 셀피",  # en 'Front-facing selfie video'
    "menu.line.selfie_video_where": "셀피",  # en 'Selfie video where'
    "menu.line.a_blinding_flash": "눈부신",  # en 'A blinding flash'
    "menu.line.a_knife_cuts": "칼",  # en 'A knife cuts'
    "menu.line.a_soft_heavenly_halo": "부드러운 천상",  # en 'A soft heavenly halo'
    "menu.line.colorful_balloons_lift": "색색 풍선",  # en 'Colorful balloons lift'
    "menu.line.flames_sweep": "불꽃",  # en 'Flames sweep'
    "menu.line.dozens_of_identical_clones": "수많은 복제",  # en 'Dozens of identical clones'
    "menu.line.the_subject_is_pushed": "밀림",  # en 'The subject is pushed'
    "menu.line.takes_a_bite_of_their_food": "음식",  # en 'Takes a bite of their food'
    "menu.line.clothes_rain_down": "옷",  # en 'Clothes rain down'
    "menu.line.hands_squish_the_subject": "손이",  # en 'Hands squish the subject'
    "menu.line.breaks_into_a_big_genuine": "크고",  # en 'Breaks into a big genuine'
    "menu.line.soft_fluffy_cotton_candy": "부드러운",  # en 'Soft fluffy cotton-candy'
    "menu.line.suits_up_in_sci_fi_trooper": "SF 병사로",  # en 'Suits up in sci-fi trooper'
    "menu.line.bounces_with_joy": "기쁨",  # en 'Bounces with joy'
    "menu.line.sways_and_staggers": "흔들",  # en 'Sways and staggers'
    "menu.line.the_world": "세계",  # en 'The world'
    "menu.line.frowns_crosses_their_arms": "팔짱",  # en 'Frowns, crosses their arms'
    "menu.line.a_huge_explosion_erupts": "거대",  # en 'A huge explosion erupts'
    "menu.line.inflates_like_a_balloon": "부풀다",  # en 'Inflates like a balloon'
    "menu.line.strikes_a_series_of_quick": "연속",  # en 'Strikes a series of quick'
    "menu.line.friends_rush": "친구",  # en 'Friends rush'
    "menu.line.flexes_as_their_muscles": "근육",  # en 'Flexes as their muscles'
    "menu.line.a_sphere_of_glowing_blue": "발광 파랑",  # en 'A sphere of glowing blue'
    "menu.line.the_room_floods": "방이",  # en 'The room floods'
    "menu.line.the_subject_s_lip_trembles": "입술",  # en "The subject's lip trembles"
    "menu.line.tiny_glowing_fairies": "작은 발광 요정",  # en 'Tiny glowing fairies'
    "menu.line.slowly_mutates": "느리게 변이",  # en 'Slowly mutates'
    "menu.line.a_glowing_translucent": "발광",  # en 'A glowing translucent'
    "menu.line.a_friendly_cute_companion": "친근한",  # en 'A friendly cute companion'
    "menu.line.a_gigantic_hand_reaches": "거대한 손",  # en 'A gigantic hand reaches'
    "menu.line.banknotes_rain_down": "돈",  # en 'Banknotes rain down'
    "menu.line.a_red_japanese_oni_demon": "빨간 오니",  # en 'A red Japanese oni demon'
    "menu.line.points_at_something": "가리키다",  # en 'Points at something'
    "menu.line.pizza_slices_rain_down": "피자",  # en 'Pizza slices rain down'
    "menu.line.the_subject_s_jaw_drops": "턱",  # en "The subject's jaw drops"
    "menu.line.turns_their_head_and": "머리",  # en 'Turns their head and'
    "menu.line.shatters_like_a_mirror": "거울",  # en 'Shatters like a mirror'
    "menu.line.backlit_into_a_glowing": "역광",  # en 'Backlit into a glowing'
    "menu.line.glitchy_datamosh_effect": "글리치",  # en 'Glitchy datamosh effect'
    "menu.line.desaturated_colors": "채도",  # en 'Desaturated colors'
    "menu.line.she_turns_to_living_marble": "살아있는 대리석",  # en 'She turns to living marble'
    "menu.line.the_sun_flares_behind": "태양",  # en 'The sun flares behind'
    "menu.line.a_barrage_of_camera": "카메라 세례",  # en 'A barrage of camera'
    "menu.line.warm_skin_tones_against": "따뜻한 피부",  # en 'Warm skin tones against'
    "menu.line.flat_bold_color_fields": "납작한 과감한 색",  # en 'Flat bold color fields'
    "menu.line.neon_colours_bleed": "네온",  # en 'Neon colours bleed'
    "menu.line.iridescent_soap_bubbles": "비눗방울",  # en 'Iridescent soap bubbles'
    "menu.line.the_moving_scene": "움직이는",  # en 'The moving scene'
    "menu.line.bold_ink_outlines": "굵은 먹",  # en 'Bold ink outlines'
    "menu.line.the_image_breaks": "이미지",  # en 'The image breaks'
    "menu.line.the_frame_splits": "프레임",  # en 'The frame splits'
    "menu.line.caustic_underwater_light": "수중",  # en 'Caustic underwater light'
    "menu.line.and_scene_are_made": "장면",  # en 'And scene are made'
    "menu.line.her_gown_streams": "그녀의 드레스",  # en 'Her gown streams'
    "menu.line.glows_in_false_color_heat": "거짓색 열",  # en 'Glows in false-color heat'
    "menu.line.faded_cyan_blue_tones": "바랜 시안",  # en 'Faded cyan-blue tones'
    "menu.line.bright_paint_splashes": "밝은",  # en 'Bright paint splashes'
    "menu.line.the_scene_is_lit_only": "장면",  # en 'The scene is lit only'
    "menu.line.colours_cycle": "색",  # en 'Colours cycle'
    "menu.line.classic_black_and_white": "클래식 흑백",  # en 'Classic black and white'
    "menu.line.neon_light_trails_trace": "네온",  # en 'Neon light trails trace'
    "menu.line.soft_natural_light_streams": "부드러운 자연",  # en 'Soft natural light streams'
    "menu.line.the_scene_glows_orange": "주황",  # en 'The scene glows orange'
    "menu.line.muted_gentle_low_contrast": "차분, 온화한",  # en 'Muted, gentle low-contrast'
    "menu.line.digital_glitch_distortion": "디지털 글리치",  # en 'Digital glitch distortion'
    "menu.line.a_single_hard_overhead": "하드",  # en 'A single hard overhead'
    "menu.line.layered_mixed_media": "레이어드",  # en 'Layered mixed-media'
    "menu.line.saturated_magenta_and_cyan": "채도",  # en 'Saturated magenta and cyan'
    "menu.line.two_soft_cross_lights": "두 부드러운",  # en 'Two soft cross lights'
    "menu.line.high_contrast_black": "고대조",  # en 'High-contrast black'
    "menu.line.orange_streetlight_cast": "주황 가로등",  # en 'Orange streetlight cast'
    "menu.line.blown_out_highlights": "날아간",  # en 'Blown-out highlights'
    "menu.line.true_to_life_colors": "실사",  # en 'True-to-life colors'
    "menu.line.random_patches_of_colored": "랜덤",  # en 'Random patches of colored'
    "menu.line.soft_pastel_pinks_wash": "부드러운 파스텔",  # en 'Soft pastel pinks wash'
    "menu.line.faded_warm_colors": "바랜",  # en 'Faded warm colors'
    "menu.line.zesty_acid_green_tint": "상큼한",  # en 'Zesty acid-green tint'
    "menu.line.thick_acrylic_brushwork": "두꺼운",  # en 'Thick acrylic brushwork'
    "menu.line.a_soft_green_haze": "부드러운 초록",  # en 'A soft green haze'
    "menu.line.layered_construction_paper": "레이어드",  # en 'Layered construction-paper'
    "menu.line.neon_green_glow": "네온 초록",  # en 'Neon-green glow'
    "menu.line.tracking_boxes": "트래킹 박스",  # en 'Tracking boxes'
    "menu.line.deep_purple_darkness": "진한 보라",  # en 'Deep purple darkness'
    "menu.line.every_frame_looks_freshly": "매 프레임",  # en 'Every frame looks freshly'
    "menu.line.the_moving_scene_is_drawn": "움직이는",  # en 'The moving scene is drawn'
    "menu.line.the_scene_is_repainted": "장면",  # en 'The scene is repainted'
    "menu.line.the_scene_is_reduced": "장면",  # en 'The scene is reduced'
    "menu.line.the_moving_scene_plays": "움직이는",  # en 'The moving scene plays'
    "menu.line.an_x_ray_scan_sweeps": "X레이",  # en 'An X-ray scan sweeps'
    "menu.line.rapid_comic_panels_flash": "빠른 만화",  # en 'Rapid comic panels flash'
    "menu.line.late_night_office_light": "심야 사무실",  # en 'Late-night office light'
    "menu.line.the_subject_s_face_becomes": "피사체",  # en "The subject's face becomes"
    "menu.line.a_futuristic_holographic": "미래적",  # en 'A futuristic holographic'
    "menu.line.black_censor_bars_and_blur": "검은 검열",  # en 'Black censor bars and blur'
    "menu.line.dark_wings_in_a_storm": "폭풍 속 어두운 날개",  # en 'Dark wings in a storm'
    "menu.line.a_3d_body_for_every_person": "모두를 위한 3D 체형",  # en 'A 3D body for every person'
    "menu.line.talk_plan_and_write_with_ai": "AI와 대화·계획·글쓰기",  # en 'Talk, plan and write with AI'
    "menu.line.tools_for_fx_artists_and_teams": "FX 작가·팀을 위한 도구",  # en 'Tools for FX artists and teams'
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
