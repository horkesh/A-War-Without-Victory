#!/usr/bin/env bash
# GUARD: a scenario run just happened, or its result artifacts were just touched. Interpretation
# of those numbers belongs to the specialist seat, not to whoever ran the command.
#
# This is the orchestrator-enforcement rule that used to live as an inline one-liner in
# .claude/settings.json. It was moved here on 2026-09-11 for one reason: the inline version
# matched BARE TEXT, so it fired on a commit message that merely mentioned `sim:scenario:run`,
# and demanded an expert analysis of a run that never executed. That was the third hook in this
# repo to make the same mistake, and the reason "is this text a command?" now has a single owner
# in lib/command_segments.sh.
#
# A guard that fires on discussion of itself gets ignored, and this one asks for something
# expensive — dispatching a specialist agent. False alarms here are not free.
#
# Exit 0 always. Advisory only — emits PostToolUse additionalContext, never blocks.
set -uo pipefail

HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

payload="$(cat)"
cmd="$(printf '%s' "$payload" | jq -r '.tool_input.command // empty' 2>/dev/null)"
[ -z "$cmd" ] && exit 0

# Unchanged from the inline version: a scenario invocation, or a reference to a run artifact.
PATTERN='(npm(\.cmd)?[[:space:]]+run[[:space:]]+sim:scenario:run|run_scenario_with_preflight\.ts|tools/scenario_runner/|runs/[^[:space:]]*(final_save\.json|run_summary\.json|control_delta\.json|end_report\.md|formation_delta\.json|destroyed_brigades\.json|watched_operations\.json|weekly_report\.jsonl|operation_aars\.json))'

# shellcheck source=lib/command_segments.sh
. "$HOOK_DIR/lib/command_segments.sh"

hit=0
while IFS= read -r seg; do
  [ -z "$seg" ] && continue
  if printf '%s' "$seg" | grep -qiE "$PATTERN"; then
    hit=1
    break
  fi
done <<< "$(command_segments "$cmd" "$HOOK_DIR")"

[ "$hit" -eq 1 ] || exit 0

printf '{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"ORCHESTRATOR ENFORCEMENT: This command invokes a scenario run or references its result artifacts. You MUST dispatch /scenario-creator-runner-tester to analyze these results BEFORE presenting any interpretation to the user. Present raw numbers only. All analysis must be attributed to experts."}}\n'

exit 0
