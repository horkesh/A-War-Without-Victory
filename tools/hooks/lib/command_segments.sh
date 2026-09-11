#!/usr/bin/env bash
# Split a shell command into CANDIDATE COMMAND POSITIONS, one per line.
#
# WHY THIS IS SHARED. Three hooks in this repo independently needed the same question answered —
# "is this text a command, or is it prose ABOUT a command?" — and two of them got it wrong in the
# same way. `guard_stash_pop` denied `echo 'git stash pop is dangerous'` on its first day.
# `guard_scope_drift` fired on `echo 'npm run sim:scenario:run:188w is expensive'`, and the
# orchestrator hook chained off it, demanding a scenario analysis for a run that never happened.
#
# A guard that fires on a mention of itself is a guard that gets switched off, so the rule lives
# in one place now instead of being re-derived, wrongly, per hook.
#
# THE RULE: a real invocation begins a segment; a prose mention never does. So:
#   1. heredoc BODIES are removed      — ledger entries and commit messages quote these rules
#   2. quoted text is blanked          — `echo 'git stash pop'` is data, not an invocation
#   3. the command is split on shell separators   ; & | ( )
#   4. runs of spaces collapse, and a leading `{` group-opener is stripped
#
# BRACES ARE NOT SEPARATORS, deliberately: `{`/`}` would split `stash@{0}` in half and make a
# guard deny the very explicit-ref form it exists to encourage. `{ cmd; }` grouping is still
# covered, because the `;` inside splits it and the leading `{ ` is stripped.
#
# KNOWN, DELIBERATE GAP: backticks are not separators, so legacy `` `cmd` `` substitution is not
# seen. This repo's prose uses backticks constantly for inline code, and treating them as
# separators would re-break every doc commit. Modern `$(cmd)` IS caught, via the `(` separator.
#
# Usage:
#   source "$HOOK_DIR/lib/command_segments.sh"
#   while IFS= read -r seg; do ... done <<< "$(command_segments "$cmd" "$HOOK_DIR")"

command_segments() {
  local cmd="$1"
  local hook_dir="${2:-}"
  local body="$cmd"

  if [ -n "$hook_dir" ] && [ -f "$hook_dir/lib/strip_heredocs.awk" ]; then
    body="$(printf '%s' "$cmd" | awk -f "$hook_dir/lib/strip_heredocs.awk" 2>/dev/null || printf '%s' "$cmd")"
  fi

  printf '%s' "$body" \
    | sed "s/'[^']*'/__SQ__/g" \
    | sed 's/"[^"]*"/__DQ__/g' \
    | sed 's/[;&|()]/\n/g' \
    | sed 's/[[:space:]][[:space:]]*/ /g' \
    | sed 's/^ //' \
    | sed 's/^{ *//'
}
