#!/usr/bin/env bash
# GUARD: a MULTI-LINE script passed to `node -e` does not run, and says nothing about it.
#
# THIS BLOCKS. It is the third tier-1 guard here.
#
# MEASURED 2026-09-11, three times in one session before it was diagnosed:
#
#   node -e "
#   console.log('PRINTED THIS');
#   " > out.txt 2>err.txt
#   -> exit 0.  out.txt EMPTY.  err.txt EMPTY.
#
# The single-line form of the same script prints correctly.
#
# WHERE THE FAULT IS NOT. An early version of this guard asserted "the program never runs", and
# its own test refuted that within minutes: handed to a plain `bash -c`, the identical multi-line
# script runs and prints normally. Node is fine. The failure belongs to the way THIS AGENT
# HARNESS delivers a multi-line command to the shell, and it has been reproduced only there.
# The guard is kept because the harness is where the planner actually works — but the claim is
# now the observation, not a theory about node. (The test that caught this is the reason the
# repo requires a guard to be proven by mutation rather than argued for.)
#
# WHY IT IS WORSE THAN A CRASH. Three times this session a multi-line `node -e` was used to
# inspect a file and returned nothing. Nothing is also what an empty result looks like. The
# conclusions drawn from that silence — "the JSON has no cases", "the parse failed" — would all
# have been false. And a `node -e` that WRITES a file writes nothing while reporting exit 0: the
# edit never happens, and the next step builds on a file that was never changed.
#
# Silence that is indistinguishable from a real answer is the failure mode this repo keeps
# paying for. Here it is free to eliminate, because the working alternatives are strictly better.
#
# THE ALTERNATIVES, ALL VERIFIED WORKING
#   node script.cjs                      # write it to a file and run it — best for anything real
#   node -e "console.log(x)"             # ONE line only; fine for a quick probe
#   node - <<'EOF' ... EOF               # heredoc on stdin; multi-line and it actually runs
#
# The heredoc form is what this repo already uses to edit package.json, and it works.
#
# Emits a PreToolUse deny. Exit 0 always (the decision is in the JSON, not the exit code).
set -uo pipefail

HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

payload="$(cat)"
cmd="$(printf '%s' "$payload" | jq -r '.tool_input.command // empty' 2>/dev/null)"
[ -z "$cmd" ] && exit 0

deny() {
  printf '%s' "$1" | jq -Rs '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:.}}'
  exit 0
}

# Heredoc bodies are prose, not commands: a ledger entry describing this rule must stay writable.
body="$(printf '%s' "$cmd" | awk -f "$HOOK_DIR/lib/strip_heredocs.awk" 2>/dev/null || printf '%s' "$cmd")"

offender="$(printf '%s' "$body" | awk -f "$HOOK_DIR/lib/find_multiline_eval.awk" 2>/dev/null)"

if [ -n "$offender" ]; then
  deny "BLOCKED: \`$offender\` with a script that spans multiple lines.
In THIS harness it produces nothing: exit 0, empty stdout, empty stderr, even when both are redirected to files. Measured three times on 2026-09-11. (Handed to a plain \`bash -c\` the same script runs fine, so this is the harness's command delivery, not the interpreter — but the harness is where you are running.)
That silence is indistinguishable from a real empty result, so any conclusion drawn from it is unsound; and if the script was meant to WRITE a file, nothing is written while the command reports success.
⇒ For anything real, put it in a file:      node /path/to/script.cjs
⇒ For a one-liner, keep it on ONE line:     node -e \"console.log(x)\"
⇒ For multi-line inline, use a heredoc:     node - <<'EOF' ... EOF   (this form DOES run)"
fi

exit 0
