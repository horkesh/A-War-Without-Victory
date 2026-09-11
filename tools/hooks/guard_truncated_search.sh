#!/usr/bin/env bash
# GUARD: a file-listing search piped into `head`/`tail` is an incomplete inventory presented as a
# complete one.
#
# THIS BLOCKS, and the reason it blocks is the whole argument for blocking anything.
#
# The rule was ALREADY WRITTEN DOWN. `docs/life_lessons.md` carries it as a starred entry:
#
#   "RE-VIOLATED: A TRUNCATED GREP IS AN INCOMPLETE SEARCH PRESENTED AS A COMPLETE ONE"
#   grep -rln "\.github/workflows" tests/ | head -5  was used to establish "the tests that guard
#   workflows". The test that pins workflow install counts was excluded by both the pattern and
#   the truncation. An exhaustive search found EIGHT such tests, not three. main went red.
#
# And on 2026-09-11, with that entry in the repo, `grep -rlE "date|Date" tests/ui/*.test.ts |
# head -5` was used to choose which files a task would read. The five it returned did not include
# the file the work was actually about. The dispatch then returned four perfectly verified quotes
# from a test concerning army HQ timing copy — faithful extraction from an inventory that was
# wrong before it started.
#
# Twice, from a written rule, by the same reader. That is the definition of a tier-5 rule failing,
# and the reason this is tier 1.
#
# WHY `-l` SPECIFICALLY. `grep -l` / `-rl` asks "WHICH FILES contain this" — an inventory question
# by construction. Truncating an inventory answers a different question than the one asked, and
# the answer looks identical. Content greps (`grep -r pattern`) are left alone: peeking at the
# first few matching LINES is ordinary and harmless.
#
# THE ALTERNATIVES, all cheap:
#   grep -rl pat dir/ | sort                 read all of it; it is usually a handful
#   grep -rl pat dir/ > /tmp/all.txt         keep the complete list, then head THAT file
#   grep -rlc pat dir/ | wc -l               if you only wanted the count
#   grep -r pat dir/ | head -5               fine — content, not an inventory
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

# Mention-safety WITHOUT destroying the thing being detected.
#
# `lib/command_segments.sh` splits on shell separators INCLUDING `|`, which is exactly the
# character this guard needs to see. Using it here made the guard silently never fire — the first
# version passed all seven allow-cases and all four deny-cases, which should have been the tell:
# a guard that denies nothing looks identical to a guard that is perfectly precise.
#
# So: same quote and heredoc stripping, split on `;` `&` and newline only. Pipes survive.
body="$(printf '%s' "$cmd" | awk -f "$HOOK_DIR/lib/strip_heredocs.awk" 2>/dev/null || printf '%s' "$cmd")"
statements="$(printf '%s' "$body" \
  | sed "s/'[^']*'/__SQ__/g" \
  | sed 's/"[^"]*"/__DQ__/g' \
  | sed 's/&&/\n/g' \
  | sed 's/;/\n/g' \
  | sed 's/[[:space:]][[:space:]]*/ /g' \
  | sed 's/^ //')"

while IFS= read -r seg; do
  [ -z "$seg" ] && continue

  # A pipeline stage listing FILES: grep with -l among its flags, before the first pipe.
  head_stage="${seg%%|*}"
  printf '%s' "$head_stage" | grep -qE '(^|[[:space:]])(grep|rg)([[:space:]]+-[A-Za-z]*l[A-Za-z]*)+([[:space:]]|$)' || continue

  # ...piped into a truncator.
  printf '%s' "$seg" | grep -qE '\|[[:space:]]*(head|tail)([[:space:]]|$)' || continue

  deny "BLOCKED: \`grep -l\` piped into \`head\`/\`tail\` — that is an INVENTORY, truncated.
\`-l\` asks WHICH FILES contain something. Cutting the list answers a different question than the one asked, and the short answer looks exactly like the complete one.
This rule was already written down in docs/life_lessons.md and violated anyway, twice: once establishing 'the tests that guard workflows' (the truncation hid the test that pinned install counts; an exhaustive search found EIGHT, not three, and main went red), and again on 2026-09-11 choosing which files a task would read (the five returned did not include the file the work was about, and the dispatch produced four perfectly verified quotes from the wrong test).
⇒ Read all of it:            grep -rl pat dir/ | sort
⇒ Or keep the full list:     grep -rl pat dir/ > /tmp/all.txt   then head that file
⇒ Or if you wanted a count:  grep -rl pat dir/ | wc -l
⇒ Content greps are fine:    grep -r pat dir/ | head -5   (lines, not an inventory)"
done <<< "$statements"

exit 0
