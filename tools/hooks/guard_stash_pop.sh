#!/usr/bin/env bash
# GUARD: `git stash pop` with no ref pops stash@{0} — which is rarely yours.
#
# THIS BLOCKS. It is the first tier-1 guard in this repo; every other hook here is advisory.
# It blocks because advisory did not work: the warning for this exact failure was written INTO
# the stash message by the session that first caused it, and the next session read that message
# and did it anyway.
#
# WHY THIS EXISTS — twice, four months apart, same mistake:
#
#   2026-08-31: a stray `git stash pop` in lane/desktop-calibration-parity popped a foreign
#     stash. The recovering session re-stashed it with the message:
#     "RESTORED-BY-CLAUDE ... accidentally popped ... by a stray 'git stash pop' ...
#      Content is NOT mine; recover via git stash apply."
#
#   2026-09-10: `git stash -q -- <file>` on an UNMODIFIED file created nothing (a no-op), and the
#     unconditional `git stash pop` that followed popped that same stash@{0} — 22 entries deep,
#     someone else's work. It conflicted on src/sim/combat/paramilitary_sweep.ts and left UU.
#     Recovered only because a conflicted pop KEEPS the stash and the file still matched HEAD.
#     Had it applied cleanly, a foreign 38-line change would have merged in silently.
#
# THE RULE
#   - `git stash pop|apply|drop` MUST name a ref (`stash@{N}`). Naming it is the deliberate act.
#   - `git stash clear` is never allowed from a tool call — it destroys the whole stack.
#   - Creating a stash is allowed, but see the note above: a pathspec stash of an unmodified
#     file silently creates NOTHING, which is how the 2026-09-10 incident began.
#
# THE ALTERNATIVE, ALMOST ALWAYS
#   git checkout HEAD -- <file>      # discard changes to one file, no shared state touched
#   cp file /tmp/bak                 # throwaway experiment
#   git worktree add                 # parallel work
#
# Stash is SHARED MUTABLE STATE in a multi-agent repo. This one has 22 entries, most of them
# other people's, several explicitly labelled "not mine".
#
# ── MATCHING: COMMAND POSITION, NOT SUBSTRING ─────────────────────────────────────────────
#
# The first version matched a substring and denied `echo 'git stash pop is bad'`. Stripping
# quoted text fixed that case and looked sufficient — it was not. The guard's FIRST REAL USE
# blocked the very commit that documents it, because the ledger entry and the commit message
# discuss `git stash pop` in prose inside a heredoc, and a heredoc body is not quoted.
#
# So the test is no longer "does this text appear?" but "does this text appear where a command
# would run?" The command is split on shell separators (; & | newline ( ) { }) and each segment
# must START with `git stash <sub>`. Prose mentions are never at the start of a segment;
# real invocations always are.
#
# KNOWN, DELIBERATE GAP: backticks are not treated as separators, so `` `git stash pop` ``
# — legacy command substitution — is not caught. This repo's prose uses backticks constantly
# for inline code, and treating them as separators would re-break every doc commit. The modern
# `$(git stash pop)` IS caught, via the `(` separator. Blocking real work is worse than missing
# an archaic form nothing here uses.
#
# Emits a PreToolUse deny. Exit 0 always (the decision is in the JSON, not the exit code).
set -uo pipefail

payload="$(cat)"
cmd="$(printf '%s' "$payload" | jq -r '.tool_input.command // empty' 2>/dev/null)"
[ -z "$cmd" ] && exit 0

deny() {
  # jq -Rs handles the quoting/escaping so a reason containing quotes or newlines stays valid JSON.
  printf '%s' "$1" | jq -Rs '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:.}}'
  exit 0
}

# Reduce the command to one candidate-invocation per line:
#   1. quoted text out first (a mention inside quotes can never be an invocation)
#   2. every shell separator becomes a line break, so each line is one command position
#   3. collapse runs of spaces (`git   stash   pop`) and strip a leading indent or `{` group-opener
#
# BRACES ARE NOT SEPARATORS, deliberately: `{`/`}` would split `stash@{0}` in half and make the
# guard deny the very explicit-ref form it is trying to encourage. `{ cmd; }` grouping is still
# covered, because the `;` inside splits it and the leading `{ ` is stripped below.
segments="$(printf '%s' "$cmd" \
  | sed "s/'[^']*'/__SQ__/g" \
  | sed 's/"[^"]*"/__DQ__/g' \
  | sed 's/[;&|()]/\n/g' \
  | sed 's/[[:space:]][[:space:]]*/ /g' \
  | sed 's/^ //' \
  | sed 's/^{ *//')"

while IFS= read -r line; do
  case "$line" in
    "git stash clear"*)
      deny "BLOCKED: \`git stash clear\` destroys the entire stash stack.
This repo's stack holds other people's preserved work — several entries are explicitly labelled 'Content is NOT mine'.
There is no recovery. If you genuinely need to drop one entry, name it: git stash drop stash@{N}"
      ;;
  esac

  for sub in pop apply drop; do
    case "$line" in
      "git stash $sub"*)
        rest="${line#git stash $sub}"
        # Strip leading flags (-q, --quiet, --index) to find the first real argument.
        rest="$(printf '%s' "$rest" | sed -E 's/^( ?(-q|--quiet|--index))*//')"
        case "$rest" in
          " stash@{"*|"stash@{"*) : ;;   # explicit ref — deliberate, allow
          *)
            deny "BLOCKED: \`git stash $sub\` with no ref operates on stash@{0}, which is rarely yours.
This repo's stash stack is 22 entries deep and holds other agents' preserved work; the top entry is currently labelled 'RESTORED-BY-CLAUDE ... Content is NOT mine'.
This exact mistake has been made TWICE (2026-08-31 and 2026-09-10). The second time, the warning was written in the stash message itself and was read and ignored.
⇒ If you created a stash and want it back, name it: git stash $sub stash@{N} — verify with 'git stash list' first.
⇒ To discard changes to a file, use: git checkout HEAD -- <file>
⇒ For a throwaway experiment, copy the file aside or use git worktree. Stash is shared mutable state."
            ;;
        esac
        ;;
    esac
  done
done <<< "$segments"

exit 0
