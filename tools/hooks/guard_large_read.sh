#!/usr/bin/env bash
# GUARD: you are about to read a large file into the planner's context. There may be a cheaper way.
#
# ADVISORY, on purpose. This hook cannot know WHY you are reading the file, and the answer depends
# entirely on that:
#
#   reading FOR FACTS      — what does it say, which value is set, what failed, which is stale.
#                            Delegable. `npm run local:ask` answers it for a few hundred tokens
#                            instead of thousands, and verifies every quote before you see it.
#   reading TO CHANGE IT   — you are about to edit, and you need the real contents in context.
#                            NOT delegable. A summary is not a substitute, and delegating a read
#                            you will need anyway saves nothing while losing precision.
#
# A guard that blocked the second case would be actively harmful, so this one only tells you the
# option exists, with the command already written out.
#
# WHY IT EXISTS. The local executor was built, measured, documented — and then barely used, for
# the least interesting reason: getting a trustworthy answer took four steps (spec, schema,
# dispatch, verify) and reading the file took one. Written guidance to "prefer delegation" is a
# tier-5 rule, and this session is a long demonstration that tier-5 rules do not fire. So the
# reminder is placed where the decision actually happens, at the moment the tokens are about to
# be spent, and `local:ask` collapsed the four steps into one so that taking the advice is easy.
#
# Threshold: 40 KB, roughly 10,000 tokens. Below that the saving is not worth the round trip.
#
# Exit 0 always. Advisory only — emits PreToolUse additionalContext, never blocks.
set -uo pipefail

payload="$(cat)"
path="$(printf '%s' "$payload" | jq -r '.tool_input.file_path // empty' 2>/dev/null)"
[ -z "$path" ] && exit 0
[ -f "$path" ] || exit 0

# An offset/limit read is already bounded — the planner has scoped it deliberately.
offset="$(printf '%s' "$payload" | jq -r '.tool_input.offset // empty' 2>/dev/null)"
limit="$(printf '%s' "$payload" | jq -r '.tool_input.limit // empty' 2>/dev/null)"
[ -n "$offset" ] && exit 0
[ -n "$limit" ] && exit 0

bytes="$(wc -c < "$path" 2>/dev/null || echo 0)"
[ "$bytes" -lt 40960 ] && exit 0

tokens=$(( bytes / 4 ))

# Binary-ish files are not worth suggesting; the local model cannot read them either.
case "$path" in
  *.png|*.jpg|*.jpeg|*.gif|*.pdf|*.zip|*.exe|*.dll|*.node|*.ico|*.webp) exit 0 ;;
esac

esc="$(printf '%s' "$path" | sed 's/\\/\\\\/g; s/"/\\"/g')"

printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","additionalContext":"LARGE READ — ~%s tokens of planner budget. If you want FACTS OUT OF this file rather than its contents, the local model can extract them for a few hundred tokens and every quote is verified before you see it: npm run local:ask -- --read %s \\"your question\\" ⇒ Measured: a 12,462-token roadmap answered for ~250 tokens, 3/3 quotes verified. ⇒ IGNORE THIS if you are about to EDIT the file — you need the real contents in context, and a summary is not a substitute. Reading-for-facts is delegable; reading-to-change is not. ⇒ Also ignore it if you need exact line numbers, or if the answer depends on judgement rather than extraction."}}\n' "$tokens" "$esc"

exit 0
