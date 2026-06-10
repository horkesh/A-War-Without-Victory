# Collapse Phase IV-c — STRAIN-GEOMETRY SCOPE (making Phase 3D finally FIRE)

**Type:** READ-ONLY scoping / design document. No engine code, no flag flips, no scenario runs, no canon edits were produced in writing this. Every claim is file:line-cited against the working tree (`main` @ `661715918`) and the D2 wire-in branch `feat/collapse-phase4b-d2-wirein` (worktree `agent-af206cbf462c25e42`, HEAD `1d7bd3b18`).
**Status:** DRAFT for owner + §6-panel ratification. The build is BLOCKED on (i) the owner re-floor acknowledgment (§D — this IS the first floor-moving collapse change) and (ii) the §6 G2 HARD gate staying GREEN on the first territory-moving run (§C). Both NON-DELEGABLE.
**Predecessors:**
- `docs/40_reports/proposals/20260609_COLLAPSE_PIPELINE_BUILD_SPEC.md` — constants table (C1–C17), G1 guard, build phasing.
- `docs/40_reports/proposals/20260610_COLLAPSE_PHASE4B_OSID_SUBSTRATE_SCOPE.md` — Option 2 + M1 / M2 / M3 magnitude options (§A.4).
- `docs/40_reports/proposals/20260610_COLLAPSE_PHASE4B_S6_REVIEW.md` — §6 red-team (G2-A/B/C/D conditions; Sarajevo painted-core fix; Washington-freeze Condition 5).
- `docs/40_reports/20260610_COLLAPSE_PHASE4B_D2_FIRST_FIRE.md` (on branch `agent-af206cbf462c25e42`) — the D2 measurement this doc starts from.

---

## 0. STATE OF THE WORLD (verified — important branch-topology correction)

The mission prompt states "D2 result, now merged to main via #383." **This is not what the working tree shows, and the distinction is load-bearing for the build plan.**

- `#383` (`0efc77aa3`, on `main`) is **"Phase IV-b D1 — OSID exposure adapter (NOT wired) + G2 §6-test hardening."** It added `computePressureExposureByEntityOsid` to `pressure_exposure.ts:115–145` but **did NOT wire it into Phase 3C.** Grep confirms: `computePressureExposureByEntityOsid` has exactly ONE occurrence in `src/` — its definition. It is never called from `main`. Phase 3C on `main` still calls the settlement variant at `phase3c_exhaustion_collapse_gating.ts:603` (`computePressureExposureByEntity(state, derivedFrontEdges)`).
- The **D2 wire-in** (the ~6-LOC branch that prefers the OSID adapter when `war_front_edges_osid` is populated, commit `4882a298a`) and the **D2 first-fire measurement** (report `20260610_COLLAPSE_PHASE4B_D2_FIRST_FIRE.md`) live ONLY on the branch `feat/collapse-phase4b-d2-wirein` (worktree `agent-af206cbf462c25e42`). They are NOT on `main`. The report header itself says "Do NOT merge this PR."

**Consequence for IV-c:** the D2 wire-in is a prerequisite that must land (or be folded into the IV-c branch) before any strain-geometry change can be measured. The IV-c build is "D2 wire-in + ONE strain-geometry lever," and the D2 wire-in must be re-proven byte-identical-when-disabled as part of the same branch. The 28.2 number is real and reproducible — it just isn't on `main` yet.

---

## A. DIAGNOSIS — why strain plateaus at 28.2 (the arithmetic, with the second gate the prompt did not name)

### A.1 How strain accrues (the exact accumulator)

`local_strain` is a **purely monotonic, never-decaying** accumulator. The SOLE writer is `updateLocalStrain` (`phase3c_exhaustion_collapse_gating.ts:291–304`):

```
increment = exposure × STRAIN_FRACTION              (:299, STRAIN_FRACTION = 0.05, :75)
newStrain = min( max(0, current + increment), 100 ) (:300, STRAIN_MAX = 100, :76)
```

There is **no decay term, no per-turn reset, no cap below 100.** Grep of every `local_strain` site (`src/`) confirms `updateLocalStrain` is the only writer; nothing ever subtracts. So `strain[osid]` is the running integral of `0.05 × exposure(osid, turn)` over every turn the OSID appears in the exposure map.

The exposure under the D2 wire-in (M1, `computePressureExposureByEntityOsid` `pressure_exposure.ts:115–145`):

```
M1_UNIFORM_EDGE_MAGNITUDE = 1.0           (:124)
per OSID front edge: halfP = 1.0 / 2 = 0.5 to each endpoint   (:139–141)
⇒ exposure(osid, turn) = 0.5 × (number of OSID front edges touching that OSID this turn)
```

So per turn: `Δstrain(osid) = 0.05 × 0.5 × edge_count(osid) = 0.025 × edge_count(osid)`.

### A.2 Why 28.2 (and not 40+) — the geometry is the ceiling, not a cap

Max observed strain (D2, 188w) = **28.2** (`op:doboj:boljanic_2`, `op:novo_sarajevo:lukavica`; `op:rogatica:brcigovo` 28.0).

Solve for the implied lifetime edge-turns:
```
28.2 = 0.025 × Σ_turns edge_count(osid)
⇒ Σ_turns edge_count(osid) ≈ 1128 edge-turns over the OSID's contested lifetime.
```
If a hot OSID sits on the front the full 188 turns, that is ~6 simultaneous hostile OSID front edges sustained for the entire campaign (1128 / 188 ≈ 6.0), OR fewer edges over a shorter contested window. **28.2 is therefore NOT a cap being hit — it is the integral of a typical besieged OSID's real front-edge exposure under M1.** The accumulator never plateaus mechanically; it stops climbing only because (a) the OSID's front contracts/resolves (it stops being a contested edge — captured, or the line moves past it) and (b) M1 gives every front edge the same unit weight, so even a genuinely encircled pocket scores no higher per-edge than an ordinary front cell.

**Root cause, stated precisely:** the **M1 magnitude scale is mismatched to the 40 threshold.** The C9/C13 = 40 threshold and the C11 = 0.05 fraction were authored in the build spec (§3, C9/C11/C13) against an *assumed* exposure scale where "strain 40 = sustained high per-OSID pressure exposure over many turns" — but that assumption was written when exposure was expected to come from the **settlement `front_pressure` magnitudes** (`accumulateFrontPressure`, real pressure values that can be many units per edge), NOT from M1's uniform 1.0-per-edge presence count. M1 delivers ~5–6× less magnitude per edge-turn than the threshold was scaled for. So: **the 40 threshold is calibrated for a higher-magnitude scale than M1 produces.** It is not "the fraction is too small" or "a decay" — it is a unit/scale mismatch between the M1 presence magnitude and the threshold the build spec set.

### A.3 THE SECOND GATE the prompt did not name — `SEVERITY_MIN` (the killer)

Crossing Tier-1 (`strain > 40`) is **necessary but NOT sufficient** for Phase 3D to write anything. `computeSeverity` (`phase3d_collapse_resolution.ts:220–244`) imposes a SECOND gate:

```
if strain < STRAIN_THRESHOLD (40):           return 0      (:225)
sRaw = (strain − 40) / (STRAIN_MAX − 40) = (strain − 40)/60 (:230,235)
s = clamp(sRaw, 0, 1)
if s < SEVERITY_MIN (0.25):                   return 0      (:239, SEVERITY_MIN :49)
```

So the **effective strain floor for ANY `collapse_damage` write** is:
```
strain ≥ 40 + 0.25 × 60 = 55     (NOT 40)
```
Max strain is 28.2. **3D needs strain ≥ 55, not ≥ 40.** The gap is nearly 2×, not the ~1.4× the "28.2 < 40" framing implies.

**This breaks the "just lower the threshold to 25" lever (Lever 1).** If `STRAIN_THRESHOLD`/`TIER1 = 25` (keeping `SEVERITY_MIN = 0.25`, `STRAIN_MAX = 100`):
```
effective floor = 25 + 0.25 × (100 − 25) = 25 + 18.75 = 43.75
```
28.2 < 43.75 → **STILL no damage.** Lowering the threshold to 25 does NOT make 3D fire, because `SEVERITY_MIN` is a *fraction of the (max − threshold) range*, so it scales with the threshold and keeps the real floor well above 28.2. **To make the existing 28.2 cross via the threshold lever alone you would need `STRAIN_THRESHOLD ≈ 15` AND accept that the severity range is then `(28.2−15)/85 = 0.155`, which is below `SEVERITY_MIN=0.25` → still zero.** In fact, with `SEVERITY_MIN=0.25` fixed and `STRAIN_MAX=100`, the maximum threshold for which strain=28.2 produces non-zero severity solves `(28.2−T)/(100−T) ≥ 0.25` → `28.2 − T ≥ 25 − 0.25T` → `−0.75T ≥ −3.2` → `T ≤ 4.27`. **You would have to drop the threshold to ≤ 4 — absurd (every front OSID collapses) — OR also lower `SEVERITY_MIN`.**

**This is the single most important diagnostic finding: the prompt's "lower the threshold from 40 to ~25" lever does not work in isolation because of the `SEVERITY_MIN` second gate. Any threshold-only change is a no-op at 28.2.** The honest levers are (i) raise the magnitude/fraction so strain crosses ~55 under the real geometry, or (ii) a paired threshold + `SEVERITY_MIN` change, or (iii) M2 isolation-weighting that pushes besieged OSIDs to 55+.

**Cited evidence:** STRAIN_FRACTION `phase3c…:75`; STRAIN_MAX `phase3c…:76` / `phase3d…:48`; updateLocalStrain monotonic no-decay `phase3c…:291–304`; M1 magnitude `pressure_exposure.ts:124,139–141`; SEVERITY_MIN double-gate `phase3d…:225,230,235,239,49`; C9/C11/C13 build-spec scale assumption `20260609_COLLAPSE_PIPELINE_BUILD_SPEC.md §3` lines 121/123/125; D2 max-strain 28.2 `20260610_COLLAPSE_PHASE4B_D2_FIRST_FIRE.md §2`.

---

## B. THE LEVERS (one-change-per-run candidates, ranked by precision + risk)

The hard constraint from §A.3: the change must lift the **effective severity floor crossing** — i.e. get genuinely-pressured OSIDs to `strain ≥ 55` under the present geometry (or lower the floor in a §6-safe way). Each lever below states its arithmetic effect on the 28.2 plateau, the newly-Tier-1 OSIDs, the predicted territory direction, and the §6 interaction.

### Invariant that constrains TWO of the levers (C13 == C9)

`STRAIN_THRESHOLD` (C13, `phase3d…:47`) **must equal** `TIER1_AUTH/COH/SPA_THRESHOLD` (C9, `phase3c…:71–73`). The build spec encodes this as a consistency invariant (§3, "C13 == C9") and there is a guard comment at both sites. Any threshold lever must move BOTH (four constants: three Tier-1 + one 3D) in lockstep, or 3D severity goes silently zero / leaks. Flag a unit test if a threshold lever is chosen.

### Lever ranking

| Rank | Lever | LOC | Arithmetic effect on the 28.2 plateau | Precision | Risk |
|---|---|---|---|---|---|
| **1 (RECOMMENDED)** | **Raise STRAIN_FRACTION (C11) `0.05 → 0.15`** | ~1 (+test) | strain scales linearly: 28.2 × 3 = **84.6** max; severity floor 55 crossed by any OSID whose current strain ≥ 55/3 = **18.3**. Many of the 597 accrue past 18.3 → a moderate set crosses. | Medium — one scalar, no §6 surface change, no threshold/C13 coupling, leaves M1 geometry intact. | Medium — blanket multiplier lifts ALL strain, so the *set* that crosses is "highest-exposure front OSIDs" generally, not specifically isolated pockets. Calibration discriminates via the existing Tier-0 spatial gate (only factions with ≥10% BFS-isolated OSIDs gate Tier-1 spatial). |
| 2 | **M2: BFS-isolation-weighted magnitude** | ~20 (+test) | Replace M1's uniform 1.0/edge with `1.0` for normal edges and a higher weight (e.g. `3.0`) for edges whose endpoint is in the `SupplyReachabilityOsidReport.isolated_osids` set. Besieged pockets' strain scales up; ordinary front edges unchanged → only genuinely-isolated OSIDs cross 55. | **High** — surgically lifts the historically-correct sites (besieged/cut OSIDs) without a blanket threshold drop or a global fraction bump. | Higher — ~20 LOC, reuses the `SupplyReachabilityOsidReport` already computed at `war_phases.ts:3778` (the 3C spatial gate input), but introduces a new weighting constant to calibrate AND a second tunable interacting with C11. Do NOT bundle with Lever 1. |
| 3 | **Paired threshold + SEVERITY_MIN drop** (C9/C13 `40→25` AND `SEVERITY_MIN` `0.25→0.10`) | ~5 (4 constants + 1) | effective floor = `25 + 0.10 × 75 = 32.5`; 28.2 still < 32.5 → STILL a no-op unless ALSO paired with a fraction bump. To make 28.2 cross: `SEVERITY_MIN=0.10` + threshold `15` → floor `15 + 0.10×85 = 23.5` < 28.2 ✓ but threshold 15 is very eager. | Low — multiple coupled constants, must respect C13==C9, eager threshold floods Tier-1. | High — most-coupled, hardest to reason about, floods the eligible set. **Not recommended as the first lever.** |
| ✗ | **Lower TIER1/STRAIN_THRESHOLD alone `40 → 25`** (the prompt's "simplest") | ~4 | effective floor = `25 + 0.25×75 = 43.75`; 28.2 < 43.75 → **NO-OP.** See §A.3. | — | **Does not fire. Rejected by the arithmetic.** Documented so it is not re-attempted as "the simple first try." |

### Per-lever predicted OSID set, territory direction, and §6 interaction

**Lever 1 (STRAIN_FRACTION 0.05→0.15) — RECOMMENDED:**
- **Newly Tier-1:** the highest-exposure front OSIDs in the D2 top-list — `op:doboj:boljanic_2`, `op:novo_sarajevo:lukavica`, `op:rogatica:brcigovo`, and the tail of OSIDs currently in the 18–28 strain band. Gated by Tier-0: only factions with `eligible_spatial` (D2: HRHB, persistence 141; RS/RBiH spatial false at D2) feed Tier-1 spatial; authority/cohesion Tier-0 was false for all factions at D2 (war_exhaustion plateau), so the FIRST fire is **spatial-domain, HRHB-dominant**, with RS spatial emerging only if/when ≥10% of RS OSIDs go BFS-isolated in the late-war western cascade.
- **Territory direction:** collapse `supply_mult`/`pressure_cap_mult` can **only accelerate a defender's own fall, never save an enclave or throttle an attacker** (it degrades the degraded faction's own OSIDs — `front_pressure.ts:143–168`, `formation_fatigue.ts:201–235`). Predicted site, consistent with the IV-b §C prediction and the §6-review HIST bless: **RS western Krajina over-extension** (Sana/Storm/Mistral corridor) is where RS spatial isolation should emerge once the western cascade isolates over-extended RS OSIDs → accelerated RS losses in the 1995 cascade, moving the sim TOWARD the historical record. Secondary: marginal NON-enclave HRHB central-Bosnia OSIDs.
- **§6 interaction:** enclave OSIDs WILL accrue more strain (3× faster) and DO reach Tier-1 eligibility — **by design** (review Condition 1). G1 excludes them at the 3D `collapse_damage` write (`phase3d…:164–166` chokepoint + `:434` loop-skip + `:291` recompute) → **no `collapse_damage`, no `capacity_modifier`, no `will_not_recover` on any of the 9 protected OSIDs.** The guard surface does not move; only the keys flowing into it grow. **CONFIRM still holds** — see §C.

**Lever 2 (M2 isolation-weighting):** same territory direction but a *tighter* eligible set (only BFS-isolated OSIDs lifted), so the RS western cascade and the besieged-pocket sites cross while ordinary front cells do not. §6 interaction identical (G1 still excludes the 9 enclaves at the write; note the eastern enclaves are the MOST BFS-isolated OSIDs, so M2 lifts THEM hardest — making the G1 exclusion the most-exercised it has ever been; the G2 collapse-ON proof is therefore the load-bearing safety net, §C).

**Lever 3 (paired threshold + severity_min):** floods the eligible set; territory direction same but magnitude harder to bound; §6 same guard but a larger eligible set means more enclave OSIDs reaching the guard. Not recommended first.

---

## C. §6 GATE — does making 3D fire create ANY path to enclave collapse_damage / modifier / will_not_recover?

**VERDICT: NO new §6 path under Lever 1 or Lever 2. G1 covers the OSID key space unchanged; the strain-geometry change is upstream of the guard and does not bypass it.** The hardened G2 (collapse-ON marker + rupture-timing identity + Sarajevo painted-core key fix) is the proof obligation that must be GREEN on the first territory-moving run.

### C.1 The guard is a single chokepoint, keyed in OSID space, upstream-agnostic

`isPhase3DEnclaveGuarded(osid) = getEnclaveDefForOsid(osid) !== null` (`phase3d…:90–97`) is an OSID predicate over the 9 `ENCLAVE_DEFINITIONS` OSIDs. It fires at THREE sites, all DOWNSTREAM of strain/exposure/Tier-1:
- `getOrInitCollapseDamage` `:164–166` — returns a **detached** `{0,0,0}` never written to `collapse_damage.by_entity`. SOLE production write of that map is `:184`, after the guard's early return.
- resolution loop-skip `:434–446` — enclave skipped before `updateCapacityModifiers`.
- recompute helper `:291` — `isPhase3DEnclaveGuarded → continue`.

`will_not_recover` (`loss_of_control_trends.ts:132`) is a pure derivative of a `collapse_damage` entry's *presence*; no entry → stays false. **Whatever the strain geometry does (Lever 1, 2, or 3), it only changes which OSIDs reach `collapse_eligibility_tier1` + their `local_strain` value — both UPSTREAM of the guard.** The guard consumes Tier-1-eligible OSIDs and excludes the 9 enclaves regardless of how strain got there. **No strain-geometry lever can bypass G1.** (Confirmed by the IV-b §6 red-team: "the OSID re-route does not move the guard surface; the keys flowing into it do not change type." The strain-geometry change does not change the key TYPE either — still OSIDs.)

### C.2 The guard-by-exclusion model is now actually exercised on enclaves (the expected, ratified behavior)

Because Lever 1/2 makes enclave OSIDs cross Tier-1 for the first time (M2 lifts them HARDEST — they are the most BFS-isolated), the guard's exclusion branch is exercised on enclaves on the first territory-moving run. This is the ratified #368 design (guard-by-exclusion-at-write, NOT guard-by-never-evaluating). Per review Condition 1: enclave `local_strain` / `collapse_eligibility_tier1` entries are EXPECTED and are NOT a guard breach — only the three §6-protected fields (`collapse_damage`/`capacity_modifiers`/`will_not_recover`) must be absent. The build PR + G2 test must document this so a future reviewer does not misread an enclave strain entry as a hole.

### C.3 The edge-min residual stays INERT (Lever 1 and Lever 2 do NOT consume getEdgeCapacityMultiplier)

`getEdgeCapacityMultiplier = min(mult_a, mult_b)` (`capacity_modifiers.ts:53–62`) is consumed ONLY by `front_pressure.ts:149–150` (settlement edges, EMPTY in OSID-native scenarios) and `formation_fatigue.ts` (settlement/region edge_ids). Neither Lever 1 (a global fraction scalar) nor Lever 2 (an exposure-magnitude weighting) adds a consumer of `getEdgeCapacityMultiplier`; both feed `local_strain` only. The residual remains **doubly inert** (not consumed by the exposure path AND not reachable by the existing consumers in OSID-native scenarios), exactly as the IV-b §6 review confirmed. **The residual goes live ONLY under Option 3 (`war_front_pressure_osid` accumulator) — which IV-c does NOT touch.** Recommend keeping the G2-C positive pin (`getSidCapacityModifiers(enclaveOsid)` all-1.0) so any future Option-3 regression is loud.

### C.4 Rupture-timing identity (Condition G2-B) — the live §6 risk and its proof

Collapse never flips `political_controllers` (grep: 3D writes only `collapse_damage` `:184` + `capacity_modifiers` `:212`). The only INDIRECT risk is acceleration of a defender's scripted fall via a degraded `supply_mult` — but G1 zeroes that for every enclave OSID, so Srebrenica/Žepa fall on their existing event/triggered-op timing (Krivaja-95 / Stupčanica-95). **However:** once 3D fires on NON-enclave OSIDs, the western/eastern front can move, and an indirect knock-on to the rupture-input turn is conceivable. The hardened G2-B assertion (rupture `recorded_turn` + first `op:srebrenica:srebrenica_2 === 'RS'` turn BYTE-IDENTICAL ON vs OFF, not just `≥160`) is the proof that must run on the collapse-ON artifact. D2 measured rupture identical at t162 ON vs OFF — but that run wrote zero damage. **The IV-c run is the FIRST where damage actually writes, so G2-A (collapse-ON marker-verified) + G2-B (timing identity) are the load-bearing proofs and must be GREEN on the IV-c territory-moving run, not assumed from D2.**

### C.5 Washington-freeze check (review Condition 5) — non-enclave HRHB central-Bosnia

The first fire is HRHB-spatial-dominant (Tier-0 HRHB `eligible_spatial` true). The 3 HVO pockets (kiseljak/lasva_valley/zepce) are G1-guarded, but the MARGINAL non-enclave Croat central-Bosnia cells around them are NOT. **D3/IV-c must verify no non-enclave HRHB central-Bosnia OSID that is HELD in the 649 baseline is newly LOST under collapse-ON** (the Washington-Agreement preserved Croat central Bosnia to Dayton — accelerating its loss is an ahistorical distortion, NOT a §6 bright-line breach, but a re-floor-blocking fidelity check). D2 satisfied this trivially (0 controller delta); IV-c is where it becomes live.

**§6 verdict: SAFE-TO-BUILD CONDITIONAL — Lever 1 (or Lever 2) introduces no new §6 exposure path; G1 covers the OSID key space unchanged; the edge-min residual stays inert. The conditional is the PROOF obligation: G2-A + G2-B must be GREEN against a verified collapse-ON 188w artifact on the IV-c run (the first run where 3D actually writes), and the Washington-freeze fidelity check must pass at re-floor sign-off.**

---

## D. RECOMMENDED FIRST LEVER + one-change build/measure plan

### D.1 Recommendation

**Lever 1 — raise `STRAIN_FRACTION` (C11) from `0.05` to `0.15`** (one scalar, `phase3c_exhaustion_collapse_gating.ts:75`). Rationale:
- It is the single change that actually makes 3D FIRE given the §A.3 `SEVERITY_MIN` second gate (the threshold-drop lever is a proven no-op at 28.2). At ×3, max strain → ~84.6 and any OSID currently ≥18.3 crosses the effective-55 floor.
- It touches NO threshold (no C13==C9 coupling), NO §6 surface, NO new constant — the smallest reasoning surface for the first floor-moving run.
- It leaves M1 geometry and the 40/0.25 threshold/severity-floor intact, so M2 isolation-weighting (Lever 2) remains a clean Phase-IV-c-2 refinement if Lever 1's eligible set is under-discriminating (too many ordinary front cells, not enough besieged pockets).
- `0.15` is a starting value (3× to clear the floor with margin); the exact value is the calibration tunable — start at 0.15, then bisect toward the smallest fraction that gives a historically-plausible western-cascade eligible set.

**Do NOT bundle** Lever 1 with any threshold or `SEVERITY_MIN` or M2 change — one constant per run (Sacred Rule).

### D.2 Build / measure plan (ordered, one-change-per-run, byte-identical-when-disabled preserved)

| Step | Change (ONE) | LOC | Gate / STOP condition |
|---|---|---|---|
| **C0** | Owner + §6-panel ratify: Lever 1 (STRAIN_FRACTION 0.05→0.15) as the first floor-moving collapse change; §C §6 verdict (G1 unchanged, residual inert); §D re-floor acknowledgment (OSID count WILL move, expected UP at the western cascade). NO CODE. | 0 | Owner sign-off recorded. STOP if owner prefers Lever 2 (M2) as first → re-scope the magnitude constant + G2-against-most-isolated note. |
| **C1** | Fold the D2 wire-in (`feat/collapse-phase4b-d2-wirein` commit `4882a298a` — the ~6-LOC 3C dispatch preferring `computePressureExposureByEntityOsid` when `war_front_edges_osid` populated) into the IV-c branch. NO lever change yet. | ~6 | **40w + 188w collapse-OFF byte-identical to `main` floor** (40w `be76e56dd9d288c2`, 188w `5f57d17287b87dfb`; branch-OFF == clean-main-OFF, the proof D2 already produced — re-prove on the IV-c branch). §6 G2 GREEN (trivially, OFF). STOP if OFF path leaks. |
| **C2** | Raise `STRAIN_FRACTION` 0.05→0.15 (`phase3c…:75`). Behind the existing collapse flags (still OFF by default). | ~1 | **40w collapse-OFF hash byte-identical** (proof of inertness — the constant only matters when flags ON). With `ENABLE_COLLAPSE=true`: record max `local_strain`, count OSIDs reaching Tier-1, count 3D `collapse_damage`/`capacity_modifiers` writes. STOP-and-surface if STILL zero (then the fraction needs to go higher / re-examine geometry). |
| **C3** | **First territory-moving 188w (collapse-ON).** Measure floor delta, anchors, §6, Washington-freeze. NO tuning. | 0 | **§6 G2 HARD gate GREEN against a verified ENABLE_COLLAPSE=true artifact** (G2-A marker-verified + G2-B rupture-timing IDENTITY ON vs OFF, not just ≥160). Anchors may break (EXPECTED — this is the first real fire). Record OSID count + which OSIDs flipped + Washington-freeze non-enclave-HRHB check. **STOP-and-surface if:** any of the 9 enclave OSIDs gets a `collapse_damage`/`capacity_modifier` entry, OR `will_not_recover` true on any enclave, OR Srebrenica/Žepa fall before t160, OR rupture `recorded_turn` differs ON vs OFF, OR a held-in-649 non-enclave HRHB central-Bosnia OSID is newly lost. This is the go/no-go data artifact for the owner/panel. |
| **C4** | Bisect `STRAIN_FRACTION` toward the smallest value giving a historically-plausible western-cascade eligible set. ONE value per run. | ~1/run | anchors + §6 G2 GREEN every run + owner floor-tolerance. |
| **C5 (optional)** | If Lever 1's set is under-discriminating: M2 isolation-weighting (Lever 2) as a SEPARATE one-change run. | ~20 | same gates; §6 note: M2 lifts enclaves hardest → G2 exclusion most-exercised, G2-A is the safety net. |
| **C6–Cn** | Reconcile anchors knocked out by collapse; owner-signed re-floor (new 40w/188w/52w baseline of record + CALIBRATION_MASTER + MEMORY). | varies | 30/30 (or owner-signed deviation) + §6 G2 GREEN + owner OSID-count sign-off + Washington-freeze. |

**Estimate:** engine ~7 LOC (D2 wire-in ~6 + Lever 1 ~1) + the M2 option ~20 LOC if taken. **188w campaign runs: ~5–8** (C2 ON measurement + C3 first-fire + C4 bisection + C5 optional + C6–Cn reconciliation), plausibly 2 sessions. Each is a synchronous 188w (per `feedback_188w_validate_combat_changes_before_merge` — the western cascade compounds only at 188w; 40w + CI is a false-green for combat-behavior changes).

**byte-identical-when-disabled invariant held throughout:** collapse flags OFF by default (`getEnablePhase3*() → false`); only `ENABLE_COLLAPSE=true` flips them. No default, no scenario file, no save field is touched by Lever 1 (a constant) or the D2 wire-in (a branch on a flagged path). Every step re-proves the collapse-OFF 40w/188w byte-identical to the current floor.

**Composition warning (carried from build-spec §6):** collapse and the shelved Lane-3 casualty-realism arc both move territory through the same pressure/attrition pipeline. Lane-3 is CLOSED-by-hold at 649, so collapse builds on the current 649 floor cleanly; do NOT reopen Lane-3 during the IV-c campaign.

---

## E. OPEN QUESTIONS FOR THE PANEL / OWNER

1. **The `SEVERITY_MIN` second gate (THE decision the prompt did not anticipate).** The prompt's "lower the threshold to 25" lever is a NO-OP at 28.2 because `SEVERITY_MIN=0.25` sets the real floor at 55 (and ~44 even at threshold 25). The honest first lever is therefore **magnitude/fraction** (Lever 1), not threshold. Does the owner accept Lever 1 (STRAIN_FRACTION 0.05→0.15) as the first floor-moving change, OR prefer Lever 2 (M2 isolation-weighting) for a tighter eligible set from turn one?
2. **Magnitude vs threshold philosophy.** Lever 1 keeps the 40/0.25 threshold (a "high bar, sustained-pressure" semantic) and raises how fast strain accrues. An alternative is to keep the slow accrual and lower the bar (Lever 3, paired threshold+SEVERITY_MIN), which floods the eligible set. The recommendation is Lever 1 (preserves the "only chronically-exposed OSIDs collapse" intent). Confirm.
3. **Re-floor tolerance.** This is the FIRST floor-moving collapse change. What OSID-count band around 649 is auto-acceptable vs requires explicit sign-off? (Expected direction: UP, toward the historical 1995 western collapse.)
4. **Washington-freeze (review Condition 5).** Is any acceleration of NON-enclave HRHB central-Bosnia loss past the March-1994 federation freeze acceptable, or is that a hard re-floor blocker? (The 3 HVO pockets are G1-guarded; the marginal cells around them are not.)
5. **D2 wire-in merge sequencing.** The IV-c lever is meaningless without the D2 wire-in (`computePressureExposureByEntityOsid` is currently NEVER called on `main`). Confirm the D2 wire-in folds into the IV-c branch (C1) rather than merging as a separate PR first (it was explicitly marked "Do NOT merge" as a measurement artifact).
6. **M2 weighting constant (if Lever 2 is chosen now or at C5).** The isolation weight (e.g. 3.0 for BFS-isolated edge endpoints) is a new tunable. Owner ratify a starting value, or defer M2 entirely to a later phase?

---

## Appendix — evidence map (file:line, working tree `main` @ `661715918` + branch `agent-af206cbf462c25e42` @ `1d7bd3b18`)

- Strain accumulator (monotonic, no decay): `phase3c_exhaustion_collapse_gating.ts:291–304`; STRAIN_FRACTION `:75`; STRAIN_MAX `:76`.
- M1 exposure magnitude (D1 adapter, branch + main): `pressure_exposure.ts:115–145` (magnitude `:124`, half-split `:139–141`).
- D2 wire-in (branch only, NOT on main): `feat/collapse-phase4b-d2-wirein` commit `4882a298a`; 3C call site on main still settlement: `phase3c…:603`.
- SEVERITY_MIN double-gate (the killer): `phase3d_collapse_resolution.ts:220–244` (`:225` threshold, `:230/:235` sRaw, `:239` SEVERITY_MIN, `:49` constant).
- Tier-1 / 3D thresholds: C9 `phase3c…:71–73`; C13 `phase3d…:47`; C13==C9 invariant `20260609_…BUILD_SPEC.md §3` line 125.
- §6 G1 guard (OSID-keyed, 3 sites): `phase3d…:90–97` predicate, `:164–166` chokepoint, `:434–446` loop-skip, `:291` recompute.
- Enclave predicate source: `getEnclaveDefForOsid` `src/sim/combat/enclave_resilience.ts`; 9 protected OSIDs (6 RBiH + 3 HRHB).
- will_not_recover derivative: `loss_of_control_trends.ts:132`.
- Edge-min residual (inert): `capacity_modifiers.ts:53–62`; consumers `front_pressure.ts:149–150`, `formation_fatigue.ts:201–235`.
- Capacity-modifier consumers (territory effect): `front_pressure.ts:143–168` (pressure_cap_mult/supply_mult SOLE site), `formation_fatigue.ts:201–235`.
- D2 measurement (max strain 28.2, 597 entries, 0 damage, §6 PASS, OSID 649/649): `20260610_COLLAPSE_PHASE4B_D2_FIRST_FIRE.md §0/§2/§3`.
- Tier-0 spatial BFS gate (10% isolation): `phase3c…:202–217` (SPATIAL_ISOLATION_FRACTION `:65`); SupplyReachabilityOsidReport input `war_phases.ts:3778`.
- G2 §6 invariant test (on main): `tests/collapse_phase1_g2_section6_invariant.test.ts`.
- Life-lesson (edge-universe bridge): napkin #5 (2026-04-03).
