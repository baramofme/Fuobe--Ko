#!/usr/bin/env bash
# sync-upstream.sh — Pull from upstream, merge into fork, push to origin.
#
# Prerequisites (one-time setup):
#   git remote add upstream https://github.com/workingprototype/Fuobe
#   git remote add origin   https://github.com/baramofme/Fuobe--Ko.git
#
# Usage: ./sync-upstream.sh
#
# The script merges (not rebase) so local commits are preserved as-is.

set -euo pipefail

BRANCH="${BRANCH:-main}"

# ── Preflight checks ──────────────────────────────────────────────
for remote in upstream origin; do
  if ! git remote get-url "$remote" &>/dev/null; then
    echo "ERROR: remote '$remote' is not configured." >&2
    echo "Run: git remote add $remote <url>" >&2
    exit 1
  fi
done

# Verify push target: origin must be the fork, never upstream.
ORIGIN_URL=$(git remote get-url origin)
UPSTREAM_URL=$(git remote get-url upstream)
if [[ "$ORIGIN_URL" == "$UPSTREAM_URL" ]]; then
  echo "ERROR: 'origin' and 'upstream' point to the same URL — refusing to push." >&2
  exit 1
fi

# Ensure we're on the right branch
CURRENT_BRANCH=$(git symbolic-ref --short HEAD 2>/dev/null || echo "")
if [[ "$CURRENT_BRANCH" != "$BRANCH" ]]; then
  echo "ERROR: Current branch is '$CURRENT_BRANCH', expected '$BRANCH'." >&2
  exit 1
fi

# Check for uncommitted changes
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "ERROR: Working tree has uncommitted changes." >&2
  echo "Commit or stash before syncing." >&2
  git status --short
  exit 1
fi

# ── Fetch upstream ────────────────────────────────────────────────
echo "==> Fetching upstream/$BRANCH..."
git fetch upstream "$BRANCH"

# ── Merge upstream into local ─────────────────────────────────────
echo "==> Merging upstream/$BRANCH into $BRANCH..."
if ! git merge "upstream/$BRANCH" --no-edit; then
  echo "" >&2
  echo "========================================" >&2
  echo "MERGE CONFLICT — resolution required" >&2
  echo "========================================" >&2
  echo "" >&2
  echo "Files with conflicts:" >&2
  git diff --name-only --diff-filter=U >&2
  echo "" >&2
  echo "Resolve conflicts in the files above, then:" >&2
  echo "  git add <file>" >&2
  echo "  git commit" >&2
  echo "" >&2
  echo "To abort the merge and start over:" >&2
  echo "  git merge --abort" >&2
  echo "" >&2
  echo "The script did NOT push. Fix conflicts and re-run." >&2
  exit 1
fi

# ── Push to origin (fork) ─────────────────────────────────────────
echo "==> Pushing $BRANCH to origin ($ORIGIN_URL)..."
git push origin "$BRANCH"

echo ""
echo "==> Done. $BRANCH synced from upstream and pushed to fork."
