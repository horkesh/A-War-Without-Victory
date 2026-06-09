#!/usr/bin/env bash
# detect-changed-paths.sh
#
# Generic always-report path-filter shim (task #81, 2026-06-09). Generalizes the
# proven full-suite shim (.github/scripts/detect-full-suite-changes.sh, task #76) so
# the OTHER pre-existing REQUIRED checks can short-circuit their HEAVY steps to a
# fast success on doc-only PRs while STILL ALWAYS reporting their check name (so
# branch protection can keep them REQUIRED without ever jamming a doc-only PR on a
# never-reported "pending" check — the classic "required + path-filtered" gotcha).
#
# Usage (from a workflow step):
#   - name: Detect relevant changes
#     id: changes
#     env:
#       PATH_SET: code        # one of: code | desktop | sim
#     run: bash .github/scripts/detect-changed-paths.sh
#
# Emits `relevant=true|false` to $GITHUB_OUTPUT. The CALLING JOB always completes and
# always reports its check name; only the heavy steps are gated on `relevant == true`.
#
# PATH SETS (a changed file matching ANY entry => relevant=true):
#
#   code     The code/test/calibration contract. IDENTICAL to the full-suite shim's
#            path set (and the old PR #343 workflow-level `paths:` filter) so the
#            Baseline-Regression `test` slice never shrinks coverage vs full-suite.
#
#   desktop  Desktop packaging / Electron / UI / runtime surfaces, per the blessed
#            2026-06-05 CI/PR-batching policy ("desktop packaging required only for
#            desktop/package/UI/runtime paths"). Covers src/desktop, src/ui, all of
#            tools/ (the packaged-runtime probe + startup-snapshot builders live there
#            — superset, never shrinks), package.json (electron-builder `build` block
#            + desktop:* scripts), and the Desktop Release Guard workflow itself.
#
#   sim      Simulation / scenario / calibration surfaces that can move a scenario
#            anchor: src/sim, src/state, src/scenario, data/scenarios, data/calibration,
#            plus package.json / vitest.config.ts / tsconfig.json and the Baseline
#            Regression workflow + this script (so anchor tooling edits still run).
#
# The diff-resolution logic below is identical to detect-full-suite-changes.sh.
set -euo pipefail

PATH_SET="${PATH_SET:-code}"

case "${PATH_SET}" in
  code)
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
      ".github/workflows/baseline-regression.yml"
      ".github/scripts/detect-changed-paths.sh"
    )
    ;;
  desktop)
    PREFIXES=(
      "src/desktop/"
      "src/ui/"
      "tools/"
    )
    EXACT_FILES=(
      "package.json"
      ".github/workflows/desktop-release-guard.yml"
      ".github/scripts/detect-changed-paths.sh"
    )
    ;;
  sim)
    PREFIXES=(
      "src/sim/"
      "src/state/"
      "src/scenario/"
      "data/scenarios/"
      "data/calibration/"
    )
    EXACT_FILES=(
      "package.json"
      "vitest.config.ts"
      "tsconfig.json"
      ".github/workflows/baseline-regression.yml"
      ".github/scripts/detect-changed-paths.sh"
    )
    ;;
  *)
    echo "ERROR: unknown PATH_SET='${PATH_SET}' (expected code|desktop|sim)." >&2
    # Fail-safe: an unrecognized selector must NOT silently skip coverage.
    echo "relevant=true" >>"${GITHUB_OUTPUT}"
    exit 0
    ;;
esac

# Resolve the changed-files set for the current event.
#   pull_request: diff the PR head against the merge-base with the base branch.
#   push:         diff the pushed range (before..after); fall back to fail-safe.
changed=""
if [[ "${GITHUB_EVENT_NAME:-}" == "pull_request" ]]; then
  base_ref="${GITHUB_BASE_REF:-main}"
  git fetch --no-tags origin "${base_ref}:refs/remotes/origin/${base_ref}" >/dev/null 2>&1 || \
    git fetch --no-tags origin "${base_ref}" >/dev/null 2>&1 || true
  base_sha="$(git merge-base "origin/${base_ref}" HEAD 2>/dev/null || true)"
  if [[ -n "${base_sha}" ]]; then
    changed="$(git diff --name-only "${base_sha}" HEAD)"
  else
    echo "WARN: could not resolve PR merge-base; treating as relevant (fail-safe)." >&2
    echo "relevant=true" >>"${GITHUB_OUTPUT}"
    exit 0
  fi
else
  before="${GITHUB_EVENT_BEFORE:-}"
  if [[ -z "${before}" && -f "${GITHUB_EVENT_PATH:-/dev/null}" ]]; then
    before="$(grep -m1 '"before"' "${GITHUB_EVENT_PATH}" | sed -E 's/.*"before": *"([0-9a-f]+)".*/\1/' || true)"
  fi
  if [[ -n "${before}" && "${before}" != "0000000000000000000000000000000000000000" ]] \
     && git cat-file -e "${before}^{commit}" 2>/dev/null; then
    changed="$(git diff --name-only "${before}" HEAD)"
  else
    echo "WARN: could not resolve push base; treating as relevant (fail-safe)." >&2
    echo "relevant=true" >>"${GITHUB_OUTPUT}"
    exit 0
  fi
fi

# Empty diff => nothing we can see => not relevant.
if [[ -z "${changed}" ]]; then
  echo "PATH_SET=${PATH_SET}: no changed files detected; relevant=false."
  echo "relevant=false" >>"${GITHUB_OUTPUT}"
  exit 0
fi

echo "PATH_SET=${PATH_SET}: changed files:"
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

echo "PATH_SET=${PATH_SET}: relevant=${relevant}"
echo "relevant=${relevant}" >>"${GITHUB_OUTPUT}"
