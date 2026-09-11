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
# ── WHY IT NOW BLOCKS (2026-09-10) ────────────────────────────────────────────────────────
#
# This guard was advisory, and the lesson recording the THIRD violation says why that failed,
# in its own words: "The repo hook fired both times and I still had to be told by it."
# `desktop:map:build 2>&1 | tail -5; echo "BUILD_EXIT=$?"` reported 0 for a build that had died
# with MODULE_NOT_FOUND; a stale dist was then served to a capture rig. A warning that is read
# and stepped over is not a guard, it is a log entry.
#
# ── IT BLOCKS ONLY THE SHAPE THAT IS NEVER INTENTIONAL ────────────────────────────────────
#
# `$?` after a pipeline is sometimes exactly what you want: `cmd | grep -q x; if [ $? -eq 0 ]`
# asks grep a question and reads grep's answer. Denying that would make the guard obstructive,
# and an obstructive guard gets switched off.
#
# So the DENY is narrow: the pipeline's last stage must be a pure DISPLAY filter — tail, head,
# sed, cut, sort, cat, tee, wc and friends. Those never carry a meaningful status, so reading
# `$?` from one is always a mistake, never a question. Anything wider stays advisory.
#
# Heredoc bodies are removed before matching, so a ledger entry or commit message that
# describes this rule in prose is still writable. (The stash guard learned that the hard way
# on 2026-09-10, by blocking the commit that documented it.)
#
# THE FIX IS ALWAYS ONE OF:
#   cmd > /dev/null 2>&1; echo $?            # measure the command, discard the noise
#   cmd > /tmp/out.log 2>&1; rc=$?           # keep the output AND the real status
#   cmd; rc=$?                               # capture before anything else runs
#   set -o pipefail                          # make the pipeline adopt the first failure
#   "${PIPESTATUS[0]}"                       # bash-only, index 0 is the head of the pipe
set -uo pipefail

HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

payload="$(cat)"
cmd="$(printf '%s' "$payload" | jq -r '.tool_input.command // empty' 2>/dev/null)"
[ -z "$cmd" ] && exit 0

deny() {
  printf '%s' "$1" | jq -Rs '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:.}}'
  exit 0
}

# The correct idioms are self-evidently deliberate — if either is present, stay silent entirely.
printf '%s' "$cmd" | grep -q 'PIPESTATUS' && exit 0
printf '%s' "$cmd" | grep -q 'pipefail' && exit 0

# Prose about the rule must remain writable: drop heredoc bodies before deciding anything.
body="$(printf '%s' "$cmd" | awk -f "$HOOK_DIR/lib/strip_heredocs.awk" 2>/dev/null || printf '%s' "$cmd")"

# SINGLE-quoted text is data, never a status read: `$?` inside single quotes is not even
# expanded by the shell. Stripping it lets a test harness or a doc command carry the offending
# string as an argument — which this guard's own probe harness does, and was denied for.
# DOUBLE-quoted text must survive: `echo "BUILD_EXIT=$?"` is the exact shape being caught.
body="$(printf '%s' "$body" | sed "s/'[^']*'/__SQ__/g")"

# A BACKSLASH-ESCAPED `\$?` inside double quotes is a mention too — the shell does not expand
# it. Without this, a command that merely quotes the rule ("never read \$? after a pipe") is
# denied for describing itself, which is the failure that made the stash guard unusable.
body="$(printf '%s' "$body" | sed 's/\\\$/__ESCDOLLAR__/g')"

# `||` is not a pipe; neutralise it before any pipe test.
stripped="$(printf '%s' "$body" | sed 's/||/__OR__/g')"
printf '%s' "$stripped" | grep -q '|' || exit 0
printf '%s' "$stripped" | grep -q '\$?' || exit 0

# ── BLOCKING PASS ─────────────────────────────────────────────────────────────────────────
# Split into command positions, then look for: a pipeline ending in a display filter,
# immediately followed by a read of `$?`.
#
# Commands whose exit status is never meaningful. `grep` is deliberately ABSENT — reading
# grep's status is a legitimate question, and denying it would make this guard obstructive.
DISPLAY_FILTERS=" tail head sed cut sort uniq tr column cat tee wc nl rev fmt pr fold less more "

segments="$(printf '%s' "$stripped" | sed 's/&&/\n/g' | sed 's/;/\n/g')"

pending_filter=""
while IFS= read -r seg; do
  seg="$(printf '%s' "$seg" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//')"
  [ -z "$seg" ] && continue

  # Check BEFORE updating: does this position read the status the previous pipeline destroyed?
  if [ -n "$pending_filter" ] && printf '%s' "$seg" | grep -q '\$?'; then
    deny "BLOCKED: this reads \`\$?\` immediately after a pipeline ending in \`$pending_filter\`.
\`\$?\` is $pending_filter's exit status, not the command you are testing. \`$pending_filter\` almost always succeeds, so a FAILING command behind it reports SUCCESS.
This has now happened at least three times in this repo. On 2026-09-03 \`desktop:map:build 2>&1 | tail -5; echo \"BUILD_EXIT=\$?\"\` printed 0 for a build that died with MODULE_NOT_FOUND; a stale dist was served to a capture rig and the app rendered black. This guard fired that day too — as a warning, which was read and stepped over. That is why it now refuses.
⇒ Keep the output AND the real status:  cmd > /tmp/out.log 2>&1; rc=\$?   then read the log
⇒ Or measure the command alone:         cmd > /dev/null 2>&1; echo \$?
⇒ Or adopt the pipeline's first failure: set -o pipefail
⇒ Or index the pipeline explicitly:      \"\\\${PIPESTATUS[0]}\"
(Reading \`\$?\` after \`| grep -q\` is a real question and is NOT blocked — only pure display filters are.)"
  fi

  # Is THIS position a pipeline whose last stage is a display filter?
  pending_filter=""
  case "$seg" in
    *"|"*)
      last="${seg##*|}"
      last="$(printf '%s' "$last" | sed 's/^[[:space:]]*//')"
      word="${last%% *}"
      case "$DISPLAY_FILTERS" in
        *" $word "*) pending_filter="$word" ;;
      esac
      ;;
  esac
done <<< "$segments"

# ── ADVISORY PASS ─────────────────────────────────────────────────────────────────────────
# Everything else that pipes and reads `$?` still gets the warning it always got.
printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","additionalContext":"PIPE EXIT-CODE GUARD. This command PIPES and then reads `$?` — which is the status of the LAST stage of the pipeline, NOT the command you are testing. A failing command behind a successful filter reports SUCCESS. ⇒ THIS EXACT ERROR fired TWICE on 2026-08-26 and AGAIN on 2026-09-03: `node verify_checkpoints.cjs | sed; echo $?` printed exit=0 for three runs that ALL exit 1. It is also how two red vitest suites once announced themselves green. ⇒ FIX: measure the command alone (`cmd > /dev/null 2>&1; echo $?`), or capture first (`cmd; rc=$?`), or use `${PIPESTATUS[0]}`, or `set -o pipefail`. ⇒ The unambiguous shape (a pipeline ending in a pure display filter) is BLOCKED outright; this warning is for the cases where reading the filter status might be intentional. If you are not using $? as a pass/fail signal here, ignore this."}}\n'

exit 0
