#!/usr/bin/env bash
# GUARD: a lookup narrow enough to manufacture a false absence.
#
# WHY THIS EXISTS (2026-08-26, RE engine-integrity panel):
# The orchestrator searched for the literal `readiness = 'active'`, found two hits,
# and concluded "nothing in the war pipeline restores readiness". The real exit was
# `formation.readiness = deriveReadinessState(formation)` — an assignment of a
# FUNCTION RESULT, which contains no literal. That false absence was promoted to a
# plan prerequisite and cost a full seat-measurement round to falsify (232
# counter-examples).
#
# napkin 0m already said it: "before recording an absence, name WHICH lookup you ran
# and what it could not have seen." Every example in 0m is a HISTORICAL-source lookup,
# so it did not fire on a code grep. This hook fires on the code grep.
#
# Fires when a search pattern looks for a field assigned a LITERAL value:
#   foo = 'bar'   foo = "bar"   foo: 'bar'   foo === 'bar'
# Such a pattern cannot match an assignment of a computed value.
#
# Exit 0 always. Emits PostToolUse additionalContext only when the pattern matches.
set -uo pipefail

payload="$(cat)"

pattern="$(printf '%s' "$payload" | jq -r '.tool_input.pattern // empty' 2>/dev/null)"
command_str="$(printf '%s' "$payload" | jq -r '.tool_input.command // empty' 2>/dev/null)"

# For Bash calls, only consider the text if it actually invoked a search tool.
if [ -n "$command_str" ]; then
  if printf '%s' "$command_str" | grep -qE '(^|[|;&[:space:]])(grep|rg|egrep|git[[:space:]]+grep)([[:space:]]|$)'; then
    haystack="$command_str"
  else
    haystack=""
  fi
else
  haystack="$pattern"
fi

[ -z "$haystack" ] && exit 0

# `=` or `:` followed by optional space and a quote character.
# Quote chars are matched via a bracket expression assembled to dodge shell quoting.
SQ="'"
DQ='"'
if printf '%s' "$haystack" | grep -qE "(=|:)[[:space:]]*[${SQ}${DQ}]"; then
  cat <<'JSON'
{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"NARROW-LOOKUP GUARD (napkin 0m). Your search pattern looks for a field assigned a LITERAL value. That pattern CANNOT match an assignment of a computed value — `x = deriveState(y)` contains no literal, and a per-turn recompute is exactly the shape that gets missed. THIS EXACT MISS happened on 2026-08-26: searching `readiness = 'active'` returned 2 hits and produced the false conclusion 'nothing restores readiness'; the real exit was `formation.readiness = deriveReadinessState(formation)` at formation_lifecycle.ts:364, and the resulting wrong hypothesis became a plan prerequisite before 232 counter-examples killed it. ⇒ BEFORE concluding ANYTHING is absent: re-run against the bare field name (`<field> =`, `<field>:`) and READ EVERY HIT, or run `node tools/hooks/whowrites.mjs <field>` which does the exhaustive form for you and names any per-turn recompute that owns the field. ⇒ If you are NOT about to claim an absence, ignore this."}}
JSON
fi

exit 0
