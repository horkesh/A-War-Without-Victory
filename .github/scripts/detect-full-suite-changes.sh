#!/usr/bin/env bash
# detect-full-suite-changes.sh
#
# Always-report shim for the C1 full-suite + structural-fingerprint gate
# (.github/workflows/full-suite-and-fingerprint.yml, task #76, 2026-06-09).
#
# Emits `relevant=true` to $GITHUB_OUTPUT when the PR/push touches any path that can
# move a calibration pin or the code/test contract; otherwise `relevant=false`.
# The workflow gates its HEAVY steps on this so doc-only PRs report success fast while
# the check name still always reports (so branch protection can mark it REQUIRED).
#
# The path set here MUST stay identical to the old workflow-level `paths:` filter
# (PR #343) so coverage never shrinks. Keep PATTERNS in sync with that list.
set -euo pipefail

# Glob prefixes (directory trees) and exact files that trigger the heavy gate.
# Identical to the original `paths:` filter plus this workflow + this script.
PREFIXES=(
  "src/"
  "tools/"
  "tests/"
  "data/scenarios/"
  "data/calibration/"
  "scripts/"
)
EXACT_FILES=(
  "package.json"
  "vitest.config.ts"
  "tsconfig.json"
  ".github/workflows/full-suite-and-fingerprint.yml"
  ".github/scripts/detect-full-suite-changes.sh"
)

# Resolve the changed-files set for the current event.
#   pull_request: diff the PR head against the merge-base with the base branch.
#   push:         diff the pushed range (before..after); fall back to last commit.
changed=""
if [[ "${GITHUB_EVENT_NAME:-}" == "pull_request" ]]; then
  base_ref="${GITHUB_BASE_REF:-main}"
  # Ensure origin/<base_ref> is present (checkout uses fetch-depth: 0, so history is
  # full, but the remote-tracking ref for the base branch may still need fetching).
  git fetch --no-tags origin "${base_ref}:refs/remotes/origin/${base_ref}" >/dev/null 2>&1 || \
    git fetch --no-tags origin "${base_ref}" >/dev/null 2>&1 || true
  # merge-base of PR head (HEAD) vs the base branch tip.
  base_sha="$(git merge-base "origin/${base_ref}" HEAD 2>/dev/null || true)"
  if [[ -n "${base_sha}" ]]; then
    changed="$(git diff --name-only "${base_sha}" HEAD)"
  else
    # Defensive fallback: if we cannot resolve a base, run the heavy gate.
    echo "WARN: could not resolve PR merge-base; treating as relevant (fail-safe)." >&2
    echo "relevant=true" >>"${GITHUB_OUTPUT}"
    exit 0
  fi
else
  # push (or anything else): use the event before..after range when available.
  before="${GITHUB_EVENT_BEFORE:-}"
  if [[ -z "${before}" && -f "${GITHUB_EVENT_PATH:-/dev/null}" ]]; then
    before="$(grep -m1 '"before"' "${GITHUB_EVENT_PATH}" | sed -E 's/.*"before": *"([0-9a-f]+)".*/\1/' || true)"
  fi
  if [[ -n "${before}" && "${before}" != "0000000000000000000000000000000000000000" ]] \
     && git cat-file -e "${before}^{commit}" 2>/dev/null; then
    changed="$(git diff --name-only "${before}" HEAD)"
  else
    # New branch / unknown before / shallow: run the heavy gate (fail-safe).
    echo "WARN: could not resolve push base; treating as relevant (fail-safe)." >&2
    echo "relevant=true" >>"${GITHUB_OUTPUT}"
    exit 0
  fi
fi

# Empty diff => nothing changed that we can see => not relevant.
if [[ -z "${changed}" ]]; then
  echo "No changed files detected; relevant=false."
  echo "relevant=false" >>"${GITHUB_OUTPUT}"
  exit 0
fi

echo "Changed files:"
echo "${changed}"

relevant="false"
while IFS= read -r f; do
  [[ -z "${f}" ]] && continue
  for p in "${PREFIXES[@]}"; do
    if [[ "${f}" == "${p}"* ]]; then
      relevant="true"
      break 2
    fi
  done
  for ef in "${EXACT_FILES[@]}"; do
    if [[ "${f}" == "${ef}" ]]; then
      relevant="true"
      break 2
    fi
  done
done <<<"${changed}"

echo "relevant=${relevant}"
echo "relevant=${relevant}" >>"${GITHUB_OUTPUT}"
