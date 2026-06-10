# Collapse Phase IV-e — Combat Consumer First-Fire 188w Measurement

**Date:** 2026-06-10
**Branch:** `feat/collapse-phase4e-consumer` (head `ac32e0fe1`)
**Author:** scenario-creator-runner-tester
**Status:** HELD — §6-safe, mechanically correct, territory inert; awaits owner decision on eligibility breadth.

---

## 1. What was measured

The full Collapse IV-c + IV-d + IV-e stack, run as a 188w OFF/ON pair on
`apr1992_definitive_188w`:

- **IV-c** — `STRAIN_FRACTION` 0.05 → 0.15 (so Tier-1 strain clears the 55 severity floor).
- **IV-d** — reroute Tier-1 `entityToFaction` from `political_controllers` so the 3D writer can fire.
- **IV-e** — the **capacity_modifier COMBAT CONSUMER** at `src/sim/combat/attack_resolution_osid.ts:766`
  (own-OSID-only defender-power degradation on a collapsed, non-enclave OSID; default-OFF no-op).

All collapse machinery is gated behind `ENABLE_COLLAPSE`. The runs are complete; this report
analyzes the persisted artifacts only (no re-run).

### Artifacts

| | dir | `final_state_hash` |
|---|---|---|
| OFF (default) | `runs_ive_off/apr1992_definitive_188w__acb538b04d79af3c__w188_n0/` | `ad190ed644972150` |
| ON (`ENABLE_COLLAPSE=true`) | `runs_ive_on/apr1992_definitive_188w__acb538b04d79af3c__w188_n0/` | `22bd1b462ff52c38` |

`collapse_enabled.json` marker present in the ON dir (`{"collapse_enabled": true, "gate": "ENABLE_COLLAPSE"}`); absent OFF.

---

## 2. Raw signals

- **OFF hash `ad190ed644972150`** == known main collapse-OFF baseline → **byte-identical, inert (expected).**
- **ON hash `22bd1b462ff52c38`** == the IV-d ON hash → **the IV-e consumer made ZERO run-level difference.**
- **`control_delta.json` OFF == ON byte-identical** (md5 `a4e819fab17e81c06ed5bf246acd0279` both) → **territory inert.**
- **`political.collapse_damage.by_entity`**:
  - OFF: `<none>`.
  - ON: **exactly ONE entry** — `op:stolac:hatelji_2` (HRHB, Stolac) `{authority:0, cohesion:0, spatial:0.2658…}`.
- **`§6 verify capacity_modifier entries (ON): 1`** — the hatelji_2 non-enclave modifier (the consumer's input). NONE of the 9 enclaves carry one.
- **Territory (both OFF and ON, identical):** `osid_pair_match` 649/712 matched (ratio 0.9115); anchors 30/30;
  control_alignment per-faction identical (HRHB 106 / RBiH 285 / RS … same both sides).

---

## 3. Why the consumer produced ZERO change (the uncontested-OSID explanation)

**Hypothesis (confirmed): the single collapsed OSID `op:stolac:hatelji_2` has NO incoming
enemy attack across the entire 188w run, so degrading its defender power affects no combat
resolution → no-op.**

Evidence:

1. `hatelji_2` is the **only** entry in `collapse_damage.by_entity` (HRHB-on-its-own-OSID strain).
2. `hatelji_2` appears **0 times** in `operation_aars.json` and `watched_operations.json`, and
   **0 times** in `run_summary.json`'s `attack_resolution` / `combat_causality` blocks. It is **not**
   a `unique_attack_target` anywhere.
3. In `brigade_temporal_log.jsonl`, the 510 `hatelji` references are all **friendly HRHB**:
   - `mv_destinations: ["op:stolac:hatelji_2"]` — HRHB brigades moving their *own* forces there (garrison/staging), and
   - **416 records** with `location_osid == "op:stolac:hatelji_2"` — **100% HRHB faction, 0 non-HRHB ever located there.**
4. The one `control_delta` mention of `hatelji_2` is an **early historical RS→HRHB flip** (HVO took the
   Stolac cluster in 1993); it is present **identically in OFF and ON** and is unrelated to the collapse modifier.

Since attacks flow attacker→defender and **no enemy force is ever staged at or adjacent-into
`hatelji_2`**, the OSID is uncontested for all 188 weeks. The consumer multiplies a defender power
that is never put to a combat test → **the modifier is correctly applied but inert.**

**Conclusion: uncontested OSID = YES, with brigade-log evidence (416/416 location records HRHB,
0 enemy attacks).**

---

## 4. The consumer is mechanically CORRECT (not broken)

- **`tests/collapse_phase4e_consumer.test.ts`: 8/8 GREEN.** Proves
  `getCollapseDefenderMultiplier` returns **< 1.0** on a damaged non-enclave OSID and **1.0** on
  enclaves / undamaged OSIDs (supply_mult ×0.89, floored 0.6).

So the consumer **would bite** the moment a *contested* OSID collapses. What blocks territory
movement is the **eligibility** (only one, uncontested, OSID collapses), **not** the consumer.

**Consumer-tests-green = YES.**

---

## 5. §6 HARD GATE — PASS

- **`tools/verify_collapse_section6.cjs` (ON `--compare` OFF): `§6 GATE VERDICT: PASS`, exit 0.**
  - Srebrenica (`op:srebrenica:srebrenica_2`) → **RS**; Žepa (`op:rogatica:zepa_2`) → **RS**.
  - Goražde / Bihać / Sarajevo-core / Teočak → **HELD by RBiH**.
  - `srebrenica_genocide_1995` rupture recorded at **turn 162** (≥160), perpetrator **RS**.
  - Rupture timing **IDENTICAL ON vs OFF** (ON=162, OFF=162).
  - **0/9 enclaves** with collapse_damage / capacity_modifier / will_not_recover (full prefix+list scan clean).
- **`tests/collapse_phase1_g2_section6_invariant.test.ts`: 6/6 PASS, none skipped** (the run pair was
  staged into `runs/` so the artifact-dependent G2-A collapse-ON proof and G2-B ON/OFF rupture-timing
  identity cases **executed** rather than skipping; temp staging removed afterward).

**§6 verdict = PASS.** (Expected, since ON hash == IV-d which already passed §6 — but re-verified here.)

---

## 6. Which case + the remaining gate (owner decision)

This is **case (b)-confirmed**: collapse **fires + writes**, the combat consumer is **wired and
§6-safe**, but **territory is inert** because the **only** collapsed OSID is **uncontested**.

The empirically-confirmed remaining gate is **eligibility BREADTH**, not the consumer:

> The Tier-1 collapse eligibility is gated by a **faction-wide 10%-isolated spatial** predicate.
> Under that gate, the only OSID that clears the severity floor in this scenario is a single
> deep-rear HRHB core cell (`hatelji_2`) that no enemy ever contests. To make collapse move
> territory, **contested** OSIDs — e.g. RS western-Krajina cells under 5th-Corps pressure — would
> need to become eligible, which means **decoupling the faction-wide spatial gate** so locally
> pressured OSIDs collapse on their own.

That is an **owner design decision** (it changes what collapses and therefore moves the calibration
floor). **This report does not propose or build the eligibility change** — it states the gate so the
owner can decide.

---

## 7. Verdict summary

| Check | Result |
|---|---|
| OFF byte-identical to main baseline | YES (`ad190ed644972150`) |
| control_delta OFF == ON | YES (territory inert) |
| ON hash == IV-d ON (consumer zero run-level diff) | YES (`22bd1b462ff52c38`) |
| Why zero change | uncontested OSID `op:stolac:hatelji_2` (416/416 location records HRHB, 0 enemy attacks) |
| Consumer mechanically correct | YES (8/8 unit tests green) |
| §6 hard gate | **PASS** (verify tool exit 0 + G2 6/6 run, not skipped) |
| Remaining gate | eligibility breadth (decouple faction-wide spatial gate) — **owner decision** |

**HELD for owner review. Do not merge.**
