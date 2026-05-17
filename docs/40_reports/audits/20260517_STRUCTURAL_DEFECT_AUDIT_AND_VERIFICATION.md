# Structural Defect Audit + Verification — 2026-05-17

**Status:** AUTHORED 2026-05-17. Audit of in-session findings from four parallel investigators plus one verification pass. Reference document for Phase B/B+ scoping and follow-up backlog items.

**Plan:** `docs/plans/2026-05-17-two-level-event-surfacing-and-codex-visibility-plan.md`

**Origin:** User-reported defect — *"Codex should not be showing items (even greyed out) that were not surfaced to the player. Also, why does the player not see the initial event offers, such as 6 strategic goals for RS and so on? Investigate more deeply."* Initial investigation surfaced two surfacing defects (Codex render filter, event-queue gate). Follow-up investigations widened scope to the structural-defect *class* those two defects belong to.

---

## Verdict Summary

| Finding | Verdict | Status |
|---|---|---|
| Codex shows un-surfaced essays as greyed-out | LIVE | **FIXED 2026-05-17 (Phase A shipped)** |
| Initial event offers never queue (player_faction: null) | LIVE | Phase B specced, awaiting ship |
| `?? 'RBiH'` masking-default epidemic (8+ sites in sim/UI) | LIVE | Phase B+ specced |
| Warroom suite silently renders as RBiH regardless of intent | LIVE | Phase B+ specced |
| Autonomy-level-1 proposals never generate | LIVE | Closed by Phase B |
| Decision Room / Opening Brief / News Ticker silently empty | LIVE | Closed by Phase B |
| Paramilitary policy silently ignored (always_allow) | LIVE | Closed by Phase B+ |
| Logistics Priority is a no-op player lever | LIVE | New — needs decision (wire or remove) |
| Primary Army / Primary Corps quick-select buttons unwired | LIVE | New — minor |
| `IvpBreakdownModal` referenced but never implemented | LIVE | New — dead requirement |
| Sarajevo hardcoded defense/casualty/exhaustion railroad | INCONCLUSIVE | Verification needed (turn-40 sample too shallow) |
| NATO never intervenes (NaN propagation through getYearForTurn) | LATENT | Code defective, input never arrives in current runs |
| Multi-brigade attacks lose 50% pressure (corps_command undefined) | LATENT | corps_command consistently populated in n1741 |
| Settlement flips discarded (state.political undefined) | LATENT | state.political consistently defined |
| Casualties booked to wrong faction (formation.faction as cast) | LATENT | All formations have non-null faction |
| First-turn spatial context uses wrong key space (SID vs OSID) | LATENT | Investigated but not verified end-to-end |
| Negotiation capital zero for first 4 weeks | LATENT | Code skips turn 0 + `turn % 4 !== 0`; needs sim impact verification |
| Migration gap (only 2 migration steps for years of schema evolution) | LIVE (hygiene) | Not blocking, but cumulative risk |
| `try/catch` swallows in `pressure_system.ts:67-69` (non-strict mode) | LIVE (hygiene) | Single site, low impact |
| `AWWV_*` env vars all default OFF, no UI exposure | DESIGN | All 6 are dev/diagnostic flags — verified not gameplay-gating |

**LIVE** = bug is firing now and affecting behavior. **LATENT** = defective code path exists but input never reaches it in current runs. **INCONCLUSIVE** = needs more verification. **DESIGN** = intentional or non-issue. **DEAD** = artifact, no impact.

---

## 1. Originating Defects (User-Reported)

### 1.1 Codex shows un-surfaced essays as greyed-out

**File:** `src/ui/map/components/CodexPanel.tsx:140-175`

**Defect:** The year-group render iterated every essay in `essaysByYear` (the unfiltered group). Each rendered as a button with `data-awwv-codex-state={ghost | unlocked | locked}` and opacity-40 styling for `locked`. The resolver at `codexEssayResolver.ts:474-480` correctly returns `{isUnlocked: false, isGhost: false, paragraphs: []}` for un-surfaced non-ghost essays, but the render didn't honor the verdict.

**Status:** **FIXED 2026-05-17.** Phase A of the surfacing plan shipped. Render now derives `visibleEssaysByYear` filtered by `isUnlocked`, empty year sections collapse, header count drops the `X / Y` denominator that leaked non-surfaced totals. See ledger 2026-05-17.

### 1.2 Initial event offers never queue

**File:** `src/sim/events/evaluate_events.ts:224-225`

**Defect:** Queuing gate is `isPlayerRespondent = playerFaction != null && respondingFaction === playerFaction`. Default scenarios ship `state.meta.player_faction: null`. Therefore `isPlayerRespondent` is always false, and no `requires_player_response` event ever queues to `state.military.pending_event_decisions`.

**Visible symptoms:** `rs_strategic_goals` (turn 1), `rbih_state_identity` (turn 2), and every other `requires_player_response` event silently no-ops at scenario start.

**Status:** Phase B of the plan addresses by defaulting `player_faction` in `scenario_loader.ts`. Phase B+ widens to the broader contract.

---

## 2. The `player_faction: null` Null-Handling Sweep

~25 read sites across `src/sim`, `src/state`, `src/ui`, `src/desktop` handle `player_faction` null three different ways. The defect was invisible because each layer "handled" null its own way.

### 2.1 SKIP-WHEN-NULL (feature silently hides)

| File:line | Feature hidden |
|---|---|
| `src/sim/turn_phases/war_phases.ts:1293` | Stance recommendation generation (autonomy_level=1) |
| `src/sim/turn_phases/war_phases.ts:1316` | Level 1 stance proposal generation |
| `src/sim/turn_phases/war_phases.ts:1370` | Level 1 opportunity proposal generation |
| `src/sim/turn_phases/war_phases.ts:1387` | Level 1 op planning proposals |
| `src/sim/turn_phases/war_phase_briefing_steps.ts:9` | Command briefing assembly |
| `src/ui/shared/playerVisibility.ts:81` | Formation visibility filter — falls back to ALL formations |
| `src/ui/map/App.tsx:689, 701` | `selectPrimaryArmy` / `selectPrimaryCorps` quick-select handlers |
| `src/ui/map/components/PresidentialInbox.tsx:226-230` | OpeningBrief render |
| `src/ui/map/data/presidentialDecisionRoom.ts:1105-1107` | Decision Room — returns `hasPlayerFaction: false` empty state |
| `src/ui/warroom/components/NewsTicker.ts:126` | News Ticker — empty array |
| `src/ui/map/data/turnAftermath.ts:218-220, 495-499` | Casualty relevance + territory flip direction |
| `src/ui/map/components/AutonomyPanel.tsx:46-47` | Autonomy proposal filter |

### 2.2 OVERSHOW-WHEN-NULL (forgiving filter leaks enemy content)

| File:line | What leaks |
|---|---|
| `src/ui/map/data/inboxItems.ts:35-37` (helper) + 4 call sites (89, 133, 192, 211) | Presidential Inbox shows all-faction decisions when null |
| `src/ui/map/data/GameStateAdapter.ts:80, 263-265` | Supply state by OSID — shows all factions when null |
| `src/ui/map/data/operationOpportunityLedger.ts:147-148` | Operation Opportunity Dossier shows enemy proposal drafts |
| `src/sim/turn_phases/war_phases.ts:1255` | Bot faction filter — treats all factions as bot when null |
| `src/sim/combat/paramilitary_sweep.ts:218, 362` | Paramilitary policy ignored; auto-spawn for all factions |

### 2.3 NULL-MASKED-AS-RBIH (silent default to hardcoded faction)

| File:line | Feature silently defaults to RBiH |
|---|---|
| `src/ui/warroom/components/warroom_utils.ts:218-220` (`getPlayerFaction`) | Newspaper, Magazine, Diplomacy, Reports, IVP, Command Briefing, FactionOverview, Settings, WarPlanningMap — 11+ consumers |
| `src/sim/codex/dynamic_section_builder.ts:178-179` | Codex ghost-entry predicate evaluation |
| `src/ui/warroom/components/CommandBriefingModal.ts:31` | Command briefing renders as RBiH |
| `src/sim/negotiation/dayton_negotiation.ts:150` | Dayton player faction inference |
| `src/sim/negotiation/peace_plans.ts:151, 200` | Peace plan player faction inference |
| `src/state/supply_reserves.ts:600` | Supply reserves player faction inference |
| `src/sim/ai_commander/response_parser.ts:101` | AI commander response parsing |
| `src/sim/early_war/settlement_control.ts:265, 287` | Settlement holdout attribution — spurious RBiH holdouts when controllers unset |

### 2.4 Type contract

`src/state/game_state.ts:1268` declares `player_faction?: FactionId` — optional. No runtime assertion. No migration default. TypeScript `strictNullChecks` is off; ~30 `as FactionId` non-null assertions throughout the codebase bypass type safety even when it would catch the bug.

---

## 3. Hardcoded Defaults, Magic Constants, and Railroad Smells

### 3.1 Railroad smells (canon violation candidates)

| File:line | Hardcode | Concern |
|---|---|---|
| `src/sim/combat/exhaustion.ts:85-90` | RBiH exhaustion +3.0 / RS +2.0 during Sarajevo siege | Faction-asymmetric paint, no canon citation |
| `src/sim/combat/battle_resolution.ts:99, 107, 177, 381-382, 409` | `SARAJEVO_DEFENSE_BONUS = 0.40`, `SARAJEVO_ATTACKER_CASUALTY_MULT = 2.0` | Single-OSID paint, no derivation comment |
| `src/sim/combat/combat_math.ts:231-235` | `FACTION_MORALE_RESIST_FLOOR = { RBiH: 50, RS: 55, HRHB: 60 }` | Faction-asymmetric morale floor, no doctrine doc |
| `src/sim/early_war/bilateral_ceasefire.ts:36, 38` | `CEASEFIRE_RBIH_EXHAUSTION = 30`, `CEASEFIRE_HRHB_EXHAUSTION = 35` | Narrative event gated on hardcoded exhaustion |
| `src/sim/early_war/washington_agreement.ts:45` | `WASH_COMBINED_EXHAUSTION = 55` | Washington Agreement gated on hardcoded threshold |
| `src/sim/bot/bot_strategy.ts:144, 167` | `if (profile.faction === 'RBiH' && week < 12)` | RBiH-special bot doctrine, no RS/HRHB equivalents |

### 3.2 Stale magic numbers (no derivation comment)

| File:line | Constant |
|---|---|
| `src/sim/combat/exhaustion.ts:18, 21` | `EXHAUSTION_PER_STATIC_FRONT = 2`, `EXHAUSTION_PER_SUPPLY_PRESSURE_POINT = 0.1` |
| `src/sim/combat/combat_math.ts:81` | `MAX_EDGES_PER_BRIGADE = 2` |

### 3.3 The `?? 'RBiH'` epidemic

Beyond the canonical warroom helper, 8 confirmed sites in production code default to `'RBiH'` when player faction is null. Each is the same defect class as `warroom_utils.getPlayerFaction()`. After Phase B+ removes the warroom fallback, the others remain unless explicitly handled in B+'s consolidation pass.

---

## 4. Phase Pipeline Silent-Skip Sites

Pipeline steps that early-return on missing data **without logging**:

| File:line | Step | Skip condition | Impact |
|---|---|---|---|
| `war_phases.ts:393` | `update-formation-lifecycle` | `!fatigueReport` | Brigade lifecycle stuck |
| `war_phases.ts:517` | `supply-osid` | OSID maps missing | Supply silent-falls-back |
| `war_phases.ts:546` | `compute-spatial-context-pre-combat` | `!od?.edges?.length` | Commander loop uses stale spatial |
| `war_phases.ts:576, 587` | siege counters + supply reserves | `!supply_reserves_enabled` | Siege mechanics disabled |
| `war_phase_reconciliation_steps.ts:39` | `reconcile-final-sector-truth` | OSID edges missing | Sector truth desync |
| `war_phases.ts:1580` | `assess-negotiation-capital` | `turn === 0 \|\| turn % 4 !== 0` | First 4 weeks have zero capital |
| `war_phases.ts:1293, 1316, 1370, 1387` | Autonomy-1 proposal generators | `!playerFaction` | Closed by Phase B |
| `war_phase_briefing_steps.ts:9` | `assemble-command-briefing` | `!playerFaction` | Closed by Phase B |

**Recommended hygiene improvement:** wrap pipeline steps so any early-return emits `{phase, step, skip_reason}` into a turn diagnostic. Converts an invisible bug class into a visible one. Not blocking; backlog candidate.

---

## 5. Dead UI Components

| Component | Status | Note |
|---|---|---|
| `Logistics Priority` buttons (`CorpsFrontPanel.tsx:513-525`) | **LIVE DEAD LEVER** | UI + IPC + stage write all work; supply allocation never reads the value. Player perception: "I prioritized 2x." Reality: zero effect. |
| `selectPrimaryArmy` / `selectPrimaryCorps` (`App.tsx:688-710`) | DEAD | Handlers defined; no button wires to them. |
| `IvpBreakdownModal` | DEAD | Referenced in CLAUDE.md, never implemented. |
| `ParamilitaryReviewModal` (`App.tsx:39`) | DEAD ENTRY | Component mounted, no opener exists. |
| `SettingsScreen.tsx` (`App.tsx:44, 248`) | SHELL | Mounts when `settingsOpen=true`; no settings actually affect sim behavior. |
| `WarSummaryModal` | NEAR-DEAD | Only opens via `'s'` keyboard shortcut, no UI button. |

---

## 6. Player Command Lever Verdicts

Per CLAUDE.md canon, the 6 player command levers are: **corps stance, sector stance, ops planning, logistics priority, OPSEC, sector override**.

| Lever | Verdict | Evidence |
|---|---|---|
| Corps stance | **WORKING** | `bot_corps_stance.ts:343` explicitly guards: `if (cmd.player_ordered_stance != null) continue;` |
| Sector stance | **WORKING** | `sector_stance_orders.ts:36` applies player orders; sets `stance_source = 'player'` |
| Ops planning | **WORKING** | Player-authored ops execute via `bot_corps_directives.ts` path |
| Logistics priority | **BROKEN (LIVE)** | `formation_fatigue.ts:220,237` reads the value cosmetically; `brigade_movement.ts` and `supply_reachability.ts` never consult it |
| OPSEC | **WORKING** | `cohesion_drift.ts`, `sector_intel.ts`, `commander/briefing.ts` all read `opsec_sectors` |
| Sector override | **WORKING** | Same path as sector stance |

**5 of 6 work.** Logistics Priority is the only confirmed-broken lever and the only one that creates active player deception (UI says "Priority staged: 2.0x", sim ignores).

---

## 7. P0 Verification Against n1741 Baseline (turn-40 sample)

The four highest-blast-radius "P0" findings from the sweep were verified against a turn-40 sample of the `latest_run_final_save.json` baseline:

| Finding | Verdict | Evidence |
|---|---|---|
| 1. NATO never intervenes (NaN propagation through `getYearForTurn`) | **LATENT** | `political.patron_pressure` is absent from serialized state entirely. Either system disabled or not persisted. Turn 40 is well below week 127 trigger anyway. |
| 2. Multi-brigade attacks lose 50% pressure (`corps_command` undefined fallback) | **LATENT** | `state.military.corps_command` populated with 19 corps. Fallback-to-1.0 never triggers. |
| 3. Settlement flips discarded (`state.political` undefined branch) | **LATENT** | `state.political` consistently defined in the save. Unguarded `.` access never hits undefined. |
| 4. Casualties booked to wrong faction (`formation.faction as FactionId` cast) | **LATENT** | All 320 formations in the save have non-null faction. Cast never lies. |
| 7. Sarajevo railroad active | **INCONCLUSIVE** | Hardcoded constants are live code (no feature gate). Verification requires battle-record sampling not exposed by turn-40 data. |

**Interpretation:** the sweep correctly identified defective code paths, but in current data the inputs that would trigger them never arrive. The "rush to harden everything" instinct was incorrect. The "verify before fixing" pause prevented a misallocated sprint.

**Caveat:** turn-40 sample only. NATO intervenes at week ~127; Sarajevo siege escalates well past turn 40; multi-brigade ops happen throughout. **A 188w endgame save re-verification is warranted** (queued as a separate investigation).

**Side-finding worth probing:** `patron_pressure` is not in the serialized state at all. Either patron pressure is recomputed each turn without persistence (fine), or the patron-pressure system never runs (a different bug). 5-min check.

---

## 8. Meta-Patterns

### 8.1 The optionality crisis (root cause)

Three reinforcing causes produce the entire defect class:

1. **TypeScript runs without `strictNullChecks`.** ~30 `as FactionId` non-null assertions are confessions the type system would have rejected.
2. **GameState schema is widely `?:` optional.** 455 optional fields per the schema audit. Scenarios ship partial state.
3. **At least 4 different conventions** for handling null have evolved: SKIP, OVERSHOW, MASK-AS-DEFAULT, TYPE-ASSERT-AND-PRAY. Each layer "handles" null its own way, so cascades are invisible.

The single highest-leverage long-term fix is enabling `strictNullChecks` and migrating field-by-field to required-plus-validation. That's a milestone of work, not a lane.

### 8.2 `state.political` as the next iceberg

Beyond `player_faction`, the next field at the same risk class is `state.political?: PoliticalState`. 636 `state.political?.*` chains exist (guarded). 1041 direct `state.political.*` reads have no guard. Currently LATENT (state.political is consistently populated) but structurally analogous to player_faction.

### 8.3 Pipeline silent-skip with no diagnostic

Out of ~151 war-phase steps, 10+ have early-returns on missing data with **no console log, no warn, no metric**. The single best lifecycle improvement would be a step-wrapper that requires every early-return to emit `{phase, step, skip_reason}` into a turn diagnostic. Cheap, high-information, prevents future invisible bugs of the same class.

---

## 9. Recommended Sequencing

| Priority | Action | Status |
|---|---|---|
| 1 | Phase A — Codex visibility filter | **SHIPPED 2026-05-17** |
| 2 | Phase B — `player_faction` default | Specced, ready to dispatch |
| 3 | Endgame verification (Sarajevo + 4 latent findings at week ~188) | Queued, parallel-dispatchable with Phase B |
| 4 | Logistics Priority decision (wire-it or remove-the-UI) | Needs user call |
| 5 | Phase B+ — contract hardening, `?? 'RBiH'` consolidation, warroom fallback removal | Specced; was urgent, now hygiene |
| 6 | Phase C — Two-level event surfacing | Specced; waiting on B+ |
| 7 | Phase pipeline diagnostic wrapper | Backlog candidate; hygiene improvement |
| 8 | Sarajevo railroad canon question | User design call needed |
| 9 | `strictNullChecks` migration | Long-term milestone |

---

## 10. Caveats

- The verification sampled **turn 40 of one 188w run** (the `latest_run_final_save.json` artifact was actually 40w, not 188w as initially assumed). Endgame re-verification is warranted before fully declassifying any LATENT finding.
- **Endgame verification BLOCKED on missing artifact (2026-05-17):** Re-dispatched verification could not find the n1741 188w final save anywhere in `data/derived/`. Cross-check confirms the napkin entry "Freed ~70GB by deleting 34 stale 188w runs" — the 188w saves were intentionally garbage-collected for disk hygiene. **Endgame re-verification requires re-running `npm run sim:scenario:run` against a 188w scenario** (~30+ min wall-clock). All five INCONCLUSIVE verdicts (Sarajevo railroad, 4 latent findings at endgame) remain unconfirmed until that run is produced. Recommendation: run 188w as the next opportunity-cost session task, or accept turn-40 latency as the working assumption pending the next calibration cycle.
- The dead-UI investigation may have missed surfaces it didn't reach (it spent its budget on the 6 canonical levers + visible modals). Lower-traffic UI surfaces (Magazine internals, Chronicle filter handlers, etc.) weren't covered.
- The Sarajevo railroad concern is partly a canon question (is Sarajevo *supposed* to be code-special-cased per canon?) and partly an empirical question (are the hardcoded multipliers producing emergent-looking outcomes or visible distortion?). Both need answers.
- `AWWV_*` env vars (6 found) were all dev/diagnostic flags — no gameplay-gating flags hiding in env vars. Not a defect.

---

## References

- Plan: `docs/plans/2026-05-17-two-level-event-surfacing-and-codex-visibility-plan.md`
- Sister: `docs/plans/2026-05-16-presidential-decision-surface-correctness-plan.md`
- Ledger: 2026-05-17 entry (Phase A ship)
- Roadmap: `docs/plans/MASTER_ROADMAP.md` lines 7 and 720
