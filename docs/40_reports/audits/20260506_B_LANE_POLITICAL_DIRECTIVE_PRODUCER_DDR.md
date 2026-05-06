# B-Lane DDR — political_directive Producer

**Lane:** LANE-NIGHTSHIFT-B-LANE-PHASE-0-PANEL-RETRY
**Date:** 2026-05-06
**Predecessors:** A1 (`18136710`), A2 (`ba6955bf`), A3 (`c8ff93d8`), A4 (`93c75b1d`), A-lane DDR (`eee308e0`).

## Overview

A3's `interpretArmyDirective(state, faction, directive: PoliticalDirective)` (src/sim/combat/army_order_interpretation.ts) consumes a `PoliticalDirective` read defensively from `state.military.political_directives_by_faction[faction]` (lines 623–631). No engine-side producer ever writes that slot. A3's pipeline step `apply-army-directive-interpretation` therefore short-circuits every turn — `readPoliticalDirective(...)` returns `null`, `interpretArmyDirective` is never called, and `army_directive_pushback` events cannot fire. A4's roster-driven personalities are likewise unobserved at 188w because the upstream verb is never set. B-lane wires the producer that closes this gap.

## Q1 — Producer location

**Recommendation:** NEW module `src/sim/political/political_directive_producer.ts`.

Rationale: `army_hq_gathering.ts` (1016 lines) is already the canonical owner of bot-side military strategy translation (TheaterAssessment → CampaignPlan → FrontPriority → SyncOps). Adding a *political-layer* producer would muddle separation: the directive verb is the political leader's expression of intent (hawkishness, flexibility, alliance posture), distinct from the army CO's translation of that intent into corps roles. A new `src/sim/political/` namespace also gives B2 (and any future political-bot work — IVP, ceasefire posture, faction war goals) a natural home rather than continuing to swell `military/`. Single export `producePoliticalDirective(state, faction, currentTurn): PoliticalDirective | null` plus a thin pipeline-step wrapper `applyPoliticalDirectiveProducer(state)`.

## Q2 — Inputs

The producer reads:

- `state.political.war_exhaustion?.[faction]` — high exhaustion → bias toward `HONOR_TRUCE` / `PREPARE_RESERVE` (game_state.ts:2171).
- `state.military.political_leaders?.[faction]` (PoliticalLeaderState) — `current_posture`, `alliance_posture`, `political_capital`, `current_priorities` (political_leader_types.ts:58–80).
- `state.military.political_leader_data` (PoliticalLeaderProfile) — `hawkishness`, `flexibility`, `international_sensitivity`, `patron_deference` (political_leader_types.ts:37–54). Hawkishness ≥ 4 biases `PRESS_OFFENSIVE`; ≤ 2 biases `HOLD_AT_ALL_COSTS`.
- `state.military.campaign_plans?.[faction]` (A1 wired) — read `front_priorities` to derive `target_corps_id` (highest-role corps) and `doctrine_override.army_stance` for cross-checking with the political verb.
- `state.political.war_alliance_rbih_hrhb` (game_state.ts:2163) — alliance ≤ 0 + faction in {RBiH, HRHB} biases `MAINTAIN_CORRIDOR` toward Central Bosnia corps.
- `state.political.international_visibility_pressure` (game_state.ts:2151) — high IVP + high `international_sensitivity` biases `HONOR_TRUCE`.
- `state.meta.turn` and `state.meta.player_faction` — short-circuit when `faction === player_faction` (player issues directives via UI handler, not the bot producer).

## Q3 — Directive verbs

Six values, locked by A3's `PoliticalDirectiveVerb` union (army_order_interpretation.ts:114–120):

| Verb | A3 raw role for target_corps_id | A3 raw role for non-target |
|---|---|---|
| `HOLD_AT_ALL_COSTS` | primary | economy |
| `PRESS_OFFENSIVE` | primary | secondary |
| `MAINTAIN_CORRIDOR` | primary | economy |
| `PREPARE_RESERVE` | secondary | economy |
| `HONOR_TRUCE` | contain | contain |
| `BALANCE_FRONTS` (default) | secondary | economy |

The producer MUST emit exactly one of these per non-player faction per turn (or null). Adding new verbs is out of scope for B-lane — A3's `rawRoleForVerb` switch is exhaustive; an unknown verb would silently fall through to `BALANCE_FRONTS`.

## Q4 — Pipeline ordering

**Confirmed insertion point:** BEFORE `evaluate-army-co-transitions` (A4) and BEFORE `apply-army-directive-interpretation` (A3).

Current order in `war_phases.ts` (lines 1145–1204): `evaluate-army-hq-gathering` → `evaluate-army-co-transitions` (A4) → `apply-army-directive-interpretation` (A3) → `generate-bot-corps-orders`.

**Recommended step name:** `produce-political-directive` (verbs: produce / step-name pattern matches A3's `apply-army-directive-interpretation`).

**Recommended insertion:** AFTER `evaluate-army-hq-gathering` (the producer reads CampaignPlan to derive `target_corps_id`) and BEFORE A4's `evaluate-army-co-transitions`. A4 does not consume the directive, but A3 does, and ordering before A4 also gives any future "leader fires CO based on directive friction" logic a deterministic substrate. Net order: `evaluate-army-hq-gathering` → **`produce-political-directive`** → `evaluate-army-co-transitions` → `apply-army-directive-interpretation` → `generate-bot-corps-orders`.

## Q5 — Calibration risk band

**Firing magnitude over 188 turns, 3 non-player factions = 564 (faction × turn) tuples.**

- **Lower bound:** producer emits `null` for any faction lacking `political_leaders`/`political_leader_data` substrate — at present, scenario JSON populates these only for the canon-active leaders, so coverage is faction-dependent. Assuming 2/3 factions have populated leader data at 188w, baseline is ~376 directive emissions. Of those, the dominant `BALANCE_FRONTS` default produces FULL compliance (mid-tier officer with no alignment match → score 0.50–0.70 → MODIFIED only if non-aligned), so `army_directive_pushback` events only fire on actual misalignment. With A4 init values (Mladić stubbornness=5, cooldown 12), A3 emits **at most 1 pushback per faction per turn** (capped by interpretation per call) — lower bound ~30 pushbacks across 188w in steady mid-aggressiveness.
- **Upper bound:** every aligned-but-stubborn officer issued a misaligned verb produces a MODIFIED/PARTIAL outcome → 1 pushback per turn × 3 factions × 188 turns = **564 pushback events**. Mladić-class (stubbornness=5) on `HONOR_TRUCE` reliably triggers REFUSED. Realistic upper bound (assuming ~40% of turns produce an aligned verb): **~340 pushback events**, **~5–8 autonomous-launch proposals** (cooldown 12 caps to ≤16 per faction per 188w; eligibility gate further suppresses).

**Calibration risk:** the producer changes corps `FrontPriority['role']` only via deviation steps (max 1 along ROLE_LADDER per A3 MAX_DIRECTIVE_DEVIATION). Effect on op generation, brigade allocation, and territorial outcomes is bounded but real — even one role shift on a primary corps can cascade into `generate-bot-corps-orders`. **MEDIUM risk band.**

**Phase 1 mini-panel: REQUIRED.** A 40w byte-stable A/B (B-lane disabled vs. enabled, with `B_LANE_POLITICAL_DIRECTIVE_PRODUCER_DISABLED` env flag mirroring A4's pattern) is mandatory before merge. Calibration anchors and benchmarks must be re-verified at 40w n1627 hash baseline.

## Sensitive-history compliance

Faction-symmetric mechanism — the producer is a pure function of state inputs (exhaustion, leader profile, CampaignPlan) with no `if (faction === 'X')` branches. All asymmetry flows from data values in `political_leader_data` and `political_leaders`, both already populated by canonical scenario JSON. **No new §6 surface created**: the producer does not write to `political_controllers`, `paint anchors`, OOB stats, or rupture wiring. No FORAWWV touch. Ring 1 (mechanism) layer only; Ring 2 data is already canonical.

## Go/no-go recommendation

**GO-WITH-MINI-PANEL.** Risk band: **MEDIUM**.

A3's interpretation surface, A4's roster, and the consumer pipeline are all in place; the producer is the only missing piece preventing observable behavior at 188w. The substrate-driven design (null when leader data missing) preserves byte-stable 40w until the producer is fully wired AND scenario data is populated. Mini-panel is required to verify the 40w n1627 baseline hash holds with the producer enabled-but-substrate-empty path, and to bound territorial drift when the producer becomes active.

## Phase 1 dispatch shape

**Recommendation: SPLIT into B1 + B2.**

- **B1 — Producer infrastructure (LOW risk, byte-stable):** new module `src/sim/political/political_directive_producer.ts` with `producePoliticalDirective` + `applyPoliticalDirectiveProducer` + pipeline-step constant; pipeline insertion at `produce-political-directive`; defensive null-return when `political_leaders`/`political_leader_data` absent; env-flag short-circuit `B_LANE_POLITICAL_DIRECTIVE_PRODUCER_DISABLED`; unit tests for the verb-derivation table. **40w byte-stable** because no scenario currently populates the leader profiles for all factions, and the empty-substrate path returns null.
- **B2 — Political bot integration (MEDIUM risk, calibration-active):** populate canonical `political_leader_data` profiles (Izetbegović, Karadžić, Boban with hawkishness/flexibility/international_sensitivity/patron_deference values from canon), wire `political_leaders` initialization into scenario init, and run the mini-panel A/B 40w. This is where calibration drift becomes observable.

The split keeps the Ring 1 mechanism land (B1) free of Ring 2 data risk (B2), and lets B2 land independently once B1 is verified byte-stable.
