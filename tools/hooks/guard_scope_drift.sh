#!/usr/bin/env bash
# GUARD: a scenario run is about to be spent. Is it on the lane this session opened with?
#
# WHY THIS EXISTS (2026-08-26). A session opened on RE Phase 0 — nine cheap items, none needing a
# scenario run. A legitimate §6 finding (the enclave guard asserted 1 of 9 cells and could not fail)
# was repaired, correctly. That surfaced a switched-off mechanic; the owner ruled it on; that
# produced four ahistorical villages — and the session then spent THREE 188-week runs and five
# failed mechanism hypotheses chasing them. **One of the nine Phase 0 items got done.**
#
# THE SHAPE THAT MAKES THIS HARD TO CATCH FROM INSIDE: there was no single bad decision. The repair
# was in scope. The flag was owner-ruled. Each hypothesis was the obvious next one. Nothing was
# clearly wrong at any step, which is exactly why nothing stopped. The owner had to ask "what
# happened to the original plan?" — invisible from inside, obvious from outside.
#
# So this hook does not judge. It fires ONLY on expensive, irreversible-ish work (scenario runs and
# threshold blessings), prints the declared lane, and asks one question. Answering "yes" costs a
# second; answering "no" is the whole point.
#
# DECLARE THE LANE:  echo "RE Phase 0 — items 0.0b/0.1/0.2/0.4/0.5/0.6" > .claude/current-lane.txt
# A finding that opens a new lane gets WRITTEN DOWN AND QUEUED, not followed. It will still be
# worth pursuing tomorrow; the plan item skipped today usually stays skipped.
#
# Exit 0 always. Advisory only — never blocks.
set -uo pipefail

payload="$(cat)"
cmd="$(printf '%s' "$payload" | jq -r '.tool_input.command // empty' 2>/dev/null)"
[ -z "$cmd" ] && exit 0

# Only expensive lane-consuming work. A cheap grep is not drift.
printf '%s' "$cmd" | grep -Eq 'sim:scenario:run|run_scenario_with_preflight|engine_health_gate\.cjs .*--update' || exit 0

repo_root="$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0
[ -z "$repo_root" ] && exit 0
lane_file="$repo_root/.claude/current-lane.txt"

if [ -f "$lane_file" ]; then
  lane="$(head -c 400 "$lane_file" | tr -d '\r' | tr '\n' ' ')"
else
  lane="(none declared — write one line to .claude/current-lane.txt)"
fi

esc="$(printf '%s' "$lane" | sed 's/\\/\\\\/g; s/"/\\"/g')"
printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","additionalContext":"SCOPE-DRIFT GUARD — a scenario run or threshold bless is about to be spent. DECLARED LANE: %s ⇒ Is THIS run on that lane? If yes, proceed and ignore this. If no, say so out loud before running: name the lane you have drifted into, and decide deliberately whether to switch or to queue it. ⇒ WHY: on 2026-08-26 a session opened on RE Phase 0 (nine items, ZERO runs required), repaired a genuine §6 blocker, followed the finding it surfaced, and spent THREE 188-week runs plus five failed hypotheses on a lane the plan never mentioned — completing 1 of 9 planned items. No single step was wrong, which is why nothing stopped it; the owner had to ask. ⇒ TELL: you are on mechanism-hypothesis N>2 for something the plan does not name. After TWO failed hypotheses, stop guessing and instrument the trigger — each guess costs a full run. ⇒ A finding that opens a new lane gets WRITTEN DOWN AND QUEUED, not followed."}}\n' "$esc"

exit 0
