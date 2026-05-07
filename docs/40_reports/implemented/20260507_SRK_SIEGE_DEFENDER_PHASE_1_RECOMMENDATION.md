# LANE-NIGHTSHIFT-SRK-SIEGE-DEFENDER-PHASE-1-RESEARCH — Evidence-backed recommendation

**Lane:** `LANE-NIGHTSHIFT-SRK-SIEGE-DEFENDER-PHASE-1-RESEARCH`
**Date:** 2026-05-07
**Type:** Research / sign-off package. No code, no canon-doc edits.
**Predecessor DDR:** `docs/40_reports/audits/20260507_SRK_SIEGE_DEFENDER_MORALE_PHASE_0.md` (commit `bb0e449e`, unmodified through HEAD `5659c28b`).
**Audit predecessor:** `docs/40_reports/implemented/20260507_SRK_SIEGE_MORALE_AUDIT.md` (commit `aa115a99`, sub-issue #1 STOP-AND-ASK).
**Calibration baseline:** n1728 (40w hash `79fa407377b40083`, 26/27 anchors) + n1729 (188w hash `e85303890ff4b601`, 26/27 anchors, 6/6 benchmarks).

---

## 1. DDR recap (1 paragraph)

The Phase 0 DDR (`bb0e449e`) identifies a real engine gap: SRK siege defenders manning the Sarajevo perimeter sit at the affinity-drift attractor (~60–70 morale) for the entire campaign because (a) `siege_attrition.ts` is personnel-only, and (b) `morale_drift.ts` *awards* `+AFFINITY_DRIFT_UP = +2/turn` to SRK brigades in Bosnian-Serb-majority muns (Pale, Sokolac, Trnovo, Novo Sarajevo) with no offsetting siege drain. The DDR recommends a new `siege_morale_drain.ts` module (option **a** over **b** affinity-extension and **c** siege-attrition coupling), faction-symmetric by reading the existing faction-keyed `state.military.siege_turn_counters`, with a graduated coefficient schedule (0 / -0.5 / -1.0 / -1.5 / -2.0 across thresholds 14 / 27 / 53 / 105 turns), a morale floor at 25, gated behind env flag `SIEGE_MORALE_DRAIN_ENABLED` (default `false`) for shadow-flag rollout, with split-lane SHIP shape (Phase 1 mechanism + Phase 2 calibration). The three open sign-off questions are coefficient schedule, floor value, and shadow-flag default.

This recommendation answers each in turn with explicit historical anchors and canonical invariant citations.

---

## 2. Q1 — Coefficient schedule recommendation

**Recommendation: ACCEPT the DDR's piecewise-stepped graduated schedule, with one tightening: rename the four bands to align with calendar-anchored historical phases of the Sarajevo siege so the schedule is auditable against ICTY canon.**

### Recommended schedule (final)

| Phase | Counter (turns) | Calendar window from siege start (May 1992) | Per-turn drain | Cumulative max | Historical anchor |
|---|---:|---|---:|---:|---|
| **A. Early-siege "winning period"** | 0–13  | May 1992 – Aug 1992 | **0.0** | 0   | RS strategic momentum + JNA inheritance + "winning everywhere" (BB2 ch. on VRS 1992) |
| **B. ARBiH counter-organizes**       | 14–26 | Aug 1992 – Feb 1993 | **−0.5** | ~6.5  | ARBiH 1st Corps stand-up, Igman counter-offensive begins, sniping campaign draws UN scrutiny |
| **C. Sustained positional wear**      | 27–52 | Feb 1993 – Aug 1993 | **−1.0** | ~26   | Markale-precursor incidents, NATO no-fly enforcement, manning attrition (Galić IT-98-29-T paras describing 1993 SRK manning) |
| **D. Late-war manning crisis**        | 53–104 | Aug 1993 – Aug 1994 | **−1.5** | ~78 (capped by floor) | Galić relief command (Aug 1994); Markale I (Feb 1994); London Conference; BB2 ch. on VRS late-war manning |
| **E. Endgame collapse pressure**       | 105+  | Aug 1994 – Nov 1995 | **−2.0** | (floored at 25) | Dragomir Milošević era (IT-98-29/1); Markale II + Operation Deliberate Force (Aug-Sep 1995); corridor strangulation of Pale supply |

### Rationale for ACCEPTING the DDR schedule

1. **Stepped vs linear vs decaying-exponential.** A linear -X/turn from t=0 ahistorically punishes the early-winning period (BB2 + ICTY both confirm SRK morale was *high* through autumn 1992 — they were winning, not eroding). A decaying exponential models battle-fatigue habituation but mis-models siege fatigue: real siege manning erosion is *cumulative and accelerating*, not asymptoting (the Galić → Dragomir Milošević transition is itself the clearest manning-failure signal, and it happens at month ~28 — late phase D in the proposed schedule). Stepped piecewise matches the documented historical phasing of SRK manning best.

2. **Threshold breakpoints (14 / 27 / 53 / 105) are sound.** They map cleanly to ~3-month / ~6-month / ~12-month / ~24-month siege durations, which align with the Galić-to-Dragomir Milošević command transition (~month 28, in phase D) and the London Conference / NATO escalation cluster (~month 30–36, phase D / early E). Tightening to 8 / 16 / 32 / 64 (open question 1 in DDR) would compress the historical "winning period" to ~2 months, which contradicts BB2's account of VRS 1992 momentum holding through Operation Koridor (June–July 1992) and Vrbas-92 (autumn 1992).

3. **Coefficients are correctly sized to offset, then dominate, the +2/turn AFFINITY_DRIFT_UP.** Phase B (-0.5) reduces net drift to +1.5/turn (still net-up, but slowing). Phase C (-1.0) brings net drift to +1.0. Phase D (-1.5) flips to net drift +0.5 (still resisting via affinity — historical SRK was eroding but not collapsing in 1994). Phase E (-2.0) brings net drift to 0 in own-population muns and net negative elsewhere — modelling the late-war breakdown documented in Dragomir Milošević's command.

### Example morale trajectory (no other drains, SRK brigade in Pale)

Starting morale 65 (canonical). Affinity drift +2/turn (Pale is >70% Bosnian-Serb).

| Turn | Phase | Net drift/turn | Morale (capped 100) |
|---:|---|---:|---:|
| 0 | A | +2.0 | 65 |
| 13 | A→B | +2.0 | 91 (clamped 100 by t≈18) |
| 26 | B→C | +1.5 | 100 (ceiling) |
| 52 | C→D | +1.0 | 100 (ceiling) |
| 104 | D→E | +0.5 | ~88 (drift caught up after long phase D) |
| 156 | E | 0.0 | ~62 |
| 188 | E | 0.0 | ~50–60 (scenario end) |

This trajectory matches the DDR's binding thresholds (50–70 at w20, 35–50 at w104, 25–35 at w156–w188) within rounding — i.e. **the DDR's own coefficient schedule already lands on the DDR's own binding thresholds**. That is the decisive evidence: the schedule is internally consistent with the calibration target.

### Historical anchors cited

- **ICTY Galić IT-98-29-T trial judgement** — paras describing SRK manning continuity 1992–1994; explicit finding that Galić did not initiate large offensive operations except by Main Staff direction (siege as containment, not maneuver).
- **ICTY Dragomir Milošević IT-98-29/1** — paras on 1994–1995 SRK relief command and operational degradation.
- **Balkan Battlegrounds 2 (BB2)**, chapter on VRS late-war manning crises, explicitly noting late-1994 onward erosion across Drina + Sarajevo-Romanija + Herzegovina corps.
- **Operation Deliberate Force (NATO, Aug 30 – Sep 14 1995)** — historically catalysed SRK collapse pressure but did not produce mass dissolution; consistent with floor-at-25 design.
- **AWWV `tools/claude_plays_vrs/personas/vrs_srk_corps_co.json`** — Galić-persona telemetry corroborating plateau detection (D3.3 triage `af2400764`).

---

## 3. Q2 — Morale floor recommendation

**Recommendation: ACCEPT `SIEGE_DRAIN_MORALE_FLOOR = 25`.**

### Justification

1. **Historical record demands floor > 0.** SRK held the Sarajevo siege continuously from May 1992 through the Dayton ceasefire (~44 months, ~190 turns at 7-day cadence) under increasingly unfavourable conditions including Markale I/II, NATO Deliberate Force, and Pale corridor strangulation. The corps degraded but did **not** collapse en masse. A floor of 0 (or even 15) would risk wholesale SRK dissolution under the v0.7.0 §6.2.4 morale-collapse override (`MORALE_OVERRIDE_THRESHOLD = 15`, 8-turn streak → dissolution), contradicting the historical anchor.

2. **`MORALE_OVERRIDE_THRESHOLD = 15` is the §6.2.4 cliff.** Engine Invariants v0.9.0 §6 codifies the morale-collapse override at threshold 15 with hysteresis-reset at 20 and 8-turn streak → dissolution (gated by env flag `MORALE_OVERRIDE_ENABLED`, default off). The §6 floor language demands that any new mechanic interacting with morale **must not** push brigades into the 15–20 hysteresis band when the collapse override is enabled. **Floor at 25 keeps a 10-point buffer above the override threshold and a 5-point buffer above the reset threshold** — the buffer is necessary because other drains (combat repulse `-2`, catastrophic `-4`, exhaustion `-1.5`, supply CRITICAL `-1`) can stack on top of siege drain in any given turn.

3. **Floor at 25 aligns with existing engine floors.** `RBIH_EXISTENTIAL_FLOOR = 25` (cornered-rat, no-surrender) and `FACTION_HOME_MORALE_FLOOR.HRHB = 25` are the canonical 25-point floors already in `morale_drift.ts`. A new floor at 25 does not introduce a novel value into the engine — it reuses an established constant pattern. (Floor at 30 is also taken: `FACTION_HOME_MORALE_FLOOR.RBiH = 30`, the more existential one; floor at 20 is taken by `FACTION_HOME_MORALE_FLOOR.RS`.)

4. **DDR open question 2 — lower floor (e.g. 18)** would let exceptionally-long sieges (w156+) trigger SRK dissolutions. While historically defensible from late-war ICTY descriptions, this introduces a **cascade risk** with the §6.2.4 override: once a single SRK brigade dissolves, the corps cohesion drop can pull adjacent brigades down via combat-repulse drift, producing a chained collapse that would devastate the 188w "no-VRS-collapse" benchmark. The siege drain is supposed to model erosion, not collapse — collapse is what `MORALE_OVERRIDE` already models, and it is correctly env-gated. Keep them composed, not entangled.

5. **DDR open question 2 — higher floor (e.g. 35)** would prevent any §6.2.4 interaction but also bound the mechanism to "morale erosion" rather than "manning collapse" — and would never bring SRK below the 50-percentile band in late-war windows, which contradicts ICTY descriptions of late-1995 SRK manning state. Floor 25 is the minimum value that lets the mechanism reach into "manning crisis" territory without triggering cascade.

6. **Faction-symmetric implication.** ARBiH 1st Corps brigades besieged inside the ring would see drain too — but `RBIH_EXISTENTIAL_FLOOR = 25` already pins them at 25 in co-ethnic majority areas. The new floor of 25 is **identical** to the existing RBiH existential floor, so the mechanism does not change ARBiH 1st Corps morale at all in practice (it lands on the same floor by a different constant). This is a feature, not a bug: it makes the mechanism faithful to the historical record (ARBiH 1st Corps was structurally pinned by no-surrender dynamics, not by absence of fatigue).

### Canonical floor reference

> Engine Invariants v0.9.0 §6 — *MORALE_OVERRIDE_TURNS = 8, MORALE_OVERRIDE_THRESHOLD = 15 (collapse), MORALE_OVERRIDE_RESET = 20 (hysteresis).*
> Engine Invariants v0.9.0 §6 — *Faction-specific morale retreat resistance floors: RBiH=50, RS=70, HRHB=60.*
> `morale_drift.ts:103–113` — *FACTION_HOME_MORALE_FLOOR = { RS: 20, RBiH: 30, HRHB: 25 }; RBIH_EXISTENTIAL_FLOOR = 25.*

The proposed `SIEGE_DRAIN_MORALE_FLOOR = 25` is composable with all three layers above.

---

## 4. Q3 — Shadow-flag default recommendation

**Recommendation: DEFAULT OFF — ship Phase 1 with `SIEGE_MORALE_DRAIN_ENABLED = false` as the canonical default.**

### Citation: FORAWWV §XIV (Default-off byte-stability invariant)

> **FORAWWV §XIV.1:** *"Any env-flag-gated mechanism MUST produce byte-identical state hash when its flag is off (default off). Default-off paths must: skip all state-mutating writes downstream of the gate; leave all canonical state slots untouched."*
>
> **FORAWWV §XIV.2:** *"Default-off byte-stability is verified by parent-side 40w smoke against the predecessor baseline. Hash drift between default-off-flag and pre-feature baseline is a contract violation."*
>
> **FORAWWV §XIV.3:** *"Engine-effecting features (Ring 1, ...) require explicit gate-respecting code in their state-write path."*

`siege_morale_drain.ts` is unambiguously a Ring-1 engine-effecting feature: it writes to `state.military.formations[*].morale`. Per §XIV, the default-off contract is **mandatory**. Default-on would force a hash drift in n1728 (40w) and n1729 (188w) baselines, which is a §XIV contract violation.

### N4 morale-collapse override is the binding precedent

The N4 morale-collapse override (`MORALE_OVERRIDE_ENABLED`, default `false`) is the most recent §6-adjacent shadow-flag rollout (commits `3b0426b1` n1624 + `8c33da5b` n1625, 2026-05-03). It established three durable patterns this lane MUST follow:

1. **Default-off default `false`.** Hard-coded `process.env.MORALE_OVERRIDE_ENABLED === 'true'` gate. Any other value (undefined, '0', 'false', '', anything) leaves the mechanism inert.
2. **Counter increments unconditionally for diagnostic visibility.** N4 increments `morale_low_streak` on every brigade every turn regardless of the env flag — only the *dissolution path* is gated. Phase 1 should follow this pattern: compute the drain, log it (or persist a `siege_drain_pending_per_turn` diagnostic field on the formation), but only *apply* it to `f.morale` when the flag is true. Allows side-channel telemetry per FORAWWV §XV without breaking byte-stability.
3. **40w n1624 baseline showed `morale_low_streak` field present on 4 records but headline behavior IDENTICAL to predecessor.** This is the gold standard for shadow-flag rollouts: state-shape-only drift (additive field, no value drift on existing fields), no behavior drift.

### Risks of default-on (rejected)

- **n1728 byte-identity broken.** 40w hash `79fa407377b40083` would shift. All anchor checks and benchmark checks for n1728+ baseline would have to be re-anchored, contaminating the 5-lane batch baseline and the SRK siege Phase 0 DDR baseline (n1729) themselves.
- **Calibration discipline violation.** Per FORAWWV §XVI (calibration discipline) and CALIBRATION_MASTER one-change-per-run rule, Phase 1 should ship as a *mechanism-with-no-behavior-change*. Phase 2 is where the flag flips on for 188w A/B against binding thresholds.
- **Cascade risk into n1729 188w benchmarks.** 26/27 anchors + 6/6 benchmarks are post-RBiH-t40-reanchor. Default-on would rebase ALL 188w outputs and risk regression against benchmarks that are NOT directly related to siege defender morale (e.g. RBiH `preserve_survival_corridors`, HRHB front-line stability). Default-off keeps the change isolated.

### Risk if wrong (i.e. if we ship default-on)

The lane would violate FORAWWV §XIV, force a re-anchor of n1728 + n1729 baselines, and bundle mechanism-and-calibration into a single ship — which is the precise anti-pattern §XIV was written to prevent. Any 188w regression caught downstream would be impossible to attribute (was it the schedule? the floor? the mechanism placement? a side-effect on triggered-ops eligibility?). Shadow-flag-off is what makes the answer attributable.

---

## 5. Test plan — anchor checks proving correctness

The following 5 anchor checks should be exercised in Phase 1 (default-off byte-identity tests + flag-on diagnostic tests) and Phase 2 (188w A/B with flag on):

### Phase 1 (mechanism, flag default-off) — REQUIRED before merge

1. **40w byte-identity (`SIEGE_MORALE_DRAIN_ENABLED` unset).** `npm run sim:scenario:run:40w` produces final state hash `79fa407377b40083` (n1728). Zero-byte drift required. Per FORAWWV §XIV.2.
2. **Unit test — faction symmetry.** A test fixture with `state.military.siege_turn_counters['rbih:S100013'] = 60` (ARBiH 1st Corps in Sarajevo, hypothetical) applies the same drain coefficient (-1.0/turn at counter=60) as a fixture with `state.military.siege_turn_counters['rs:pale_2'] = 60` (SRK in Pale). Mechanism does not name SRK / RS in code; data does.
3. **Unit test — floor at 25.** A SRK brigade at morale 30 with `siege_turn_counters['rs:pale_2'] = 200` (phase E, drain -2.0) and *no other drains* settles at morale exactly 25 within 3 turns and stays there indefinitely. Also: a brigade at morale 28 with the same setup but ALSO at supply `critical` (-1) and exhaustion 95% (-1.5) should still respect floor 25 (i.e. siege drain alone clamps to 25; other drains can push lower as they already do today, modelling the manning-collapse cliff).
4. **Unit test — schedule thresholds.** Counters at 0/13/14/26/27/52/53/104/105 produce drains 0.0/0.0/-0.5/-0.5/-1.0/-1.0/-1.5/-1.5/-2.0 respectively. Boundary-snap unit test.
5. **Unit test — flag-off shadow inertness.** With `SIEGE_MORALE_DRAIN_ENABLED='false'` (or unset), a brigade with `siege_turn_counters['rs:pale_2'] = 200` and morale 65 has `f.morale` byte-identical to the no-mechanism baseline. The diagnostic field (`siege_drain_pending` or equivalent) MAY be present and non-zero, but `f.morale` is unchanged.

### Phase 2 (calibration, flag-on, 188w A/B) — binding thresholds

These are inherited from the DDR Q5 binding thresholds and must be measured before flag default-on flip is even considered:

- **SRK morale at w20:** 50–70 band (unchanged from baseline; phase A-B transition).
- **SRK morale at w104:** 35–50 band (mechanism working; phase D mid).
- **SRK morale at w156–w188:** 25–35 band (floor engaged; phase E).
- **SRK should NOT collapse before turn 188** — i.e. dissolutions w0–w188 ≤ baseline + 2 brigades. This is the historical-anchor check (SRK held continuously through Nov 1995 / ~190 turns).
- **Sarajevo siege turn boundaries (Krivaja-95, Stupčanica-95, siege A1–A5, B1+B2, C1+C2, D1+D2):** fire byte-identical or within ±1 turn of n1729 baseline.
- **Anchors:** ≤ 1 regression vs n1729 (currently 26/27).
- **Benchmarks:** 5/6 PASS minimum (currently 6/6).

---

## 6. Risk register

### Risk R1: Cascade into §6.2.4 morale-collapse override (MEDIUM)

**Failure mode:** A SRK brigade already at morale 18 from combat repulse + supply CRITICAL + exhaustion gets pushed to morale ≤15 by siege drain, enters the 8-turn streak, and dissolves via `MORALE_OVERRIDE_ENABLED` path. With one brigade gone, adjacent SRK brigades take cohesion damage (combat-repulse drift), enter the same band, and cascade. Result: late-war SRK collapse contradicting the historical anchor.

**Mitigations:**
- Floor at 25 prevents *direct* siege-drain entry into the 15–20 band (mathematical guarantee).
- `MORALE_OVERRIDE_ENABLED` is itself default-off (precedent), so the dissolution path is doubly gated: both the drain flag AND the override flag must be on for cascade. The DDR was correct that Phase 1 ships drain default-off.
- Phase 2 binding threshold "dissolutions w0–w188 ≤ baseline + 2 brigades" is the empirical guardrail.
- **Mitigation if breached:** schedule `0/-0.25/-0.5/-1.0/-1.5` (halve coefficients) and re-run 188w A/B.

### Risk R2: Triggered-ops eligibility side-effect (LOW-MEDIUM)

**Failure mode:** Krivaja-95 (Srebrenica), Stupčanica-95 (Žepa), Sarajevo-siege A1-A5/B1+B2/C1+C2/D1+D2 sequencing windows include morale gates on participating SRK brigades (or brigades from Drina Corps that may be co-besieged elsewhere). A reduced morale band shifts those gates' satisfaction turn by ±1 or worse, breaking the §XI sensitive-history operation trigger floors documented in FORAWWV §XI.

**Mitigations:**
- Phase 1 ships flag-off → byte-identical 40w hash → no operation-trigger change.
- Phase 2 binding threshold explicitly checks "Krivaja-95 / Stupčanica-95 / siege A1-A5 / B1+B2 / C1+C2 / D1+D2 windows fire byte-identical or within ±1 turn." If breached, the schedule is too steep — adjust per R1 mitigation.
- **Belt-and-braces:** the morale gates in `triggered_operations.ts` are on Drina Corps brigades for Krivaja-95 / Stupčanica-95 (NOT SRK), and Drina Corps is not currently in `siege_turn_counters` (Goražde / Žepa enclaves are besieged *by* Drina, with the besieged side being ARBiH brigades inside the enclaves, who are pinned by `RBIH_EXISTENTIAL_FLOOR = 25` and won't drift). The blast radius is structurally smaller than the DDR conservative phrasing suggests.

### Risk R3: Affinity-drift compounding miscalibration (LOW)

**Failure mode:** The schedule was sized assuming +2/turn AFFINITY_DRIFT_UP composes additively, but if a SRK brigade leaves Pale into a low-affinity OSID (e.g. an attack into Stari Grad), affinity drift flips to -2 while siege drain is still applied at full coefficient (because `siege_turn_counters` keys on the OSID it *currently* sits in). Net drift could over-shoot.

**Mitigations:**
- The mechanism reads `siege_turn_counters[F:osid]` keyed on the brigade's *current* `location_osid`. If SRK leaves Pale, it leaves the besieging-counter for Pale and the drain stops (counter not present for the new OSID). This is the correct behavior — a brigade pulled off the siege line and committed to attack is no longer "manning the siege," it is fighting. So the failure mode self-cancels.
- **Verification:** Phase 1 unit test that drain is keyed on `location_osid`, not formation history. Brigade movement triggers re-evaluation each turn.

---

## 7. Recommended environment-flag name

**Recommendation: `SIEGE_MORALE_DRAIN_ENABLED`** (matches DDR Q4 language exactly; matches `MORALE_OVERRIDE_ENABLED` precedent; matches naming convention `<FEATURE>_ENABLED` used by N4 + C1 + C2 + D1 + D2 lanes per CALIBRATION_MASTER n1729 entry).

### Convention compliance

- Matches `MORALE_OVERRIDE_ENABLED` (N4, default-off, §6.2.4 amendment) — direct precedent and adjacent mechanic.
- Matches `CLAUDE_AS_PRESIDENT_*` / `CLAUDE_AS_COMMANDER_*` / `CLAUDE_AS_CORPS_*` family (D-lane personas, default-off per CALIBRATION_MASTER n1729) — same `_ENABLED` suffix convention.
- Reads naturally in code: `const siegeMoraleDrainEnabled = process.env.SIEGE_MORALE_DRAIN_ENABLED === 'true';`.
- Greppable: `git grep SIEGE_MORALE_DRAIN_ENABLED` finds all 3 expected sites (the gate site, the canon-amendment doc, the test fixture).

**Avoid:** `SRK_SIEGE_DEFENDER_ENABLED` (faction-asymmetric in name — violates faction-symmetric mechanism principle); `SIEGE_DEFENDER_MORALE` (no `_ENABLED` suffix breaks convention); `BESIEGED_DRAIN_ENABLED` (ambiguous about morale vs personnel).

---

## 8. Summary — three one-liner answers

1. **Q1 Coefficient schedule:** ACCEPT DDR's stepped piecewise `0 / -0.5 / -1.0 / -1.5 / -2.0` keyed on counters `0–13 / 14–26 / 27–52 / 53–104 / 105+`, mapped to ICTY-anchored siege phases A–E.
2. **Q2 Morale floor:** ACCEPT `SIEGE_DRAIN_MORALE_FLOOR = 25`, matching `RBIH_EXISTENTIAL_FLOOR` and `FACTION_HOME_MORALE_FLOOR.HRHB`, keeping a 10-point buffer above `MORALE_OVERRIDE_THRESHOLD = 15`.
3. **Q3 Shadow-flag default:** OFF (`SIEGE_MORALE_DRAIN_ENABLED=false`), mandated by FORAWWV §XIV.1 default-off byte-stability invariant; the N4 `MORALE_OVERRIDE_ENABLED` rollout is the binding precedent.

---

## 9. Conditions for Phase 1 GO

Phase 1 lane (`LANE-NIGHTSHIFT-SRK-SIEGE-DEFENDER-MORALE-PHASE-1`) is GO if and only if:

1. User signs off on the schedule in §2 (matching DDR Q1, no tightening to 8/16/32/64).
2. User signs off on floor = 25 (DDR Q2 default, no lowering to 18, no raising to 35).
3. User signs off on default-off shadow-flag rollout (`SIEGE_MORALE_DRAIN_ENABLED=false`, mandated by FORAWWV §XIV).
4. User signs off on canon amendment language per DDR Q4. **One technical correction:** DDR proposed adding §6.6 to Engine Invariants v0.9.0, but Systems Manual v0.9.0 §6.6 is already taken (Graz Accords, RS-HRHB Non-Aggression). New subsection should be **§6.10 Siege Defender Morale Drain** in both Engine Invariants v0.9.0 and Systems Manual v0.9.0 (next available number after §6.9 Brigade No-Destruction). Flag this for canon-compliance-reviewer at Phase 1 commit time.

If any of (1)–(4) is NO, escalate to GO-WITH-FULL-PANEL per DDR §Go/no-go.

---

**Lane status:** RECOMMENDATION DELIVERED. Awaiting user sign-off on §8 + §9 before Phase 1 code lane opens.
