# Unified Faction-Agnostic `contain` Enclave Posture — Design

**Status:** DESIGN PROPOSAL, sign-off-ready, 2026-06-07. Read-only research+design; no code yet.
**Owner direction:** the enclave `contain` model is faction-agnostic — it applies not only to VRS-vs-RBiH eastern enclaves but also to **RBiH (ARBiH) containing HVO (HRHB) enclaves.**
**Convening:** Pyrrhic Historian + Game-Designer + Calibration. Expands the §6 strangle-not-capture packet into its symmetric form.

---

## 0. One mechanic, two documented problems
The two problems are the **same bug with the factions swapped** — a historical besieger that *contained* an isolated pocket it could have overrun, which the sim has no representation for (it has a resilience *defense* bonus but no besieger-side *restraint*):

| | Problem 1 (VRS-side) | Problem 2 (ARBiH-side) |
|---|---|---|
| Besieger | VRS (RS) | ARBiH (RBiH) |
| Enclave | RBiH: Srebrenica, Žepa, (Goražde) | HVO: Žepče, Lašva, Kiseljak |
| Sim failure | VRS **captures** what it historically **contained** until July 1995 | ARBiH **captures** what it historically **bottled** until the Washington Agreement |
| Root cause | No encirclement-aware restraint → bot treats enclave-core OSIDs as ordinary objectives; crushing besieger manpower overwhelms the resilience bonus | Identical: ARBiH 2nd/3rd Corps (~9k) vs hrhb_111th (~700) → bot assaults and takes the pocket |
| Source | §6 / HIST-GAP-2 audit | `calibration_central_bosnia_hrhb_ceiling` (13 OSIDs: 10 over-captures + 3 Žepče) + `enclave_mechanics_research` |

`ENCLAVE_DEFINITIONS` (`src/sim/combat/enclave_resilience.ts`) is **already symmetric** — 9 enclaves (6 RBiH: bihac_pocket, srebrenica, zepa, teocak, gorazde, sarajevo; 3 HRHB: kiseljak, lasva_valley, zepce), each with `faction`/`resilience_start_turn` plus either an explicit `osid_list` or `osid_prefixes` (bihac_pocket and sarajevo are prefix-scoped) and an optional `capital_osid`. A future `contain` implementation must scope over all 9 — not just the 6 conflict-pocket entries called out in §0 — so it does not silently skip Bihać/Teočak/Goražde/Sarajevo. The mechanic adds **no new data**; it reads what exists and asks "who is the besieger, and is the pocket cut from its own supply?"

**Precedent already in code:** the SRK Sarajevo siege constraint (`bot_corps_stance.ts:165-189`) already does "maintain pressure, never assault core" for `vrs_sarajevo_romanija`, citing Galić IT-98-29-T — and its own comment states the mechanism *"is faction-symmetric: a corps_id-keyed siege-doctrine constraint could be expanded to any besieger."* `contain` is that generalization, from a hardcoded corps to an emergent enclave+isolation predicate.

## 1. The unified mechanic
**One emergent predicate** `isEnclaveContainable(state, osid, besiegingFaction): boolean` — true when ALL hold (over existing data; no new fields, no scenario tuning, no OSID override):
1. `osid` belongs to an enclave whose `faction` ≠ `besiegingFaction` (enclave defs are Ring-1 engine geometry per the gate).
2. the enclave faction's BFS report (`computeSupplyReachabilityOsid` → `isolated_osids`) lists this pocket as isolated (the encirclement signal, already computed, currently unread by targeting).
3. past the enclave's `resilience_start_turn` (Žepče t30, Srebrenica/Žepa t16, Kiseljak/Lašva t40).
4. the release predicate (§2) is NOT yet satisfied.

Faction-agnostic by construction: takes `besiegingFaction`, reads `enclave.faction` from data; the identical path serves `(VRS, srebrenica_2)` and `(ARBiH, zepce_2)`.

**The posture — a 5th derived (never player-set) `CorpsStance` value `contain`** (`CorpsStance`, `game_state.ts:139`). Enclave-front-scoped (a corps with other live fronts keeps its normal stance there). `contain` does exactly two things: (a) garrison the ring + apply supply pressure (identical to a defensive/screening sector; existing supply-isolation already starves the pocket — no new pressure mechanic); (b) suppress offensive target-generation into the enclave core.

**Suppression chokepoints** (the same shape as the existing `computeSalientRisk`/`SALIENT_RISK_THRESHOLD` filter that already drops targets with >75% enemy neighbors): filter `buildOffensiveTargets` (`commander/emit.ts:405`) to drop containable OSIDs; and `evaluateSectorStances` (`bot_corps_directives.ts:462`) resolves an all-containable sector to `screening`.

## 2. Per-faction-pair differential (the §6 split)
Shared predicate, different release condition + canon sensitivity.

**2a. VRS vs eastern enclaves — §6-SENSITIVE (the critical constraint).** `contain` MUST NOT prevent Srebrenica from falling on the historical path. If it did, `srebrenica_genocide_1995` (`rupture_consequences.ts:66`; RS controls `srebrenica_2` + enclave-formed + turn ≥140) would never record — the game would erase the genocide from its own record via a calibration mechanic (a Ring-1 + §6 violation). So the VRS release is a 1995-pivot emergent flag (Directive-7-analog turn≥140 / defender collapse / supply-critical+isolation-exhaustion) that lifts `contain`; the fall then flows through the **normal control-flip combat path** the rupture predicate keys on. The fall is not rewarded (gate Ring-3 #4/#10). **Goražde** (historically didn't fall — UNPROFOR/April-1994 NATO ultimatum) stays contained with NO release — a feature that also stops long-horizon Goražde over-capture.

**2b. ARBiH vs HVO pockets — LESS §6-fraught (calibration mechanic).** No genocide-rupture coupling (Ahmići/Stupni Do are Ring-2, explicitly not ruptures). Release = the historical **Washington-Agreement ceasefire** (`state.political.rbih_hrhb_state.washington_signed`, `game_state.ts:1530`): contain engages from `resilience_start_turn` (t30-40), then Washington freezes the RBiH↔HRHB war (existing `isRbihHrhbCombatEnabled`/`areRbihHrhbAllied` machinery), so the pockets stay HVO-held — matching painted Oct-1995. This plugs the pre-Washington over-capture window. Retires the ceiling: the 3 Žepče cores (`ozimica_2`/`viniste_2`/`zepce_2`) stop flipping to RBiH; the 10 Central-Bosnia over-captures bound down as assault axes stop generating.

| | VRS-eastern | ARBiH-HVO |
|---|---|---|
| Rupture coupling | YES (`srebrenica_genocide_1995`) | None |
| Release | 1995-pivot flag/collapse/exhaustion — MUST fire so fall records | `washington_signed` ceasefire freeze |
| Canon tier | Sensitive-History gate Ring-1; non-delegable user sign-off | Ordinary calibration; lighter sign-off |
| Failure mode | Genocide erased from record (unacceptable) | Calibration miss (recoverable) |

## 3. Calibration impact + scope risk
Directional: VRS over-capture of eastern enclaves drops (188w especially; Srebrenica still falls on release, rupture intact); ARBiH over-capture of Central-Bosnia/Žepče drops (closing the 13-OSID ceiling CC events can't fix). **SCOPE RISK — western cascade:** `enclave_mechanics_research` documents Srebrenica-ring fixes coupling to VRS 2nd-Krajina brigade state + the bosansko_grahovo/Šipovo HVO cascade (R24 reverted: +6 Srebrenica / −6 large-area). `contain` is *less* prone (it removes aggression rather than committing an assault axis), but the **freed brigades must not silently redeploy and tip the western cascade** — measure, don't assume. **Land as TWO separate changes (one change per run):** Lane V (VRS) and Lane A (ARBiH) each one run, 40w+188w, re-floor. Do NOT bundle (un-attributable regression + smuggling a §6 change alongside an ordinary one).

## 4. Build-lane shape + sign-off (Ring-1, read-only-predicate-first)
- **Lane 1 — diagnostic predicate, ZERO behavior change.** Implement `isEnclaveContainable` + a per-turn diagnostic (which (besieger,enclave) pairs are containable, isolation-turns, release state). **Wire into nothing.** Prove 40w+188w **byte-identical**. Validates the predicate fires on the right pockets/turns before any outcome change. *(No gate; byte-identical; autonomous-safe.)*
- **Lane A (ARBiH-side) — stance/suppression, LIGHT gate.** Land first (less §6-fraught; attacks the documented ceiling). Sign-off: `/game-designer` + `/canon-compliance-reviewer` + calibration re-floor. One run.
- **Lane V (VRS-side) — stance/suppression, FULL §6 gate.** Land last, with a regression test asserting that on the historical path `srebrenica_2` still flips to RS in the 1995 window and the rupture still records. Sign-off: `/historian` (ICTY/BB-cited) + `/war-or-game` + `/game-designer` + **non-delegable user "no reward for atrocity" approval.**

## 5. Bright line (binding)
Bot-only posture (never a player "bottle" lever). No reward for restraint or for the eventual fall (Pyrrhic score never inverts; the eastern rupture stays locked/idempotent/unrewarded; gate #10 — the reward for an intact enclave is the *absence* of a condemnation flag, never a badge). No `avoided_osids_by_faction` (banned) — it suppresses *target generation*, not an OSID blacklist. No initial-OSID override. Safe-by-construction: the mechanic only ever *removes* an attack the bot would generate; it cannot create an attack, reward, or flip control by itself — the fall (on release) flows through the existing, already-tested combat path.

## Key files
`src/sim/combat/enclave_resilience.ts` (`ENCLAVE_DEFINITIONS`, `getEnclaveIdForOsid`); `src/state/supply_reachability_osid.ts` (`isolated_osids`); `src/state/game_state.ts:139` (`CorpsStance`), `:1530` (`washington_signed`); `src/sim/combat/bot_corps_stance.ts:165-189` (SRK precedent + derivation site); `bot_corps_directives.ts:111-131` (`computeSalientRisk` analog), `:462` (`evaluateSectorStances`); `commander/emit.ts:405` (`buildOffensiveTargets` chokepoint); `src/sim/negotiation/rupture_consequences.ts:66` (the predicate Lane V must keep satisfiable); `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md` (§1/§2/§6). Memory: `calibration_central_bosnia_hrhb_ceiling`, `enclave_mechanics_research`, `sectors_are_standing_ogs`.

**One-line sign-off summary:** Add a 5th derived bot-only `CorpsStance` `contain`, gated by emergent `isEnclaveContainable(state, osid, besiegingFaction)` over existing enclave-definition + BFS-isolation data, that garrisons the ring and suppresses assault target-generation into isolated enemy enclaves — faction-agnostic, fixing both VRS over-capture of the eastern enclaves (1995-pivot release that MUST fire so Srebrenica falls + records) and ARBiH over-capture of Žepče/Central-Bosnia (Washington-freeze release; closes the 13-OSID ceiling). Land Lane 1 (byte-identical diagnostic) → Lane A (ARBiH, light gate) → Lane V (VRS, full §6 + non-delegable user approval); one change per run.
