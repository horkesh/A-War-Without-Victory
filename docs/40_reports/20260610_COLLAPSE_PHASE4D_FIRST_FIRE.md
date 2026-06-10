# Collapse Phase IV-c + IV-d — First-Fire 188w Measurement

**Date:** 2026-06-10
**Branch:** `feat/collapse-phase4d-entitytofaction` @ `83cc04f17`
**Status:** HELD for re-floor panel. Supersedes the held #396.
**Author role:** scenario-creator-runner-tester (measurement only — does NOT declare a re-floor).

---

## 0. What was tested

Two stacked, DISABLED-by-default collapse levers, measured as an OFF/ON 188w pair:

- **IV-c** (`560401fba`): `STRAIN_FRACTION` 0.05 → 0.15 in
  `src/sim/pressure/phase3c_exhaustion_collapse_gating.ts` — raises Tier-1 local strain
  so it clears the 55 severity floor. (IV-c harvest: max local_strain 84.6, 83 OSIDs > 40,
  39 OSIDs ≥ 55.)
- **IV-d** (`83cc04f17`): reroute the Tier-1 `entityToFaction` map from
  `faction.areasOfResponsibility` (empirically EMPTY in the OSID-native historical path —
  AoR is only grown by applied front-breach flips, never by init/census/event control) to
  `state.political.political_controllers` (the canonical 712-OSID control surface). This is
  the unblock: with a populated map, every Tier-1 entity no longer hits
  `if (!factionId) continue`, so **Tier-1 finally evaluates and Phase 3D can write
  collapse_damage**.

### Artifacts (DONE — not re-run)
| Run | Dir | `final_state_hash` | Marker |
|-----|-----|--------------------|--------|
| OFF (default) | `runs_ivd_off/apr1992_definitive_188w__acb538b04d79af3c__w188_n0/` | `ad190ed644972150` | none |
| ON (`ENABLE_COLLAPSE=true`) | `runs_ivd_on/apr1992_definitive_188w__acb538b04d79af3c__w188_n0/` | `22bd1b462ff52c38` | `collapse_enabled.json` present |

OFF hash `ad190ed644972150` == the known collapse-OFF baseline → **OFF is inert as expected**
(the IV-c+IV-d code is fully gated off the default path).

---

## 1. DID PHASE 3D FIRE? — **YES.**

Parsed from the ON `final_save.json` → `state.political`:

| Field | ON | OFF |
|-------|-----|-----|
| `collapse_damage.by_entity` (entry count) | **1** | 0 (key absent — inert) |
| `capacity_modifiers.by_sid` (entry count) | **1** | 0 (key absent — inert) |
| `collapse_eligibility_tier1` (entries) | **597** | 0 (empty — inert) |
| tier1 entries domain-eligible (any of A/C/S true) | **2** | 0 |

**The single collapse_damage write:**
```
op:stolac:hatelji_2  (controller: HRHB)
  collapse_damage: { authority: 0, cohesion: 0, spatial: 0.2658 }
  capacity_modifier: { authority_mult: 1, cohesion_mult: 1,
                       pressure_cap_mult: 0.8937, supply_mult: 0.8937 }
```

**Faction:** the only OSID that took collapse_damage is **HRHB** (`op:stolac:hatelji_2`,
SE-Herzegovina/Stolac). Spatial domain only; authority/cohesion untouched.

**The two domain-eligible Tier-1 OSIDs** (both HRHB, both spatial-only):
| OSID | controller | strain (end) | spatial persistence | got collapse_damage? |
|------|-----------|--------------|---------------------|----------------------|
| `op:stolac:hatelji_2` | HRHB | 55.9 | **54** | **YES** |
| `op:glamoc:vidimlije_2` | HRHB | 42.0 | 12 | no (below damage write threshold) |

3D **fired for real for the first time.** The ON hash moved `ad190ed6 → 22bd1b46` solely
because this collapse read-model state (tier1 + collapse_damage + capacity_modifiers) is now
serialized — territory did not move (see §3). This is the observer-flag re-floor precedent:
the hash moves on newly-persisted read-model fields, not on control.

### Why only 1 write despite 39 OSIDs ≥ 55 strain
Of the 39 end-state OSIDs at strain ≥ 55, exactly **1** is domain-eligible. Eligibility is
**persistence-gated, not instantaneous-strain-gated**: an OSID must hold high strain across
many consecutive turns to accumulate `persistence.spatial` and clear the collapse_damage
write threshold. End-of-run strain is a snapshot; most high-strain OSIDs spiked late or
transiently. `hatelji_2` is the one OSID that sustained pressure long enough
(spatial persistence 54). This is the slow-burn collapse curve behaving as designed, not a
bug — collapse bites where pressure is *chronic*, and at 188w only SE-Herzegovina HVO
(Stolac/Glamoč) had a chronic-enough strain profile.

---

## 2. §6 HARD GATE — **PASS (both instruments).**

Now load-bearing for real (3D writes state). Both ran against the marker-verified ON artifact.

### 2a. vitest `tests/collapse_phase1_g2_section6_invariant.test.ts --reporter=verbose`
**6/6 passed.** Critically, the two formerly-skipping blocking gaps **RAN** (not skipped):
- **G2-A** (collapse-ON proof, marker-gated) — RAN, PASS.
- **G2-B** (rupture-timing identity ON vs OFF) — RAN, PASS.
- sentinel (latest 188w = the ON artifact) — PASS.

(Staged: OFF/ON copied into `runs/` so the suite's newest-first discovery resolved a
marked-ON + unmarked-OFF pair; ON touched newest.)

### 2b. `tools/verify_collapse_section6.cjs <ON> --compare <OFF>`
**§6 GATE VERDICT: PASS (with OFF-timing compare).** Every assertion PASS:
- Srebrenica (`op:srebrenica:srebrenica_2`) → **RS** ✓; Žepa (`op:rogatica:zepa_2`) → **RS** ✓
- Goražde / Bihać / Sarajevo-painted-core (`sarajevo_dio_centar_sajarevo`) / Teočak
  (`op:ugljevik:teocak_krstac_2`) → **HELD RBiH** ✓
- `srebrenica_genocide_1995` rupture recorded, **recorded_turn = 162** (≥ 160) ✓,
  perpetrator RS ✓
- **rupture timing IDENTICAL ON vs OFF — ON=162, OFF=162** ✓
- **ZERO** collapse_damage / capacity_modifier / will_not_recover on all 9 enclave capitals
  + Sarajevo painted core ✓
- FULL-KEYSPACE scan: no collapse_damage / capacity_modifier / will_not_recover=true key
  resolves to any enclave prefix/list ✓

The G1 guard-by-exclusion-at-write held: high-strain enclave OSIDs
(`gorazde:sopotnica` strain 83.3, `srebrenica:obadi` 48.2, `rogatica:zepa_2` 40.7) carry
`local_strain` / `tier1` entries BY DESIGN but their tier1 `domains` are all-false at end
state and **none** received any §6-protected write. The single 3D write (`hatelji_2`) is a
non-enclave HRHB OSID — no enclave was touched even though 3D is now live.

---

## 3. TERRITORY DELTA ON vs OFF — **INERT (zero).**

Parsed `state.political.political_controllers` (712 OSIDs) for both runs:

| Metric | OFF | ON | Δ |
|--------|-----|-----|---|
| OSIDs differing ON vs OFF | — | — | **0** |
| RS control count | 321 | 321 | 0 |
| RBiH control count | 285 | 285 | 0 |
| HRHB control count | 106 | 106 | 0 |
| `control_delta.json` total_flips | 186 | 186 | 0 |
| anchors | **30/30** | **30/30** | 0 |

- **Named flips list: EMPTY.** No OSID changed controller between OFF and ON.
- `control_delta.json` is **byte-identical** OFF vs ON
  (sha256 `c5d76b0cc514b91bca4e3658616e385cca52678d5d8cc553ab99bbbd0690341b` for both) →
  OFF control_delta proven byte-identical to the ON run's, and OFF hash `ad190ed6` == the
  known main collapse-OFF baseline. **Territory floor unchanged at 649.**
- **Anchors 30/30 for ON** — NOT broken (territory did not move, so no anchor could move).
- **Washington-freeze:** no non-enclave HRHB central-Bosnia OSID held-in-OFF was lost-in-ON
  (zero OSIDs flipped at all). Note the ONE 3D write is HRHB SE-Herzegovina (`stolac:hatelji_2`),
  and it produced a capacity_modifier, NOT a control flip — so even the written degradation
  did not cost HRHB any ground.

---

## 4. WHICH CASE — **(b): 3D fired, but territory-inert.**

3D wrote `collapse_damage` + `capacity_modifiers` (pressure_cap_mult / supply_mult 0.8937 on
`op:stolac:hatelji_2`), but **no downstream consumer reads those capacity_modifiers to move
control.** The written degradation is currently observer-only state: it serializes (moving
the hash) but does not feed pressure/supply/combat in a way that flips an OSID.

This is the expected handoff to **Phase IV-e**: wire the capacity_modifier consumers
(pressure cap + supply multipliers) into the systems that actually drive control change, so a
chronically-strained OSID's degraded capacity translates into a fall. Until that reroute, the
strain→collapse_damage→capacity_modifier chain is complete but **terminates before territory**.

- Not (a): territory did not move — this is NOT yet "collapse bites."
- Not (c): 3D *did* fire — Tier-1 evaluated and wrote state (the IV-d entityToFaction reroute
  succeeded; the empty-AoR blocker is resolved).

---

## 5. Re-floor question for the panel (framed, NOT decided)

Phase IV-d achieved the **first-fire milestone**: Tier-1 now evaluates and Phase 3D writes
collapse state, with §6 fully intact and territory byte-identical to the 649 floor. Because
territory did not move, **there is no territory re-floor to ratify from this run** — the ON
hash moved only on newly-persisted collapse read-model state (observer-flag precedent;
analogous to the `vance_owen_accepted` / PDP-activation re-floors that moved the full-run hash
while leaving control byte-identical).

The panel question is therefore narrow:

> **Q1.** Accept `22bd1b462ff52c38` as the new collapse-ON 188w hash-of-record for the
> IV-c+IV-d stack (territory unchanged at 649/30-30, §6 PASS, OFF byte-identical to main),
> i.e. ratify the read-model-only hash move?
>
> **Q2.** Authorize **Phase IV-e** (capacity_modifier consumer reroute) as the next lever —
> the step that converts the now-live `pressure_cap_mult` / `supply_mult` writes into actual
> control movement. Scope expectation per the collapse roadmap: RS western-Krajina accelerated
> falls — note that the *current* first-fire OSID is HRHB SE-Herzegovina (`stolac:hatelji_2`),
> so IV-e must be measured to confirm the persistence profile lands on the intended
> western-Krajina RS OSIDs and not (only) on HVO Herzegovina.

No re-floor is declared here. This report is measurement + which-case verdict only.

---

## Appendix — raw evidence
- §6 vitest: 6/6 pass (G2-A + G2-B ran, not skipped). §6 cjs: PASS, rupture 162==162.
- collapse_damage.by_entity = `{ "op:stolac:hatelji_2": { authority:0, cohesion:0, spatial:0.2658 } }`
- capacity_modifiers.by_sid = `{ "op:stolac:hatelji_2": { authority_mult:1, cohesion_mult:1, pressure_cap_mult:0.8937, supply_mult:0.8937 } }`
- tier1: 597 entries, 2 domain-eligible (`glamoc:vidimlije_2`, `stolac:hatelji_2`, both spatial-only, both HRHB), 0 immune, 0 suppressed.
- local_strain.by_entity max ≈ 84.6 (`doboj:boljanic_2`, `novo_sarajevo:lukavica`); 39 OSIDs ≥ 55.
- per-faction control identical RS 321 / RBiH 285 / HRHB 106 both runs; 0 OSIDs differ.
- control_delta.json sha256 identical OFF==ON; OFF hash == main collapse-OFF baseline.
