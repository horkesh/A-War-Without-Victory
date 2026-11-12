# Posture model option 2: corps and OG stance matters for the president

**Status.** Active plan, 2026-11-12. Owner chose option 2 on 2026-11-12 (review `docs/40_reports/proposals/20261111_PLAYER_SURFACE_AND_AGENCY_REVIEW.md` §2, on `claude/truthful-command`). Implementation branch `claude/stance-proposals-a2b85d`, stacked on `claude/truthful-command` (step 1, unmerged) so the step-1 copy can be corrected in the same change. Panel record: `docs/40_reports/governance/20261112_POSTURE_MODEL_OPTION2_PANEL.md`.

## Outcome

At the default autonomy level (2, "Delegated"), when a player-army corps commander changes the corps stance, or an Operational Group (standing sector) moves into or out of local attacks, the change reaches the president as a Command Surface matter with the commander's reasoning and a staff assessment. The president can approve, decline, or amend with a constraint. Silence is consent: an unanswered matter lapses at its deadline and the commander's choice stands. Overruling a commander has a cost, and every answer leaves a record.

## Non-goals

- Brigade posture is never put to the president (owner rule 6). It stays derived from corps and OG stance by the commanders.
- No change to autonomy levels 0, 1 or 3. The level-1 `SET_STANCE:` proposal path is untouched.
- No change to bot, headless or calibration behaviour (rule 2). No new combat lever, no new stance values.
- No direct stance setting by the president at any echelon. "Amend" only narrows what the commander chose.
- No named-person hardcode. RS Main Staff resistance comes from data (the faction friction weight and the serving army CO's roster stubbornness), the shape the deferred institutional-veto idea asks for.

## The timing contract (why silence changes nothing)

The bot pass `generate-bot-corps-orders` (`bot_corps_ai.ts` `generateAllCorpsOrders`) sets every staff-controlled corps stance (`generateCorpsStanceOrders`) and OG stance (`evaluateSectorStances`, then the commander loop) on every turn, the player's army included at level 2. The matter is raised **after** that pass in turn T and describes a change the commander has already made under delegation. The president answers during the planning window before turn T+1. In turn T+1 the new step `resolve-stance-matters` runs **before** `generate-bot-corps-orders`:

- unanswered → the matter lapses as "stood"; nothing in the simulation is touched except the matter record;
- approved → recorded; no simulation effect;
- declined or amended → a presidential **stance hold** is written for the corps (or OG), and the bot pass applies it from T+1 for `HOLD_TURNS` turns.

Because nothing defers or replays the commander's decision, a run with no answers takes exactly the same stance path as main. All new code that writes state is gated on a live president: `meta.player_faction` set, `meta.headless_scenario_auto_control !== true`, `meta.autonomy_level === 2`, phase `war`. Headless and calibration runs never reach it, so their state hashes are unchanged by construction; a live run with no answers differs from main only by the matter records themselves.

## Mechanics

**Sources (one pass, deterministic).** Inside the `generate-bot-corps-orders` step, for the player faction only and only when gated on: snapshot each player corps' `stance` before `generateAllCorpsOrders`, collect a read-only decision trace from `generateCorpsStanceOrders` (optional out-parameter; no state write), and after the pass compare:
- **Corps matter:** corps stance after ≠ before, and the corps has no `player_ordered_stance` (level-1 legacy).
- **OG matter:** a standing sector whose stance moved into `active_defense` (local attacks: its brigades take the attack posture) or out of it, compared with the last stance recorded for that sector in `stance_matter_state.last_sector_stance` (sectors are rebuilt each turn, so the sector record cannot hold history). The map is written only on the gated path.

**Volume cap (rule 5).** At most `MAX_STANCE_MATTERS_PER_TURN = 3` new matters per turn. A corps (with all its OGs) gets no new matter for `STANCE_MATTER_COOLDOWN_TURNS = 4` turns after its last one, whatever the answer. Priority: corps matters before OG matters; then larger stance-rank change first; then `strictCompare` on id. Changes over the cap are not put to the president and simply stand (as today).

**Matter content.** `id = STANCE_<turn>_<corpsId>` or `STANCE_<turn>_<sectorId>`; scope, corps id, sector id, from/to stance, commander id (serving corps CO), reason code from the trace (`threat_high`, `readiness_low`, `reorganize_critical`, `opportunity`, `doctrine`, `campaign_plan`, `army_directive`, `alliance_front`, `patron_ceiling`, `other`), the trace figures (average cohesion, average strength, sector threat), the deadline turn (T+1), and, for HRHB corps under an active patron directive, the ceiling. Player-facing text is built in the UI from these fields (EN and BCS), never stored prose.

**Answers.** `approve`, `decline`, `amend:<constraint>`. The amend set is drawn from the existing stance vocabulary, as ceilings (`STANCE_RANK` in `bot_corps_stance.ts`, `CORPS_STANCE_ALLOWED_SECTOR_STANCES` in `combat_math.ts`):
- corps: `ceiling_balanced` — "Local attacks only, no general offensive" (cap at balanced); `ceiling_defensive` — "Hold the line, no offensives" (cap at defensive). Offered only when below the commander's chosen stance.
- OG: `no_local_attacks` — cap at `elastic`; `hold_no_counterattacks` — only `fortify`, `defend`, `screening`. Offered only when they narrow the chosen stance.
Decline = keep the previous stance (corps) or previous OG stance for the hold. A hold never overrides `reorganize` (critical condition), mirrors the AI-override rule, and is re-capped by the HRHB patron ceiling (Zagreb wins). Holds expire after `HOLD_TURNS = 4`; an OG hold lapses early if its sector disappears in a rebuild (recorded).

**Overrule cost (rule 3).** Decline or amend calls the existing `recordPresidentialOverride(state, corpsId, turn)` (`order_interpretation.ts`): `override_count`, `last_override_turn`, `recent_overrides`, and the existing cowed threshold. The existing officer-resentment receipts already read these. Approve costs nothing.

**Faction asymmetry (rule 4), one mechanism, data only.**
- *Main Staff resistance.* On an overrule, `resistance = COMMAND_FRICTION_FACTION_WEIGHT[faction] × stubbornness` of the army CO serving at that turn (`data/scenarios/army_co_roster.json` schedule). If `resistance ≥ MAIN_STAFF_RESIST_THRESHOLD (4.0)` the hold starts `1` turn late (`2` if ≥ 5.0): the commander's choice stands meanwhile and the record says the Main Staff slowed the order. With today's data: RS (1.0 × Mladić 5) → two-week delay; RBiH (0.5 × Halilović 4 / Delić 2) → followed; HRHB (0.25 × …) → followed.
- *Zagreb pressure.* For an HRHB corps inside an active patron directive's scope (`getActivePatronDirective(faction, turn, state, corpsId)`), the hold is capped by the patron ceiling, the matter shows that ceiling, and an overrule shifts `patron_confidence` by the existing `PATRON_OVERRIDE_FLOOR` (HRHB −2) through `applyDimensionShift`.
- RBiH: approvals and overrules are followed as given.

**Records (authorship).** Each resolved matter is appended to `meta.stance_matter_history` (receipt: id, turn, resolved turn, answer or `stood`, effective-from turn, delay reason, cost applied). The decision-consequence ledger (Army HQ Records) and the Turn Aftermath read it. A new advisory family `stance_matter` in `player_decision_manifest.ts` (gate policy `advisory`, never blocks advance).

## State (all optional, save-compatible)

`src/state/game_state.ts`:
- `meta.stance_matters?: StanceMatter[]` — open and just-answered matters (pending until `resolve-stance-matters`).
- `meta.stance_matter_history?: StanceMatterReceipt[]` — bounded to the last 200 receipts, sorted by (resolved turn, id).
- `military.stance_matter_state?: { cooldown_until_by_corps: Record<string, number>; last_sector_stance: Record<string, SectorStance>; holds: PresidentialStanceHold[] }`.
Absent in old saves and every headless run; no migration needed. Validation in `validateGameState.ts` accepts absence; serialization sorts keys and arrays (`strictCompare`).

## Files

| Task | Files |
|---|---|
| Sim core | new `src/sim/combat/stance_matters.ts` (gate, generation, cap/cooldown, resolution, holds, asymmetry); `bot_corps_stance.ts` (optional trace out-param; apply corps hold before `cmd.stance = stance`, then patron re-cap); `bot_corps_directives.ts` `evaluateSectorStances` and `commander_loop.ts` `applyCommanderOutput` (apply OG hold); `bot_corps_ai.ts` (pass trace through) |
| Pipeline | `src/sim/turn_phases/war_phases.ts`: new step `resolve-stance-matters` before `generate-bot-corps-orders`; generation inside `generate-bot-corps-orders` after the faction loop; `tests/war_phase_step_order.test.ts` count |
| State | `game_state.ts`, `validateGameState.ts`, `player_decision_manifest.ts` |
| Desktop | `electron-main.cjs` IPC `resolve-stance-matter` (records the answer only; validates faction, open, allowed amend); `preload.cjs`; `autonomy_ipc_contract.cjs`; `player_visible_state.cjs` (project player-faction matters, history, holds) |
| UI | `GameStateAdapter.ts` + `types.ts` (stance matter view); `presidentialDecisionRoom.ts` card builder (lever `stance_matter`); `DirectiveCard.tsx` branch (Approve / Decline / Amend choices); `CorpsFrontPanel.tsx` stance step (shows the OG stance, who set it, an open matter with the same three answers, an active hold; failure shows `corpsFront.stageStanceFailed`); `decisionConsequenceLedger.ts` receipts; `useIPC.ts` |
| Dead hooks | retire `stagePostureOrderAction`, `stageAssignBrigadeToSectorAction`, `assignBrigadeToSectorOverrideAction` in `orderActions.ts` if unreferenced (verify first; IPC `stageAttackOrder/MoveOrder/DeployOrder/UndeployOrder` stay as recorded "correctly unused" unless they are also unreferenced and have no bot use) |
| Copy | `messages.en.ts`, `messages.bcs.ts`: matter copy; `autonomy.level.*.desc` and `formationDetail.command.autonomyHint` (step 1) say that at the default level stance changes come to the president as matters and go ahead if unanswered; Assisted additionally holds operations |
| Canon | Rulebook §5.5, §16.3, §17.1 item 2, §17.3 item 2; Systems Manual §5 posture paragraph and §6.7 sector stance; `PLAYER_TURN_GUIDE.md` rows and the "Locked president-through-generals" note; Game Bible line 75 (brigade posture) |

## Checks

1. `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` exit 0.
2. New `tests/sim/stance_matters.test.ts`: gate (headless / level ≠ 2 / no player → no write); corps and OG generation; no matter without a real change; cap 3 and per-corps cooldown; deadline lapse = stood with no stance change; approve no effect; decline holds the previous stance for 4 turns then releases; amend ceilings; reorganize not overridden; patron re-cap and `patron_confidence` shift for HRHB; RS Main Staff delay from roster data, RBiH none; overrule calls the override record; save round-trip (serialize → parse → equal); determinism (same input → same matters, shuffled corps order → same output).
3. Inertness: with matters gated on but no answers, a multi-turn state comparison equals the gated-off run after stripping `meta.stance_matters`, `meta.stance_matter_history`, `military.stance_matter_state`.
4. Affected UI tests plus a new card/sector-step test; full `npm run test:vitest` (Git Bash on PATH), reading its exit status.
5. Headless 40-week run `npm run sim:scenario:run:40w` on main and on this branch: identical final state hash and weekly hashes. Evidence: `F:/AWWV-coordination/surface_steps/stance/inertness/`.
6. Renders of the new matter and the sector stance step at 2293×960 and 1280×720: `F:/AWWV-coordination/surface_steps/stance/`.
7. A 188-week validation is required before merge; the owner schedules it (not run here).

**Wait gate.** Until `F:/AWWV-coordination/crash_recovery_20261112/shake_status.txt` contains `hrhb03_exit`, only reading, design, plan and panels. Steps 1, 4, 5 and 6 wait for it.

## Completion

Panel record (unanimous), canon amendment in the same change, implementation, inertness proof, gates green, PROJECT_LEDGER entry, branch pushed (no PR, no merge), short report with what is left for the owner (188w run, merge order after `claude/truthful-command`).
