# Collapse Phase IV-b D2 — OSID Exposure Wire-In, First-Fire 188w Measurement (RAW DATA)

**Status:** HELD / MEASUREMENT ARTIFACT. RAW DATA ONLY — a separate panel owns the re-floor verdict. Do NOT merge this PR, do NOT re-bless the golden manifest, do NOT tune. baseline-regression CI is EXPECTED to remain green here only because territory did NOT move (see §3).

**Date:** 2026-06-10
**Branch:** `feat/collapse-phase4b-d2-wirein` (HEAD `1d7bd3b18`)
**Scenario:** `data/scenarios/apr1992_definitive_188w.json` (plain 188w; not `_dayton_close`). All deltas are collapse-ON vs collapse-OFF on the SAME scenario.
**Predecessors:**
- `docs/40_reports/20260610_COLLAPSE_PHASE4A_FIRST_FIRE.md` — Tier-0 fires, Phase 3D writes nothing because the exposure substrate (`front_pressure`) is empty in OSID-native scenarios.
- `docs/40_reports/proposals/20260610_COLLAPSE_PHASE4B_OSID_SUBSTRATE_SCOPE.md` — Option 2 + M1 re-route (ratified, diffusion=OFF).
- `docs/40_reports/proposals/20260610_COLLAPSE_PHASE4B_S6_REVIEW.md` — §6 review (G2-A/B/C/D hardening, Sarajevo key-space fix Codex #382).

**Commits under measurement (3):**
- `95b760456` — G2-A marker run-dir-reuse hygiene (delete stale ON marker on OFF path).
- `4882a298a` — Phase 3C wire-in: prefer `computePressureExposureByEntityOsid(state)` when `war_front_edges_osid` populated (~6 LOC, behind existing collapse flags).
- `1d7bd3b18` — Sarajevo logical-vs-painted §6 key-space fix (Codex #382).

Temp `tmp_d2_compare.cjs` removed.

---

## 0. HEADLINE

- **(a) Did Phase 3D WRITE `collapse_damage` / `capacity_modifiers` this time?** — **NO. Zero entries in both.** BUT the wire-in DID succeed one layer up: `local_strain.by_entity` is now POPULATED (597 OSID entries; Phase 4A had it EMPTY). New blocker: max local_strain ≈ **28.2 < Tier-1 threshold 40** (C9/C13) → no OSID reaches Tier-1 → 3D resolves with nothing to write.
- **(b) Did any consumer READ the modifiers?** — **N/A (nothing was written), and structurally NO even if it had been.** The 3D-keyspace is OSID; every consumer (`front_pressure.ts`, `formation_fatigue.ts`, `loss_of_control_trends.ts`) reads `capacity_modifiers.by_sid` keyed by **settlement SID** (parsed from `edge_id`). 3D-fires-but-inert ⇒ **Phase IV-c is defined: (i) raise strain to cross Tier-1 [D4 lever], and (ii) bridge the OSID-write → settlement-read keyspace.**
- **(c) OSID delta ON vs OFF** — **ZERO.** 649/712 both. **0 controller flips.** Every behavioral section (casualties, battles, captures, displacement, attack-resolution, historical-alignment) byte-identical ON vs OFF. The ON final-save hash differs from OFF ONLY via the inert diagnostic fields `collapse_eligibility` + `local_strain` + `loss_of_control_trends`.
- **§6 HARD GATE — PASS** on BOTH proofs (G2 vitest 6/6 incl. G2-A + G2-B RAN-not-skipped; independent `verify_collapse_section6.cjs` exit 0).

---

## 1. §6 HARD GATE — PASS (both independent proofs)

### Proof 1 — `tools/verify_collapse_section6.cjs` (dependency-free, WITH the Sarajevo #382 fix), ON vs clean-main-OFF

`§6 GATE VERDICT: PASS (with OFF-timing compare)` — exit 0. Every assertion PASS:

| §6 invariant | OFF | ON | verdict |
|---|---|---|---|
| Srebrenica `op:srebrenica:srebrenica_2` | RS | RS | fell, identical |
| Žepa `op:rogatica:zepa_2` | RS | RS | fell, identical |
| Goražde `op:gorazde:gorazde_2` | RBiH | RBiH | held, identical |
| Bihać `op:bihac:bihac_2` | RBiH | RBiH | held, identical |
| Sarajevo painted core `op:centar_sarajevo:sarajevo_dio_centar_sajarevo` | RBiH | RBiH | held, identical |
| Teočak `op:ugljevik:teocak_krstac_2` | RBiH | RBiH | held, identical |
| rupture `srebrenica_genocide_1995` recorded_turn | 162 | 162 | ≥160 AND identical |
| rupture perpetrator | — | RS | correct |
| `collapse_damage` on all 9 ENCLAVE OSIDs + full-keyspace scan | — | **0** | clean |
| `capacity_modifier` on all 9 ENCLAVE OSIDs + full-keyspace scan | — | **0** | clean |
| `will_not_recover` on all 9 ENCLAVE OSIDs + full-keyspace scan | false | **false** | clean |

### Proof 2 — `tests/collapse_phase1_g2_section6_invariant.test.ts` (hardened G2), against the marker-verified ON artifact

**6/6 GREEN.** Critically, **G2-A (collapse-ON proof) and G2-B (rupture-timing identity) RAN — not skipped** (verified against a staged `runs/…_ON` carrying `collapse_enabled.json` + a staged unmarked `runs/…_OFF`). G2-A asserts the full §6 set against the marker-verified ON artifact; G2-B asserts `recorded_turn` + `srebrenica_falls_1995`/`zepa_falls_1995` fired-turn + event-flag identity ON vs OFF. The marker `{collapse_enabled:true, gate:"ENABLE_COLLAPSE"}` was genuinely written by the ON run.

---

## 2. Question (a) — did Phase 3D write? Where the pipeline now stalls

| Stage | Phase 4A (pre-wire-in) | Phase 4B D2 (this wire-in) |
|---|---|---|
| OSID exposure → `local_strain.by_entity` | **EMPTY** (settlement `front_pressure` empty in OSID-native run) | **POPULATED — 597 OSID entries** (adapter `computePressureExposureByEntityOsid` now feeds it) |
| max `local_strain` observed (188w) | ~0 | **≈ 28.2** (top: `op:doboj:boljanic_2` 28.2, `op:novo_sarajevo:lukavica` 28.2, `op:rogatica:brcigovo` 28.0) |
| Tier-1 threshold (C9/C13) | 40 | 40 |
| OSIDs reaching Tier-1 | 0 | **0** (28.2 < 40) |
| Tier-0 (faction) | spatial channel only | HRHB `eligible_spatial=true` (persistence 141); RS/RBiH spatial=false; authority/cohesion=false all factions |
| `collapse_eligibility_tier1` state | absent | absent (none crossed) |
| 3D `collapse_damage` written | 0 | **0** |
| 3D `capacity_modifiers` written | 0 | **0** |

**The wire-in did exactly what it was designed to do — it bridged the OSID edge-universe so exposure now flows into `local_strain`.** The blocker advanced from "no strain accrues at all" (4A: empty substrate) to "strain accrues but plateaus below Tier-1" (4B: ~28 vs 40). Under M1 (uniform unit magnitude per active OSID front edge) and the current `STRAIN_FRACTION` (C11), the late-war plateau does not cross the C9=40 Tier-1 gate. This is precisely the D4 tuning lever (`STRAIN_FRACTION` C11 / `TIER1_*_THRESHOLD` C9) named in the scope doc. **No constant was tuned in D2 (correct — D2 is the wire-in + measurement, not the tune).**

ON final-save hash differs from OFF ONLY in three fields, all of which are diagnostic / non-§6-protected and BY DESIGN populated on a collapse-ON run (G2-D, ratified #368):
```
political keys differing ON vs OFF: ["collapse_eligibility", "local_strain", "loss_of_control_trends"]
collapse_damage: ABSENT both    capacity_modifiers: ABSENT both
```

---

## 3. Question (c) — OSID delta ON vs OFF + anchors + benchmarks

| Metric | clean-main OFF | branch ON | delta |
|---|---|---|---|
| final_state_hash | `ad190ed644972150` | `802a15bff6ac1306` | differs ONLY via inert strain/eligibility/trends |
| matched_osids (oct1995) | **649**/712 | **649**/712 | **0** |
| match_ratio | 0.91152 | 0.91152 | 0 |
| HRHB correctly_placed | 92 | 92 | 0 |
| RBiH correctly_placed | 265 | 265 | 0 |
| RS correctly_placed | 292 | 292 | 0 |
| anchors | **30/30** | **30/30** | 0 (no break — territory did not move) |
| benchmarks | 6/6 passed | 6/6 passed | 0 |
| controller flips ON vs OFF | — | — | **0 OSIDs differ** (full 712-OSID universe) |
| control_delta.json sha256 | `c5d76b0c…0690341b` | `c5d76b0c…0690341b` | **byte-identical ON vs OFF** |

**Anchors 30/30 — NO break.** (The mission anticipated a break "EXPECTED"; it did not occur because no territory moved, because 3D wrote nothing. Recorded, not fixed.)

### Casualty / K:W / combat (all identical ON vs OFF)
| | OFF | ON |
|---|---|---|
| total_battles | 496 | 496 |
| total_attack_orders | 718 | 718 |
| total_objective_attempts | 986 | 986 |
| total_objective_captures | 528 | 528 |
| civilian killed (HRHB/RBiH/RS) | 4000 / 36287 / 3549 | 4000 / 36287 / 3549 |
| fled_abroad (HRHB/RBiH/RS) | 96139 / 86615 / 99007 | identical |

Sections verified byte-identical ON vs OFF: `civilian_casualties`, `combat_causality`, `takeover_displacement`, `attack_resolution`, `historical_alignment`.

### Washington-freeze check (§6-review Condition 5)
Any non-enclave HRHB central-Bosnia OSID HELD in OFF but LOST in ON? — **NONE.** Controller delta ON vs OFF = 0 OSIDs across all factions, so the freeze condition is trivially satisfied this run. (It will become load-bearing once 3D writes and territory moves — D4+.)

---

## 4. Byte-identical OFF proofs (the wire-in did NOT leak into the OFF/default path)

| Horizon | branch OFF (default flags) | clean-main OFF | match |
|---|---|---|---|
| **40w** final_state_hash | `e246e8529d4244d8` | `e246e8529d4244d8` | **YES** |
| 40w control_delta.json | — | — | **byte-identical** |
| 40w final_save.json | — | — | **byte-identical** |
| **188w** final_state_hash | `ad190ed644972150` | `ad190ed644972150` | **YES** |
| 188w control_delta.json | — | — | **byte-identical** |
| 188w final_save.json | — | — | **byte-identical** |

40w branch-OFF == clean-main-OFF byte-identical (hash + control_delta + final_save). 188w proof below.

> **Run-harness note (collision):** during these runs a concurrent agent ("orch") was operating in this same worktree and launched its own `--out runs_orch_off` 188w run, which clobbered the original `runs_branch_off` 188w dir. The clean-main-OFF 188w (`ad190ed644972150`) is the OFF reference of record (it is `origin/main` @ `0ca7de47a` with no collapse code). The branch-OFF 188w byte-identical proof was re-run cleanly in a collision-proof dir (`runs_d2_branch_off_v2`) — hashes above.

---

## 5. What this measures, for the panel

1. **The OSID exposure wire-in is correct and live** — `local_strain` now accrues over the OSID front universe (597 entities) where Phase 4A had nothing. The edge-universe mismatch (napkin life-lesson #5) is bridged for the collapse substrate.
2. **Phase 3D is still inert** — strain plateaus at ~28 vs the C9=40 Tier-1 gate, so nothing crosses into `collapse_damage`/`capacity_modifiers`. **First-fire of the territory-moving pipeline did NOT occur.** This is a tuning gap (D4: `STRAIN_FRACTION`/`TIER1` threshold), not a wiring bug.
3. **Even past Tier-1, the written modifiers would not be consumed** in OSID-native runs — the 3D writer keys OSIDs, all live consumers read `by_sid` settlement keys. The OSID-write → settlement-read bridge is the second half of Phase IV-c.
4. **§6 is intact and the OFF/default path did not leak.** Collapse-ON is behaviorally byte-identical to OFF except inert diagnostic state; collapse-OFF is byte-identical to clean main.

**Phase IV-c scope (defined by this measurement):** (i) tune the M1 magnitude / `STRAIN_FRACTION` / Tier-1 threshold so late-war over-extended OSIDs cross Tier-1 (one constant per run, owner-signed, §6 G2 GREEN every run); (ii) bridge the OSID-keyed `collapse_damage`/`capacity_modifiers` writes to the settlement-keyed consumers (or move consumers OSID-native). Diffusion stays OFF per the ratification.
