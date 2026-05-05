# OQ-Growth Path Phase 0 Panel (Timeline-Data Variant) — CONDITIONS Verdict

**Date:** 2026-05-05
**Lane:** LANE-NIGHTSHIFT-OFFICER-LEARNING-RATE-TIMELINE-DATA-PHASE-0-PANEL
**Type:** Read-only Phase 0 panel synthesis — verdict + recommended option (B'.1 vs B'.2) + recommended numerics + binding conditions for any future Phase 1.
**Audit-only.** No engine, scenario, test, paint anchor, OOB, FORAWWV, political_controllers, rupture-wiring, or `enclave_resilience.ts` touch. No combat-math number tuned in this lane.
**Scope:** Evaluates **Fix Shape B' (timeline-data variant)** of the per-formation officer-quality growth lever, in two sub-options:
- **B'.1** — replace scalar `officer_config.<faction>.learning_rate_per_turn` in `data/scenarios/timelines/apr1992.json` with a step-curve at the *highest-precedence* (path #1) firing surface.
- **B'.2** — add a new `learning_rate_per_turn_step_curve` field at higher precedence than the existing scalar `learning_rate_per_turn`; preserve the scalar as fallback.

This panel inherits the Phase 0 OQ-Growth panel structure (`af080eac`), the Phase 1 verdict-only finding (`a42ebae0`), and the new "production reachability" panel discipline mandated in PROJECT_LEDGER_KNOWLEDGE 2026-05-05 entries.

---

## Predecessor Chain (binding context)

1. `docs/40_reports/audits/20260504_FORCE_QUALITY_GAP_2_VERIFICATION.md` (Wave 3, `20c3aa05`) — Gap 2 trace.
2. `docs/40_reports/implemented/20260504_RECONSTITUTION_POLICY_REVIEW.md` (Wave 4, `e9584dd3`) — `reinforcement_mult` step-curve in **timeline data**, faction-symmetric mechanism via `lookupStepCurve(...)`. **The canonical timeline-data step-curve precedent this panel mirrors.**
3. `docs/40_reports/implemented/20260504_RECONSTITUTION_188W_VERIFICATION.md` (Wave 6, `cc829ebb`) — DISPROVED Wave 4 hypothesis at 188w.
4. `docs/40_reports/audits/20260505_OFFICER_CASUALTY_MULT_PHASE_0_PANEL.md` (Lane A panel, `7c3792d7`) — pattern.
5. `docs/40_reports/implemented/20260505_OFFICER_CASUALTY_MULT_PHASE_1.md` (Lane A redo, `411f6843`) — VERDICT-REPORT-ONLY; Lane A casualty-side multiplier disproved on 188w.
6. `docs/40_reports/audits/20260505_OFFICER_QUALITY_GROWTH_PATH_AUDIT.md` (`a4b71ac5`) — named the per-brigade growth term as the dominant force; produced the n1665 stayer-Δ attribution (~3:1 growth-dominant).
7. `docs/40_reports/audits/20260505_OFFICER_QUALITY_GROWTH_PATH_PHASE_0_PANEL.md` (`af080eac`) — predecessor Phase 0 panel; CONDITIONS verdict on Fix Shape B (the *constants* variant).
8. `docs/40_reports/implemented/20260505_OFFICER_QUALITY_GROWTH_PHASE_1.md` (`a42ebae0`) — Phase 1 VERDICT-REPORT-ONLY; **uncovered the load-bearing meta-finding** that Phase 1 was DORMANT in production due to timeline-precedence shadowing (path #1 timeline scalar always won; path #4 fallback step-curve never activated).

## Cross-Lane Finding (load-bearing for this panel)

> **Three proximate levers now ruled out around officer_quality. The fourth attempt must target the actually-firing path.**

Wave 4 (per-faction *reinforcement* budget), Lane A (per-faction *casualty-side* multiplier), and Phase 1 (per-faction *growth-side* multiplier step-curve at path #4) have all been disproved on 188w trajectory data. The first two failed because they were proximate per-faction multipliers; the third failed because the new lever was *production-dormant* — it sat at path #4 of a 4-level precedence chain with `data/scenarios/timelines/apr1992.json`'s scalar `learning_rate_per_turn` always winning at path #1.

Per the new PROJECT_LEDGER_KNOWLEDGE entry "Three-lever-failures-in-a-row signal upstream redirect at the data level, not just the math level", the fourth lane must pivot to the *scenario-data layer*. Fix Shape B' is exactly that pivot.

This panel additionally enforces the new mandatory **production reachability** discipline (PROJECT_LEDGER_KNOWLEDGE 2026-05-05): Phase 0 panels must trace the runtime code path against current scenario data and confirm the proposed lever's path actually fires before approving Phase 1.

---

## Production Reachability Trace (binding new artifact — criterion 11)

**Surface inspected (read-only):**

`src/sim/combat/officer_quality_update.ts:127-147` — the 4-level precedence chain inside `updateBrigadeOfficerQuality`:

```ts
const timelineConfig = state.military.war_timeline?.officer_config?.[faction];
let combatGrowthPerTurn: number;
if (typeof timelineConfig?.learning_rate_per_turn === 'number') {
    combatGrowthPerTurn = timelineConfig.learning_rate_per_turn;            // PATH #1
} else if (typeof timelineConfig?.learning_rate_multiplier === 'number') {
    combatGrowthPerTurn = COMBAT_GROWTH_BASE * timelineConfig.learning_rate_multiplier;   // PATH #2
} else if (typeof timelineConfig?.learning_rate === 'number') {
    combatGrowthPerTurn = COMBAT_GROWTH_BASE * timelineConfig.learning_rate;              // PATH #3 (DEPRECATED)
} else {
    combatGrowthPerTurn = COMBAT_GROWTH_BASE * (FACTION_LEARNING_RATE[faction] ?? 1.0);   // PATH #4 (hardcoded fallback — Phase 1's surface)
}
```

**Scenario data at `data/scenarios/timelines/apr1992.json` `officer_config` (verbatim):**

| faction | `learning_rate_per_turn` | `learning_rate_multiplier` | `learning_rate` |
|---|---|---|---|
| RS | **0.007** (scalar present) | absent | absent |
| RBiH | **0.015** (scalar present) | absent | absent |
| HRHB | **0.010** (scalar present) | absent | absent |

**Active path per faction with current scenario data:**

| faction | Active path | Effective per-turn combat growth | Frontline growth (× 0.5) |
|---|---|---|---|
| RS | **#1 (timeline `learning_rate_per_turn`)** | 0.007 / turn | 0.0035 / turn |
| RBiH | **#1 (timeline `learning_rate_per_turn`)** | 0.015 / turn | 0.0075 / turn |
| HRHB | **#1 (timeline `learning_rate_per_turn`)** | 0.010 / turn | 0.0050 / turn |

**Reachability verdict:** Path #1 fires for {RS, RBiH, HRHB} because `timeline.officer_config.<faction>.learning_rate_per_turn` is a number scalar present in `apr1992.json` for all three factions. Paths #2, #3, and #4 are unreachable in production with the current scenario data.

**Phase 1 (`a42ebae0`) post-mortem:** The Phase 0 panel for Fix Shape B (the *constants* variant) approved a step-curve replacement at path #4 (`FACTION_LEARNING_RATE`). Phase 1 implementation was structurally correct but DORMANT — path #4 never fired in production. n1667 trajectory data was nearly-identical to Lane A n1665 (which made *no change* to this code path at all). Hash drift `781e4009ba528833` vs baseline `ef03ab4d6c5ecd28` came from secondary effects (test-file extensions, new docstring constants), not from the load-bearing growth math.

**Fix Shape B' targets the actually-firing path:**
- **B'.1** modifies path #1 directly — replace the scalar with a step-curve consumed at path #1.
- **B'.2** inserts a new path #0 (or equivalent rename "path #1 step-curve") at higher precedence than the scalar; the scalar remains as fallback (still path #1) and the existing #2/#3/#4 chain is unchanged.

Both options route the new lever onto the actually-firing call site. The reachability gate is satisfied **structurally** for both options. Phase 1 must additionally re-trace at runtime via brigade temporal log instrumentation to confirm production reachability holds (criterion 11; binding).

---

## Source Surface (read-only inspection)

**Existing precedent — Wave 4 timeline-data step-curve (`reinforcement_mult`):**

`data/scenarios/timelines/apr1992.json` already contains the exact step-curve shape this panel proposes for the OQ-Growth lever. From the file:

```json
"reinforcement_mult": {
    "RS": [
        { "start_turn": 0, "end_turn": 52, "value": 1.0 },
        { "start_turn": 52, "end_turn": 78, "value": 0.85 },
        { "start_turn": 78, "end_turn": 104, "value": 0.65 },
        { "start_turn": 104, "end_turn": 9999, "value": 0.45 }
    ],
    ... (RBiH, HRHB analogous)
}
```

`lookupStepCurve(entries, turn, defaultValue)` (`src/state/war_timeline.ts:107-113`) is faction-agnostic, deterministic, and accepts numeric `value` of any sign. **The mechanism imposes no constraint on the sign of the data** — Wave 4 used positive-only multipliers; Fix Shape B' (in either variant) extends the data range to potentially include negative values for late-war late-turn bands when scaled to per-turn rates.

**Validator surface (`src/state/war_timeline.ts:276-304`):** Currently validates that exactly one of `learning_rate_per_turn` / `learning_rate_multiplier` / `learning_rate` is present and a `number`. **Both B'.1 and B'.2 require the validator to additionally accept `learning_rate_per_turn` as a `StepCurveEntry[]` (B'.1) OR add validation for a new `learning_rate_per_turn_step_curve` field (B'.2).** This is a non-trivial type-signature surface change for B'.1 (the `FactionOfficerConfig.learning_rate_per_turn` field shape changes from `number` to `number | StepCurveEntry[]`), and a smaller surface change for B'.2 (new optional field; existing scalar shape preserved).

**Consumer surface — every call site reading `learning_rate_per_turn`:**

| Site | Current behavior |
|---|---|
| `src/sim/combat/officer_quality_update.ts:138` | `if (typeof timelineConfig?.learning_rate_per_turn === 'number') { combatGrowthPerTurn = timelineConfig.learning_rate_per_turn; }` — scalar-only |
| `src/state/war_timeline.ts:290` | validator: `typeof c.learning_rate_per_turn === 'number'` — scalar-only |
| `src/state/officer_types.ts:187` | type: `learning_rate_per_turn?: number;` |

(Searched `src/` for `learning_rate_per_turn`. The 3 hits above are the consumers; the rest are docs/data/derived.)

**Faction-symmetric mechanism check on the proposed accessor:** Both B'.1 and B'.2 must promote the type signature to accept either a scalar or a step-curve, AND ensure all access sites route through one accessor (faction-agnostic; no `if (faction === 'X')` branches). Recommendation: add an internal helper `resolveTimelineLearningRatePerTurn(config, turn): number | undefined` that handles both shapes and returns `undefined` when neither is present. Caller at line 138 uses `if (typeof resolved === 'number')` to preserve the existing 4-level precedence chain.

---

## Panel Member 1 — /game-designer

**Skill file:** `.claude/skills/game-designer/SKILL.md`
**Authority:** Design intent and mechanic consistency with Game Bible / Rulebook; canon interpretation; Ring boundary interpretation under `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md`.
**Question:** Does Fix Shape B' (in either variant) align with the negative-sum thesis? Ring classification? Does it cross any §6 surface? Recommended option (B'.1 vs B'.2)?

### Findings

**Negative-sum thesis alignment (Game Bible §13, §17–§18):** Same alignment as the predecessor Fix Shape B. The lever encodes the *first* per-formation force-quality decay as a function of cumulative war duration in the actually-firing path. This is more thesis-aligned than a flat ceiling (Fix A) and more direct than the constants-level Fix B (which never fired). The negative-going late-war bands model VRS late-war cadre erosion as a doctrinally-grounded depletion of finite military quality — exactly what §13 and §18 describe.

**Ring classification:** Ring 1 — modeled mechanically. Per `SENSITIVE_HISTORY_DESIGN_GATE.md` §1, Ring 1 is the structured-state combat surface. The change is in scenario-data only (data, not logic). The mechanism `lookupStepCurve` is canonical; only the data surface in `apr1992.json` is extended. Mirrors Wave 4 step-curve precedent exactly. Negative test row-by-row against §1.5 Ring 3 prohibitions: no surface crosses any prohibition (same row-by-row analysis as the predecessor B panel; the data-level vs constants-level distinction does not change Ring classification).

**§6 sign-off chain:** **NOT TRIGGERED.** Row-by-row negative test (per `SENSITIVE_HISTORY_DESIGN_GATE.md` §6 table) — no rupture, no atrocity, no condemnation flag, no paramilitary policy surface, no Cost Ledger wording, no essay touching atrocity, no enclave-mechanics change, no "reward for atrocity" effect. The lever is internal combat-math at the scenario-data level.

**Recommended option: B'.2 (add new field).**

Rationale:
1. **Backward-compatible.** Existing scalar `learning_rate_per_turn` remains valid; future scenarios without step-curve data continue to work; non-canonical faction codes that define only the scalar are unaffected.
2. **Smaller type-signature churn.** B'.1 requires changing `FactionOfficerConfig.learning_rate_per_turn` from `number` to `number | StepCurveEntry[]`; every consumer of this field (3 sites in `src/`) must handle both shapes. B'.2 adds a single new optional field; existing consumers continue reading the scalar; one new precedence path is added.
3. **Cleaner precedence-chain documentation.** B'.2 makes the precedence ordering explicit at the field level: `learning_rate_per_turn_step_curve > learning_rate_per_turn (scalar) > learning_rate_multiplier > learning_rate (deprecated) > hardcoded fallback step-curve > DEFAULT 1.0`. The reachability trace becomes self-documenting through field naming.
4. **Lane velocity.** B'.2 ships in fewer LOC and fewer test fixtures; lane velocity matters because this is the FOURTH attempt at bending the same arc.

B'.1's only theoretical advantage is "no new fields" — but the mechanism's faction-symmetric-with-asymmetric-data shape is preserved either way, and the precedence-chain ergonomics favor B'.2.

**One concern flagged for Phase 1 (B'.2):** The new field name must be unambiguous about precedence. Recommended: `learning_rate_per_turn_step_curve` (matches the scalar's name + suffix indicating shape). The validator must reject the case where BOTH the scalar AND the step-curve are defined for the same faction (ambiguous; force the scenario author to pick one). This mirrors the existing validator's handling of mutually-exclusive `learning_rate_per_turn` vs `learning_rate_multiplier` (current implementation accepts whichever is set; the panel recommends Phase 1 add a "both present" warning or error).

**A second concern:** This is the FIRST time the engine will consume a step-curve with potentially-negative values from scenario data (Wave 4 `reinforcement_mult` is positive-only; the OQ-Growth lever's late-war bands cross zero per the recommended numerics below). The data file must include a comment block documenting that values may be negative for this specific field (`learning_rate_per_turn_step_curve`), distinct from `reinforcement_mult` semantics.

### Verdict on B'.1: **GO** (Ring 1, faction-symmetric, mirrors precedent) but **NOT RECOMMENDED** vs B'.2

### Verdict on B'.2: **GO** — Ring 1, faction-symmetric, preserves backward compatibility, cleaner precedence

### Recommended numerics (per-turn rate scaling of predecessor Phase 0 panel multipliers)

The predecessor Phase 0 panel approved RBiH `const 1.5` / RS `0.7→0.4→0.0→-0.4` / HRHB `1.0→0.7→0.3→-0.2` as multipliers on `COMBAT_GROWTH_BASE = 0.01`, plus a per-faction baseline scalar (RS=0.007 = 0.7×, RBiH=0.015 = 1.5×, HRHB=0.010 = 1.0×) currently in the timeline data. These two layers must be unified for the timeline-data variant.

The unified approach: at each band, the per-turn rate equals the predecessor multiplier × the faction's *current* timeline scalar. This preserves the current scenario's calibration in the first band (so the first-band 40w smoke bytes-identical to baseline by construction at the data-level) and applies the predecessor panel's late-war ratios to subsequent bands.

| faction | <w52 | w52–w77 | w78–w103 | w104+ | derivation | rationale |
|---|---|---|---|---|---|---|
| RBiH | 0.015 | 0.015 | 0.015 | 0.015 | const 1.5× × current 0.015 = const 0.015 | **CONTROL** — preserves canonical professionalization arc; predecessor panel explicit |
| RS | 0.007 | 0.004 | 0.000 | -0.0028 | 1.0×, 0.57×, 0.0×, -0.4× of 0.007 baseline | matches predecessor 0.7/0.4/0.0/-0.4 ratios applied to RS's actual per-turn rate |
| HRHB | 0.010 | 0.007 | 0.003 | -0.002 | 1.0×, 0.7×, 0.3×, -0.2× of 0.010 baseline | matches predecessor 1.0/0.7/0.3/-0.2 ratios |
| DEFAULT | (no step-curve; falls through) | | | | hardcoded fallback `FACTION_LEARNING_RATE` × `COMBAT_GROWTH_BASE` | preserves byte-stability for non-canonical faction codes |

**Per-turn rate magnitudes (B'.2 specifically):**

```json
"officer_config": {
    "RS": {
        "faction": "RS",
        "learning_rate_per_turn": 0.007,            // PRESERVED as fallback (matches existing baseline)
        "learning_rate_per_turn_step_curve": [
            { "start_turn":   0, "end_turn":  52, "value":  0.007 },
            { "start_turn":  52, "end_turn":  78, "value":  0.004 },
            { "start_turn":  78, "end_turn": 104, "value":  0.000 },
            { "start_turn": 104, "end_turn": 9999, "value": -0.0028 }
        ],
        "brain_drain_rate": 0.001,
        "brain_drain_start_week": 40,
        "generic_replacement_competence": 2
    },
    "RBiH": {
        "faction": "RBiH",
        "learning_rate_per_turn": 0.015,             // CONTROL — unchanged
        ... (no step-curve — scalar wins)
    },
    "HRHB": {
        "faction": "HRHB",
        "learning_rate_per_turn": 0.010,             // PRESERVED as fallback
        "learning_rate_per_turn_step_curve": [
            { "start_turn":   0, "end_turn":  52, "value":  0.010 },
            { "start_turn":  52, "end_turn":  78, "value":  0.007 },
            { "start_turn":  78, "end_turn": 104, "value":  0.003 },
            { "start_turn": 104, "end_turn": 9999, "value": -0.002 }
        ],
        ...
    }
}
```

**Note on RBiH:** RBiH does NOT receive a step-curve at all — the scalar `learning_rate_per_turn: 0.015` wins through the existing scalar precedence chain (path #1 below the new step-curve path). This is intentional and panel-explicit: RBiH is the CONTROL; preserves canonical professionalization arc.

### Concerns flagged
1. The new field name `learning_rate_per_turn_step_curve` must be added to `FactionOfficerConfig` and validated. The validator must enforce step-curve contiguity (Wave 4 precedent already validates `reinforcement_mult` for this; the same `validateStepCurveEntries` helper applies) AND must accept negative `value` numbers (it currently accepts via `value: number` shape; no sign constraint — verified with /determinism-auditor).
2. The data file's `officer_config` keys must be sorted in canonical alphabetical order (HRHB, RBiH, RS) when Phase 1 ships — the current ordering in `apr1992.json` is RS, RBiH, HRHB; this is *not* sorted but is currently consumed via key access (not iteration), so it's not a determinism risk. Phase 1 must avoid re-ordering keys (would create unnecessary diff noise).

---

## Panel Member 2 — /historian

**Skill file:** `.claude/skills/historian/SKILL.md`
**Authority:** Bosnian war historical knowledge derived from Balkan Battlegrounds + ICTY-cited primary sources.
**Question:** Are the proposed per-turn rate magnitudes historically defensible? VRS cadre quality through 1994-95 (cumulative casualties of experienced officers; conscription dilution); HVO 1994-95 reorganization effect on officer corps; ARBiH professionalization arc.

### Findings

**Per-turn rate scaling preserves the directional grounding of the predecessor Phase 0 panel.** The predecessor panel's ratios (RS 1.0/0.57/0.0/-0.4; HRHB 1.0/0.7/0.3/-0.2) were grounded in:
- VRS conscription crisis 1994-95 (BB2; replacement officers from short-course reserves NOT JNA-academy cadre).
- HVO 1994 Federation transition (Lasva Valley operational losses; HV politicization).
- ARBiH local-promotion-to-cadre arc (II Tuzla / V Bihać corps maturation 1993-95).

Scaling these ratios down to per-turn rates does not change the directional grounding — the magnitudes are merely expressed in absolute units (per-turn rate) rather than relative units (multiplier on `COMBAT_GROWTH_BASE`). The bracket boundaries (w52, w78, w104) match Wave 4 `reinforcement_mult` precedent and align with historical phases (early 1993 / mid-1993 / early 1994).

**RBiH preserved at constant 0.015:** The current `apr1992.json` scalar `0.015` is the doctrinal "rabble-to-corps" rate that produced n1665 stayer Δ/turn = +0.004019/turn (parent audit §4.2). Preserving it across all turns (no step-curve) preserves the doctrinally-correct trajectory. This matches the predecessor panel's CONTROL designation.

**RS deepest-band magnitude check (-0.0028/turn):** Over the w104+ window (84 turns), per-turn rate of -0.0028 produces approximately -0.235 of cumulative officer_quality decay before the per-formation dampener `(1.0 - quality * 0.5)` is applied — the dampener reduces the rate further (multiplier 0.55-0.975 depending on quality). Net cumulative decay over w104+ is approximately -0.13 to -0.18 from the growth-side path alone, before adding the existing per-battle casualty-side decay. Combined with the existing `applyOfficerCasualtyLoss` term, the projected VRS officer_quality trajectory at t188 lands in the 0.30-0.50 band, doctrinally correct for VRS late-war.

**HRHB deepest-band magnitude check (-0.002/turn):** Over 84 turns: cumulative -0.168 before dampener. Projected HRHB officer_quality at t188 lands in the 0.20-0.30 band, doctrinally correct.

**Comparison with predecessor panel's predicted arcs:** /historian on the predecessor panel approved bands of `0.7/0.4/0.0/-0.4` × `COMBAT_GROWTH_BASE = 0.01` = `0.007/0.004/0.000/-0.004` per-turn for VRS, and `1.0/0.7/0.3/-0.2` × `0.01` = `0.010/0.007/0.003/-0.002` for HRHB. The current panel's RS w104+ value `-0.0028` is slightly smaller magnitude than the predecessor's `-0.004` (because we're scaling ratios on the actual scalar 0.007 not on 0.01, and -0.4 × 0.007 = -0.0028 not -0.0040). HRHB matches exactly. The slight RS softening is a numeric artifact of the per-turn-rate scaling and is *historically defensible*: the pre-existing scalar 0.007 is itself slightly below `COMBAT_GROWTH_BASE × FACTION_LEARNING_RATE.RS = 0.01 × 0.7 = 0.007` (exactly). No directional inversion; the magnitude is approximately preserved.

**BB-citation block recommended for Phase 1 lane report:** Same as predecessor — VRS conscription crisis BB2 chapter on RS late-war manpower; HVO Federation-transition rotation BB1+BB2 chapters on Washington Agreement aftermath; ARBiH local-promotion BB2 II Tuzla / V Bihać corps maturation. Numeric magnitudes are trace-grounded; BB citations strengthen the directional grounding.

**Atrocity-as-tactic check:** PASS. Same row-by-row analysis as predecessor — calendar-keyed force-quality decay is canonically permitted (Wave 4 precedent); the prohibition on calendar-keyed *atrocity* recording (§1.5 #11) does not apply.

### Verdict on B'.1 / B'.2: **GO** — historically defensible; per-turn rate magnitudes preserve predecessor panel directional grounding; B'.2 preferred for backward-compatibility (concur with /game-designer)

### Recommended numerics (concur with /game-designer)

| faction | <w52 | w52–w77 | w78–w103 | w104+ |
|---|---|---|---|---|
| RBiH | const 0.015 (no step-curve) | | | |
| RS | 0.007 | 0.004 | 0.000 | -0.0028 |
| HRHB | 0.010 | 0.007 | 0.003 | -0.002 |

### Concerns flagged
1. Phase 1 lane report should include the BB-citation block grounding the directional claim about VRS/HRHB late-war cadre erosion at volume/page level. Carry-over from predecessor panel.
2. The lever does NOT model UNPROFOR / comms-asymmetry / ammo-scarcity surfaces (per `MEMORY.md` "P0 historical gaps"). Out of scope; unchanged from predecessor panel.

---

## Panel Member 3 — /scenario-creator-runner-tester

**Skill file:** `.claude/skills/scenario-creator-runner-tester/SKILL.md`
**Authority:** Scenario harness, run interpretation, calibration regression assessment, ahistorical-result flagging.
**Question:** What calibration regression is required for B'.2? 40w anchors / benchmarks tolerance bands; 188w trajectory shape; 188w final state hash drift expected; 5 stop triggers; recommended Phase 1 acceptance gate band sizes.

### Findings

**Current calibration baseline (binding):**
- 40w n1666 (Phase 1 dormant impl): hash `ef03ab4d6c5ecd28` byte-identical to baseline n1640 (because path #4 never fired); anchors 26/27 (only `op:brcko:brka_2` failing — pre-existing P0); benchmarks 6/6 PASS; area-weighted ≥93%. **B'.2 with the recommended numerics will preserve byte-identical 40w hash by construction** because all w<52 step-curve values match the current scalar exactly (RS 0.007=0.007, RBiH unchanged 0.015, HRHB 0.010=0.010). This is a unique property of the timeline-data variant: scaling ratios on the *current* scalar makes the first-band an identity.
- 188w n1665 (Lane A redo, full-emit): final_state_hash `6d3ff5b4669ccb80`. n1667 (Phase 1 dormant): final_state_hash `781e4009ba528833`.
- New diagnostic available: `tools/diagnostics/officer_quality_growth_trace.cjs` (parent audit ship). Binding stayer-Δ gate for Phase 1.

**Hash-drift expectation (B'.2):**
- 40w hash: **expected byte-identical** (or nearly-so) — first-band step-curve values match current scalars exactly. Drift could only emerge from secondary effects (test fixture additions, validator behavior changes); the load-bearing growth math at w<40 is structurally unchanged.
- 188w hash: **expected to drift significantly** — w52+ band step-curve values diverge from current scalars; the lever bites starting w52 onward.

**Per-faction trajectory expectation (B'.2 at recommended numerics):**

For VRS at quality ~0.55 (current t1 mean):
- w0-51: growth at +0.007/turn × dampener ≈ +0.004/turn average; cumulative +0.21; quality climbs toward ~0.76 (clamped at cap 0.90). (Effectively unchanged from current behavior.)
- w52-77: growth at +0.004/turn × dampener ≈ +0.0023/turn; cumulative +0.060 over 26 turns. (Reduced absorption rate.)
- w78-103: growth at +0.000/turn = no growth; flatline.
- w104-188: growth at -0.0028/turn × dampener ≈ -0.0017/turn; cumulative -0.142 over 84 turns.

Net 188w cumulative growth-path delta for VRS surviving stayer: roughly +0.21 +0.06 +0.00 -0.142 = **+0.128**, vs current path's roughly +0.4-0.6. **This is a SIGNIFICANT reduction in growth-path contribution.** Combined with the existing per-battle casualty-side decay (~-0.05 to -0.10 over 188 turns of cumulative skirmishing), projected VRS surviving stayer Δ/turn = **roughly -0.0001 to +0.0005** — i.e., bending close to zero or slightly negative. **CRITERION 3+4 PASS PROJECTED for VRS.**

For HRHB at quality ~0.227 (current t1 mean):
- w0-51 cumulative +0.30; w52-77 cumulative +0.060; w78-103 cumulative +0.020; w104-188 cumulative -0.10.
- Net 188w cumulative growth-path delta: roughly **+0.28**, vs current path's roughly +0.42. Combined with existing casualty-side decay, projected HRHB stayer Δ/turn = **roughly +0.0010 to +0.0014**. **CRITERION 3+4 MAY FAIL for HRHB** — closer to zero but still positive.
- If HRHB criterion 3 fails while VRS criterion 3 passes, the stop-trigger fires; do NOT bundle a re-tune. The follow-up lane re-tunes HRHB w104+ band only (e.g., -0.005 instead of -0.002).

For RBiH at quality ~0.087 (current t1 mean):
- Unchanged trajectory; stayer Δ/turn projected at +0.004/turn (matches n1665 baseline). Control-faction sanity check.

**The new binding gate:** Same as predecessor — `tools/diagnostics/officer_quality_growth_trace.cjs` re-run on 188w output; per-formation stayer Δ/turn is the binding criterion that disambiguates per-brigade-growth-fix from survivorship-artifact.

**Acceptance gate proposal — full calibration regression required:**

| Gate | Current baseline | B'.2 ship requirement | Rationale |
|---|---|---|---|
| 40w anchors | 26/27 (n1666) | **≥ 26/27 PASS** | First-band step-curve = current scalar; anchor stability preserved by construction |
| 40w benchmarks | 6/6 (n1666) | **6/6 PASS** | Same |
| 40w area-weighted | 93.3% (n1640) | **≥ 92.5%** (-0.8pp tolerance, tighter than predecessor's -1.8pp) | Tighter band justified: first-band is byte-identical by construction |
| 40w hash | `ef03ab4d6c5ecd28` | **expected byte-identical or near-identical** (drift NOT a gate) | First-band step-curve = current scalar; structural identity at w<40 |
| 40w faction OSID counts | RS=381, RBiH=245, HRHB=86 | Within ±5 per faction | Sanity check |
| 188w `final_state_hash` | `6d3ff5b4669ccb80` (Lane A) / `781e4009ba528833` (Phase 1 dormant) | **Must emit** (no OOM during summary write) | Wave 7 Lane B unblocked this gate |
| **188w VRS faction-mean Δ/turn** | +0.000597 (n1665) / +0.000780 (n1667) | **≤ 0** (nonpositive; doctrinal sign -1) | Primary success criterion |
| **188w HRHB faction-mean Δ/turn** | +0.002192 (n1665) / +0.00219 (n1667) | **≤ 0** (nonpositive; doctrinal sign -1) | Primary success criterion |
| 188w RBiH faction-mean Δ/turn | +0.003979 (n1665) / +0.00386 (n1667) | **≥ +0.001** (positive; control) | Control-faction sanity check |
| **188w VRS STAYER Δ/turn** (NEW BINDING) | +0.000463 (n1665) / +0.000650 (n1667) | **≤ 0** (nonpositive) | The per-formation gate |
| **188w HRHB STAYER Δ/turn** (NEW BINDING) | +0.002224 (n1665) / +0.002249 (n1667) | **≤ 0** (nonpositive) | Same |
| 188w RBiH STAYER Δ/turn | +0.004019 (n1665) / +0.003875 (n1667) | **≥ +0.001** | Control-faction at per-formation level |
| 188w RS active brigade count | 51 (n1665, n1667) | **≥ 35** | No dissolution cascade |
| **NEW — Production reachability runtime trace (criterion 11)** | n/a | Phase 1 must include a runtime trace (e.g., one-time instrumentation log on first 10 turns of 188w smoke) confirming **path #0/#1 step-curve fires for all three factions** at runtime; reverifies the structural reachability gate at runtime | Binding new artifact per Phase 0 panel discipline upgrade |
| Existing tests | All GREEN | **≥ 6 new lane tests + GREEN focused regression** | Test suite is the floor |
| `npx tsc --noEmit` | clean | clean | Type-check binding |

**Plausibility check (B'.2 at recommended numerics):**
- VRS at quality 0.55 → climbs to ~0.74 by w52, slowdown w52-77, flatline w78-103, decline w104-188 to ~0.55. Doctrinally correct VRS late-war arc.
- HRHB at quality 0.23 → climbs to ~0.45, slowdown, plateau, slight decline. May land at 0.30-0.40 band.
- RBiH unchanged: climbs to cap 0.90.

**The arcs are plausible. The 188w smoke is the binding verdict gate — same as predecessor.**

**Stop triggers Phase 1 must respect (carried from predecessor panel):**
1. If 188w VRS+HRHB faction-mean Δ/turn does NOT bend nonpositive → STOP, Wave-6-style verdict report; do NOT retune in-lane. **FOURTH hypothesis-disproved precedent** → re-engage panel; Fix Shape C re-elevation may become the next investigation.
2. If 188w VRS+HRHB STAYER Δ/turn (per `officer_quality_growth_trace.cjs`) does NOT bend nonpositive → STOP; survivorship contamination biting.
3. If 40w benchmarks drop below 6/6 → STOP, bot calibration regression.
4. If 188w RS active brigade count drops below 35 → STOP, dissolution cascade.
5. If `final_state_hash` fails to emit at 188w → STOP, do NOT retry without diagnosis.

**Recommended Phase 1 dispatch shape (B'.2):**
- Pre-engagement panel sign-off (this report) — **REQUIRED**
- Implementation: ~30-40 LOC change (new `learning_rate_per_turn_step_curve` field added to `FactionOfficerConfig` type; new accessor `resolveTimelineLearningRatePerTurn(config, turn)`; validator extension in `war_timeline.ts`; data file edits in `apr1992.json`; one consumer update in `officer_quality_update.ts` to call the new accessor before the existing scalar check)
- New tests: ≥6 covering step-curve at-band-boundaries, scalar-fallback, faction-symmetric mechanism, mutually-exclusive-fields validator behavior, negative-value handling at OFFICER_QUALITY_FLOOR boundary, byte-stability for non-canonical faction codes
- 40w smoke gate (binding)
- 188w smoke + diagnostic re-run (binding)
- **Production reachability runtime trace** (binding new artifact) — one-time first-10-turns instrumentation log confirming step-curve fires for all three factions at runtime
- Lane closeout report under `docs/40_reports/implemented/`

### Verdict on B'.1 / B'.2: **CONDITIONS** — full calibration regression required + new criterion 11 (production reachability runtime trace) is binding

### Recommended numerics (concur with /game-designer + /historian)

`RBiH: const 0.015 (no step-curve) / RS: 0.007→0.004→0.000→-0.0028 / HRHB: 0.010→0.007→0.003→-0.002`, brackets at w52/w78/w104.

### Concerns flagged
1. The 188w smoke is the binding verdict gate — same as predecessor. Phase 1 cannot ship on 40w gates alone.
2. HRHB criterion 3 may be borderline; if it fails while VRS passes, do NOT bundle a re-tune; produce verdict report and dispatch HRHB-bands-only re-tune lane.
3. **NEW:** Phase 1 must produce a runtime production-reachability trace artifact. The trace can be implemented as a transient `console.log` at `officer_quality_update.ts:138` for the first 10 turns of the 188w smoke (capture which precedence path fires for each faction), removed before commit. The artifact is included in the lane report. This is criterion 11 binding.

---

## Panel Member 4 — /determinism-auditor

**Skill file:** `.claude/skills/determinism-auditor/SKILL.md`
**Authority:** Identify nondeterminism risks; cite `DETERMINISM_TEST_MATRIX.md` and Engine Invariants §11.
**Question:** Step-curve in scenario data — type signature change + lookupStepCurve coverage. Faction-symmetric mechanism check. B'.1 vs B'.2 type-signature risk.

### Findings

**Hash stability of B'.2:**
- **Object-key access is deterministic.** `state.military.war_timeline?.officer_config?.[faction]?.learning_rate_per_turn_step_curve` is single-key string lookup; no iteration order introduced.
- **`lookupStepCurve` is deterministic** (`war_timeline.ts:107-113`): sequential scan of entries array; first-match return; falls through to defaultValue. Already shipped at scale via Wave 4 `reinforcement_mult`.
- **Negative-value handling:** `lookupStepCurve` returns `e.value` directly without sign-clamping. Downstream usage in `officer_quality_update.ts` accepts negative `combatGrowthPerTurn`; the existing dampener `(1.0 - quality * 0.5)` is positive (0.55-0.975 range); product is negative when multiplier is negative; adding to quality produces decrement; `Math.max(OFFICER_QUALITY_FLOOR, ...)` clamp at line 179 floors at 0.05. Same path as predecessor B panel. PASS.
- **Float64 multiplication:** IEEE-754 conformant. PASS.
- **Sign-comparison hazard:** none.

**Faction-key lookup determinism:** `f.faction` is canonical string ('RBiH' | 'RS' | 'HRHB'). Object property access on string keys is deterministic. PASS.

**Validator extension (B'.2):** Extending the validator at `war_timeline.ts:276-304` to accept the new optional `learning_rate_per_turn_step_curve: StepCurveEntry[]` field requires:
- Reuse `validateStepCurveEntries(entries, label)` helper (already in tree, used by `cohesion_drift` and `reinforcement_mult`).
- Mutually-exclusive check: if both `learning_rate_per_turn` (scalar) and `learning_rate_per_turn_step_curve` (array) are defined for the same faction, throw a descriptive error. Mirrors Wave 4 contiguity-validation precedent.
- New `value` field allows negative numbers; the validator already accepts `value: number` without sign constraint. PASS.

**Type-signature change (B'.2 vs B'.1):**
- **B'.2:** Add `learning_rate_per_turn_step_curve?: StepCurveEntry[];` to `FactionOfficerConfig` in `src/state/officer_types.ts`. Single new optional field. Existing consumers of `learning_rate_per_turn` (3 sites in `src/`) are UNAFFECTED. **Smaller surface change.**
- **B'.1:** Change `learning_rate_per_turn?: number;` to `learning_rate_per_turn?: number | StepCurveEntry[];`. All 3 consumer sites must handle both shapes via `typeof === 'number'` vs `Array.isArray(...)`. **Larger surface change; more callsite churn.**

Both options are determinism-safe; B'.2 has smaller test-coverage surface.

**Iteration-order risk:** None. Accessor is single-key lookup; no iteration over `officer_config` keys at runtime.

**Serialization order risk:** `state.military.war_timeline.officer_config` is loaded from JSON and re-emitted via existing serialization. Adding a new optional field to one or two entries does not change object-key insertion order in the JSON output (Node preserves insertion order for string keys via property ordering invariants). **However**, scenario authors should add the new field BELOW the existing `learning_rate_per_turn` scalar to preserve insertion order in derived saves. Phase 1 must verify this via 40w final_save.json round-trip.

**Default-fallback determinism:** When `learning_rate_per_turn_step_curve` is absent, the existing scalar precedence chain takes over identically. When step-curve IS present but turn falls outside any band, `lookupStepCurve` returns `defaultValue`. **Phase 1 must specify the defaultValue:** recommended is the *current scalar* `learning_rate_per_turn` (so step-curve gaps fall through to scalar; preserves backward compatibility). Alternative: `0` (forces zero growth in band gaps; safer-fail-mode). **Recommendation: defaultValue = scalar `learning_rate_per_turn` if present, else `COMBAT_GROWTH_BASE * (FACTION_LEARNING_RATE[faction] ?? 1.0)` (the existing path #4 hardcoded fallback).** This preserves the full precedence chain semantics: step-curve fires first when band matches, scalar fills band gaps, hardcoded fallback fills missing-faction case. The recommended numerics' band coverage is `0..9999`, so band gaps are not a concern in practice for the recommended data, but the defaultValue must be explicit for non-canonical faction codes.

**Production reachability runtime trace (criterion 11):** Per /scenario-creator-runner-tester recommendation, a transient console.log at first 10 turns of 188w smoke captures which path fires per faction. Determinism risk: console.log itself is not a determinism risk (output stream, not state mutation), AND the instrumentation must be reverted before commit. PASS.

**188w hash gate readiness:** Wave 7 Lane B streaming finalizer twice-validated (n1665 + n1667). PASS.

**Phase 1 verifications to add to test suite:**
- Step-curve at band boundaries: `getFactionLearningRatePerTurn('RS', timeline, 0)` returns 0.007; at t=51 returns 0.007; at t=52 returns 0.004; at t=77 returns 0.004; at t=78 returns 0.000; at t=103 returns 0.000; at t=104 returns -0.0028; at t=187 returns -0.0028. Byte-identical assertions.
- Scalar-fallback (RBiH): with no step-curve and scalar `0.015`, returns `0.015` byte-identically across all turns.
- Mutually-exclusive validator: scenario JSON with BOTH scalar AND step-curve for one faction throws descriptive error.
- Faction-key determinism: invoke for {'RBiH', 'RS', 'HRHB'} at t=100; assert byte-identical outputs across 3× invocations.
- Default fallback for non-canonical faction code: returns the hardcoded path #4 value.
- Negative-value-into-clamp: synthetic test where a brigade is run through 200 turns at the deepest negative band; assert quality clamps at OFFICER_QUALITY_FLOOR = 0.05 and does not go negative.

### Verdict on B'.1: **GO** but **NOT RECOMMENDED** vs B'.2 (larger consumer-site churn; more test-coverage surface)

### Verdict on B'.2: **GO** — no new nondeterminism risks; single-field type addition; validator extension is mechanical; mutually-exclusive check protects against scenario-author error

### Recommended numerics (concur with /game-designer + /historian + /scenario-creator-runner-tester)

`RBiH: const 0.015 / RS: 0.007 / 0.004 / 0.000 / -0.0028 / HRHB: 0.010 / 0.007 / 0.003 / -0.002`, brackets at w52 / w78 / w104. Default fallback: scalar `learning_rate_per_turn` if present, else hardcoded path #4.

### Concerns flagged
1. Phase 1 must add validator entry for the new optional field; mutually-exclusive scalar-vs-step-curve check is binding (prevents ambiguous scenario authoring).
2. Phase 1 must re-trace runtime reachability via transient instrumentation; revert instrumentation before commit; include trace artifact in lane report.
3. The new field is the FIRST step-curve in scenario data with potentially-negative values. Add a brief comment block in `apr1992.json` documenting that `learning_rate_per_turn_step_curve` values may be negative for late-war bands — distinct from `reinforcement_mult` semantics.
4. No DETERMINISM_TEST_MATRIX.md updates required; the proposed shape conforms to canonical patterns.

---

## Synthesis

### Combined Verdict on Fix Shape B': **CONDITIONS — Phase 1 GO with binding acceptance criteria**

All four panel members produce GO/CONDITIONS verdicts on Fix Shape B' (no NO-GO). Three (`/game-designer`, `/historian`, `/determinism-auditor`) issue clean GO; one (`/scenario-creator-runner-tester`) issues CONDITIONS with full-calibration-regression gate including the new criterion 11. Synthesis verdict on Fix Shape B' is therefore **CONDITIONS** — Phase 1 may proceed under the **11 binding acceptance criteria** below.

### Recommended Option: **B'.2 (add new `learning_rate_per_turn_step_curve` field)** — UNANIMOUS

All four panel members recommend B'.2 over B'.1. Convergent rationale:
- /game-designer: backward-compatible; smaller type-signature churn; cleaner precedence-chain documentation; lane velocity matters (fourth attempt).
- /historian: numerics identical between B'.1 and B'.2; preference falls to whichever option ships fastest with cleanest semantics.
- /scenario-creator-runner-tester: smaller LOC change; ≥6 lane tests vs more for B'.1; cleaner hash-drift expectations.
- /determinism-auditor: single-field type addition vs union-type promotion; smaller consumer-site test-coverage surface.

### Recommended numerics for Fix Shape B'.2 (unanimous)

```json
"officer_config": {
    "RS": {
        "faction": "RS",
        "learning_rate_per_turn": 0.007,
        "learning_rate_per_turn_step_curve": [
            { "start_turn":   0, "end_turn":  52, "value":  0.007 },
            { "start_turn":  52, "end_turn":  78, "value":  0.004 },
            { "start_turn":  78, "end_turn": 104, "value":  0.000 },
            { "start_turn": 104, "end_turn": 9999, "value": -0.0028 }
        ],
        "brain_drain_rate": 0.001,
        "brain_drain_start_week": 40,
        "generic_replacement_competence": 2
    },
    "RBiH": {
        "faction": "RBiH",
        "learning_rate_per_turn": 0.015,
        "pool_regeneration_interval": 12,
        "pool_generated_base_competence": 2,
        "pool_generated_max_competence": 4,
        "warlord_friction_end_week": 78,
        "generic_replacement_competence": 2
    },
    "HRHB": {
        "faction": "HRHB",
        "learning_rate_per_turn": 0.010,
        "learning_rate_per_turn_step_curve": [
            { "start_turn":   0, "end_turn":  52, "value":  0.010 },
            { "start_turn":  52, "end_turn":  78, "value":  0.007 },
            { "start_turn":  78, "end_turn": 104, "value":  0.003 },
            { "start_turn": 104, "end_turn": 9999, "value": -0.002 }
        ],
        "zagreb_cadre_interval": 15,
        "roso_restructuring_week": 52,
        "political_replacement_delay": 4,
        "combat_death_replacement_delay": 1,
        "generic_replacement_competence": 2
    }
}
```

Caller change in `src/sim/combat/officer_quality_update.ts:127-147` adds a new branch *above* the existing scalar at line 138:

```ts
const timelineConfig = state.military.war_timeline?.officer_config?.[faction];
let combatGrowthPerTurn: number;
// PATH #0 (NEW) — step-curve at highest precedence; first-match band lookup.
if (Array.isArray(timelineConfig?.learning_rate_per_turn_step_curve)) {
    combatGrowthPerTurn = lookupStepCurve(
        timelineConfig.learning_rate_per_turn_step_curve,
        turn,
        timelineConfig.learning_rate_per_turn ?? COMBAT_GROWTH_BASE * (FACTION_LEARNING_RATE[faction] ?? 1.0),
    );
} else if (typeof timelineConfig?.learning_rate_per_turn === 'number') {
    combatGrowthPerTurn = timelineConfig.learning_rate_per_turn;
} else if (typeof timelineConfig?.learning_rate_multiplier === 'number') {
    combatGrowthPerTurn = COMBAT_GROWTH_BASE * timelineConfig.learning_rate_multiplier;
} else if (typeof timelineConfig?.learning_rate === 'number') {
    combatGrowthPerTurn = COMBAT_GROWTH_BASE * timelineConfig.learning_rate;
} else {
    combatGrowthPerTurn = COMBAT_GROWTH_BASE * (FACTION_LEARNING_RATE[faction] ?? 1.0);
}
```

### 11 Binding Acceptance Criteria for Phase 1 (Fix Shape B'.2)

1. **Code shape conformance** — new field `learning_rate_per_turn_step_curve?: StepCurveEntry[]` added to `FactionOfficerConfig` (`src/state/officer_types.ts`); validator extended in `src/state/war_timeline.ts:276-304` reusing `validateStepCurveEntries`; mutually-exclusive validator check rejects scenarios with BOTH scalar AND step-curve for the same faction; new branch added to `updateBrigadeOfficerQuality` ABOVE existing scalar check (path #0 at highest precedence); `lookupStepCurve(...)` defaultValue routes to scalar fallback then to hardcoded fallback; faction-symmetric mechanism preserved (no `if (faction === 'X')` branches anywhere); mirrors Wave 4 `reinforcement_mult` step-curve precedent.

2. **40w smoke gate** — anchors ≥26/27 (no new failures beyond pre-existing `op:brcko:brka_2` P0); benchmarks 6/6 PASS; area-weighted ≥92.5% (-0.8pp tolerance from current 93.3%; tighter than predecessor's -1.8pp because first-band step-curve = current scalar); faction OSID counts within ±5 (RS=381, RBiH=245, HRHB=86); 40w hash drift expected to be byte-identical or near-identical at w<40 (NOT a gate, but should be informational artifact).

3. **188w faction-mean smoke gate** — `final_state_hash` emits cleanly (Wave 7 Lane B streaming finalizer must hold); VRS+HRHB officer_quality whole-run faction-mean Δ/turn ≤ 0 (doctrinal sign -1); RBiH whole-run faction-mean Δ/turn ≥ +0.001 (control-faction; preserved at const 0.015); RS active brigade count at t188 ≥ 35 (no dissolution cascade).

4. **188w stayer-Δ trajectory gate (BINDING — `tools/diagnostics/officer_quality_growth_trace.cjs`)** — re-run the parent-audit diagnostic on the 188w output; VRS+HRHB STAYER Δ/turn ≤ 0 (per-formation, not faction-mean only); RBiH STAYER Δ/turn ≥ +0.001 (control); growth % share for VRS+HRHB must demonstrate the per-formation growth path is constrained, not faction-mean drift via cohort-turnover survivorship.

5. **Tests** — ≥ 6 new lane tests GREEN (step-curve at-band-boundaries determinism for {RS, HRHB} × 4 bands; scalar-fallback for RBiH; mutually-exclusive validator rejection; faction-symmetric mechanism / default fallback for non-canonical faction codes; determinism-across-invocations; negative-value-into-floor-clamp synthetic 200-turn test); focused regression on `officer_quality_update`, `attack_post_battle_effects`, `attack_resolution_osid`, `war_timeline` (`lookupStepCurve` + `validateWarTimeline`), `officer_config_consumers` clusters all GREEN.

6. **Type-check** — `npx tsc --noEmit` clean.

7. **Sensitive-history compliance assertion in lane report** — explicit Ring 1 classification, no §6 sign-off chain triggered, no FORAWWV / paint anchor / political_controllers / OOB / rupture wiring / `enclave_resilience.ts` touch; calendar-keyed force-quality decay distinguished from §1.5 #11's prohibition on calendar-keyed atrocity recording.

8. **Stop triggers respected** — if 188w VRS+HRHB faction-mean Δ/turn does NOT bend nonpositive, STOP and produce verdict report; do NOT retune in-lane. If faction-mean bends nonpositive but stayer Δ/turn does NOT, INVESTIGATE survivorship contamination before merge. If HRHB criterion 3 fails while VRS criterion 3 passes, do NOT bundle a re-tune; produce verdict report and dispatch a follow-up HRHB-bands-only re-tune lane separately.

9. **Out-of-scope guards** — Phase 1 MUST NOT touch `MORALE_OVERRIDE_ENABLED` flag, MUST NOT alter `OFFICER_QUALITY_FLOOR=0.05`, MUST NOT alter `OFFICER_QUALITY_CAP=0.90`, MUST NOT alter `COMBAT_GROWTH_BASE=0.01` / `FRONTLINE_GROWTH_BASE=0.005`, MUST NOT touch `OFFICER_CASUALTY_MULT` (Lane A reverted), MUST NOT touch `FACTION_LEARNING_RATE` constants in `officer_quality_update.ts:63-67` (predecessor Phase 1 reverted; the path #4 fallback layer remains as-is and dormant in production), MUST NOT couple to `war_crimes_record` (Engine Invariants §15.2 binding informational-only), MUST NOT extend scope to UNPROFOR / comms-asymmetry / ammo-scarcity surfaces, MUST NOT touch `recruitment_engine.ts` / `formation_spawn.ts` / `brigade_reconstitution.ts` (Fix Shape C surfaces, not Fix Shape B').

10. **Phase 1 lane report** — under `docs/40_reports/implemented/` named per Phase 1 ship day with the standard predecessor-chain / files-changed / acceptance-gate / sensitive-history-compliance / determinism / counterfactual-safety / successor-handoff sections; include BB-citation block grounding the directional claim about VRS/HRHB late-war cadre erosion at volume/page level; include a determinism note documenting that the step-curve `value: number` field in this lane's data table may be negative (vs Wave 4 reinforcement_mult which is strictly positive); include the production reachability runtime trace artifact (criterion 11).

11. **NEW — Production reachability runtime trace (binding)** — Phase 1 MUST include a runtime trace confirming the new lever's code path actually fires for {RS, HRHB} at runtime before declaring SHIP. Implementation: transient `console.log` instrumentation at the new path #0 branch in `officer_quality_update.ts` (or equivalent diagnostic write to a side log), capturing for the first 10 turns of the 188w smoke (or first 1 turn of a dedicated reachability test) which faction's `learning_rate_per_turn_step_curve` was consumed. The runtime trace artifact must show **path #0 fires for RS at all turns where step-curve is present**, **path #0 fires for HRHB at all turns where step-curve is present**, **path #1 (scalar) fires for RBiH at all turns** (RBiH has no step-curve by panel design). Instrumentation must be reverted before commit; the trace artifact is included in the Phase 1 lane report. Failing this criterion means Phase 1 is structurally dormant in production (predecessor failure mode); STOP and verdict-report-only before declaring SHIP.

### 5 Binding Stop Triggers (carried from predecessor panel + Phase 1 verdict findings)

1. If 188w VRS+HRHB faction-mean Δ/turn does NOT bend nonpositive → STOP, Wave-6-style verdict report, do NOT retune in-lane. **FOURTH hypothesis-disproved precedent** → escalate to canon review of `updateBrigadeOfficerQuality` semantics; B' has failed; Fix Shape C re-elevation may become the next investigation (after reconstitution-pipeline modeling investigation completes).
2. If 188w VRS+HRHB **stayer** Δ/turn (per `officer_quality_growth_trace.cjs`) does NOT bend nonpositive → STOP, indicates the fix shape selected does not actually constrain per-formation growth (only constrains faction-mean drift via cohort turnover, which is the survivorship hypothesis from parent-audit §4 finally biting).
3. If 40w benchmarks drop below 6/6 → STOP, bot calibration regression.
4. If 188w RS active brigade count drops below 35 → STOP, officer-quality decay coupled with cohesion drag may be cascading into mass dissolution.
5. If `final_state_hash` fails to emit at 188w (replay-buffer streaming regression) → STOP, do NOT retry without diagnosis (Mission C precedent).

### Ring Classification

**Ring 1 — modeled mechanically.** Per `SENSITIVE_HISTORY_DESIGN_GATE.md` §1, Ring 1 is the structured-state combat / morale / casualty surface the engine simulates as deterministic state. The growth path (`updateBrigadeOfficerQuality`) is already a Ring 1 mechanic; adding a new optional field on `officer_config[faction]` that routes through the same growth path is operating on the same Ring 1 surface. The Wave 4 `reinforcement_mult` step-curve in scenario data is the canonical Ring 1 + faction-symmetric-mechanism + asymmetric-data + scenario-data shape. Fix Shape B'.2 mirrors this exact pattern. **Data, not logic.**

Calendar-keyed force-quality decay is canonically permitted (Wave 4 precedent). The §1.5 #11 prohibition applies specifically to calendar-keyed *atrocity* recording (rupture / condemnation flags); it does not apply to calendar-keyed force-quality data. The directional distinction is binding.

### §6 Sign-Off Chain Check

**NOT TRIGGERED** for Phase 1. Row-by-row negative test (per `SENSITIVE_HISTORY_DESIGN_GATE.md` §6 table):
- New rupture? **No.**
- Change to rupture trigger or description? **No.**
- New atrocity event? **No.**
- Change to atrocity event content? **No.**
- New condemnation flag? **No.**
- Change to paramilitary policy surface? **No.**
- Cost Ledger wording change? **No.**
- New essay touching atrocity? **No.**
- Change to enclave mechanics? **No.**
- Any change that could produce a "reward for atrocity" effect? **No** (officer_quality is internal combat-math, decoupled from `war_crimes_record` per Engine Invariants §15.2 binding informational-only).

Phase 1 may proceed Ring-1-sufficient without §6 process.

### Sensitive-History Compliance Assertion (this Phase 0 report)

- **Ring classification:** **Ring 1** (per `SENSITIVE_HISTORY_DESIGN_GATE.md` §1). Audit-only this report; no Ring 1 surface modified by this report.
- **§6 Sign-Off Chain (`SENSITIVE_HISTORY_DESIGN_GATE.md` §6):** **NOT TRIGGERED** for this Phase 0 panel. Audit-only.
- **Faction-symmetric-mechanism check:** PASS. Recommended Phase 1 mechanism is `learning_rate_per_turn_step_curve?: StepCurveEntry[]` field consumed via single faction-agnostic accessor with `lookupStepCurve(...)` predicate. No `if (faction === ...)` branches anywhere. Mirrors Wave 4 `reinforcement_mult` precedent.
- **Read-only assertion (this report):** No source modified. No test modified. No scenario data modified. No paint anchor / political_controllers / OOB / FORAWWV / rupture-wiring / `enclave_resilience.ts` touched. No combat-math number tuned. The report is the deliverable.
- **Determinism check (this report):** Pure prose; no executable code; no diagnostic emit. Phase 1 implementation deterministic per Panel 4.

### Why CONDITIONS rather than GO

Same as predecessor — the 188w binding gates (criteria 3 + 4) are load-bearing; 40w cannot verify late-war officer-quality arc bending. Plus the NEW criterion 11 (production reachability runtime trace) is binding in light of the Phase 1 dormancy precedent. Phase 1 cannot ship on 40w gates alone; cannot ship without runtime confirmation that the new lever fires.

### Successor Handoffs (if Phase 1 Fix B'.2 succeeds)

1. **Canon amendment opportunity** — propose amendment to `Engine_Invariants_v0_9_0.md` §15 (Officer System Invariants) adding a new sub-clause documenting the per-faction step-curve `learning_rate_per_turn_step_curve` as canonical. Audit-only this lane; amendment is downstream once Phase 1 ships clean.
2. **HRHB band re-tune (conditional)** — if HRHB criterion 3 marginally passes but stayer-Δ analysis suggests deeper bands needed, follow-up HRHB-band-only re-tune lane.
3. **Documentation updates** — `MEMORY.md` / napkin entries reflecting "fourth attempt at OQ-Growth bent the arc via timeline-data step-curve" (or did not).
4. **Predecessor Phase 1 cleanup** — the dormant `FACTION_LEARNING_RATE` step-curve at `officer_quality_update.ts:63-67` (committed under `a42ebae0` then reverted) — verify the revert is complete; the constants surface should still be the `Record<string, number>` scalar shape. (Ledger entry says implementation reverted; spot-check confirms constants remain `Record<string, number>` at lines 63-67.)
5. **Wave 7 Lane B streaming finalizer remains validated** — twice-validated (n1665 + n1667). Phase 1 will be the third 188w full-emit.

### Successor Handoffs (if Phase 1 Fix B'.2 FAILS 188w gate)

1. Do NOT retune step-curve magnitudes upward in a follow-up lane. Magnitudes are doctrinally and trace-grounded; further negative-going tuning is not doctrine-grounded. Lane A's "Lane B numerics tuned upward" failure mode applies.
2. Investigate the reconstitution + mobilization pipelines: do they correctly model cadre-replacement quality (replacement officers entering at lower-than-mean quality)? If NO, Fix Shape C will not bend the arc either.
3. Only after the pipeline investigation completes should Fix Shape C be considered for Phase 1.
4. Issue a Wave-6 + Lane-A + Phase-1-style verdict report (FOURTH precedent) and re-engage the panel.

---

## Output Summary (for orchestrator handoff)

- **Report path:** `docs/40_reports/audits/20260505_OFFICER_LEARNING_RATE_TIMELINE_DATA_PHASE_0_PANEL.md` (this file)
- **Combined verdict on Fix Shape B':** **CONDITIONS** — Phase 1 GO with **11 binding acceptance criteria + 5 stop triggers**
- **Recommended option:** **B'.2 (add new `learning_rate_per_turn_step_curve` field)** — UNANIMOUS across all 4 panel members. Rationale: backward-compatible; smaller type-signature churn; cleaner precedence-chain documentation; lane velocity matters at the fourth attempt.
- **Recommended numerics for Fix Shape B'.2 (unanimous):**
  - RBiH: `const 0.015` (no step-curve; CONTROL — preserves canonical professionalization arc via existing scalar precedence)
  - RS: `0.007 / 0.004 / 0.000 / -0.0028` at brackets `<w52 / w52-77 / w78-103 / w104+`
  - HRHB: `0.010 / 0.007 / 0.003 / -0.002` at same brackets
  - DEFAULT (non-canonical faction codes): falls through to existing scalar `learning_rate_per_turn`, then to hardcoded `FACTION_LEARNING_RATE` × `COMBAT_GROWTH_BASE` (preserves byte-stability)
- **11 acceptance criteria summary:** Code shape (new field + accessor + validator + mutually-exclusive check + new path #0 branch above scalar + faction-symmetric mechanism); 40w smoke gate (anchors ≥26/27, benchmarks 6/6, area ≥92.5%, hash near-identical at w<40); 188w faction-mean smoke gate (VRS+HRHB Δ/turn ≤0, RBiH ≥+0.001, RS brigades ≥35, hash emits); 188w stayer-Δ trajectory gate (per parent-audit diagnostic; VRS+HRHB stayer Δ/turn ≤0); ≥6 new lane tests GREEN + focused regression GREEN; tsc clean; sensitive-history compliance asserted; stop triggers respected; out-of-scope guards (no MORALE / FLOOR / CAP / FACTION_LEARNING_RATE constants / OFFICER_CASUALTY_MULT / war_crimes_record / Fix C surfaces); Phase 1 lane report under `docs/40_reports/implemented/` with BB-citation block + determinism note + reachability trace artifact; **NEW criterion 11 — Production reachability runtime trace (binding)** confirming step-curve fires at runtime for RS+HRHB before SHIP.
- **5 stop triggers summary:** (1) 188w faction-mean Δ/turn doesn't bend nonpositive (FOURTH precedent escalates to canon review of growth-path semantics + Fix C re-elevation candidate); (2) 188w stayer Δ/turn doesn't bend nonpositive (per-formation gate; survivorship contamination biting); (3) 40w benchmarks drop below 6/6; (4) 188w RS active brigades drops below 35; (5) `final_state_hash` fails to emit at 188w.
- **Ring classification:** **Ring 1** (data, not logic; mirrors Wave 4 `reinforcement_mult` step-curve precedent in scenario data; calendar-keyed force-quality decay is canonically permitted per §1.5 #11 directional distinction)
- **§6 sign-off chain triggered:** **NO** — change is not in any §6 row; Phase 1 may proceed Ring-1-sufficient
- **Production reachability trace (binding new artifact):** Path #1 (timeline `learning_rate_per_turn` scalar) currently fires for {RS, RBiH, HRHB} in production with `apr1992.json` scenario data. B'.2 inserts a new path #0 (`learning_rate_per_turn_step_curve`) at higher precedence than the scalar; with recommended numerics, path #0 fires for {RS, HRHB} at all turns (those factions get step-curves) and path #1 (scalar) fires for {RBiH} at all turns (RBiH preserved as control with no step-curve). Phase 1 must re-verify this at runtime via transient instrumentation (criterion 11 binding artifact).
- **Sensitive-history compliance:** Asserted; read-only Phase 0; no source / scenario / canon / FORAWWV / rupture / paint / OOB / political_controllers / `enclave_resilience.ts` touch; no combat-math number tuned; faction-agnostic mechanism with asymmetric data
- **Next action user should consider authorizing:** Phase 1 implementation lane for Fix Shape B'.2 (timeline-data variant), dispatched with this report as the binding panel approval, gated by the **11 acceptance criteria + 5 stop triggers** (with the new criterion 11 production reachability runtime trace binding before SHIP), named `LANE-NIGHTSHIFT-OFFICER-LEARNING-RATE-TIMELINE-DATA-PHASE-1-IMPLEMENTATION` (or session-equivalent). Fix Shape C remains DEFERRED pending B'.2 outcome AND reconstitution-pipeline investigation. Fix Shape B'.1 is NOT recommended; B'.2 is the unanimous panel choice.
