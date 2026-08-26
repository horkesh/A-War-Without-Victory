#!/usr/bin/env bash
# GUARD: reading `$?` after a pipeline reports the LAST command's status, not the one you care about.
#
# WHY THIS EXISTS (2026-08-26). Twice in one session, and the second time an hour after the first
# was caught and written up:
#
#   node tools/verify_checkpoints.cjs "$R" 2>&1 | sed -n '/X/,/Y/p'; echo "exit=$?"
#     -> printed "exit=0" for THREE runs that every one exit 1. `$?` was sed's.
#     Measured properly with `> /dev/null; echo $?`, all three returned 1.
#
#   npx vitest run <file> | tail -12; echo "EXIT: $?"
#     -> the same shape; a red suite can report green.
#
# It is also the documented cause of a project-level incident: two full suites announced
# "completed (exit code 0)" while their logs recorded TESTS_EXIT=1 — the status belonged to a
# trailing `grep`. Believing it would have committed a red tree. (life_lessons 2026-08-25.)
#
# THE FIX IS ALWAYS ONE OF:
#   cmd > /dev/null 2>&1; echo $?            # measure the command, discard the noise
#   cmd; rc=$?; ...                          # capture before anything else runs
#   set -o pipefail                          # make the pipeline adopt the first failure
#   "${PIPESTATUS[0]}"                       # bash-only, index 0 is the head of the pipe
#
# Exit 0 always. Advisory only — emits PreToolUse additionalContext, never blocks.
set -uo pipefail

payload="$(cat)"
cmd="$(printf '%s' "$payload" | jq -r '.tool_input.command // empty' 2>/dev/null)"
[ -z "$cmd" ] && exit 0

# Must contain a real pipe (not `||`) AND read $? / PIPESTATUS-less status somewhere after it.
# Strip `||` so it cannot be mistaken for a pipeline.
stripped="$(printf '%s' "$cmd" | sed 's/||/__OR__/g')"
printf '%s' "$stripped" | grep -q '|' || exit 0
printf '%s' "$stripped" | grep -q '\$?' || exit 0

# PIPESTATUS is the correct idiom — if it is already being used, stay quiet.
printf '%s' "$cmd" | grep -q 'PIPESTATUS' && exit 0

printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","additionalContext":"PIPE EXIT-CODE GUARD. This command PIPES and then reads `$?` — which is the status of the LAST stage of the pipeline (the grep/sed/tail/head), NOT the command you are testing. A failing command behind a successful filter reports SUCCESS. ⇒ THIS EXACT ERROR fired TWICE on 2026-08-26, the second time an hour after the first was caught and written up: `node verify_checkpoints.cjs | sed; echo $?` printed exit=0 for three runs that ALL exit 1. It is also how two red vitest suites once announced themselves green. ⇒ FIX: measure the command alone (`cmd > /dev/null 2>&1; echo $?`), or capture first (`cmd; rc=$?`), or use `${PIPESTATUS[0]}`, or `set -o pipefail`. ⇒ If you are not using $? as a pass/fail signal here, ignore this."}}\n'

exit 0
