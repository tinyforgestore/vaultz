#!/usr/bin/env bash
# release.sh — trigger the bump-version workflow on origin/main via gh.
# Usage: ./scripts/release.sh <version> [--watch]   e.g.  ./scripts/release.sh 1.2.3
set -euo pipefail

VERSION="${1:-}"
WATCH=false
for arg in "${@:2}"; do
  if [[ "$arg" == "--watch" ]]; then WATCH=true; fi
done

if [[ -z "$VERSION" ]]; then
  echo "Error: version argument is required." >&2
  echo "Usage: $0 <version> [--watch]   e.g.  $0 1.2.3" >&2
  exit 1
fi

if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Error: version must be in semver format (e.g. 1.2.3). Got: $VERSION" >&2
  exit 1
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "Error: gh CLI not installed. Install: https://cli.github.com/" >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "gh CLI not authenticated. Run: gh auth login" >&2
  exit 1
fi

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$CURRENT_BRANCH" != "main" ]]; then
  echo "Error: must be on main; current branch: $CURRENT_BRANCH" >&2
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Error: working tree is not clean. Commit or stash your changes first." >&2
  exit 1
fi

git fetch origin main

LOCAL=$(git rev-parse main)
REMOTE=$(git rev-parse origin/main)
BASE=$(git merge-base main origin/main)

if [[ "$LOCAL" == "$BASE" && "$LOCAL" != "$REMOTE" ]]; then
  echo "Error: local main is behind origin/main; pull first" >&2
  exit 1
elif [[ "$REMOTE" != "$BASE" && "$LOCAL" != "$BASE" ]]; then
  echo "Error: local main and origin/main have diverged; reconcile first" >&2
  exit 1
elif [[ "$REMOTE" == "$BASE" && "$LOCAL" != "$REMOTE" ]]; then
  echo "Warning: local main is ahead of origin/main (unpushed commits present)." >&2
else
  echo "Local main is up to date with origin/main."
fi

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# Read current version for the confirmation prompt; bump-version.sh on CI re-validates monotonicity.
CURRENT_VERSION=$(node -p "require('$REPO_ROOT/package.json').version")

printf "Vaultz release: %s → %s. Continue? [y/N] " "$CURRENT_VERSION" "$VERSION"
read -r REPLY
if [[ "$REPLY" != "y" && "$REPLY" != "Y" ]]; then
  echo "Aborted."
  exit 0
fi

if ! gh workflow run bump-version.yml -f version="$VERSION" --ref main; then
  echo "Failed to trigger workflow" >&2
  exit 1
fi

sleep "${RELEASE_QUERY_DELAY:-2}"

RUN_URL=$(gh run list --workflow=bump-version.yml --user "@me" --limit 1 --json url --jq '.[0].url' 2>/dev/null || true)
RUN_ID=$(gh run list --workflow=bump-version.yml --user "@me" --limit 1 --json databaseId --jq '.[0].databaseId' 2>/dev/null || true)

if [[ -z "$RUN_URL" ]]; then
  echo "Workflow dispatched. Check: gh run list --workflow=bump-version.yml"
else
  echo "Workflow started: $RUN_URL"
fi

if $WATCH; then
  if [[ -n "$RUN_ID" ]]; then
    gh run watch "$RUN_ID"
  fi
else
  echo "Tip: pass --watch to follow the run live."
fi
