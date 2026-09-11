#!/usr/bin/env bash
# GUARD: editing a source file from a python/node heredoc silently corrupts backslash escapes.
#
# THIS BLOCKS. FOUR OCCURRENCES IN ONE DAY, all the same shape:
#
#   python - <<'EOF'
#   s = s.replace(old, 'x.join(\'\\n\')')     <-- intended: a literal backslash-n in the FILE
#   io.open(p,'w').write(s)
#   EOF
#
# What lands in the file is a REAL NEWLINE, not the two characters `\` `n`. On 2026-09-11 this
# produced, in order: an unterminated JS string literal in delegate.mjs; a broken `join('` +
# newline in a vitest file; a sed pattern of `\\$` that meant "backslash then end-of-line"; and an
# unterminated string in task_manifests.test.ts. Every one typechecked as a failure only AFTER
# the write, and one of them was committed.
#
# WHY A HEREDOC AND NOT THE EDIT TOOL. There is no reason. The Edit tool passes strings through
# JSON, where `\\n` means backslash-n and nothing rewrites it. The heredoc route exists only
# because it is habit, and habit is what this guard interrupts.
#
# WHAT IS BLOCKED, NARROWLY: a heredoc fed to python/node whose body WRITES A FILE. Reading,
# printing, computing and one-off analysis are untouched — those cannot corrupt anything.
#
# THE ALTERNATIVES
#   Edit / Write tool            for any change to a tracked source file — escapes survive
#   node - <<'EOF' ... EOF       fine when it only READS and prints
#   a script file in the scratchpad, run with node/python — fine, escapes are written once
#
# Emits a PreToolUse deny. Exit 0 always (the decision is in the JSON, not the exit code).
set -uo pipefail

payload="$(cat)"
cmd="$(printf '%s' "$payload" | jq -r '.tool_input.command // empty' 2>/dev/null)"
[ -z "$cmd" ] && exit 0

deny() {
  printf '%s' "$1" | jq -Rs '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:.}}'
  exit 0
}

# Is there a heredoc into python or node at all?
printf '%s' "$cmd" | grep -qE '(python3?|node)[[:space:]]+-[[:space:]]*<<' || exit 0

# Does the body write a file? These are the write idioms that actually appear in this repo.
printf '%s' "$cmd" | grep -qE "(io\.)?open\([^)]*['\"]w['\"]|writeFileSync|\.write\(|appendFileSync|Path\([^)]*\)\.write_text" || exit 0

# Writing to the scratchpad or /tmp is not editing the repo — analysis output is fine.
target_is_scratch=0
printf '%s' "$cmd" | grep -qE "['\"](/tmp/|C:/Users/[^'\"]*Temp/|__dirname)" && target_is_scratch=1
[ "$target_is_scratch" -eq 1 ] && exit 0

deny "BLOCKED: writing a repo file from a python/node heredoc.

Backslash escapes do not survive this route. \`'\\\\n'\` intended as the two characters backslash-n lands in the file as a REAL NEWLINE, and the damage is only visible after the write.

FOUR times on 2026-09-11: an unterminated string literal in delegate.mjs; a broken \`join('\` in a vitest file; a sed pattern of \`\\\\\$\` that meant backslash-then-end-of-line instead of backslash-dollar; and an unterminated string in task_manifests.test.ts. One was committed before it was noticed.
⇒ Use the Edit or Write tool for any change to a source file. Strings pass through JSON there and escapes survive.
⇒ A heredoc that only READS and prints is fine — this only blocks writes.
⇒ Writing to /tmp or the scratchpad is fine, and is not blocked."
