# Event System Authoring Guide

**Status:** Engineering reference
**Audience:** Anyone authoring a new event packet (Phase D Packet 45+), wiring a new political dimension consumer (Phase E continuation), or extending the canon-gate enforcement surface
**Pairs with (WHY):** `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md` — the canonical moral and design gate
**This document (HOW):** Step-by-step workflow for adding to the event system without spelunking transcripts, ledger entries, and memory files
**Last updated:** 2026-05-28
**Authority:** Engineering reference; the canon docs and source files cited here are the binding authorities. When this guide and a source disagree, the source wins.

---

## 1. Overview

The event system is the deterministic causal political layer of AWWV. Events are authored as JSON rows in `data/scenarios/events/war_*.json`, loaded by `event_loader.ts`, evaluated each turn by `evaluate_events.ts`, and consumed by player UI surfaces (modal-ready acceptance) plus, when feature-flag activated, by bot operational decision making (Phase E political-dimension propagation).

### Three-layer architecture

| Layer | Concern | Where it lives |
|---|---|---|
| Layer 1 — Authoring | Event JSON rows, options, dimension shifts, effects, runtime causality wiring | `data/scenarios/events/war_*.json` + `consequences.json` |
| Layer 2 — Substrate | Catalog load + per-turn evaluation + writers (`recordEnabledEvents` / `recordClosedEvents` / `recordCausality`) + decision log | `src/sim/events/event_loader.ts`, `evaluate_events.ts`, `strategic_dimensions.ts`, `apply_effects.ts` |
| Layer 3 — Consumption | Player modal acceptance + (feature-flagged) bot ops political-dimension consumption | `src/sim/combat/commander/briefing.ts`, `sector_offensive.ts`, `emit.ts`, gated through `src/sim/political/political_dimension_propagation_gate.ts` |

Phase D ships 44 causal-chain packets in Layer 1. Phase B authored the writers and validation passes in Layer 2. Phase E wires Layer 3 with feature-flag-gated bot consumers (defaults OFF; baseline byte-identical).

### Glossary

- **Foundational event** — A root political-posture decision that anchors every downstream chain on a faction. Three exist: R1 `rs_strategic_goals`, B1 `rbih_state_identity`, H1 `hrhb_political_goal`. Confirmed via `tools/diagnostics/event_family_graph.ts --format tree --depth 0`.
- **Downstream event** — Any event whose firing depends on a foundational (or other upstream) option being resolved a particular way. Wired via `requires_enabled[]` on the downstream and `enables_events_runtime[]` on the upstream response option.
- **`enables_events_runtime`** — Per-option array on a response option naming events that this option unlocks when chosen. Writers fire `recordEnabledEvents`.
- **`closes_events_runtime`** — Per-option array naming events this option forecloses when chosen. Writers fire `recordClosedEvents`. Subject to the rupture-foreclosure policy.
- **`future_consequences[]`** — Player-facing narrative annotations of what an option opens / closes / shifts. Distinct from `enables_events_runtime` (player narrative vs engine wiring). May overlap; both are deterministic.
- **Ring 3** — Categorically refused sensitive-history surfaces per canon §1.3 (11 binding refusals). Engine-enforced via `RING3_SENSITIVE_FAMILIES` + `isRing3SensitiveFamily()` in `src/sim/events/event_families.ts`.
- **`source_tier`** — Required field on every event row. One of `icty_icj_un`, `agreement_text`, `balkan_battlegrounds`, `corroborated_participant`, `design_counterfactual`, `pending`. Loader-enforced.
- **`historical_default` / `staff_recommended`** — Two distinct response options. `historical_default` is the response history actually produced (used by bots under `bot_response_logic: "historical"` and is the calibration-discipline canonical path). `staff_recommended` is the design layer's separated recommendation surface for the human player; never the bot's path.

---

## 2. Authoring a new Phase D packet (step by step)

This section is the procedural body of the guide. Follow it in order for any new packet.

### 2.0 Pre-flight check

Run before any authoring.

1. **Is this a sensitive-history event?** If the event touches camp operations, ethnic targeting, paramilitary deployment, hostage taking, forced displacement, or any §1.3 #1-#11 surface — STOP. Jump to §3 below and do the §6 sign-off process before any further work.
2. **New authoring or extension?** Inspect the current authoring graph:
   ```bash
   node node_modules/tsx/dist/cli.mjs tools/diagnostics/event_family_graph.ts --format tree --root <foundational-id> --depth 2
   ```
3. **Calibration conflict check?** Confirm the target file does not overlap with active calibration work:
   ```bash
   git log --oneline --name-only -20 origin/claude/calibration-*
   ```
   If overlap exists, defer or coordinate with the calibration owner before authoring.

### 2.1 Worksheet (research-grounded events only)

When the event has historical content (not pure design counterfactual), author a research worksheet first:

- Location: `docs/40_reports/research/YYYYMMDD_EVENT_FAMILY_<id>.md`
- Required sections: trigger window with ICTY/ICJ/BB citations; canonical `historical_default`; the 2-3 counterfactual options with cost floors; the `source_note` paragraph including §3.6 forward-looking guard if sensitive-adjacent.
- Source hierarchy (from `docs/PROJECT_LEDGER_KNOWLEDGE.md`): ICTY/ICJ/UN first, then agreement text, then Balkan Battlegrounds, then corroborated participant accounts, then design counterfactual. The `source_tier` field on the row must match the strongest source actually cited.

### 2.2 JSON authoring

Pick the chronologically-correct file (`war_1992.json` / `war_1993.json` / `war_1994.json` / `war_1995.json`; or `consequences.json` for csq_* descendant rows).

Required fields on a new event row:

- `id` — kebab-case unique id. Bot-pool name-collision check: must not collide with operation names, formation names, or persona ids per the Stupčanica-95 lesson (see canon `SENSITIVE_HISTORY_DESIGN_GATE.md` §1.1 implementation-note).
- `family` — used for graph clustering and Ring 3 gating. Faction-prefixed (`rs_*`, `rbih_*`, `hrhb_*`) or cross-faction (`x_*`, `h5_*`, `un_*`, etc.).
- `source_tier` — see glossary; loader-enforced enum.
- `emergence_class` — one of `incident`, `pressure`, `threshold`, `duration`, `compound`, `exogenous`, `legacy_calendar_pending_conversion`.
- `requires_enabled[]` — list of upstream foundational/event ids that must be runtime-enabled for this row to be eligible.
- `historical_default_response_id` — the option id history actually produced.
- `bot_response_logic: "historical"` — canonical for every authored Phase D row. Preserves calibration discipline (napkin lesson).
- `responding_faction` — `RBiH` / `RS` / `HRHB`. The faction whose government chooses.
- `notifications_to_other_factions[]` — list of factions that observe the resolution.
- An OR-trigger condition predicate referencing one of the registered condition types in `event_vocabulary.ts:KNOWN_EVENT_CONDITION_TYPES`.
- `response_options[]` — typically 3 options. Each must carry an `id`, a `label`, optional `dimension_shifts[]`, optional `effects[]`, optional `future_consequences[]`, optional `enables_events_runtime[]`, optional `closes_events_runtime[]`.
- `source_note` — prose paragraph. Sensitive-adjacent rows MUST include the §3.6 forward-looking guard text (see §3 below).

### 2.3 Foundational extension (when adding a downstream)

If the new event hangs off a foundational decision:

1. Open the foundational row (`rs_strategic_goals` / `rbih_state_identity` / `hrhb_political_goal`).
2. For EACH option whose path leads to your new event, add the new event id to `enables_events_runtime[]` in **alphabetical** insertion order (via `strictCompare`).
3. For EACH such option, add a matching `future_consequences[]` entry of the form `{ id: "<opt>_to_<event>", label: "...", timing: "future", certainty: "conditional", opens_events: ["<event-id>"], explanation: "<citation-backed prose>" }`. The `opens_events` array and the `enables_events_runtime` array are deliberately parallel — engine reads `enables_events_runtime`, player UI reads `future_consequences[].opens_events`.

The canonical pattern is the existing R1/B1/H1 chains. Reference: `data/scenarios/events/war_1992.json` rows `rs_strategic_goals` (R1), `rbih_state_identity` (B1), `hrhb_political_goal` (H1).

### 2.4 Test counter bumps

The catalog count flows through multiple test assertions. After adding one new event row, bump:

- `tests/event_loader.test.ts` — total event count.
- `tests/event_loader_runtime_substrate.test.ts` — same total.
- `tests/sim/events/event_acceptance_report.test.ts` — total + required-response counter + modal-ready counter.
- `tests/sim/events/event_taxonomy_report.test.ts` — total + choice + required + historical-default + foundational future_consequence_count.
- `tests/sim/events/event_presidential_acceptance.test.ts` — catalog + probed + rows + player_surfaced + player_resolved + headless_auto.

The presidential-acceptance test uses a `requires_enabled` bypass (Packet 22 diagnostic probe fix) so it can reach gated rows. Do not "fix" that bypass.

### 2.5 Ledger

Append to the top of `docs/PROJECT_LEDGER.md`:

```
## [YYYY-MM-DD] codex: Phase D Packet N (subject)

- **Type.** ...
- **Change.** ...
- **Determinism.** ...
- **Verification.** ...
- **Artifacts.** ...
- **Responsible commit.** <sha>
```

Note the expected baseline-drift profile (see §2.6 categories). Within-52w packets may behaviorally fire; outside-52w packets are metadata-only.

### 2.6 Baseline refresh (only if behavioral drift expected)

If the event will fire within the 52w baseline window AND the consumer wiring is LIVE (i.e. a sub-flag has activated a Phase E consumer for the dimensions you wrote), drift is expected. Refresh:

```bash
UPDATE_BASELINES=1 node node_modules/tsx/dist/cli.mjs tools/scenario_runner/run_baseline_regression.ts
node node_modules/tsx/dist/cli.mjs tools/scenario_runner/run_baseline_regression.ts
```

The second run with `UPDATE_BASELINES` unset must report `Baseline regression: all scenarios match.`.

For metadata-only or catalog-pass-through drift (the typical Phase D case with all flags OFF), do NOT refresh — the baseline classification table in `docs/40_reports/implemented/20260528_PHASE_D_CLOSEOUT.md` shows what each tier looks like.

---

## 3. Sensitive-history canon-gate (Ring 1 / 2 / 3)

This is the load-bearing section. Read the canonical `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md` in full; this section is procedural summary, not a substitute.

### 3.1 Ring classification

| Ring | Treatment | Examples |
|---|---|---|
| Ring 1 | Modeled mechanically — structured state in the simulation | `war_crimes_events` counter, `srebrenica_genocide_1995` rupture, enclave resilience, displacement, paramilitary sweeps. Never authored as a discrete decision event with player options. |
| Ring 2 | Represented narratively — events, essays, Chronicle, Wrapped, Cost Ledger | Ahmići, Markale I/II, Bijeljina, Kravica, Stupni Do, Grabovica/Uždol, Tuzla Gate, the full Srebrenica arc essays. |
| Ring 3 | Categorically refused — the 11 binding entries in canon §1 | "Commit genocide" decision tree, concentration camp system, negotiable condemnation, body-count optimization, etc. |

The full Ring 3 list is canon §1 items 1-11. Do not author any event whose response options materialize a Ring 3 surface. If unsure, the canon §8 life lesson applies: *"When in doubt, the answer is no."*

### 3.2 §6 sign-off chain

Per canon §6, sensitive-adjacent events require a 4-specialist panel before authoring. This is the lived process that shipped Packets 40 / 41 / 42:

| Specialist | Role |
|---|---|
| `/historian` | ICTY/ICJ/UN source-tier evidence; named perpetrators in documented roles |
| `/game-designer` | Ring 3 boundary verification per canon §1.3; cost-floor magnitudes per Rulebook §3.6 |
| `/canon-compliance-reviewer` | §3.6 forward-looking guard enforcement; `RING3_SENSITIVE_FAMILIES` exact-match; `validateRing3EnablingRejection` pass |
| `/narrative-designer` | Canon §4 prosecutorial wording; no reward language; consequence framing |

Per canon §6.3, user approval is non-delegable on any change that could produce a "reward for atrocity" effect. Packets 40, 41, 42 all required user sign-off because every one of them touched that risk.

Reference precedent (read these before drafting a new sensitive packet):
- Packet 40 — R4 `concentration_camps_revealed_1992` — ICRC/Roy Gutman/Penny Marshall reporting; `historical_default: "deny"`; `cooperate_investigation` counterfactual carries maximum punitive cost floor.
- Packet 41 — B5 documentary fix — retired the non-registered `enclave_resilience` dimension; surrogate via `military_credibility -15`. Loader vocabulary pass (Packet 44) now catches this class.
- Packet 42 — H6 `hrhb_camp_exposure_response_1993` — Ring 3 family with EMERGENT trigger via H1 foundational option-resolved condition, NOT runtime-enabled.

### 3.3 §3.6 forward-looking guard text

Required content for any sensitive-adjacent `source_note`. One paragraph, ICTY/ICJ-cited:

1. Frame the event as a **response to existing state**, NOT authorization of a new sensitive act.
2. Explicitly prohibit downstream `csq_*` consequence rows from re-authoring: cleansing / forced-displacement / civilian-targeting / paramilitary-deployment / hostage-taking / detention-camp-expansion / ethnic-targeting.
3. Enumerate the adjacent sensitive surfaces that remain canon-gated through their existing event surfaces. Typical list: `drina_valley_ethnic_cleansing_1992`, `srebrenica_falls_1995`, `srebrenica_genocide_1995`, `un_hostage_crisis_1995`, `paramilitary_policy_rs_1992`, `deliberate_force_rs_compliance_1995`, `concentration_camps_revealed_1992`.
4. Cite the specific ICTY case and paragraph. Wikipedia is not acceptable. Balkan Battlegrounds is acceptable but not preferred when an ICTY paragraph is available.

The canonical reference example is the `source_note` on `concentration_camps_revealed_1992` in `data/scenarios/events/war_1992.json`. Read it before drafting your own.

### 3.4 Engine guards (what already catches you)

Three guards run at catalog load time. You cannot bypass them by author intent:

- **`validateRing3EnablingRejection`** at `src/sim/events/event_loader.ts` ~line 757. Rejects any catalog row whose response option's `enables_events_runtime[]` targets an event whose `family` matches `RING3_SENSITIVE_FAMILIES` (or its prefix set).
- **`CAMP_EXPOSURE_OPTION_IDS` freeze** at `src/sim/events/event_loader.ts` ~line 83. The canonical camp-exposure option set is `['deny', 'obstruct', 'cooperate']`. Adding, removing, or renaming options on a camp-exposure row is a structural canon violation.
- **`SREBRENICA_FORECLOSURE_ALLOWLIST`** at `src/sim/events/event_loader.ts` ~line 104. Empty by default. Adding a Srebrenica-foreclosure entry requires explicit Gate §6 sign-off with a one-line citation in the source comment.

### 3.5 Emergent-trigger pattern (Ring 3 family events)

Ring 3 family events CANNOT be runtime-enabled by H1 / R1 / B1 chains (Packet 42 H6 ran into this gate directly; `validateRing3EnablingRejection` blocks it). The canonical pattern is:

1. Author the event without `requires_enabled[]` references.
2. Give it an OR-trigger condition that is engine-state-predicate: a turn-window AND a Ring 1 mechanical condition (typical examples: `war_crimes_above`, `siege_active`, `enclave_supply_status`).
3. Document in `source_note` why the trigger is engine-state rather than runtime-enabled.

Reference: `hrhb_camp_exposure_response_1993` Packet 42.

---

## 4. Loader validation guarantees (Packet 44 + Phase B passes)

`event_loader.ts` runs twelve validation passes at catalog load. A failure throws and the catalog does NOT load, so authoring errors surface immediately. The passes most relevant to authoring:

| Pass | What it catches |
|---|---|
| `validateDimensionShiftVocabulary` | `dimension_shifts[].dimension` not in canonical 6 DimensionIds (see §5) |
| `validateEffectKindVocabulary` | `effects[].kind` not in `KNOWN_EVENT_EFFECT_KIND_SET` (see §5) |
| `validateRing3EnablingRejection` | Any `enables_events_runtime[]` targeting a Ring 3 family |
| `validateRuptureForeclosurePolicy` | Any `closes_events_runtime[]` referencing `srebrenica_falls_1995` or `srebrenica_genocide_1995` without an allowlist entry |
| Camp-exposure freeze | Catalog row in `concentration_camps_revealed_1992` or camp-exposure family with non-canonical option ids |
| Forbidden family slugs | Catalog row carrying `family: 'rs_drina_campaign'` (categorically rejected) |
| Cross-faction option-id disjointness | Same option id appearing across faction-distinct rows with causality wiring |
| Source-tier vocabulary | `source_tier` not in `VALID_SOURCE_TIERS` |
| Emergence-class vocabulary | `emergence_class` not in `VALID_EMERGENCE_CLASSES` |
| `bot_response_logic` vocabulary | Not in `VALID_BOT_RESPONSE_LOGIC` |
| `future_consequences[].timing` vocabulary | Not in `VALID_FUTURE_CONSEQUENCE_TIMING` |
| `future_consequences[].certainty` vocabulary | Not in `VALID_FUTURE_CONSEQUENCE_CERTAINTY` |

If your authoring throws at load: **fix the data**. Do not bypass.

---

## 5. Engine vocabulary (dual-channel architecture)

This is the single most common authoring mistake. The engine has TWO distinct channels that look identical in event JSON syntax but route entirely differently. The Packet 43 audit found 11 DEAD writes from confusing them.

Canonical reference: `memory/engine_dimension_vocabulary.md`.

### 5.1 Channel A — DimensionId (typed union, 6 names ONLY)

- **Authored via:** `dimension_shifts[].dimension`
- **Engine handler:** `applyDimensionShift` at `src/sim/events/strategic_dimensions.ts`
- **Registry:** `DIMENSION_IDS` array at `src/sim/events/strategic_dimensions.ts:5`

The six canonical DimensionIds:

| DimensionId | Meaning |
|---|---|
| `military_credibility` | Faction's perceived military effectiveness |
| `territorial_legitimacy` | Faction's territorial-claim legitimacy |
| `international_standing` | Faction's international diplomatic position |
| `patron_confidence` | Bilateral patron relationship score (Belgrade for RS; Zagreb for HRHB; US/Iran for RBiH) |
| `internal_cohesion` | Faction's internal political cohesion |
| `negotiating_leverage` | Faction's negotiating position strength |

Any other name in this channel is silently dropped (pre-Packet 44) or throws (post-Packet 44).

### 5.2 Channel B — EffectKind (separate dispatch, many names)

- **Authored via:** `effects[].kind`
- **Engine dispatch:** `applyEventEffects` at `src/sim/events/apply_effects.ts`
- **Registry:** `KNOWN_EVENT_EFFECT_KINDS` at `src/sim/events/event_vocabulary.ts:9`

The canonical EffectKinds (alphabetical, matches `EFFECT_KIND_ORDER`):

```
aggression_modifier, alliance_change, alliance_lock, bot_priority_shift,
cohesion_change, control_change, cost_ledger_annotation, doctrine_constraint,
equipment_grant, equipment_quality_modifier, guerrilla_threat,
humanitarian_impact, morale_change, narrative, negotiation_capital,
offensive_ops_suppression, patron_pressure, recruitment_modifier, supply_delta
```

Note that `recruitment_modifier` is a LIVE EffectKind (see `memory/recruitment_modifier_dead_channel.md` for the corrected investigation — the channel works; small multipliers on small pools round to zero deterministically). Magnitudes: `0.80x`-`1.20x` is subtle; `0.50x` or `1.50x` is stark.

### 5.3 Worksheet-to-engine substitution map

Historian worksheets often use natural-language dimension names. Substitutions:

| Worksheet term | Engine term | Channel | Notes |
|---|---|---|---|
| `national_identity` | `internal_cohesion` | Channel A (DimensionId) | Sum absolute deltas (Packet 23 precedent) |
| `alliance_lock(zagreb) -N` | `patron_confidence -N` | Channel A | DimensionId for patron relationship |
| `alliance_lock(belgrade) -N` | `patron_confidence -N` | Channel A | DimensionId for patron relationship |
| `alliance_lock(rbih) +N` | `alliance_change +N/10` | Channel B (EffectKind) | Scale-down because `alliance_change` is 0-1 not 0-100 |
| `territorial_loss` | `territorial_legitimacy -N` | Channel A | DimensionId |
| `recruitment_pool -N%` | `recruitment_modifier (1-N/100)x/Nt` | Channel B (EffectKind) | NOT `dimension_shifts` |
| `enclave_resilience` | `military_credibility -N` | Channel A surrogate | No direct field; `enclave_resilience` is NOT a registered name (retired in Packet 41) |

### 5.4 Critical rule

> A DimensionId in `effects[].kind` is DEAD. An EffectKind in `dimension_shifts[].dimension` is DEAD.

Packet 44 loader validation throws on either confusion at catalog load. The 11 DEAD writes remediated in Packet 43 were all the second pattern (EffectKinds `patron_pressure` + `alliance_change` placed inside `dimension_shifts`).

---

## 6. Phase E political-dimension propagation (consumer-side)

### 6.1 Architecture summary

Phase D writes dimensions to `FactionCapital.strategic_dimensions[]`. Phase E reads them via a feature-flag-gated consumer chain:

```
briefing.ts (surface political_dimensions block)
  -> sector_offensive.ts (per-dimension multiplier helper)
    -> emit.ts (combinedMult = intlMult * cohesionMult * ...)
      -> launch threshold = Math.ceil(baseMinForOp / combinedMult)
```

Currently wired (defaults OFF):

| Sub-flag | Dimension | Threshold | Multiplier when below | Helper |
|---|---|---|---|---|
| `AWWV_PDP_INTL_STANDING_OPS_HESITATION` | `international_standing` | 30 | 0.7x | `getIntlStandingOpsHesitationMultiplier` |
| `AWWV_PDP_COHESION_CAUTION_BIAS` | `internal_cohesion` | 40 | 0.85x | `getCohesionCautionBiasMultiplier` |

Master switch: `AWWV_POLITICAL_DIMENSION_PROPAGATION`. Both tiers must be ON for any consumer to fire.

Deferred (calibration territory overlap): `patron_confidence` -> `equipment_quality_modifier` (intersects `combat_math.ts` / `active_modifiers.ts`); `military_credibility` (intersects `force_eval.ts`).

### 6.2 Adding a new dimension wiring

Mirror the existing pattern exactly:

1. **Gate module** — add a new sub-flag pair to `src/sim/political/political_dimension_propagation_gate.ts`:
   - module-local override (`let _myDimensionOverride: boolean | null = null;`)
   - getter (`isMyDimensionEnabled()` reads env then override)
   - setter (`setMyDimensionOverride(value)` for tests)
   - combined helper (`isMyDimensionActive()` AND'd with global tier-1)
   - `resetPoliticalDimensionGates()` updated to clear the new override
2. **Briefing extension** — conditional spread in `src/sim/combat/commander/briefing.ts` adds the dimension to the `political_dimensions` block when the combined helper is true.
3. **Sector helper** — new multiplier function in `src/sim/combat/sector_offensive.ts` with threshold + multiplier constants; returns 1.0 fast-path when inactive (calibration-safety invariant).
4. **Emit consumer** — chain into `combinedMult` in `src/sim/combat/commander/emit.ts buildOperations`.
5. **Tests** — mirror `tests/phase_e2_cohesion_caution_bias.test.ts` and `tests/phase_e3_combined_activation.test.ts` patterns: flag-off byte identity, flag-on multiplier math, briefing integration, off-by-one threshold safety.
6. **Default OFF** — confirm baseline regression byte-identical with the new flag default OFF.

### 6.3 Activation procedure

The activation procedure is canonical and gated. See `docs/40_reports/implemented/20260528_PHASE_E_ACTIVATION_PROCEDURE.md`. Summary: pre-activation diagnostic baseline → threshold review → global tier-1 only → first sub-flag → calibration sign-off → next sub-flag.

Rollback is env-var-only — no save migration, no code revert. `Remove-Item Env:AWWV_POLITICAL_DIMENSION_PROPAGATION` reverts ALL sub-flags simultaneously.

---

## 7. Diagnostic tools (use these to verify your work)

All tools live under `tools/diagnostics/` and run via `node node_modules/tsx/dist/cli.mjs <path>`. None of them mutates production data.

| Tool | What it checks |
|---|---|
| `tools/diagnostics/event_taxonomy_report.ts` | Per-family event counts, source tiers, choice/required/historical_default summary |
| `tools/diagnostics/event_acceptance_report.ts` | Modal-ready production status (which rows can be surfaced to the player) |
| `tools/diagnostics/event_presidential_acceptance.ts` | Bot acceptance proof for `historical_default` rows |
| `tools/diagnostics/event_causality_chain.ts` (Phase F1) | Runtime causality from a save file — what fired, what enabled, what closed |
| `tools/diagnostics/sensitive_history_canon_gate_audit.ts` (Phase F2) | Canon §3.6 + §1.3 compliance audit; flags missing guards, weak cost floors, illegal Ring 3 enabling |
| `tools/diagnostics/event_family_graph.ts` (Phase F3) | Static authoring causality graph in DOT / tree / JSON formats |
| `tools/diagnostics/political_dimensions_snapshot.ts` (Phase E4) | Per-faction dimension state + Phase E sub-flag activation snapshot |
| `tests/phase_d_causality_runtime_integration.test.ts` (Phase F5) | End-to-end substrate verification — runs a scenario and asserts writers populate logs |

The F3 tool is the entrypoint for new authoring — it answers "what does the chain currently look like before I add to it?" in three formats.

---

## 8. Common patterns and anti-patterns

### 8.1 Do

- Author `historical_default` with `bot_response_logic: "historical"`. Preserves calibration discipline.
- Use canonical engine DimensionIds + EffectKinds; never invent new dimension names.
- Cite ICTY case + paragraph in `source_note` for any historical claim.
- Add the §3.6 forward-looking guard paragraph to sensitive-adjacent rows.
- Mirror existing patterns: Packet 40 for sensitive Ring 1/2; Packet 38 for non-sensitive RS-side; Phase E2 for new dimension wiring.
- Run loader validation (`tsc --noEmit` then vitest run on event_loader.test.ts) before any further integration testing.
- Author edits as ONE packet per commit. The napkin "one change per calibration run" lesson extends to event authoring.

### 8.2 Don't

- Do NOT author `recruitment_modifier` or any EffectKind in `dimension_shifts[].dimension`. DEAD channel; throws since Packet 44.
- Do NOT author a Ring 3 family event with upstream `enables_events_runtime[]` references. `validateRing3EnablingRejection` throws.
- Do NOT author positive `territorial_legitimacy` deltas on sensitive counterfactuals. Crosses the Ring 3 boundary.
- Do NOT add foreclosure entries for `srebrenica_falls_1995` or `srebrenica_genocide_1995` without explicit Gate §6 sign-off with a citation comment.
- Do NOT auto-edit `docs/10_canon/FORAWWV.md` per CLAUDE.md. Flag for manual review.
- Do NOT run `UPDATE_BASELINES=1` without first explaining the expected drift in your ledger entry.
- Do NOT bundle multiple packets into one commit. One packet, one commit, one ledger entry.
- Do NOT use the `requires_enabled` bypass in `event_presidential_acceptance.test.ts` as a model for production code. It is a diagnostic probe carve-out (Packet 22).
- Do NOT use `avoided_osids_by_faction` or initial OSID overrides as workarounds for calibration drift induced by your event. Fix the event, the cost floor, or the bot logic.

---

## 9. References and further reading

### Canon (authoritative)
- `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md` — Tier 2 canon: the WHY
- `docs/10_canon/Rulebook_v0_9_0.md` §5.8 — war_crimes_record informational-only rule
- `docs/10_canon/Engine_Invariants_v0_9_0.md` §15.2 — War Crimes Records

### Session-of-record reports
- `docs/40_reports/implemented/20260528_PHASE_D_CLOSEOUT.md` — full Phase D + §6 sign-off + Phase E expansion
- `docs/40_reports/implemented/20260528_PHASE_E_ACTIVATION_PROCEDURE.md` — activation playbook

### Engine source (read these when extending)
- `src/sim/events/event_loader.ts` — validation passes, Ring 3 enforcement, vocabulary checks
- `src/sim/events/event_families.ts` — `RING3_SENSITIVE_FAMILIES` + `isRing3SensitiveFamily()`
- `src/sim/events/event_vocabulary.ts` — `KNOWN_EVENT_EFFECT_KINDS` + `KNOWN_EVENT_CONDITION_TYPES`
- `src/sim/events/strategic_dimensions.ts` — `DIMENSION_IDS` (the canonical 6)
- `src/sim/events/apply_effects.ts` — `EFFECT_KIND_ORDER` deterministic dispatch
- `src/sim/events/evaluate_events.ts` — per-turn evaluator + causality writers
- `src/sim/political/political_dimension_propagation_gate.ts` — Phase E two-tier gate

### Memory files (rules of thumb)
- `memory/engine_dimension_vocabulary.md` — dual-channel canonical map
- `memory/recruitment_modifier_dead_channel.md` — corrected (channel IS live; rounding artifact)

### Source canon for citations
- ICTY completed cases: https://www.icty.org/en/cases
- ICJ Bosnia v. Serbia (2007)
- UN A/54/549 (1999) — Srebrenica fall report
- Balkan Battlegrounds vols. I-II

---

## 10. Decision flowchart

```
                  [ New event packet proposed ]
                              |
                              v
              +-------------------------------+
              | Touches Ring 3 surface?       |
              | (camps, cleansing, hostages,  |
              |  paramilitaries, ethnic       |
              |  targeting, etc.)             |
              +---------------+---------------+
                  |                       |
                YES                       NO
                  |                       |
                  v                       v
       +--------------------+   +--------------------+
       | STOP. Read canon   |   | Sensitive-adjacent |
       | §1.3 #1-#11. If    |   | (operational topic |
       | item appears in    |   | near a Ring 3      |
       | the refused list,  |   | surface)?          |
       | abandon packet.    |   +---+---------+------+
       | Otherwise: §6      |       |         |
       | sign-off chain.    |     YES         NO
       +---------+----------+       |         |
                 |                  v         v
                 v          +---------------+ +-------------+
       +--------------------+ §3.6 guard    | | Standard    |
       | 4-specialist panel | text required | | authoring   |
       | + user approval    | in source_note| | (§2.1-§2.6) |
       | non-delegable      | + cost-floor  | +------+------+
       +---------+----------+ punitive on   |        |
                 |            counterfactuals       v
                 v          +-------+-------+ +-------------+
       +--------------------+        |       | | Worksheet?  |
       | APPROVED_WITH_     |        v       | | (research   |
       | REVISIONS or       | +-------------+| | grounded)   |
       | REJECTED           | | Author per  || +---+---------+
       +---------+----------+ | §2.2-§2.6 + || |
                 |            | §3.3 guard  || YES NO
                 v            +------+------+| |  |
       +--------------------+        |       v  v
       | Mirror Packet 40/  |        v       Draft worksheet
       | 41/42 precedent +  | +-------------+ at §2.1, then
       | author per §2.2-   | | §2.2 JSON   | continue to
       | §2.6, §3.3 guard,  | | author with | §2.2.
       | §3.4 engine guards | | citations,  |
       | will block illegal | | source_tier,|
       | writes at load.    | | foundational|
       +--------------------+ | extension   |
                              | (§2.3)      |
                              +------+------+
                                     |
                                     v
                              +-------------+
                              | §2.4 bump   |
                              | test counts |
                              +------+------+
                                     |
                                     v
                              +-------------+
                              | §2.5 ledger |
                              | entry with  |
                              | drift class |
                              +------+------+
                                     |
                                     v
                              +-------------+
                              | Behavioral  |
                              | drift in    |
                              | 52w + flag  |
                              | ON?         |
                              +--+--------+-+
                                 |        |
                               YES        NO
                                 |        |
                                 v        v
                          +-----------+ +-----------+
                          | §2.6      | | Skip      |
                          | baseline  | | baseline  |
                          | refresh + | | refresh   |
                          | UPDATE=1  | +-----+-----+
                          | verify    |       |
                          +-----+-----+       |
                                |             |
                                v             v
                              +-----------------+
                              | Commit packet,  |
                              | run F2 + F3 +   |
                              | F5 diagnostics  |
                              | as smoke test   |
                              +-----------------+
```

---

End of guide. When this document and any cited source disagree, the source wins. When a future packet's pattern is genuinely novel, extend this guide rather than spelunking transcripts.
