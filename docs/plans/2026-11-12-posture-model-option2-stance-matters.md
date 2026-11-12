# Posture model option 2: corps and OG stance matters for the president

**Status.** Active plan, 2026-11-12, revision 2 (panel round-1 conditions integrated). Owner chose option 2 on 2026-11-12 (review `docs/40_reports/proposals/20261111_PLAYER_SURFACE_AND_AGENCY_REVIEW.md` §2). Implementation branch `claude/stance-proposals-a2b85d`, stacked on `claude/truthful-command` (step 1, unmerged; merge that first) so the step-1 copy is corrected in the same change. Panel record: `docs/40_reports/governance/20261112_POSTURE_MODEL_OPTION2_PANEL.md` (covers the FORAWWV §XII amendment by name).

## Outcome

At autonomy level 2 (the default, shown as "Delegated"), when a player-army corps commander changes the corps stance, or an Operational Group (standing sector) moves into or out of Active Defense, the commander acts and reports. The change reaches the president as a Command Surface matter with the commander's reasoning and a staff assessment. The president can **Confirm**, **Countermand** or **Constrain** it before the next week. Silence is consent: the matter lapses at its deadline as "stood". This is the stance counterpart of the existing Stop-op lever at autonomy 2 (Rulebook line 13, "Levers and autonomy"): review inside command-through-generals, not a sixth lever. Overruling costs the commander's goodwill and leaves a record.

## Non-goals

- Brigade posture is never put to the president. Commanders derive it from corps and OG stance (`sector_stance_orders.ts` mapping).
- Levels 0, 1 and 3 unchanged. Levels 0-1 keep the existing `SET_STANCE:` / `generate-player-stance-recommendations` path; level 3 has no matters (stances stand without review).
- No bot, headless or calibration behaviour change. No new stance values, no new combat lever, no attack path.
- The president never sets a stance. Countermand keeps the previous stance; Constrain only narrows.
- No named-person hardcode. RS resistance is a bounded delay computed from data; no refusal or veto (that belongs to the deferred post-1.0 institutional-veto design).
- A delay never reduces, transfers or explains away condemnation, war-crimes attribution or the Pyrrhic grade. Receipts record timing only.
- Out of scope (noted, separate ticket): `applyCommanderOutput` overwrites sectors with `stance_source === 'player'`.

## Timing contract (why silence changes nothing)

The bot pass `generate-bot-corps-orders` (`bot_corps_ai.ts` `generateAllCorpsOrders`) sets every staff-controlled corps stance and OG stance each turn, the player's army included at level 2 (`staff_control.ts`). Matters are raised **after** that pass in turn T and describe a change already made under delegation. The president answers in the planning window before turn T+1. In T+1 the new step `resolve-stance-matters` runs **after** `apply-autonomy-transition` and **before** `generate-bot-corps-orders`:

- unanswered → receipt `stood`; nothing else changes;
- Confirm → receipt `confirmed`; no simulation effect;
- Countermand / Constrain → a presidential **stance hold** for the corps or OG, effective from T+1 (or later under Main Staff delay) for `HOLD_TURNS = 4` turns counted from the effective-from turn.

Nothing defers or replays a commander's decision, so a run with no answers follows exactly main's stance path.

**Gates.** Generation and holds run only when `meta.player_faction` is set, `meta.headless_scenario_auto_control !== true`, phase is `war`, and `meta.autonomy_level === 2`. Resolution keeps the player/auto-control gate but **not** the level gate: whatever is open resolves; if the level is no longer 2, open matters lapse as `stood` and active holds end (`hold_lapsed`, reason `autonomy_changed`). Headless sets `headless_scenario_auto_control = true` unconditionally (`scenario_runner.ts:1691`), so it never reaches this code: byte-identical by construction. Live harnesses at level 2 (`tools/ai_play/desktop_calibration_compare.ts --autonomy-level production`, `territory_sweep.ts`, `parity_probe.ts`, `president_playthrough.ts`) do generate matters; none answers them (they only touch `pending_proposal_reviews`; the new family is advisory), so their territory is unchanged, but their full-state hashes now include the matter records.

## Mechanics

**Baselines (persisted, live only).** `military.stance_matter_state.last_corps_stance` holds each player corps' stance at the end of the previous turn's pass; `last_og` holds each OG's stance with a fingerprint. A pre-pass snapshot is not used: player-authored and op-directive injections write `offensive` earlier in the turn (`war_phases.ts:436`, `:974`).

**OG identity.** Sector ids are positional and renumbered on rebuild (`sector:${corpsId}:${i}`). An OG is identified by its corps plus a fingerprint: the sorted FNV-1a hashes of its front `edge_ids`. A current sector matches the recorded OG of the same corps with the highest Jaccard overlap, at least 0.5, ties broken by `strictCompare`. Unmatched → no matter; a hold whose OG cannot be matched lapses (`og_dissolved`). Sectors with `stance_source === 'player'` are excluded.

**Sources.** After the faction's pass (generation inside the `generate-bot-corps-orders` step, for the player faction only):
- *Corps matter:* final stance ≠ `last_corps_stance`, no `player_ordered_stance`, and no player-authored or president-requested operation injected for that corps this turn (the president caused it himself).
- *OG matter:* a matched OG whose stance moved into or out of `active_defense`.
- *Reason code from the final writer:* corridor breach → `opportunity`; bilateral-war reassignment → `alliance_front`; HVO/ARBiH mobilisation → `alliance_front`; otherwise the formula trace (read-only out-parameter of `generateCorpsStanceOrders`): `reorganize_critical`, `threat_high`, `readiness_low`, `opportunity`, `doctrine`, `campaign_plan`, `army_directive`, `patron_ceiling`. OG: into Active Defense → `enemy_massing` (the commander loop's only path there, `decide.ts`); out of it → `situation_eased`.
- Averages over zero brigades are not computed (no NaN in saves).

**Volume.** At most `MAX_STANCE_MATTERS_PER_TURN = 3` new matters per turn. A corps (with its OGs) gets no new matter for `STANCE_MATTER_COOLDOWN_TURNS = 4` turns after its last one, nor while it is held. Priority: corps before OG; larger stance-rank change first; then `strictCompare(id)`. Changes over the cap, in cooldown or under a hold get a one-line receipt `not_put` (reason `cap` / `cooldown` / `held`) with no answer buttons. Generation upserts by id and drops same-turn ids first (re-run safe).

**Matter content (structured, copy built in the UI, EN and BCS).** id, scope, corps, OG fingerprint, from/to, serving commander, reason, staff figures (cohesion, strength, threat, rounded), HRHB patron ceiling, deadline, constraint options that actually narrow the choice, whether countermand is allowed, and the countermand cost preview (override record, Main Staff delay, patron shift).

**Answers.**
- *Confirm:* free; recorded.
- *Countermand:* corps keeps its previous stance; OG keeps its previous stance.
- *Constrain:* corps `ceiling_balanced` ("No general offensive, local attacks only") or `ceiling_defensive` ("Hold the line, no new offensives"); OG `no_active_defense` ("No active patrolling or local counterattacks") or `hold_no_counterattacks` ("Hold ground, no counterattacks": fortify, defend or screening). OG sets are intersected with `CORPS_STANCE_ALLOWED_SECTOR_STANCES` for the corps' current stance; an empty intersection resolves to `defend`. Only options that narrow the commander's choice are offered; the Constrain choice is hidden when none do.
- *Overrule window (freeze-exploit fix).* After a Countermand or Constrain of a corps (or one of its OGs), that commander's next matters within `COWED_OVERRIDE_WINDOW = 8` turns offer Confirm only, with the reason shown. So one overrule per commander per eight weeks, a hold of four: the commander's own choice runs at least half the time, and stance matters alone can never reach the cowed threshold (two overrides in eight turns). A repeat overrule is never better for the president than a confirm.

**Holds (enforcement).** One helper set in `stance_matters.ts`, applied only when a hold exists:
- Corps: clamp `cmd.stance` right after `generateCorpsStanceOrders`, again after `attemptCorridorBreach` (before `evaluateSectorStances` reads it), and once more at the end of the faction pass, so the hold is the last writer. `attemptCorridorBreach` launches nothing for a corps held below offensive. `getEffectiveCorpsStance` (`corps_command.ts`) is capped by an active hold so combat uses the held stance under an army general offensive. A hold never overrides `reorganize`, and the HRHB patron ceiling caps the result (Zagreb wins).
- OG: clamp once after the commander loop (the final sector-stance writer; `buildSectorStances` resets every OG), before the ghost-sector prune. An OG hosting a live CorpsOperation in planning or execution is not clamped that turn (the operation wins).
- Running operations continue: a hold blocks new offensives only. Stopping one stays with Stop-op.
- The president's own operation order (`inject-op-directive`, `inject-authored-operations`) clears that corps' hold, recorded as `hold_lapsed` / `presidential_operation`.
- Holds and stale `last_og` entries are pruned when expired; cooldown entries pruned when past.

**Overrule cost.** Countermand and Constrain call the existing `recordPresidentialOverride(state, corpsId, turn)` (`override_count`, `last_override_turn`, `recent_overrides`; officer-resentment receipts read them). Confirm is free.

**Faction asymmetry (one mechanism, data only).**
- *Main Staff delay.* `resistance = COMMAND_FRICTION_FACTION_WEIGHT[faction] × stubbornness` of the army commander serving now (`getArmyCommander` from live state; stubbornness from its officer data, written from `army_co_roster.json` by A4). `≥ 4.0` → effective one turn late; `≥ 5.0` → two turns; never more, never a refusal. Today: RS 1.0 × 5 = 5.0 → two weeks; RBiH 0.5 × 4 or 2 → followed; HRHB 0.25 × 2-3 → followed. Copy is institutional: "Main Staff: order takes effect in 2 weeks. Current stance holds until then."
- *Zagreb.* For an HRHB corps inside an active patron directive's scope (`getActivePatronDirective(faction, turn, state, corpsId)`, dated phases), the hold is capped by the directive ceiling, the matter shows it ("Zagreb's directive limits this corps to …"), and an overrule shifts `patron_confidence` by `PATRON_OVERRIDE_FLOOR` (HRHB −2) via `applyDimensionShift`.
- RBiH: followed as given.
- A later 1994-95 RS weighting would be a separate measured data change, not this PR. Data note: Delić's week-60 tenure start is about a week before 8 June 1993; harmless (under threshold).

**Records.** `meta.stance_matter_history` receipts (bounded to 200, sorted by resolved turn then id) feed Army HQ Records (decision-consequence ledger) and the Turn Aftermath, so `stood` reads as the president's choice. An active hold shows on the sector panel and the corps panel ("Held by order of the President, N weeks left"). New advisory manifest family `stance_matter` (never blocks advance).

## State (optional, save-compatible)

`game_state.ts`: `StanceMatter`, `StanceMatterReceipt`, `PresidentialStanceHold`, `StanceMatterState`; `meta.stance_matters?`, `meta.stance_matter_history?`, `military.stance_matter_state?` (classified optional-persisted). Arrays sorted at write time with `strictCompare`; Record iteration through sorted keys. Shape checks added to `validateGameState.ts`. Absent in old saves and headless runs; no migration.

## Desktop IPC

`resolve-stance-matter {matterId, answer, constraint?}` records the answer only (faction, open, deadline, allowed option, overrule window); refuses with `turn_in_progress` while a turn is resolving (pause-before-combat working state, `desktop_sim.ts:895-909`). Projection in `player_visible_state.cjs`: player-faction matters, history and holds.

## Files

| Task | Files |
|---|---|
| Sim core | new `src/sim/combat/stance_matters.ts`; `bot_corps_stance.ts` (read-only trace out-param); `bot_corps_ai.ts` (clamp points, OG clamp, generation hook); `bot_corps_corridor.ts` (no breach under hold); `corps_command.ts` (`getEffectiveCorpsStance` cap); `war_phases.ts` (`resolve-stance-matters` step; hold clear on presidential ops) |
| State | `game_state.ts`, `validateGameState.ts`, `player_decision_manifest.ts`, `tools/diagnostics/game_state_field_classification.ts` if needed, `tools/diagnostics/presidential_command_convergence.ts` family list |
| Desktop | `electron-main.cjs`, `preload.cjs`, `autonomy_ipc_contract.cjs`, `player_visible_state.cjs` |
| UI | `GameStateAdapter.ts`, `types.ts`, `presidentialDecisionRoom.ts` (lever `stance_matter`), new `StanceMatterActions.tsx` used by `DirectiveCard.tsx` and the new `SectorStanceStep.tsx` (mounted by one line in `CorpsFrontPanel.tsx`, which the map-rail lane is restyling; failure copy `corpsFront.stageStanceFailed`), `decisionConsequenceLedger.ts`, `useIPC.ts` |
| Dead hooks | retire `stagePostureOrderAction`, `stageAssignBrigadeToSectorAction`, `assignBrigadeToSectorOverrideAction` if unreferenced |
| Copy | matter, receipt and hold copy; step-1 `autonomy.level.*.desc` and `formationDetail.command.autonomyHint` (EN, BCS); sweep both for wrong-noun copy |
| Canon | FORAWWV §XII.1 "Player command model"; Engine Invariants new §14.10c; Phase Specifications pipeline additions; Rulebook line 13, §5.5, §6.3 line 279, §16.3, §17.1, §17.3; Systems Manual §6.1, §6.4, §6.5, §6.7; `PLAYER_TURN_GUIDE.md` rows and locked-model note; Game Bible line 75; `DETERMINISM_TEST_MATRIX.md` row |

## Checks

1. `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` exit 0.
2. `tests/sim/stance_matters.test.ts`: gate; corps and OG generation from persisted baselines; no matter for president-caused changes; cap, cooldown and `not_put` receipts; deadline lapse = stood with no stance change; Confirm no effect; Countermand holds for 4 turns from effective-from; Constrain ceilings and OG intersection; reorganize not overridden; patron re-cap and shift; RS two-turn delay from officer data, RBiH none; overrule window (second overrule refused; repeat never better than confirm); hold is last writer against corridor breach; `getEffectiveCorpsStance` capped; presidential op clears hold; OG fingerprint matching and lapse; level change lapses; idempotent re-run; save round-trip; determinism (shuffled input, same output).
3. Multi-turn strip-and-compare vitest: gated path with no answers equals the gated-off path after deleting the three new fields, with a non-zero matter count.
4. Affected UI tests, field-classification test, manifest/convergence tests; full `npm run test:vitest` with Git Bash on PATH, reading its exit status.
5. Headless `npm run sim:scenario:run:40w` on the stack base (`claude/truthful-command` HEAD) and on this branch: equal `final_state_hash` and equal sha256 of `final_save.json`, `weekly_report.jsonl`, `control_delta.json`, `formation_delta.json`, `activity_summary.json`, `watched_operations.json`, `end_report.md`, `run_summary.json` (the 40w run has no per-week state hash). Live: `npx tsx tools/ai_play/desktop_calibration_compare.ts --autonomy-level production --event-policy bot_equivalent` for one faction, 20+ turns, base and branch, with `--final-save-dir`: equal control counts and equal stripped-state sha256, matters > 0 on the branch. Evidence under `F:/AWWV-coordination/surface_steps/stance/inertness/`.
6. Renders of the matter and the sector stance step at 2293×960 and 1280×720 under `F:/AWWV-coordination/surface_steps/stance/`.
7. Before merge (owner schedules, not run here): 188-week validation and `npm run test:baselines`.

**Wait gate.** Until `F:/AWWV-coordination/crash_recovery_20261112/shake_status.txt` contains `hrhb03_exit`: reading, design, plan, panels and code editing only; checks 1 and 3-6 wait.

## Completion

Unanimous panel record, canon amendment in the same change, implementation, inertness proof, gates green, PROJECT_LEDGER entry, branch pushed (no PR, no merge), short report listing what is left for the owner.
