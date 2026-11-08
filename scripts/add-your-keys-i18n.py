#!/usr/bin/env python3
"""Add the settings.yourKeys.* keys to en.json and ko.json (balanced, duplicate-checked).

Rule 5: add keys via script, not patch. Loads both locale files as ordered dicts, checks each key is not already
present (a sibling card may have created it), then sets en + ko together and dumps indent=2 / ensure_ascii=False /
trailing newline. Every en value is byte-identical to the source's rendered literal so the byte-bound tests stay
green under the vitest default language (en). ko covers every key (ko == 100%).
"""
import json
from collections import OrderedDict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EN = ROOT / "src/lib/i18n/locales/en.json"
KO = ROOT / "src/lib/i18n/locales/ko.json"

NS = "settings.yourKeys"

# (leaf, en == original byte, ko)
TABLE = [
    # CLOUD_KEY per-provider render fields (dynamic key settings.yourKeys.<provider>.<field>)
    ("fal.field", "fal.ai API key", "fal.ai API 키"),
    ("fal.placeholder", "key_id:key_secret", "key_id:key_secret"),
    ("fal.getKey", "Get a key", "키 발급"),
    ("fal.blurb", "One key runs almost every paid model.", "키 하나로 대부분의 유료 모델을 실행할 수 있습니다."),
    ("replicate.field", "Replicate API token", "Replicate API 토큰"),
    ("replicate.placeholder", "r8_…", "r8_…"),
    ("replicate.getKey", "Get a token", "토큰 발급"),
    ("replicate.blurb", "Hosts some of the same models.", "동일한 모델 일부를 호스팅합니다."),
    # your-keys.ts data functions (call-time t(); en value re-assembled byte-identical via {label}/{who}/{tail})
    ("addKeyMessage", "Add your {label} key to run this. Runs on {label} are billed to your own {label} account.", "{label} 키를 추가해 이 실행을 시작하세요. {label} 실행은 고객님의 {label} 계정으로 청구됩니다."),
    ("keyRejected", "{label} didn't accept your key. Check it in Settings → Your keys.", "{label}이(가) 고객님의 키를 승인하지 않았습니다. 설정 → 내 키에서 확인하세요."),
    ("balanceOut", "Your {label} balance has run out. Top it up on {label}, then run again.", "{label} 잔액이 모두 소진되었습니다. {label}에서 충전한 뒤 다시 실행하세요."),
    ("emptyBalance", "Your {label} key works, but your {label} balance is empty. Top it up on {label} before you run.", "{label} 키는 정상이지만 {label} 잔액이 비어 있습니다. 실행 전에 {label}에서 충전하세요."),
    ("keyRemoved", "Your {label} key was removed, so this run stopped.", "{label} 키가 삭제되어 이 실행이 멈췄습니다."),
    ("addKeyLabel", "Add your {label} key", "{label} 키 추가"),
    ("billedTo", "your {label} account", "고객님의 {label} 계정"),
    ("keySavedMain", "Your {label} key works{who}. Paid models on {label} are ready{tail}", "고객님의 {label} 키가 작동합니다{who}. {label}의 유료 모델이 준비되었습니다{tail}"),
    ("keySavedTail", ".", "."),
    ("keySavedHostedTail", ": pick Cloud in the model list to use them.", ": 모델 목록에서 Cloud를 선택해 사용하세요."),
    ("somethingWrong", "Something went wrong. Please try again.", "문제가 발생했습니다. 다시 시도해 주세요."),
    # your-keys.tsx component render strings (tr at render)
    ("stopRunsReplace", "Stop runs and replace", "실행을 멈추고 교체"),
    ("stopRunsRemove", "Stop runs and remove", "실행을 멈추고 삭제"),
    ("keepIt", "Keep it", "유지"),
    ("checking", "Checking…", "확인 중…"),
    ("checkAndReplace", "Check and replace", "확인 후 교체"),
    ("checkAndSave", "Check and save", "확인 후 저장"),
    ("cancel", "Cancel", "취소"),
    ("ready", "Ready", "준비됨"),
    ("addCredit", "Add credit", "충전"),
    ("endingKey", "Key ending in ", "키 끝부분 "),
    ("endingToken", "Token ending in ", "토큰 끝부분 "),
    ("addedAt", " · added {date}", " · 추가 {date}"),
    ("unreadable", "This key can't be read any more. Add it again.", "이 키는 더 이상 읽을 수 없습니다. 다시 추가해 주세요."),
    ("stoppedAccepting", "{label} stopped accepting this key on {date}. Replace it, or check it again.", "{label}이(가) {date}부터 이 키를 받지 않습니다. 교체하거나 다시 확인하세요."),
    ("balanceRanOut", "Your {label} balance ran out on {date}. Add credit on {label}, then press Check again.", "{label} 잔액이 {date} 소진되었습니다. {label}에서 충전한 뒤 다시 확인을 누르세요."),
    ("removeConfirm", "Remove your {label} key? Paid models on {label} stop working for you until you add a key again.", "{label} 키를 삭제할까요? 키를 다시 추가하기 전까지는 {label}의 유료 모델이 중단됩니다."),
    ("removeKey", "Remove key", "키 삭제"),
    ("remove", "Remove", "삭제"),
    ("replace", "Replace", "교체"),
    ("addAgain", "Add again", "다시 추가"),
    ("checkAgain", "Check again", "다시 확인"),
    ("checkWorksEmpty", "Your {label} key works, but its balance is empty. Add credit, then run.", "{label} 키는 정상이지만 잔액이 비어 있습니다. 충전한 뒤 실행하세요."),
    ("checkWorks", "Your {label} key works.", "{label} 키가 정상입니다."),
    ("checkFailed", "We couldn't check your key. Try again in a minute.", "키를 확인할 수 없습니다. 잠시 후 다시 시도하세요."),
    ("checkNoInternet", "We couldn't check your key. Check this computer's internet, then try again.", "키를 확인할 수 없습니다. 이 컴퓨터의 인터넷 연결을 확인한 뒤 다시 시도하세요."),
    ("keyIsRemoved", "Your {label} key is removed.", "{label} 키가 삭제되었습니다."),
    ("dialogTitle", "Add your {label} key", "{label} 키 추가"),
    ("dialogDesc", "Runs on {label} are billed to your own {label} account. Your key is stored encrypted.", "{label} 실행은 고객님의 {label} 계정으로 청구됩니다. 키는 암호화되어 저장됩니다."),
    ("haveReplicateInstead", "Have a Replicate token instead?", "Replicate 토큰을 가지고 계신가요?"),
    ("haveFalInstead", "Have a fal.ai key instead?", "fal.ai 키를 가지고 계신가요?"),
    ("changeAnyTime", "Change or remove it any time in ", "언제든 변경하거나 삭제할 수 있어요:"),
    ("yourKeysLink", "Settings → Your keys", "설정 → 내 키"),
    ("title", "Your keys", "내 키"),
    ("intro", "Add your fal.ai or Replicate key to use Nano Banana, Kling, Veo and more. You pay the provider directly. Your key is stored encrypted.", "Nano Banana, Kling, Veo 등을 쓰려면 fal.ai 또는 Replicate 키를 추가하세요. 요금은 제공업체에 직접 지불하고, 키는 암호화되어 저장됩니다."),
    ("whereRunsGo", "Where your runs go: ", "실행 위치: "),
    ("change", "Change", "변경"),
    ("whatItCosts", "What it costs:", "비용:"),
    ("costsNote", " The price next to Generate is an estimate; your provider's bill is the final word.", " 생성 옆의 가격은 추정치이며, 최종 요금은 제공업체 청구서 기준입니다."),
    ("limitsOnKey", "On your key: up to 4 runs at once and 60 an hour.", "내 키 사용 시: 최대 동시 4개, 시간당 60개."),
    ("limitsDefault", "Up to 4 runs at once and 60 an hour.", "최대 동시 4개, 시간당 60개."),
    ("paidModelsLead", "Paid models:", "유료 모델:"),
    ("paidModelsTail", " add your own fal.ai or Replicate key to use Nano Banana, Kling and Veo, billed to your account with them.", " fal.ai 또는 Replicate 키를 추가해 Nano Banana, Kling, Veo 등을 사용하세요. 실행은 해당 계정으로 청구됩니다."),
    ("noGpuLead", "No GPU?", "GPU가 없나요?"),
    ("noGpuTail", " Add your own fal.ai or Replicate key to use paid models like Nano Banana, Kling and Veo, billed to your account with them.", " fal.ai 또는 Replicate 키를 추가해 Nano Banana, Kling, Veo 같은 유료 모델을 사용하세요. 실행은 해당 계정으로 청구됩니다."),
    ("addAKey", "Add a key", "키 추가"),
    # key-info.ts data functions (call-time t())
    ("updatedJustNow", "Updated just now", "방금 업데이트"),
    ("updatedMin", "Updated {n} min ago", "{n}분 전 업데이트"),
    ("updatedHour", "Updated {n} h ago", "{n}시간 전 업데이트"),
    ("orgSuffix", "organization", "조직"),
    ("noKeyYetFal", "When you save a key, this card shows your fal.ai balance or a link to it.", "키를 저장하면 이 카드에 fal.ai 잔액 또는 잔액 링크가 표시됩니다."),
    ("noKeyYetReplicate", "When you save a token, this card shows your Replicate account and a link to your balance.", "토큰을 저장하면 이 카드에 Replicate 계정과 잔액 링크가 표시됩니다."),
    ("checkRejected", "{label} didn't accept this {kind}. ", "{label}이(가) 이 {kind}을(를) 승인하지 않았습니다. "),
    ("checkOwnerTail", "Press Test to check it, or save a new one.", "테스트를 눌러 확인하거나 새 키를 저장하세요."),
    ("checkAccountTail", "Press Check again, or replace it.", "다시 확인을 누르거나 교체하세요."),
    # key-account-details.tsx render strings (tr at render)
    ("opensInNewTab", " (opens in a new tab)", " (새 탭에서 열림)"),
    ("refresh", "Refresh", "새로 고침"),
    ("balanceLabel", "Balance", "잔액"),
    ("accountLabel", "Account", "계정"),
    ("spentThisMonth", "Spent this month", "이번 달 지출"),
    ("openBilling", "Open {label} billing", "{label} 청구 페이지 열기"),
    ("balanceEmpty", "Your {label} balance is empty.", "{label} 잔액이 비어 있습니다."),
    ("topUpOn", "Top up on {label}", "{label}에서 충전"),
    ("balanceOnBillingPage", "{label} shows your balance on its billing page.", "{label}은(는) 청구 페이지에 잔액을 표시합니다."),
    ("seeBalanceOn", "See balance on {label}", "{label}에서 잔액 확인"),
    ("falBalanceTitle", "How to see your balance here", "여기서 잔액을 확인하는 방법"),
    ("falBalanceOpenBefore", "Open your", "에서 새 키를 만드려면"),
    ("falBalanceOpenLink", "fal.ai keys page", "fal.ai 키 페이지"),
    ("falBalanceOpenAfter", "and make a new key.", "을(를) 여세요."),
    ("falBalancePickBefore", "For its permissions, choose your own list. Pick the ones in the API preset, then add", "권한은 직접 목록을 선택하세요. API 프리셋의 항목을 고른 뒤 다음을 추가:"),
    ("falBalancePickAfter", ".", "."),
    ("falBalanceSave", "Save the new key here in place of this one.", "새 키를 여기에서 이 키 대신 저장하세요."),
    ("falBalanceWhy", "That permission only reads your balance and what you spent. Fuobe uses it to show them here, and for nothing else.", "해당 권한은 잔액과 지출 내역만 읽습니다. Fuobe는 이를 여기서 표시하는 데만 사용하며 다른 용도로는 쓰지 않습니다."),
]


def load(path):
    with path.open(encoding="utf-8") as f:
        return json.load(f, object_pairs_hook=OrderedDict)


def dump(path, data):
    with path.open("w", encoding="utf-8") as f:
        f.write(json.dumps(data, ensure_ascii=False, indent=2) + "\n")


en = load(EN)
ko = load(KO)

added = 0
skipped = 0
for leaf, en_val, ko_val in TABLE:
    key = f"{NS}.{leaf}"
    if key in en or key in ko:
        print(f"SKIP (exists): {key}")
        skipped += 1
        continue
    en[key] = en_val
    ko[key] = ko_val
    added += 1

dump(EN, en)
dump(KO, ko)
print(f"added={added} skipped={skipped} en_keys={len(en)} ko_keys={len(ko)}")
if len(en) != len(ko):
    raise SystemExit(f"PARITY BROKEN: en={len(en)} ko={len(ko)}")
