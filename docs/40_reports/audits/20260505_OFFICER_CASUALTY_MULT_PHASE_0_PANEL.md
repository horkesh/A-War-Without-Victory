# OFFICER_CASUALTY_MULT Phase 0 Panel — CONDITIONS Verdict

**Date:** 2026-05-05
**Lane:** LANE-NIGHTSHIFT-OFFICER-CASUALTY-MULT-PHASE-0-PANEL
**Type:** Read-only Phase 0 panel synthesis — verdict + recommended numerics + binding conditions for any future Phase 1.
**Audit-only.** No engine, scenario, test, paint anchor, OOB, FORAWWV, political_controllers, rupture-wiring, or `enclave_resilience.ts` touch. No combat-math number tuned in this lane.

---

## Predecessor Chain (binding context)

1. `docs/40_reports/audits/20260504_FORCE_QUALITY_GAP_2_VERIFICATION.md` (Wave 3, commit `20c3aa05`) — trace evidence at t1→t84 showing VRS officer_quality stagnant (Δ +0.000246/turn), HRHB monotonic positive (Δ +0.002068/turn), RBiH on-doctrine (Δ +0.004629/turn). Recommendation §"If a future lane decides to tune anyway": faction-asymmetric `RS:2.5 / HRHB:2.0 / RBiH:1.0`.
2. `docs/40_reports/implemented/20260504_RECONSTITUTION_POLICY_REVIEW.md` (Wave 4, commit `e9584dd3`) — shipped the upstream reinforcement-mult step-curve as the named "Gap 2 fix." Faction-symmetric mechanism (`lookupStepCurve`), asymmetric data. 40w n1638 hash `ef03ab4d6c5ecd28`, anchors 26/27, benchmarks 6/6, area 93.3%.
3. `docs/40_reports/implemented/20260504_RECONSTITUTION_188W_VERIFICATION.md` (Wave 6, commit `cc829ebb`) — **DISPROVED the Wave 4 hypothesis from 188w trajectory evidence**. VRS officer_quality climbs through deepest 0.45× decay band (t104→t188 +0.001218/turn). HRHB grows monotonically every segment. RBiH (control) tracks doctrinal arc. Wave 4 lever shrinks force (78→51 brigades, -34.6%) but surviving cadre grows stronger per-brigade (+21.6% officer_quality, +37.7% personnel). The reinforcement-budget lever cannot starve per-brigade growth.
4. `docs/40_reports/implemented/20260505_REPLAY_BUFFER_STREAMING.md` (Wave 7 Lane B, commit `107fe60b`) — replay-buffer streaming finalizer unblocks 188w `final_state_hash` emission, making 188w byte-identity gates technically dispatchable for any future Phase 1.

## Source Surface (read-only inspection)

`src/sim/combat/attack_post_battle_effects.ts:61-67` — `applyOfficerCasualtyLoss(f, cas, totalPersonnel)`:

```ts
export function applyOfficerCasualtyLoss(f: FormationState, cas: number, totalPersonnel: number): void {
    if (f.officer_quality === undefined) return;
    if (totalPersonnel <= 0) return;
    const casualtyRatio = cas / totalPersonnel;
    const officerLoss = casualtyRatio * OFFICER_CASUALTY_MULT * (1.0 - f.officer_quality * 0.3);
    f.officer_quality = Math.max(OFFICER_QUALITY_FLOOR, f.officer_quality - officerLoss);
}
```

`src/sim/combat/officer_quality_update.ts:34` — `OFFICER_CASUALTY_MULT = 1.5` (single scalar).

Call sites (`applyOfficerCasualtyLoss(...)` invocations): exactly 2, both in `src/sim/combat/attack_resolution_osid.ts:770,772` (one per attacker formation distributed by personnel fraction; one for the defender formation). No other production callers; tests at `tests/attack_post_battle_effects.test.ts` import the symbol but do not write game state.

`OFFICER_CASUALTY_MULT` consumers: exactly 1 production reader (the formula above) + 1 import re-export from `attack_post_battle_effects.ts:19` + 1 test import.

The mechanism is wired correctly per Wave 3 trace; the multiplier is the lever named in trace evidence.

---

## Panel Member 1 — /game-designer

**Skill file:** `.claude/skills/game-designer/SKILL.md`
**Authority:** Design intent and mechanic consistency with Game Bible / Rulebook; canon interpretation; Ring boundary interpretation under `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md`.
**Question:** Is faction-asymmetric `OFFICER_CASUALTY_MULT` a Ring 1 honest-mechanic (faction-symmetric mechanism, asymmetric data) or does it cross into Ring 2 / Ring 3? Is there a precedent? What numerics align with the negative-sum thesis?

### Findings

**Ring classification: Ring 1.** Per `SENSITIVE_HISTORY_DESIGN_GATE.md` §1, Ring 1 is the structured-state combat/morale/casualty surface that the engine simulates as deterministic state. `applyOfficerCasualtyLoss` is already a Ring 1 mechanic — it consumes per-battle casualty ratios and produces a deterministic officer-quality decrement. Promoting `OFFICER_CASUALTY_MULT` from a scalar (`1.5`) to a faction-keyed record (`{RS, HRHB, RBiH}`) does not introduce any new player-facing surface, does not create a player-authorized atrocity surface (paramilitary_policy is the **only** authorized war-crime surface per §3), and does not touch the rupture roster (Srebrenica only, per §2). It is a parameter shape change, not a Ring boundary crossing.

**Negative test against §1 Ring 3 list:**

| §1 Ring 3 prohibition | Crosses? |
|---|---|
| #1 "commit genocide" decision tree | No — no player surface |
| #2 concentration camp system | No — no new system |
| #3 negotiable condemnation | No — no rupture flag touched |
| #4 body-count optimization surface | No — Pyrrhic score not inverted by this |
| #5 atrocity efficiency metric | No — `OFFICER_CASUALTY_MULT` is force-quality cost not territorial-gain coupling |
| #6 alternate-history minimization | No |
| #7 ranking factions by atrocity | No |
| #8 granular victim attribution | No |
| #9 justified atrocity framing | No |
| #10 gamified prevent-genocide | No |
| #11 calendar-driven atrocity recording | No — change is per-battle-casualty-ratio coupling, not calendar |

**Precedent — faction-symmetric mechanism / faction-asymmetric data:**

The Wave 4 reconstitution lane (`getFactionReinforcementMult`, commit `e9584dd3`) is the canonical precedent and is sitting in tree right now. Per `20260504_RECONSTITUTION_POLICY_REVIEW.md`: the mechanism is `lookupStepCurve(...)` — a single faction-agnostic predicate; only data parameters drive the asymmetry. RBiH 4-band, HRHB 4-band, RS 4-band — all read by the same predicate. RBiH and HRHB had step curves before the lane; RS got the same shape with faction-correct values.

The Wave 3 substrate-then-content precedent (`equipment_quality_modifier`, commit `658241df`) is the second precedent: substrate ships with a no-op default; content (event #11) is faction-agnostic and consumes the multiplier through a single thread point.

**`FACTION_LEARNING_RATE` (existing symmetric-mechanism / asymmetric-data precedent in this same file):** `src/sim/combat/officer_quality_update.ts:63-67` and `src/sim/combat/attack_post_battle_effects.ts:30-34` already declare `FACTION_LEARNING_RATE: Record<string, number> = { RBiH: 1.5, RS: 0.7, HRHB: 1.0 }` as canon (cited Wave 3 audit §"Magnitude check"). The faction-asymmetric multiplier shape is therefore already in canon for the *growth* side of officer-quality. Promoting `OFFICER_CASUALTY_MULT` to the same shape on the *loss* side is structurally identical — same record type, same predicate-by-key lookup, same faction-agnostic consumer.

**Engine Invariant §6 ("Front and Combat Invariants"):** No invariant in §6.1–§6.5 of `Engine_Invariants_v0_7_0.md` is touched. The change is internal to the post-battle-effects path — does not flip OSIDs (§6 lead), does not create new fronts, does not touch the ops-only attack invariant (§6.3), does not touch the cold-front invariant (§6.4), does not touch unified sector defense (§6.5). The brigade no-destruction invariant (§6.2) is preserved because officer-quality decay does not produce dissolution by itself; OFFICER_QUALITY_FLOOR=0.05 floor still holds and dissolution gates remain at the 2-of-3 / morale-override paths in §6.2.4.

**Negative-sum thesis alignment:** The negative-sum thesis (per Wave 6 lessons + Game Bible) says exhaustion, political collapse, and constrained agency dominate, not conquest. Bending VRS late-war officer-quality downward — the doctrinal arc per Wave 3 audit §"Magnitude check" — is consistent with the thesis: the late-war VRS is supposed to be a degraded force that holds despite cadre erosion, not a force that professionalizes into 1995 alongside its political collapse. `RS:2.5 / HRHB:2.0 / RBiH:1.0` produces the doctrinal direction (RS+HRHB degrade, RBiH holds doctrinal rise from rabble-to-corps) without inverting the Pyrrhic score, without rewarding atrocity, and without crossing any §1.5 Ring 3 line.

**One concern flagged for Phase 1:** the faction-keyed shape requires a default-fallback for any string key not in the record (e.g., future scenarios with non-canonical faction codes). Pattern: `OFFICER_CASUALTY_MULT[faction] ?? DEFAULT_OFFICER_CASUALTY_MULT` with `DEFAULT = 1.5` (current scalar value). This preserves byte-stability for any test fixture that uses a non-{RBiH,RS,HRHB} faction code.

### Verdict: GO — Ring 1, faction-symmetric mechanism, faction-asymmetric data

**Recommended numerics (matching Wave 3 trace evidence):**
- `RS: 2.5`
- `HRHB: 2.0`
- `RBiH: 1.0`
- `DEFAULT_OFFICER_CASUALTY_MULT: 1.5` (preserves current scalar for unmapped factions)

**Concerns flagged:**
1. Phase 1 must promote the constant to a record-with-default and route the lookup through a single faction-agnostic accessor; no `if (faction === 'RS')` branches anywhere in the path. (Mirrors `FACTION_LEARNING_RATE` / `lookupStepCurve` shape.)
2. The Wave 6 lesson "per-brigade growth terms can overwhelm per-faction budget caps" applies in reverse here — this lane's lever IS a per-brigade lever (it modifies the per-brigade decay term in `applyOfficerCasualtyLoss`), so it should bend per-brigade trajectory in the predicted direction. Phase 1 verification must confirm the per-brigade arc bends, not merely the faction average.
3. Tone alignment: the lever encodes "VRS replacement officers are JNA-cadre-loss net of partial replacement" (per Wave 3 §"Recommendation"). This is a doctrine-grounded arithmetic statement, not a narrative claim. No Cost Ledger string changes are required by this lane (§4 wording constraints unaffected).

---

## Panel Member 2 — /historian

**Skill file:** `.claude/skills/historian/SKILL.md`
**Authority:** Bosnian war historical knowledge derived from Balkan Battlegrounds + ICTY-cited primary sources. Authority for "what does the record say?"
**Question:** Are the proposed asymmetric values (`RS:2.5 / HRHB:2.0 / RBiH:1.0` from Wave 3 trace) historically defensible? Do these values encode atrocity-as-tactic in any way? Verdict on historical plausibility.

### Findings

**VRS officer-quality decline through 1995 — defensible, well-documented:**
- VRS inherited the JNA Sarajevo command structure on 12 May 1992 (canonical, BB1 timing). Initial cadre depth was high — career JNA officers at Corps and Army HQ levels, with technical specialists across artillery, armor, signals, and engineering.
- Through 1992-1993, the VRS sustained heavy combat in Posavina corridor + Drina + Krajina; cadre attrition was real (BB1 details extended Posavina campaign costs; OOB master `VRS_ORDER_OF_BATTLE_MASTER.md` documents progressive officer reassignments to fill gaps).
- By 1994-1995, mobilization shortfall was severe (Republika Srpska conscription crisis, draft-evasion to FRY, exhaustion of reservist pool). Replacement officers were drawn from short-course reserves, not JNA-academy cadre.
- The `RS: 2.5` value (raising the casualty-multiplier coefficient by 67% above the 1.5 baseline) is consistent with the empirical observation that VRS replacement officers were lower-quality than the cadre they replaced; per-casualty officer loss is amplified relative to the mean because of the cadre-replacement asymmetry.
- This is a doctrinal-arc statement, not a moral statement. It does not rank VRS by war crimes (forbidden per §1 #7); it does not encode atrocity-as-tactic (forbidden per §1 #5); it does not condition any combat outcome on civilian-targeting decisions.

**HRHB officer reorganization 1993-1994 — defensible:**
- HVO experienced parallel pressures: Lasva Valley operational losses, Washington Agreement transition (March 1994) that rerouted some officers to ARBiH-Federation structures, and chronic NATO-quality patron influence variance from HV (Croatian Army). OOB master `HVO_ORDER_OF_BATTLE_MASTER.md` documents corps-structure pressure during this window.
- The `HRHB: 2.0` value (33% above 1.5 baseline) is smaller than RS — appropriate, since HRHB had a smaller initial cadre and a smaller absolute decline; the multiplier per-casualty needs to be elevated above baseline but not as severely as VRS. This matches the Wave 3 trace evidence (HRHB rate-of-change deviation from doctrine was smaller in magnitude than the mechanism allows for at the higher coefficient).

**ARBiH professionalization arc — defensible:**
- ARBiH transitioned from rabble (TO improvisation, militia-leader cadre, April-June 1992) to mature corps (II Tuzla, V Bihać, I Sarajevo professional structures by 1994-1995). OOB master `ARBIH_ORDER_OF_BATTLE_MASTER.md` documents the structural evolution.
- The `RBiH: 1.0` value (33% below 1.5 baseline) is consistent with the empirical observation that ARBiH replacement officers were locally-promoted-from-combat — they were higher-quality than the militia-leaders they replaced, so per-casualty officer loss is dampened relative to the mean.
- This produces the doctrinal "rabble-to-corps" arc per `FACTION_LEARNING_RATE.RBiH=1.5` (growth side) coupled with reduced per-casualty decay.

**Sources for the asymmetry claim:**
- BB1/BB2 are the primary historical source per the historian skill mandate (volume + page citations required for any factual claim). The Wave 3 audit (`20260504_FORCE_QUALITY_GAP_2_VERIFICATION.md` §"Recommendation") cites the asymmetry as canon-grounded but does not produce BB volume/page citations. **For Phase 1, a BB-citation pass on the asymmetry claim would strengthen the doctrine grounding.** The trace-evidence math grounds the magnitudes; the BB citations would ground the directional claim independently.
- ICTY case law does not directly speak to officer-quality numerics; it speaks to command-responsibility findings (Krstić, Karadžić, Mladić) which are already in canon at the rupture/atrocity-event layer (Ring 1 + Ring 2). No ICTY-citable claim is being introduced or modified by this lane.

**Atrocity-as-tactic check:** The proposed lever does NOT couple officer quality to civilian-casualty events, paramilitary-sweep approvals, or any §3 player-authorized war-crime surface. It is purely a force-quality decay coefficient on per-battle casualty ratio (combat casualties, not civilian). It satisfies §1.5 #4 (no body-count optimization), #5 (no atrocity-efficiency metric), #9 (no justified-atrocity framing). It does not interact with `war_crimes_events`, `genocide_condemnation`, or paramilitary mechanics in any way.

**Cost Ledger §4 wording check:** No new player-facing string surfaces are introduced. The lever is internal to combat math.

### Verdict: GO — historically defensible; non-atrocity surface

**Recommended numerics (concur with /game-designer):** `RS: 2.5 / HRHB: 2.0 / RBiH: 1.0`. No revision proposed; the trace-derived values match doctrinal direction.

**Concerns flagged:**
1. Phase 1 should add a BB-citation block (volume + page) to the lane report grounding the directional claim about VRS cadre-replacement quality erosion through 1995 and HRHB Federation-transition pressure. The numeric magnitudes are trace-grounded; the directional claim is doctrine-grounded but currently uncited at the BB level. This strengthens future canon-review without affecting the numerics.
2. The lever does not directly model UNPROFOR officer-liaison effects, comms-quality asymmetry, or per-brigade ammo scarcity (per `MEMORY.md` "P0 historical gaps"). Those remain separate calibration handoffs and are not in scope here. Phase 1 should not extend scope into any of those surfaces.
3. The lever is independent of the `war_crimes_record` informational-only invariant (Engine Invariants §15.2). Phase 1 must not couple officer-quality to `war_crimes_record` in any direction (§15.2 binding).

---

## Panel Member 3 — /scenario-creator-runner-tester

**Skill file:** `.claude/skills/scenario-creator-runner-tester/SKILL.md`
**Authority:** Scenario harness, run interpretation, calibration regression assessment, ahistorical-result flagging.
**Question:** What calibration regression is required before Phase 1 ships? What tolerance band is acceptable? Recommended Phase 1 acceptance criteria.

### Findings

**Current calibration baseline (from MEMORY.md + napkin):**
- 40w n1640: hash `ef03ab4d6c5ecd28`, anchors 26/27 (only `op:brcko:brka_2` failing — pre-existing P0, unrelated to officer-quality), benchmarks 6/6, area-weighted 93.3%.
- 188w hash gates now technically dispatchable (Wave 7 Lane B `107fe60b` shipped streaming finalizer; 188w runs can now emit `run_summary.json` and `final_state_hash` reliably).
- Faction-differentiated combat factors (P1-P10) all stable since n1289 calibration ATH.

**Hash-drift expectation:** This lane will drift the 40w hash. The drift is the point — the lever exists to bend the late-war arc that the 188w trajectory exposed. Hash drift is **expected, not a stop trigger**, per the Wave 4 precedent (binding spec language: "this lane is the calibration fix; drift is the point"). However, the drift must remain **bounded**: anchor count and benchmark count must not degrade.

**Per-faction trajectory expectation (from Wave 3 audit §"Expected effect on this trace's data"):** VRS rate-of-change shifts from +0.000246/turn to ~-0.0050/turn; HRHB from +0.002068 to ~-0.0048/turn; RBiH from +0.004629 to ~+0.0040/turn (slight slowdown). At 188w, this should produce monotonic decline for VRS and HRHB officer_quality from t52 onward, and continued doctrinal rise for RBiH. The Wave 6 trajectory diagnostic (`tools/diagnostics/reconstitution_188w_checkpoints.cjs`) already provides the harness for verification at t1/t52/t78/t104/t188.

**Acceptance gate proposal — full calibration regression required:**

| Gate | Current baseline | Phase 1 ship requirement | Rationale |
|---|---|---|---|
| 40w anchors | 26/27 PASS | **≥ 26/27 PASS** (no new failures beyond pre-existing brka_2) | Anchor count is the primary stability metric |
| 40w benchmarks | 6/6 PASS | **6/6 PASS** | Benchmark band is the bot-behavior calibration floor |
| 40w area-weighted | 93.3% | **≥ 92.5%** (≥ -0.8pp tolerance) | Per Wave 4 precedent (+0.1pp drift in expected direction was acceptable; -0.8pp gives one stdev of slack for a casualty-side change) |
| 40w hash | `ef03ab4d6c5ecd28` | DRIFT EXPECTED — NOT A GATE | Lane intent is to drift |
| 40w faction OSID counts | RS=381, RBiH=245, HRHB=86 | Within ±5 OSIDs per faction | Sanity check that early-war dynamics aren't perturbed |
| 188w `final_state_hash` | Available post-Wave-7 Lane B | **Must emit** (no OOM during summary write) | Wave 7 Lane B unblocked this gate; Phase 1 must verify it stays unblocked |
| 188w VRS officer_quality whole-run mean Δ/turn | +0.000775 (Wave 6) | **≤ 0** (nonpositive; doctrinal sign -1) | Primary success criterion — the lever must bend the arc |
| 188w HRHB officer_quality whole-run mean Δ/turn | +0.002225 (Wave 6) | **≤ 0** (nonpositive; doctrinal sign -1) | Primary success criterion |
| 188w RBiH officer_quality whole-run mean Δ/turn | +0.003865 (Wave 6) | **≥ +0.001** (positive; doctrinal sign +1, with slight slowdown allowed) | Control-faction sanity check |
| 188w RS active brigade count | 51 (Wave 6) | **≥ 35** (no catastrophic dissolution cascade) | Must not destroy the VRS via officer-quality-driven decay loop into MORALE_OVERRIDE_TURNS dissolution |
| Existing tests | All GREEN | **≥ 5 new lane tests + GREEN focused regression** (officer_quality, officer_config, attack_post_battle_effects, attack_resolution_osid clusters) | Test suite is the floor |
| `npx tsc --noEmit` | clean | clean | Type-check is binding |

**Plausibility check (per skill mandate "is the outcome historically plausible"):** The Wave 3 trace projection for `RS:2.5/HRHB:2.0/RBiH:1.0` produces VRS shifting from +0.000246/turn drift to ~-0.0050/turn decline. Over 188 turns this is a total Δ of approximately -0.94 — but officer_quality is clamped at OFFICER_QUALITY_FLOOR=0.05, so the actual end-state for VRS would be in the 0.05-0.20 band by t188 starting from 0.55. This produces the doctrinal "professional-but-degraded" arc cleanly. HRHB by similar math would land in the 0.10-0.20 band. RBiH would continue rising toward OFFICER_QUALITY_CAP=0.90. The arcs are plausible.

**Stop triggers Phase 1 must respect:**
1. If 40w benchmarks drop below 6/6, STOP and report — bot calibration regression.
2. If 188w VRS officer_quality whole-run Δ/turn does NOT bend nonpositive, the hypothesis is again disproven; STOP, do NOT retune in-lane, and produce a Wave-6-style verdict report.
3. If 188w RS brigade count drops below 35, STOP — officer-quality decay coupled with morale-override may be cascading into mass dissolution. This is the critical interaction surface (Engine Invariants §6.2.4 morale-collapse override is currently behind `MORALE_OVERRIDE_ENABLED=false` flag, but the dissolution criteria 2-of-3 path is always live).

**Recommended Phase 1 dispatch shape:**
- Pre-engagement panel sign-off (this report) — **REQUIRED**
- Implementation phase: ~30-50 LOC change (record promotion + accessor + 2 call-site updates inside `applyOfficerCasualtyLoss` to read `OFFICER_CASUALTY_MULT[f.faction] ?? DEFAULT`)
- New tests: ≥5 covering faction-keyed lookup, default fallback, RS/HRHB/RBiH numeric verification, determinism across invocations, and existing-test regression preservation
- 40w smoke gate (binding)
- 188w smoke + Wave 6 trajectory diagnostic re-run (binding)
- Lane closeout report under `docs/40_reports/implemented/`

### Verdict: CONDITIONS — full calibration regression at both 40w and 188w required before merge

**Recommended numerics (concur):** `RS:2.5 / HRHB:2.0 / RBiH:1.0`, with `DEFAULT_OFFICER_CASUALTY_MULT=1.5` fallback per /game-designer.

**Conditions Phase 1 must meet:**
1. 40w smoke gate: anchors ≥26/27, benchmarks 6/6, area ≥92.5%.
2. 188w smoke gate: `final_state_hash` emits cleanly (Wave 7 Lane B verified achievable), VRS+HRHB officer_quality whole-run Δ/turn ≤0, RBiH ≥+0.001, RS brigade count ≥35.
3. ≥5 new lane tests GREEN; focused regression on officer_quality / attack_post_battle_effects / attack_resolution_osid clusters GREEN.
4. `npx tsc --noEmit` clean.
5. Hash drift at 40w is expected and not a gate; hash byte-identity is not required (and would in fact be a failure mode — lane intent is to drift).

**Concerns flagged:**
1. The 188w smoke is the binding verdict gate. Without it, the lane has no way to verify the late-war arc bend. This is a 12+ minute scenario run (per Wave 6 wallclock) and must include the Wave 6 trajectory diagnostic re-run. Phase 1 cannot ship on 40w gates alone — Wave 6 explicitly proved that 40w is unverifiable for this lever (40w terminates at turn 40, all factions in their unchanged early-war bands).
2. The `MORALE_OVERRIDE_ENABLED` flag is currently default-false; if Phase 1 also sets it true (out of scope for this lane!), the interaction with officer-quality-driven cohesion drag could cascade into VRS dissolution. Phase 1 MUST NOT touch the morale-override flag.
3. The Wave 6 lesson "per-brigade growth terms can overwhelm per-faction budget caps" applies as a positive prediction here — the lever IS per-brigade, so it should bend per-brigade trajectory directly. If 188w shows the per-brigade arc still climbs after the lever, then the hypothesis-disproved-by-verification pattern applies and the lane closes with a STOP-AND-ASK Wave-6-style report.

---

## Panel Member 4 — /determinism-auditor

**Skill file:** `.claude/skills/determinism-auditor/SKILL.md`
**Authority:** Identify nondeterminism risks; cite `DETERMINISM_TEST_MATRIX.md` and Engine Invariants §11.
**Question:** Faction-asymmetric numerics on a faction-symmetric mechanism — is this still hash-stable? Are there any iteration-order or rounding-mode concerns? Does the 188w hash gate need any new test infrastructure?

### Findings

**Hash stability of the proposed shape:**

Promoting `OFFICER_CASUALTY_MULT` from `const = 1.5` to `Record<string, number> = {RBiH: 1.0, RS: 2.5, HRHB: 2.0}` with accessor `OFFICER_CASUALTY_MULT[faction] ?? 1.5`:

- Object literal key order is irrelevant — accessor reads by `f.faction` string key, not by iteration. No iteration order introduced.
- The accessor is a single property read + nullish coalescing — pure, no temporal dependency, no `Math.random`, no `Date.now`, no locale-dependent comparator.
- The arithmetic shape inside `applyOfficerCasualtyLoss` is unchanged: `casualtyRatio * mult * (1.0 - oq * 0.3)`. Float64 multiplication is deterministic across V8 versions for IEEE-754-conformant operations on the same inputs (per Engine Invariants §11.2 implicit, plus DETERMINISM_TEST_MATRIX.md).
- Per Engine Invariants §11.1 and §11.2 (referenced from skill required reading): float arithmetic must be order-independent at the call-site level. The two call sites in `attack_resolution_osid.ts:770,772` iterate `attackerFormations` (already sorted upstream by formation_id via strictCompare per the post-battle effects pipeline) and apply once to the defender. No new iteration is introduced.

**Faction-key lookup determinism:** `f.faction` is a canonical string ('RBiH' | 'RS' | 'HRHB'). The key set is closed in canon (`MEMORY.md`: "Canonical faction IDs: RBiH, RS, HRHB only"). Object property access on string keys is deterministic across Node versions.

**Default-fallback determinism:** `?? 1.5` produces the legacy scalar value when the faction key is not in the record. Any future test fixture or scenario using a non-canonical faction code (e.g., 'JNA' transitional formations, militia formations with faction='UNKNOWN') will receive 1.5 byte-identically to the current behavior. This preserves byte-stability for all non-{RBiH,RS,HRHB} formations.

**No nondeterminism risks introduced:**
- No iteration over the record's keys is required at runtime; the accessor is single-key lookup.
- No serialization order risk — `OFFICER_CASUALTY_MULT` is not persisted in `final_save.json` (it's a module-level constant).
- No timestamp coupling.
- No randomness coupling.

**188w hash gate readiness:**

Wave 7 Lane B (`107fe60b`) shipped the streaming finalizer that emits `replay_save_sequence.json` after run completion via `streamFinalizeReplaySaveSequenceFromJsonl`. Per the Wave 7 audit, this bounded peak heap to ~6.9 GB at 188w (1.3 GB headroom under 8 GB cap). The `run_summary.json` and `final_state_hash` emit reliably post-streaming.

**No new test infrastructure required for hash gates.** The existing harness (`scenario_runner.ts` + `final_state_hash` emit + 40w/188w scenario configs) is sufficient. Phase 1 should:
- Use `npm run sim:scenario:run:40w` for the 40w smoke (existing).
- Use `npm run sim:scenario:run -- --scenario data/scenarios/apr1992_definitive_188w.json --unique --map --out runs --max-old-space-size=8192` for the 188w smoke (existing post-Wave-7 Lane B).
- Use `tools/diagnostics/reconstitution_188w_checkpoints.cjs` for the trajectory diagnostic (existing post-Wave 6).

**Determinism-Test-Matrix gate alignment:** Per `docs/DETERMINISM_TEST_MATRIX.md`, faction-asymmetric data on faction-symmetric mechanism is the canonical pattern (cited examples: `FACTION_LEARNING_RATE`, `getFactionReinforcementMult`, `FACTION_RESERVE_DRAW_RATE`, `FACTION_POOL_SCALE`). The proposed shape conforms.

**One Phase 1 verification to add to the new test suite:**
- Faction-key determinism test: invoke `applyOfficerCasualtyLoss` against three formations (one per faction) with identical (cas, totalPersonnel, officer_quality) inputs; assert post-state officer_quality differs in the expected proportions (`Δ_RS = 2.5 × Δ_RBiH`, `Δ_HRHB = 2.0 × Δ_RBiH`). This catches accidental scalar-fallback regressions.
- Determinism-across-invocations test: invoke 3× with same inputs; assert byte-identical outputs.

### Verdict: GO — no new nondeterminism risks; 188w hash gate infrastructure ready post-Wave-7 Lane B

**Recommended numerics (concur):** `RS:2.5 / HRHB:2.0 / RBiH:1.0` with `DEFAULT=1.5`.

**Concerns flagged:**
1. Phase 1 must not introduce iteration over `OFFICER_CASUALTY_MULT` keys at runtime (accessor-only is deterministic; iteration would require strictCompare-sort).
2. Phase 1 must preserve the `?? 1.5` default for any future non-canonical faction code; without it, an undefined faction would propagate `NaN` through the multiplication and clamp to OFFICER_QUALITY_FLOOR (silently wrong, hash-stable but incorrect).
3. The 188w hash gate is technically dispatchable post-Wave-7 Lane B but has not been exercised as a binding regression gate yet. Phase 1 will be the first lane to use it as such. If the streaming finalizer regresses unexpectedly, Phase 1 must STOP rather than retry without diagnosis (Mission C precedent on gate failures).
4. No DETERMINISM_TEST_MATRIX.md updates required; the proposed shape already conforms to canonical patterns documented there.

---

## Synthesis

### Combined Verdict: **CONDITIONS — Phase 1 GO with binding acceptance criteria**

All four panel members produce GO/CONDITIONS verdicts (no NO-GO). Three (`/game-designer`, `/historian`, `/determinism-auditor`) issue clean GO; one (`/scenario-creator-runner-tester`) issues CONDITIONS with a full-calibration-regression gate that the other three concur with. Synthesis verdict is therefore **CONDITIONS** — Phase 1 may proceed under the binding conditions below.

### Recommended numerics for Phase 1 (unanimous)

```ts
// src/sim/combat/officer_quality_update.ts (proposed Phase 1 shape)

/** Default officer casualty multiplier — preserves legacy scalar for unmapped factions. */
export const DEFAULT_OFFICER_CASUALTY_MULT = 1.5;

/** Faction-asymmetric officer casualty multipliers.
 *  Per Wave 3 trace evidence: VRS replacement officers are JNA-cadre-loss net of partial
 *  replacement (higher decay coefficient); ARBiH replacement officers are local-leader
 *  promotion (lower decay coefficient); HRHB Federation-transition rotation (intermediate).
 *  Faction-symmetric mechanism (Record<string, number> read via accessor); asymmetric data.
 *  Mirrors FACTION_LEARNING_RATE shape on the loss side of officer_quality.
 */
export const OFFICER_CASUALTY_MULT: Record<string, number> = {
    RBiH: 1.0,
    RS: 2.5,
    HRHB: 2.0,
};

/** Accessor — preserves byte-stability for non-canonical faction codes. */
export function getOfficerCasualtyMult(faction: string): number {
    return OFFICER_CASUALTY_MULT[faction] ?? DEFAULT_OFFICER_CASUALTY_MULT;
}
```

Caller change in `attack_post_battle_effects.ts:65`:
```ts
const officerLoss = casualtyRatio * getOfficerCasualtyMult(f.faction) * (1.0 - f.officer_quality * 0.3);
```

### Binding acceptance criteria for Phase 1 (must-meet before merge)

1. **Code shape** — record + accessor + default fallback as above; no `if (faction === 'X')` branches anywhere; faction-symmetric mechanism preserved.
2. **40w smoke gate** — anchors ≥26/27 (no new failures beyond pre-existing brka_2 P0); benchmarks 6/6; area-weighted ≥92.5% (-0.8pp tolerance from current 93.3%); hash drift expected, not a gate.
3. **188w smoke gate** — `final_state_hash` emits cleanly (Wave 7 Lane B streaming finalizer must hold); VRS+HRHB officer_quality whole-run Δ/turn ≤0 (doctrinal sign -1); RBiH whole-run Δ/turn ≥+0.001 (control); RS active brigade count at t188 ≥35 (no dissolution cascade).
4. **Trajectory verification** — Wave 6 diagnostic (`tools/diagnostics/reconstitution_188w_checkpoints.cjs`) re-run on the 188w output; checkpoints at t1/t52/t78/t104/t188 must show monotonic VRS+HRHB officer_quality decline from t52 onward.
5. **Tests** — ≥5 new lane tests GREEN (faction-keyed lookup, default fallback, per-faction numeric verification, determinism across invocations, byte-stability for non-canonical faction codes); focused regression on `attack_post_battle_effects`, `attack_resolution_osid`, `officer_quality`, `officer_config_consumers` clusters all GREEN.
6. **Type-check** — `npx tsc --noEmit` clean.
7. **Sensitive-history compliance assertion in lane report** — explicit Ring 1 classification, no §6 (Sensitive History Design Gate) sign-off chain triggered, no FORAWWV / paint anchor / political_controllers / OOB / rupture wiring / `enclave_resilience.ts` touch.
8. **Stop triggers respected** — if 188w VRS officer_quality Δ/turn does NOT bend nonpositive, STOP and produce Wave-6-style verdict report; do NOT retune in-lane.
9. **Out-of-scope guards** — Phase 1 MUST NOT touch the `MORALE_OVERRIDE_ENABLED` flag, MUST NOT alter `OFFICER_QUALITY_FLOOR`, MUST NOT alter `FACTION_LEARNING_RATE` (growth side), MUST NOT couple to `war_crimes_record` (Engine Invariants §15.2 binding), MUST NOT extend scope to UNPROFOR / comms-asymmetry / ammo-scarcity surfaces.
10. **Phase 1 lane report** — under `docs/40_reports/implemented/` named `20260505_OFFICER_CASUALTY_MULT_FACTION_ASYMMETRIC.md` (or dated to Phase 1 ship day) with the standard predecessor-chain / files-changed / acceptance-gate / sensitive-history-compliance / determinism / counterfactual-safety / successor-handoff sections.

### Sensitive-History Compliance Assertion (this Phase 0 report)

- **Ring classification:** **Ring 1** (per `SENSITIVE_HISTORY_DESIGN_GATE.md` §1 Ring 1 = "modeled mechanically as structured state"). The proposed change modifies an existing combat-mechanic scalar into a faction-keyed record on the same mechanic. No Ring 2 narrative surface is touched (no event content, no essay content, no Cost Ledger string). No Ring 3 refused surface is approached (negative test on §1.5 #1-#11 all PASS).
- **§6 Sign-Off chain (`SENSITIVE_HISTORY_DESIGN_GATE.md` §6):** This change is **NOT** in any §6 row that requires sign-off. It is not a new rupture, not a change to a rupture trigger, not a new atrocity event, not a change to atrocity event content, not a new condemnation flag, not a paramilitary policy surface change, not a Cost Ledger wording change, not a new essay, not a change to enclave mechanics, and not a "reward for atrocity" effect. Therefore §6 sign-off chain is **NOT TRIGGERED** for Phase 1.
- **Faction-symmetric-mechanism check:** PASS. Mechanism is `Record<string, number>` with single faction-agnostic accessor `getOfficerCasualtyMult(faction)` and `?? DEFAULT` fallback. No `if (faction === ...)` branches anywhere in the path. Mirrors the canonical shape of `FACTION_LEARNING_RATE` already in the same file and `getFactionReinforcementMult` already in tree (Wave 4 precedent `e9584dd3`).
- **Read-only assertion (this report):** No source modified. No test modified. No scenario data modified. No paint anchor / political_controllers / OOB / FORAWWV / rupture-wiring / `enclave_resilience.ts` touched. No combat-math number tuned. The report is the deliverable.

### Why CONDITIONS rather than GO

The full-calibration-regression gate at 188w is the binding condition. Wave 6 explicitly proved that 40w cannot verify late-war officer-quality arc bending — the 40w scenario terminates before the lever bites. Phase 1 cannot ship on 40w gates alone; the 188w trajectory verification is load-bearing. Wave 7 Lane B unblocked the 188w hash gate by streaming the replay buffer, but that gate has not yet been exercised as a binding pre-merge regression gate by any lane. Phase 1 will be the first to use it as such, and the trajectory must show the doctrinal direction or the hypothesis is again disproven (Wave 6 pattern).

The CONDITIONS verdict is the calibration-discipline answer: ship the lever per the unanimous panel numerics, but only with binding 188w-trajectory verification gates. If those gates fail, this is the second hypothesis-disproved-by-verification pattern in this calibration arc, and the next investigation surface (per Wave 6 successor handoff item 3) becomes the surviving-brigade growth-term cap (i.e., capping VRS officer-quality growth at the JNA-inheritance baseline rather than amplifying its decay coefficient).

### Successor handoff if Phase 1 fails

If Phase 1 ships clean numerics + binding gates and 188w trajectory STILL shows VRS+HRHB officer_quality climbing:
1. Do NOT retune `OFFICER_CASUALTY_MULT` upward in a follow-up lane (the magnitudes are trace-grounded; further upward tuning is no longer doctrine-grounded).
2. Investigate the per-turn `updateBrigadeOfficerQuality` growth path — specifically the `(1.0 - quality × 0.5)` diminishing-returns factor and whether the `COMBAT_GROWTH_BASE × FACTION_LEARNING_RATE` product overwhelms the casualty-side decay even at the `RS:2.5` coefficient.
3. Consider adding a per-turn upper-bound cap on per-brigade officer_quality growth keyed off cohort/cadre-replacement turnover (proposed in Wave 6 successor handoff item 3 as "capping at the pre-war professionalism baseline for VRS").
4. Issue a Wave-6-style verdict report and re-engage the panel.

---

## Output Summary (for orchestrator handoff)

- **Report path:** `docs/40_reports/audits/20260505_OFFICER_CASUALTY_MULT_PHASE_0_PANEL.md` (this file)
- **Panel verdict:** **CONDITIONS** — Phase 1 GO with binding acceptance criteria
- **Recommended numerics:** `RS:2.5 / HRHB:2.0 / RBiH:1.0` with `DEFAULT_OFFICER_CASUALTY_MULT=1.5` fallback (unanimous across all four panel members)
- **Conditions list:** 10 binding acceptance criteria above (40w smoke gate, 188w smoke gate, trajectory verification, ≥5 lane tests, type-check, sensitive-history compliance, stop triggers respected, out-of-scope guards, Phase 1 lane report shape, faction-symmetric mechanism preserved)
- **Ring classification:** **Ring 1** (per `SENSITIVE_HISTORY_DESIGN_GATE.md` §1)
- **§6 sign-off chain triggered:** **NO** — change is not in any §6 row
- **Sensitive-history compliance:** Asserted; read-only Phase 0; no source / scenario / canon / FORAWWV / rupture / paint / OOB / political_controllers / `enclave_resilience.ts` touch; no combat-math number tuned
- **Next action user should consider authorizing:** Phase 1 implementation lane, dispatched with this report as the binding panel approval, gated by the 10 acceptance criteria, named `LANE-NIGHTSHIFT-OFFICER-CASUALTY-MULT-PHASE-1-IMPLEMENTATION` (or session-equivalent).
