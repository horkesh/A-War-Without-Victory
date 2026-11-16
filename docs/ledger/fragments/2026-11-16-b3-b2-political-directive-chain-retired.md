## 2026-11-16 — B3 + B2: the political-directive chain is retired; its undrainable officer events are drained

Batch B, items B3 and B2 (freeze cut, Fable consult 2 revision 2). Scope ruled B3-b + B2-b by game-designer and corps-army-commander, confirmed by the orchestrator.

**What the chain was.**
- `produce-political-directive` (B1) wrote a verb per faction. The verb locked once war exhaustion passed 500, and exhaustion never falls, so it said the same thing for ~182 weeks.
- `apply-army-directive-interpretation` (A3) translated that verb into per-corps roles (`army_corps_directives_by_faction`).
- The commander briefing's C1 overlay let those roles REPLACE the CampaignPlan role. That made the overlay a hard `campaign_role` gate on fresh commander plans (`plan.ts`), not the "~0.02 weight" the freeze cut assumed. On main's final save it pinned every ARBiH corps to `economy` and lifted every RS and HRHB corps above its plan role.
- A3 also pushed one `army_directive_pushback` officer event per faction per turn: 538 over 188 weeks, none ever acknowledged.
  - `override-army-directive` has no handler.
  - The UI adapter drops the type.
  - But the sim briefing counted them, so a player at autonomy 1+ saw "N order interpretations pending" grow every week, and "Review" opened an empty list.
- The player's own order tool (`stage-op-directive-order` → `inject-op-directive`) is a separate path and was never part of this chain.

**Change.**
- Removed both pipeline steps (`war_phases.ts`; step count 197 → 195) and deleted `political_directive_producer.ts` and its test.
- `commander/briefing.ts`: the overlay reader and its "Wave 6" economy exception are gone. A corps role now comes from the CampaignPlan alone (`army_hq_gathering` front priorities). The plan.ts hard block, the 0.05 alignment weight and the patron term now read the plan's own roles.
- `army_order_interpretation.ts` keeps its library functions for the claude_plays_vrs harness tools and `army_clashes.ts` (compliance score). `applyArmyDirectiveInterpretation` is marked as no longer in the pipeline.
- B2: `collect_briefing.ts` and `player_decision_manifest.ts` exclude `army_directive_pushback`, matching the adapter.
- Save migration v39 (CURRENT_SCHEMA_VERSION 38 → 39):
  - deletes `political_directives_by_faction`;
  - empties `army_corps_directives_by_faction` (the field stays);
  - drains unacknowledged `army_directive_pushback` events;
  - drops the staff's directive-reading traces (the pushback panel shows each faction's last trace with no age limit), keeping AUTONOMOUS_LAUNCH_PROPOSAL traces.
  - Other officer events are untouched.
- Startup snapshot rebuilt at schema 39; drift report regenerated.

**Tests.**
- New `tests/b3_directive_chain_retired.test.ts`: the v39 migration (slots, drain, traces, idempotence) and the briefing count (pushback not counted; a real `order_pushback` still is).
- Updated: step order, A3 T12, A4 T11, C1 T2/T3/T4b/T10, the schema pins (freeze guard, versioned steps, drift audit) and the B2 leader-data test (producer parts removed).
- The player's tool: `op_directive_injection`, `op_directive_staging` and `command_lever_consequences` pass.
- 16 files, 413 tests, plus the earlier 30-file slice; `tsc` 0.

**Proof (main 76e5fcabd).**
- Historical 188w, two runs: final_save `bb2ca04839f11d8b` both times (deterministic).
  - Compared with main's run, these are byte-identical: control_delta, weekly_report, formation_delta, activity_summary, operation_aars, watched_operations, destroyed_brigades, the brigade and displacement logs, end_report and replay manifest. CONTROL-IDENTICAL.
  - 709/709/708/681, guard intact, engine health PASS, 0 consistency failures.
  - The final save differs only in `pending_officer_events` (538 → 0), `army_co_decision_traces`, the two directive slots and `schema_version`. It is about 550 KB smaller.
  - Commander state is byte-identical, so the gate never changed a corps decision in a measured run.
- Hands-off emergent 188w with B0's source applied (uncommitted): control_delta byte-identical to the B0-only emergent run; 710/707/707/670; the same three emergent breaches (Farz 0/4, Seher t164, Petrovo t179), which belong to package P2.
- The baselines manifest needs a re-bless for the new state hash (`bb2ca04839f11d8b` on 76e5fcabd) at merge time, on top of whatever main it lands on.

**Follow-ups (register).**
- `political_leader_data` / `political_leaders` are still loaded into state at scenario start, but nothing reads them now (state-only; retiring them changes every save).
- The claude_plays_vrs directive bridge and three-commander harness now drive a chain the game no longer reads.
- The pushback panel's directive-objection source and its copy are now dead for new games (UI lane).

Evidence: `C:/Pyrrhic/AWWV-worktrees/_logs/batch-b-20261116/` (b3_*).
