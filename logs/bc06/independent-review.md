# BC06 independent review — 2026-09-08

**Verdict: GO for the bounded BC06 repair after the targeted correction pass.** No blocking correctness, canon, determinism, ownership, UX, or persistence finding remains in the authorized scope. This review does not close R8 packaged/full-campaign acceptance, the six unauthored address/decoration escalation rows, or the pre-existing decoration-target semantics gap.

## Reviewed scope and authority

Reviewed the production/test diff from clean base `4c419c464adce4e59d9046b37b79d163979d5c7d`, the BC06 section of `docs/plans/2026-07-31-full-campaign-electron-validation-plan.md`, the PM routing authority at `docs/40_reports/audits/20260905_EVENT_ROADMAP_FIT_PM_RULING.md`, and its referenced event-pacing designer reconciliation. The implementation stays within the authorized desktop player-action repair: no natural-event recurrence redesign, canon amendment, combat/initial-control/enclave/Dayton/NATO change, campaign, calibration, baseline, or structural-fingerprint run.

The catalog correction is factual: the current twelve `action_cadence` rows comprise three already-escalating posture reviews and nine formerly static gestures. BC06 changes only the three front visits from static to escalating. The remaining three addresses and three decorations have no authored stages or numerical escalation rule and remain unresolved. The earlier “11 of 12 static” audit count is historical evidence, not the current catalog count.

## Correctness, ownership, and UX

- `src/desktop/strategic_posture_review_contract.cjs:9-11,26-104` maps all three player factions, applies the authored cap/cooldown and duplicate-pending guard, filters choices by numbered fire, debits CA once, queues one self-contained decision, and records cadence. It does not apply event effects.
- `src/desktop/electron-main.cjs:3122-3153`, `src/desktop/preload.cjs`, `src/ui/map/desktop/useIPC.ts`, `src/ui/map/data/presidentialDecisionRoom.ts`, and `src/ui/map/components/army_hq/DirectiveCard.tsx:179-329,558-567` form one complete Decision Room → renderer → preload → serialized IPC path. The mutating initiation remains serialize-by-default; availability is correctly classified read-only.
- `src/sim/events/resolve_decision_core.ts:21-61` remains the sole writer for authored effects, flags, dimension shifts, player decision receipts, and other-faction notifications. `electron-main.cjs:3320-3327` now broadcasts the resulting canonical serialization back to the initiating renderer, satisfying the Systems Manual §22 desktop-mutation rule as well as autosave persistence.
- The shared `responseOptionsForFire` filter preserves authored order and exposes `available_from_fire: 3` only on fire 3+. First/third live cases confirm the actual posture and front-visit modal choices. Duplicate/pending/cooldown guards do not double-debit or rewrite autosave.
- UI copy truthfully presents posture review as a 10-CA presidential strategy action. A leadership action now reports that its decision opened immediately and that the response applies its effects; ordinary staged directives retain their next-turn receipt. The reused front-visit art is explicitly a temporary fallback and resolves through the existing art contract.

## Targeted review findings and corrections

The initial diff preserved decoration notification metadata but failed to emit it for per-unit choices. `buildDecorateUnitPendingDecision` generates response ids such as `decorate_steadfast_rbih__arbih_101st_mountain`, while authored notification maps use the unsuffixed template id; `emitEventNotifications` performs an exact response-id lookup. This made the newly preserved metadata inert for the main per-unit path.

The single correction at `src/desktop/decorate_unit_contract.cjs:263-275` deterministically aliases the existing authored notification payload under every generated per-unit response id. It adds no prose or effect. `tests/leadership_actions.test.ts` now resolves a generated response through the canonical resolver and proves two notifications plus one decision receipt. The retained RED receipt is `logs/bc06/red-decoration-notification-alias.log` (1 expected failure); GREEN is `logs/bc06/decoration-notification-correction.log` (48/48).

Live inspection then found a false success receipt inherited from the generic directive path: the queued leadership decision was described as “staged for next turn” and “consumed when you advance,” although the modal opens immediately and its selected response resolves the effects. `DirectiveCard.tsx:436-437,569` now gives leadership gestures a dedicated receipt while leaving `markIssued` unchanged for staged directives. English and BCS strings describe the actual immediate-decision lifecycle. The retained RED is `logs/bc06/red-leadership-ui-receipt.log`; the focused UI file passes 28/28 in `logs/bc06/leadership-ui-receipt-correction.log` and in my fresh independent run. `logs/bc06/live-posture-receipt-final-01/result.json` records the exact rendered `role=status` text and non-zero box dimensions before automatic modal navigation, then proves the same effects, receipt, cooldown, and autosave path. The transition screenshot catches the modal rather than stable receipt text, so the live claim is the DOM observation recorded in `result.json`.

## Canon and design mapping

- Rulebook §17.5 lines 550-569 authorizes state-driven event decisions, immediate effects/flags/dimension shifts, and some recurring decisions with escalating stakes. The numbered-fire option filter and unchanged canonical resolver implement that bounded requirement without altering the natural evaluator.
- Game Bible §21.1 lines 255-261 and §21.4 line 288 require costly decisions with explicit causal flags. The live receipts demonstrate those authored consequences. The repair creates no new sensitive-history rupture or forbidden player choice under Game Bible §22.
- Game Bible §21.5 lines 290-300 keeps the five military command levers fixed. This action routes an already-authored event/leadership gesture; it does not add direct formation command or a sixth military lever.
- The fixed **10 CA** posture price has no posture-specific canon clause. I accept it only as an explicit implementation/design inference: the existing CA economy defines affordable leadership gestures at 10 CA, and front visit, address, and decoration already share that price. The constants are parity-tested across desktop and renderer. It must not be cited as a sourced historical or posture-specific canon number.

## Determinism and evidence

No nondeterminism risk was found against `docs/10_canon/Engine_Invariants_v0_9_0.md`, `docs/PHASE_A_INVARIANTS.md`, and `docs/20_engineering/DETERMINISM_TEST_MATRIX.md`. The new contracts are pure over state; filtering preserves authored array order; generated decoration aliases follow the already sorted eligible-option order; no time, randomness, filesystem enumeration, or new simulation-order owner was introduced. The desktop-only cadence data does not enter the natural/headless evaluator.

Fresh independent verification after the correction:

- affected Vitest set after the notification correction: **10 files, 151/151 tests, exit 0**; after the later UI-only receipt change, a fresh targeted `directive_card_stop_op_action` run passed **28/28, exit 0**;
- `git diff --check`: no whitespace errors (one informational CRLF conversion warning for `COMMAND_BOARD.md`);
- root receipts: final map build and receipt-correction map rebuild exit 0, typecheck exit 0, and `logs/bc06/scope-check.log` pass, preserving `war_1994.json`, `war_1995.json`, the 188-week scenario, initial save, calibration data, combat, and `evaluate_events.ts`;
- six visible local Electron posture cases under `logs/bc06/live-{rbih,rs,hrhb}-{1,3}-final-01/`: all result files pass; all use the real preload, autosave, and initiating-renderer refresh; fire 1 hides and fire 3 exposes the authored settlement branch; persisted state records 10 CA, cadence, authored effects/flags, one player receipt, zero pending decisions, and two notifications; immediate repeat returns cooldown with unchanged autosave;
- `logs/bc06/live-visit-first-final-01`, `live-visit-third-final-01`, and `live-address-final-01` pass and preserve the same receipt/notification/cooldown behavior for changed shared builders.
- `logs/bc06/live-posture-receipt-final-01` additionally proves the corrected immediate-decision receipt in the rendered DOM after the final UI build.

These are local unpackaged Electron fixtures at synthetic turn 90. They are adequate for the bounded desktop wiring and persistence question; they do not establish installer/package acceptance, campaign cadence, or calibration neutrality beyond the source/scope proof.

## Residual gate boundaries

1. Six address/decoration rows remain static because no authored escalation stages or numeric rule exists. BC06 makes no full gesture-escalation claim.
2. The decoration UI lets the player name one formation and persists that formation in the suffixed response id, but `target_formation_id` has no engine consumer. The authored `morale_change` and `cohesion_change` effects are faction-wide, so every active brigade receives the same deltas. `logs/bc06/live-decorate-final-01/result.json` deliberately fails the non-target positive control (`55 !== 50`) and proves this pre-existing semantic mismatch. Fixing it requires an authored targeting/effect rule and is outside BC06; the notification alias correction does not conceal or waive it.
3. The generic natural event path remains as found and was not changed. General recurrence, option decay, campaigns, structural fingerprint, calibration/baselines, and final packaged acceptance remain separately gated.
4. Nonblocking comment hygiene: `address_nation_contract.cjs:105` and `front_visit_contract.cjs:194` still say `available_from_fire` is left to a downstream resolver. The current builders enforce it before queueing. The executable behavior and tests are correct; those comments should be aligned before commit if touched-file documentation hygiene is desired.

## Follow-up addendum — 2026-09-08 — per-unit decoration targeting

**Verdict: GO for the owner-authorized targeting follow-up from `d7fb720353c2b6b37a80269261ec1e193a205161`.** No blocking correctness, transactionality, canon, determinism, ownership, UX-receipt, or persistence issue remains in this bounded follow-up. Residual item 2 above records the state at the end of the original BC06 review; this follow-up resolves that specific selected-unit semantic mismatch without rewriting the historical finding.

### Code and transaction review

- `src/desktop/decorate_unit_contract.cjs:74-87,211-224` now requires the schema's explicit `status: 'active'`, retains the existing friendly corps/brigade gate and deterministic kind/id ordering, and writes the selected formation id into both the generated response suffix and `target_formation_id`. Missing `kind` still uses the documented backward-compatible brigade default.
- `src/sim/events/resolve_decision_core.ts:24-55,75-96` recognizes only generated `decorate_steadfast_{rbih,rs,hrhb}__<formationId>` responses. Before any effect or decision mutation it verifies the matching decoration event, responding faction, nonempty metadata, suffix/metadata identity, existing friendly formation, active status, and regular corps/brigade kind. Missing, stale/unknown, enemy, inactive, nonregular, mismatched, or misplaced target metadata throws while leaving the complete state unchanged.
- `src/sim/events/apply_effects.ts:81-116,173-191` gives only `morale_change` and `cohesion_change` the validated target. Their existing authored deltas and clamps apply to the selected formation. Other effect kinds, definition flags, dimension shifts, runtime causality, decision receipts, notifications, and pending-decision consumption keep their existing owners and order.
- Unsuffixed steadfast responses and broad/decline responses without target metadata take the original faction-wide path. Non-decoration responses carrying target metadata fail closed instead of silently changing semantics. `rg` finds no new caller that can supply the optional target outside the canonical decision resolver.

The validation-before-mutation placement satisfies the requested transaction boundary for invalid targets. A malformed trusted effect payload whose effect faction disagreed with its already-validated decision faction was not added to this repair's contract; the desktop builder shallow-clones the authored faction-consistent effects, and the three source definitions were inspected. General effect-payload hardening would be a separate scope.

### Independent evidence

- I read the repository's targeted-test dispatcher before running it. My fresh command used `npm run test:vitest -- tests/leadership_actions.test.ts tests/event_decisions.test.ts tests/morale_change_theater_scope.test.ts` and passed **3 files, 62/62 tests, exit 0**. Receipts: `logs/bc06/targeting/reviewer-tests.log` and `reviewer-tests.exit`.
- The regression matrix proves selected-only morale/cohesion for RBiH, RS, and HRHB; full-state equality after missing, unknown, enemy, inactive, and nonregular target rejection; strict active eligibility; unchanged faction-wide broad and legacy unsuffixed behavior; deterministic response ordering; notification aliases; and single decision consumption. The direct code checks additionally cover event/faction/suffix mismatch guards.
- Root gates pass with exit 0 for typecheck, desktop simulation build/read-only startup snapshot, tactical-map build, scope check, and diff check under `logs/bc06/targeting/`.
- Visible local Electron cases `live-rbih-02`, `live-rs-02`, and `live-hrhb-02` each pass with zero diagnostics. Their canonical autosaves prove the selected unit at morale 55/cohesion 52, another friendly and one foreign formation unchanged at 50/50, one 10-CA debit, one cadence count, one player decision receipt, zero pending decisions, two opponent notifications, and cooldown rejection through real preload IPC with byte-unchanged autosave. The first RBiH attempt is retained as a harness-projection failure; its canonical save already showed the foreign control unchanged and no production correction resulted.

The follow-up is a deterministic local desktop/canonical-save proof at synthetic turn 90. The six unauthored address/decoration escalation rules and final packaged acceptance remain open. No campaign, calibration, baseline, structural fingerprint, recurrence redesign, or broader canon claim is established here.
