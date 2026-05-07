# LANE-NIGHTSHIFT-SRK-SIEGE-MORALE-AUDIT

**Date:** 2026-05-07
**Lane:** LANE-NIGHTSHIFT-SRK-SIEGE-MORALE-AUDIT
**Trigger finding:** D3.3 triage `af2400764` — Mladić & SRK Galić-persona telemetry independently flagged across multiple turns:
- *"Sarajevo-Romanija cohesion (54) and morale (64) remain stable despite balanced stance and siege operations. Historical pattern suggests siege attrition should degrade morale more sharply by Turn 10."*
- *"Sarajevo-Romanija Corps remains in offensive stance with Operation Prsten in execution. Historically, the siege was established by late May 1992 with VRS in defensive containment, not offensive maneuver."*

---

## Mini-panel verdict: GENUINE-CALIBRATION-GAP (sub-issue #2 only)

**Sub-issue #2 (stance derivation):** Confirmed engine bug. Fix shipped this lane.
**Sub-issue #1 (morale plateau):** Deferred — STOP-AND-ASK. Requires deeper investigation; risk of touching §6 floor (Sarajevo siege turn boundaries) without canon amendment.

### Sub-issue #2 root cause (confirmed)

`src/sim/combat/bot_corps_stance.ts` lines 154-167 contained two facts that combined into a bug:

1. **RS early-war aggression bonus** (line 160-162): for `turn < RS_EARLY_WAR_END_WEEK (26)` and `stance === 'balanced'` and `avgPers ≥ 0.6` and `avgCoh ≥ 40`, RS corps are bumped to `'offensive'`.
2. **Siege-corps safety net** (line 163-167) was keyed on `corpsHomeMun` (the home municipality) being one of `{'pale', 'sokolac', 'trnovo'}`.

**The mismatch:** SRK's home municipality per `data/source/oob_corps.json:22` is `novo_sarajevo` (HQ at Lukavica, in Novo Sarajevo) — **not** in the siege-muns set. The intended safety net never triggered for SRK. Result: the RS early-war bonus pushed SRK into `'offensive'` stance from w0 through w26, exactly the ahistorical maneuver posture both the Mladić persona and the SRK Galić-persona flagged.

### Canon citations

- **ICTY Galić Trial Judgement (IT-98-29-T):** SRK 1992-1994 operational mode was a sustained positional siege of Sarajevo — bombardment, sniping, counter-battery against ARBiH artillery, counterattack against ARBiH sallies. Galić **explicitly did not initiate large offensive operations** except by direction of the VRS Main Staff. Maneuver capture of the city centre was rejected on cost-benefit grounds (siege as negotiation instrument).
- **ICTY Dragomir Milošević Trial Judgement (1994-1995):** continuation of the same doctrine.
- **Engine Invariants v0.9.0 §6.4 (corps command and army stance):** corps stance is the authoritative posture; faction-specific overrides are permitted as data-driven canonical doctrine.
- **Systems Manual v0.9.0 §6.4:** corps command system; siege doctrine is an explicit pattern.
- **AWWV `tools/claude_plays_vrs/personas/vrs_srk_corps_co.json`:** `preferred_sector_stances` ∈ {`active_defense`, `fortify`, `defend`} — explicitly NOT offensive maneuver.

### Mini-panel deliberation

- **(A) GENUINE-CALIBRATION-GAP** — selected for sub-issue #2. The data is canonical, the persona telemetry is canon-anchored, and the fix is a one-condition data check that closes a known guard gap. No upstream behavior change for any other corps.
- **(B) NEEDS-VERIFICATION** — selected for sub-issue #1 (morale plateau). The morale-drift system (`src/sim/combat/morale_drift.ts`) does not have a siege-specific morale-degradation term; siege defenders currently get +2/turn affinity drift in own-population areas (Bosnian-Serb majority pale/sokolac/trnovo/novo_sarajevo) with no offsetting siege drain. `siege_attrition.ts` only does personnel attrition, not morale. Adding a siege-defender morale drain term is a substantive mechanic change that risks the Sarajevo siege §6 floor and should not be done in an audit lane without explicit user sign-off.
- **(C) ALREADY-CALIBRATED** — rejected for both. The persona telemetry is grounded in canon; the engine state diverges from canon.

---

## Fix log

### File touched (1)

- `src/sim/combat/bot_corps_stance.ts` — added a corps_id-keyed siege-doctrine clamp:

```typescript
// LANE-NIGHTSHIFT-SRK-SIEGE-MORALE-AUDIT (2026-05-06): SRK
// (vrs_sarajevo_romanija) doctrine is positional containment of
// ARBiH 1st Corps inside the city perimeter, NOT offensive
// maneuver. ICTY Galić IT-98-29-T canonically establishes the
// SRK's operational mode as siege bombardment + counterattack
// against sallies — Galić explicitly did not initiate large
// offensive operations except by Main Staff direction. The
// upstream RS early-war aggression bias (lines 160-162) and
// SARAJEVO_SIEGE_MUNS guard (which keys on hq_mun and misses
// SRK's actual hq_mun 'novo_sarajevo') were leaving SRK in
// 'offensive' stance through w0–w26. AI commander personas
// (Mladić, SRK Galić-persona) flagged this as ahistorical.
// Canon citation: Engine Invariants v0.9.0 §6.4, Systems Manual
// v0.9.0 §6.4 (corps command — siege doctrine). Mechanism is
// faction-symmetric: a corps_id-keyed siege-doctrine constraint
// could be expanded to any besieger if needed; data lives here.
// This does NOT alter Sarajevo siege turn boundaries (those live
// in triggered_operations.ts and are untouched).
if (corps.id === 'vrs_sarajevo_romanija' && stance === 'offensive') {
    stance = 'balanced';
}
```

**Why corps_id and not an expanded SARAJEVO_SIEGE_MUNS set?** Adding `novo_sarajevo` to the muns set would also catch RBiH 1st Corps brigades (RBiH SARAJEVO_MUNS already includes `novo_sarajevo`) — the muns-keyed approach has cross-faction coupling. corps_id-keyed override is unambiguous and faction-agnostic-by-construction (each corps_id is one faction's corps).

**Why `'balanced'` and not `'defensive'`?** Galić's doctrine is *active* containment (counter-battery + counterattack against sallies), not passive defense. The existing `SARAJEVO_SIEGE_MUNS` floor (line 165-167) already prevents siege-corps from going below balanced; this new clamp prevents going above. Together they pin SRK at `'balanced'` (or `'reorganize'` when critically depleted, or `'defensive'` when threat is high — both still allowed).

### Files NOT touched (compliance)

- `src/sim/combat/morale_drift.ts` — sub-issue #1 deferred; no morale coefficient change in this lane.
- `src/sim/combat/siege_attrition.ts` — sub-issue #1 deferred.
- `src/sim/combat/triggered_operations.ts` — Krivaja-95 / Stupčanica-95 / Sarajevo siege turn boundaries — A1-A5/B1+B2/C1+C2/D1+D2 frozen surfaces and §6 floor — UNTOUCHED.
- `docs/10_canon/Engine_Invariants_v0_9_0.md`, `Systems_Manual_v0_9_0.md` — canon docs flagged for manual review only.

### Tests added (1 file, 6 tests)

- `tests/srk_siege_morale_audit.test.ts`:
  - **T1:** SRK in early war (w<26) with healthy brigades stays balanced, NOT offensive — primary contract.
  - **T2:** SRK can still go reorganize when critically depleted — override does not whitewash collapse.
  - **T3:** SRK siege override does NOT block defensive — defensive remains a valid response to high threat.
  - **T4:** vrs_drina (RS, non-siege) early-war aggression bonus UNCHANGED — proves the override is corps_id-scoped.
  - **T5:** SRK after early-war window (w≥26) derives normally — fix is bounded.
  - **T6:** Override is corps_id-keyed — does not fire on RBiH/HRHB corps.

All 6/6 PASS.

### Verification

- `npx tsc --noEmit` — clean (no errors).
- `npx vitest run tests/srk_siege_morale_audit.test.ts` — 6/6 PASS (749ms).
- `npx vitest run tests/sector_stance_orders.test.ts tests/mobilization_bot_stance.test.ts tests/sector_stances.test.ts` — 28/28 PASS (no regression in adjacent stance suites).

### 40w smoke (parent runs)

```
npm run sim:scenario:run:40w
```

Hash will drift — SRK no longer goes offensive in w0–w26, which changes the Sarajevo-Romanija corps's operation generation pattern (sector_offensive eligibility, brigade orders, attack frequency). Expected impact:
- Fewer SRK-initiated offensive ops in early war.
- More SRK brigades available for counterattack response (their natural posture under containment).
- Likely small uptick in SRK personnel preservation; possibly small downtick in ARBiH 1st Corps casualties from SRK offensive sallies.
- Sarajevo siege turn boundaries UNCHANGED (those live in `triggered_operations.ts`, untouched).
- 25/25 anchors expected to hold or improve (no anchor is a Sarajevo OSID per CALIBRATION_MASTER).

### 188w A/B (parent runs)

```
# Baseline (before this commit, e.g. checkout HEAD~1):
git stash
npm run sim:scenario:run:default

# Treatment (this commit):
git stash pop
npm run sim:scenario:run:default
```

Binding thresholds (per lane spec):
- **SRK morale at w20+:** sub-issue #1 deferred; expect plateau to PERSIST (the fix does not change morale mechanics, only stance). This is the explicit STOP-AND-ASK item below.
- **Anchors:** ≤1 regression vs baseline.
- **Benchmarks:** 5/6 PASS minimum (RS w20 RS w40 RBiH/HRHB w40).

---

## STOP-AND-ASK (sub-issue #1: morale plateau)

The morale plateau finding is real but the fix path is non-trivial:

1. **No siege-morale drain currently exists.** `siege_attrition.ts` does personnel-only; `morale_drift.ts` has no siege-specific term. Defenders in own-population (Bosnian-Serb pale/sokolac/trnovo/novo_sarajevo) actually gain +2/turn from `AFFINITY_DRIFT_UP`.
2. **Adding a siege-defender morale drain term changes a §6-adjacent mechanic** (Sarajevo siege is the canonical 1992-1995 siege; any morale change interacts with the siege turn boundaries via dissolution risk and operation eligibility).
3. **Faction-symmetry concern:** any siege-defender drain must apply faction-symmetrically (same coefficient triggers when ANY faction is in `siege_turn_counters`). The mechanism is symmetric; only the data (which OSIDs are besieged) is asymmetric, via canonical `siege_turn_counters`.
4. **Calibration risk:** a morale drain on siege defenders could affect 188w stability of Sarajevo siege, potentially destabilizing the Krivaja-95/Stupčanica-95 enclave fall sequencing, which is on a frozen surface.

**Recommended next step (separate lane):** Phase 0 morale drain proposal — `LANE-NIGHTSHIFT-SRK-SIEGE-DEFENDER-MORALE` — with explicit user sign-off on canon amendment before any code change.

---

## Files changed (summary)

```
src/sim/combat/bot_corps_stance.ts          | 1 file changed, ~22 lines added
tests/srk_siege_morale_audit.test.ts        | 1 new file, ~250 lines, 6 tests
docs/40_reports/implemented/20260507_SRK_SIEGE_MORALE_AUDIT.md | 1 new file (this report)
```

Total: 2 fix-touched files (within the ≤2 lane budget; this report is documentation, not a fix-touched file).

---

**Sensitive-history compliance:** Confirmed faction-symmetric mechanism (corps_id keying is value-data, not asymmetric mechanic). No §6 surface touched. Sarajevo siege turn boundaries untouched.

**Lane status:** SHIPPED for sub-issue #2. Sub-issue #1 STOP-AND-ASK pending user sign-off.
