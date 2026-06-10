# Collapse Phase IV-b — §6 ADVERSARIAL RED-TEAM REVIEW

**Type:** READ-ONLY adversarial verification. No engine/sim/scenario/state/test/canon code touched. The reviewer did NOT author the scope doc under review and checked its §6 verdict skeptically against the live working tree (`main` @ `b7d7d58fd`).
**Reviewer role:** `/historian` + `/canon-compliance-reviewer`.
**Subject:** `docs/40_reports/proposals/20260610_COLLAPSE_PHASE4B_OSID_SUBSTRATE_SCOPE.md` §B (B.1 / B.2 / B.3) + the HIST bless.
**§6 bright lines (SACRED, NON-NEGOTIABLE):** Srebrenica + Žepa MUST fall to RS; Goražde/Bihać/Sarajevo/Teočak MUST hold; `srebrenica_genocide_1995` rupture timing MUST NOT change; no protected enclave OSID may ever accrue `collapse_damage` / `capacity_modifier` / `will_not_recover`.

---

## Evidence base actually read (file:line, verified this session)

- Scope doc under review — full text.
- §6 gate packet — `docs/40_reports/proposals/20260609_COLLAPSE_S6_HISTORIAN_GATE_PACKET.md` (full).
- Guard code — `src/sim/collapse/phase3d_collapse_resolution.ts` (full).
- Enclave predicate — `src/sim/combat/enclave_resilience.ts:82–202` (`ENCLAVE_DEFINITIONS`), `:559–564` (`getEnclaveDefForOsid`).
- Capacity modifiers + edge-min — `src/sim/collapse/capacity_modifiers.ts:38–62`.
- G2 invariant test — `tests/collapse_phase1_g2_section6_invariant.test.ts` (full).
- `will_not_recover` writer — `src/state/loss_of_control_trends.ts:103–132`.
- pressure_cap_mult / supply_mult consumer — `src/state/front_pressure.ts:143–188`.
- formation supply consumer — `src/state/formation_fatigue.ts:201–235,406`.
- Phase 3C exposure read + strain write — `src/sim/pressure/phase3c_exhaustion_collapse_gating.ts:291–304,560–595`.
- Exposure producer — `src/sim/pressure/pressure_exposure.ts:39–83`.
- Harness seed writer — `src/cli/phase3abc_audit_harness.ts:1004–1005,1186–1194`.
- Full grep of every writer of `collapse_damage` / `capacity_modifiers` / `will_not_recover` across `src/`.

**NOTE on prompt path drift:** the prompt cited `docs/40_reports/20260609_COLLAPSE_S6_HISTORIAN_GATE_PACKET.md` and `docs/40_reports/20260610_COLLAPSE_PHASE4A_FIRST_FIRE.md`. The gate packet actually lives under `.../proposals/`. The IV-a "FIRST_FIRE" report does NOT exist on disk anywhere under `docs/40_reports/` (glob `**/*PHASE4A*` → no files). The IV-a empirical claims (rupture t162, 0 enclave damage on the branch) are therefore cited by the scope doc but **could not be independently re-verified by this reviewer** — the artifact is on the unmerged branch `feat/collapse-phase4a-first-fire`, not in the working tree. This is folded into the conditions below (the G2 collapse-ON assertion is NOT yet provable from `main`).

---

## Per-claim verdict

### (B.1) "Re-routing exposure into OSID keys does NOT move the G1 guard surface." — **CONFIRM**

The guard is genuinely at the single chokepoint and there is **no production write path that bypasses it**.

- **The guard IS the chokepoint.** `getOrInitCollapseDamage` (`phase3d_collapse_resolution.ts:159–166`) calls `isPhase3DEnclaveGuarded(entityId)` FIRST and returns a **detached** `{authority:0,cohesion:0,spatial:0}` object that is never assigned into `state.political.collapse_damage.by_entity` (the assignment is at `:184`, after the guard's early return). `isPhase3DEnclaveGuarded` (`:90–97`) = `getEnclaveDefForOsid(osid) !== null`, an OSID-space predicate. Confirmed: the protected keys ARE OSIDs (`op:srebrenica:srebrenica_2`, `op:rogatica:zepa_2`, …), resolved via `osidBelongsToEnclave` prefix/list match.
- **Grep of EVERY writer** of the three protected fields across `src/`:
  - `collapse_damage.by_entity[…] =` is written at exactly TWO sites: `phase3d_collapse_resolution.ts:184` (production — downstream of the `:164` guard) and `phase3abc_audit_harness.ts:1191` (CLI harness, see below). No other writer exists.
  - `capacity_modifiers.by_sid[…] =` is written at exactly ONE site: `phase3d_collapse_resolution.ts:212` (`getOrInitCapacityModifiers`), reached only from `updateCapacityModifiers` (`:255`) / `recomputePhase3DCapacityModifiersFromDamage` (`:292`). The resolution loop `:434` skips enclaves before calling `updateCapacityModifiers`; the recompute helper guards at `:291` (`isPhase3DEnclaveGuarded → continue`). Both modifier paths are guarded.
  - `will_not_recover` is set at exactly ONE site: `loss_of_control_trends.ts:132` = `!!(collapse_damage.by_entity?.[sid])`. It is a pure DERIVATIVE of the `collapse_damage` entry. Because G1 keeps the enclave OSID out of `collapse_damage.by_entity`, `will_not_recover` stays false transitively. Confirmed the load-bearing point from the gate packet's Codex #368-P1 correction: presence ALONE (even at damage 0) would trip it, so the guard MUST block the *entry*, not just zero the values — and it does (detached object, never written).
- **The re-route does change behavior in one acknowledged way, and the doc states it honestly.** `updateLocalStrain` (`phase3c…:291–304`) writes `local_strain.by_entity[entityId]` for EVERY exposure entity **with no enclave guard**. So once exposure keys become OSIDs, enclave OSIDs WILL accrue `local_strain` and WILL reach Tier-1 eligibility for the first time. The protection is entirely the guard-by-exclusion-at-the-3D-write model, exercised for real on enclaves for the first time. The doc B.1 states exactly this ("the re-route exercises it on enclaves for the first time"). It is the ratified #368 design, not a new hole — but see CONDITION 1: this means `local_strain` and `collapse_eligibility_tier1` WILL contain enclave OSID entries on a collapse-ON run, and the G2 test asserts only `collapse_damage`/`capacity_modifiers`/`will_not_recover` absence — NOT `local_strain`/`tier1` absence. That is correct (those two are not §6-protected fields — they are upstream of the guard), but it should be an explicit, documented expectation so a future reviewer does not mistake an enclave `local_strain` entry for a guard breach.

**No production path under the OSID re-route lets a protected OSID accrue `collapse_damage`/`capacity_modifier`/`will_not_recover`.** CONFIRM.

### (B.2) "The `getEdgeCapacityMultiplier` edge-min residual stays INERT under Option 2 + M1." — **CONFIRM (with a sharpened condition)**

- **The OSID exposure path genuinely does not consume `getEdgeCapacityMultiplier`.** Full grep: the ONLY consumers of `getEdgeCapacityMultiplier` are `front_pressure.ts:149–150` and `formation_fatigue.ts:216,228` (via `getFormationSupplyMultiplier`). The proposed `computePressureExposureByEntityOsid` (Option 2) reads `state.military.war_front_edges_osid` topology + an M1 presence magnitude and feeds `local_strain`; it does not call `getEdgeCapacityMultiplier`. Confirmed: Option 2 + M1 adds no new consumer of the edge-min function.
- **Trace of the "collapsed neighbor bleeds into enclave" concern.** The edge-min residual is `min(mult_a, mult_b)`. For it to degrade an enclave, an enclave OSID must appear as one endpoint of an edge whose OTHER endpoint carries a sub-1.0 collapse multiplier, AND that edge must be consumed. Two consumers:
  1. `front_pressure.ts` — runs over the **settlement** `computeFrontEdges` universe (`a`/`b` are canonical SIDs), which IV-a measured as EMPTY (0 edges) in OSID-native scenarios. So in the calibration scenarios this consumer processes zero edges → the residual cannot fire there regardless. In a *settlement-native* scenario the edge endpoints are canonical SIDs, and `getSidCapacityModifiers` keys on whatever string the modifier map used (OSID); a canonical-SID endpoint will not match an OSID modifier key → DEFAULT 1.0. Inert.
  2. `formation_fatigue.ts:getFormationSupplyMultiplier` — keys on `formation.assignment.edge_id` / `region_id`, again settlement-pipeline edge IDs. Same mismatch → DEFAULT. Inert.
  - **Critically: collapse writes `capacity_modifiers.by_sid` keyed by OSID** (the Tier-1 entity = OSID). The two edge-min consumers iterate over **settlement/region edge IDs**, not OSID edges. So even when collapse fires on a non-enclave OSID, the degraded multiplier sits in `by_sid[<osid>]` and is read by `getSidCapacityModifiers(<osid>)` ONLY where a consumer passes an OSID — which neither edge-min consumer does in the OSID-native scenarios (front_pressure has 0 edges; formation edges are settlement-keyed). The edge-min residual is therefore doubly inert under Option 2: not consumed by the exposure path AND not reachable by the existing consumers in the OSID-native calibration scenarios.
- **The doc's own escape hatch is correct and must be held:** the residual goes LIVE under Option 3 (a real `war_front_pressure_osid` accumulator that ports `getEdgeCapacityMultiplier` consumption onto OSID edges). At THAT point an enclave-adjacent OSID edge `min(1.0_enclave, collapsed_neighbor)` = the collapsed value would degrade the enclave's own edge — a real §6 hole. The doc flags this and recommends AGAINST Option 3. Confirmed sound.

**CONFIRM the residual stays inert under Option 2 + M1 — with CONDITION 2 (a one-line G2 assertion that pins it) and CONDITION 4 (the Option-3 lockout).**

### (B.3) Rupture-timing invariant — **CONFIRM that collapse cannot flip `political_controllers`; PARTIAL on the G2 test coverage.**

- **Collapse has no path to `political_controllers`.** Grep confirms Phase 3D writes ONLY `collapse_damage` (`:184`) and `capacity_modifiers` (`:212`). No assignment to `political_controllers` exists in `phase3d_collapse_resolution.ts` or anywhere in `src/sim/collapse/`. Consistent with Engine Invariants §9.6 "no passive pressure flip" (quoted in the gate packet §2.3). The only indirect risk — a degraded `supply_mult` softening a defender so it falls EARLY — is neutralized for enclaves by G1 (enclave never gets a modifier). For Srebrenica/Žepa, the fall is driven by the scripted `srebrenica_falls_1995` / `zepa_falls_1995` events (windows 160–185 / 160–190) and the Krivaja-95/Stupčanica-95 triggered ops, none of which collapse touches. CONFIRM.
- **G2 test — what it ACTUALLY asserts (verified against the test file):**
  - ✅ `pc['op:srebrenica:srebrenica_2'] === 'RS'` and `pc['op:rogatica:zepa_2'] === 'RS'` (test :78–79). Srebrenica + Žepa fall asserted.
  - ✅ Goražde (`op:gorazde:gorazde_2`), Bihać (`op:bihac:bihac_2`), Sarajevo (real core cell `op:centar_sarajevo:sarajevo_dio_centar_sajarevo`), Teočak (`op:ugljevik:teocak_krstac_2`) held RBiH (test :84–87).
  - ✅ `srebrenica_genocide_1995` rupture recorded AND `recorded_turn >= 160` (test :90–99) — stricter than the canon ≥140 floor, guarding the [140,160) gap per panel directive #3(iv).
  - ✅ G1 proof: for all 9 `PROTECTED_ENCLAVE_OSIDS`, `collapse_damage[osid]` undefined, `capacity_modifiers[osid]` undefined, `will_not_recover` false (test :101–118).
  - **GAP G2-A (the load-bearing gap): the test does NOT run against a collapse-ON path.** It reads the most-recent `runs/apr1992_definitive_188w__*/final_save.json` (`:23–36`) and `it.runIf(runDir !== null)`. There is no assertion that the run it reads was produced with `ENABLE_COLLAPSE=true`. On `main`, collapse is OFF by default, so the artifact this test reads is a **collapse-DISABLED** run — the assertions pass trivially (the gate packet §3 and the test header both state this: "In Phase I the pipeline is DISABLED … this passes trivially"). The test's own comment (`:120–126`) admits the collapse-ON-vs-OFF comparison "is NOT runnable from a single DISABLED Phase-I artifact" and is deferred to "the enable PR's calibration harness." **So the G2 test, as it stands, does NOT prove the §6 invariant on the collapse-ON path. It proves it on the collapse-OFF path and serves as a regression sentinel.** This is the single most important finding of this review.
  - **GAP G2-B: timing-IDENTICAL ON-vs-OFF is not asserted.** Gate packet G2.3 requires `recorded_turn` and the three trigger inputs to be byte-identical ON vs OFF. The test asserts only `>= 160` (an absolute floor), not equality vs a baseline. A collapse-ON run could record the rupture at, say, t170 vs a baseline t162 and still pass `>= 160` — a timing CHANGE that violates §6 ("rupture timing MUST NOT change") would slip through. The doc B.3 claims "timing unchanged" but the test does not enforce it.

**CONFIRM the mechanism (no control flip); but the G2 test must be hardened before the first territory-moving run — see CONDITIONS 2 + 3.**

### (HIST) Historical bless — **CONFIRM defensible, with one ahistorical-risk flag.**

- **"An over-extended RS western Krajina OSID collapses and falls earlier in the 1995 cascade" is historically DEFENSIBLE.** The real VRS western front DID collapse Aug–Oct 1995 under the combined ARBiH 5th Corps / HV / HVO pressure: Operation Storm (Aug 4–7, collapsed RSK and unhinged the western VRS flank), Operation Sana / Sana-95 (Sept–Oct, Bosanski Petrovac, Ključ, Sanski Most, Mrkonjić Grad), and Operation Mistral 2 (Sept, Jajce/Šipovo/Drvar–Grahovo). The VRS 2nd Krajina Corps and the western brigades were materially over-extended and under-supplied; the Krajina pocket lost ~4,000 km² in weeks. A collapse mechanic that makes over-extended, BFS-isolated RS western-Krajina OSIDs degrade (supply_mult/pressure_cap) and fall marginally earlier is moving the sim TOWARD the historical record, not away from it. This is the correct direction and the doc's C.1 prediction (RS western cascade = where the floor moves most) is historically right.
- **Accelerating non-enclave HRHB central-Bosnia pocket loss — DEFENSIBLE but with an ahistorical-RISK FLAG.** Historically the HVO central-Bosnia pockets (Vitez/Busovača/Kiseljak/Žepče/Vareš) were besieged by ARBiH through 1993–early 1994 and then FROZE at the **Washington Agreement (March 1994)** — they did NOT fall; the alliance machinery preserved them HVO-held to Dayton. The three HVO enclave pockets (kiseljak/lasva_valley/zepce) are G1-guarded so they will NOT collapse — correct. BUT the doc's C.1 says "only NON-enclave HRHB OSIDs move," and these are exactly the marginal central-Bosnia cells around those pockets. **FLAG:** if collapse accelerates loss of non-enclave HRHB central-Bosnia OSIDs PAST the Washington-Agreement freeze (i.e. ARBiH over-runs Croat-held ground that historically survived to Dayton because of the federation), that IS an ahistorical distortion — it would erase the Washington-Agreement preservation of Croat central-Bosnia territory. The collapse magnitude constants are "chronic not catastrophic" (supply floor 0.6, not 0), so combat still resolves the fall — but the D3 first-fire run MUST check that non-enclave HRHB central-Bosnia OSIDs that are HELD in the 649 baseline are not newly LOST post-Washington. This is a calibration-anchor + historical-fidelity check, not a §6 bright-line breach, but it is a real "distort the historical record" risk the doc under-weights (it frames all HRHB movement as benign). See CONDITION 5.
- **No §6/atrocity bright line is crossed by the historical framing.** Collapse is a consequence (softening), never a reward or a lever; the genocide rupture stays a consequence-not-lever per SENSITIVE_HISTORY_DESIGN_GATE §3 #10.

---

## OVERALL VERDICT

**§6-SAFE-TO-BUILD — CONDITIONAL.**

The mechanism is sound: G1 is a true single-chokepoint guard keyed in OSID space, there is no production write path that bypasses it, the OSID re-route does not move the guard surface, the edge-min residual stays doubly inert under Option 2 + M1, and collapse provably cannot flip `political_controllers`. The historical direction (RS western-Krajina earlier collapse) is correct. **B.1, B.2, B.3-mechanism, and HIST all CONFIRM.**

The conditional is NOT about the guard — it is about the **proof obligation**: the G2 test as written validates the collapse-OFF path and is a regression sentinel, not a collapse-ON §6 proof. The first territory-moving run (D2/D3) is the first time enclave OSIDs reach Tier-1 for real, and the current G2 cannot catch a collapse-ON-only breach or a rupture-timing drift. Those test gaps MUST close before D2 merges.

---

## CONDITIONS THAT MUST ATTACH TO THE BUILD (blocking, in order)

1. **(B.1 documentation) Document the expected enclave `local_strain` / `collapse_eligibility_tier1` entries.** Under the OSID re-route, enclave OSIDs WILL accrue `local_strain` and Tier-1 eligibility (verified: `updateLocalStrain` :291–304 has no enclave guard, by design). Add a one-line note to the build PR and to the G2 test that this is EXPECTED and is NOT a guard breach — the §6-protected fields are `collapse_damage`/`capacity_modifiers`/`will_not_recover` only. Prevents a future reviewer from misreading an enclave strain entry as a hole.

2. **(GAP G2-A — BLOCKING) The G2 collapse-ON assertion must run against a verified `ENABLE_COLLAPSE=true` 188w artifact before D2 merges.** Today the test reads any latest `apr1992_definitive_188w__*` run with no proof it was collapse-ON; on `main` that is a collapse-OFF run and the test passes trivially. Before the first territory-moving run is accepted, G2 (or an enable-PR harness gate) must assert its checklist against an artifact KNOWN to be collapse-ON (e.g. read a `meta.collapse_enabled` flag from the save, or run the assertions inside the enable PR's two-run harness). Without this, "G2 GREEN" is a false-green for §6.

3. **(GAP G2-B — BLOCKING) Add the rupture-timing IDENTITY assertion (gate-packet G2.3), not just the `>= 160` floor.** §6 requires rupture timing "MUST NOT change." The current test asserts only `recorded_turn >= 160`. Add: `recorded_turn` (and the first turn `political_controllers['op:srebrenica:srebrenica_2'] === 'RS'`) is BYTE-IDENTICAL between the collapse-ON and collapse-OFF 188w runs. This is the assertion the doc B.3 *claims* but the test does not enforce. (The gate packet itself lists G2.3 as required; it is currently unimplemented.)

4. **(B.2 — BLOCKING design lock) Option 3 is forbidden without a fresh §6 review.** The owner picks Option 2 + M1 explicitly (scope doc D0/E-1). If Option 3 (`war_front_pressure_osid` accumulator) is ever chosen, the `getEdgeCapacityMultiplier` edge-min residual goes LIVE on OSID edges and an enclave-adjacent collapsed neighbor CAN degrade the enclave's own edge — a real §6 hole. Any move to Option 3 re-enters this gate with a per-edge enclave guard (`if either endpoint is enclave-guarded, return 1.0`) designed and reviewed FIRST. Recommend adding a one-line G2 assertion now that pins the residual: for every enclave OSID, `getSidCapacityModifiers(state, enclaveOsid)` returns all-1.0 (it does today because the OSID is never in `by_sid`; the assertion makes any future regression loud).

5. **(HIST — non-§6 historical-fidelity check, BLOCKING for the re-floor sign-off, NOT for §6) D3 must verify non-enclave HRHB central-Bosnia OSIDs are not lost past the Washington-Agreement freeze.** The three HVO pockets are G1-guarded, but the marginal non-enclave Croat central-Bosnia cells are not. Confirm the D3 first-fire run does not newly LOSE (vs the 649 baseline) non-enclave HRHB central-Bosnia OSIDs that historically survived to Dayton under the federation. If it does, that is an ahistorical distortion to flag to the owner at re-floor sign-off — not a §6 breach, but a "distort the historical record" risk the scope doc under-weights.

---

## G2-TEST GAPS THAT MUST BE CLOSED BEFORE THE FIRST TERRITORY-MOVING RUN (summary)

| Gap | Severity | Fix |
|---|---|---|
| **G2-A** — assertions run against an unverified (currently collapse-OFF) artifact | BLOCKING | Pin the asserted run to `ENABLE_COLLAPSE=true` (read a save flag or run inside the enable-PR two-run harness). Without this, G2-GREEN is a false-green for §6. |
| **G2-B** — only `recorded_turn >= 160`, no ON-vs-OFF timing identity | BLOCKING | Add gate-packet G2.3: rupture `recorded_turn` + first-RS-turn byte-identical ON vs OFF. |
| **G2-C** — no positive pin on the edge-min residual | RECOMMENDED | Assert `getSidCapacityModifiers(enclaveOsid)` all-1.0 for every enclave OSID (makes any future Option-3 regression loud). |
| **G2-D** — `local_strain`/`tier1` enclave entries undocumented | NON-BLOCKING (doc) | Note in test that enclave OSIDs WILL have `local_strain`/`tier1` entries on a collapse-ON run by design; only the 3 §6 fields must be absent. |

---

## Single most important finding

**The G2 §6 invariant test, as written, validates the collapse-OFF path and passes trivially — it does NOT yet prove the §6 invariant on a collapse-ON run, and it asserts only `recorded_turn >= 160` rather than rupture-timing IDENTITY vs baseline. The guard code (G1) is genuinely sound and bypass-free, but the PROOF that buys the §6 guarantee on the first territory-moving run does not exist yet. G2-A and G2-B must close before D2 merges, or "G2 GREEN" is a false-green for §6.**
