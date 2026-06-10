# Collapse Phase IV-c — STRAIN_FRACTION 0.15 First-Fire 188w Measurement (HELD)

**Date:** 2026-06-10
**Branch:** `feat/collapse-phase4c-strain-fraction` (lever commit `560401fba`)
**Author role:** scenario-creator-runner-tester
**Status:** HELD for re-floor panel. NOT a re-floor declaration — this frames the question.
**Scope ref:** `docs/40_reports/proposals/20260610_COLLAPSE_PHASE4C_STRAIN_GEOMETRY_SCOPE.md`

## TL;DR — which case

**Case (c): 3D STILL did not fire — but NOT because strain failed.** The magnitude lever
worked *exactly as predicted* (max `local_strain` rose to **84.60**, precisely the scoped
~84.6; **39 OSIDs** now sit at/above the 55 severity floor, **83 OSIDs** above the Tier-1
threshold 40). Yet `collapse_damage` and `capacity_modifiers` are **absent/empty** and
**Tier-1 eligibility = 0 entities**. The block is **three downstream eligibility gates**,
not the strain magnitude. The next lever is NOT "more strain" — it is reconciling the
Tier-0 coherence gates and the Tier-1 entity→faction map. **Territory is byte-identical
ON vs OFF (0 OSIDs differ); §6 floor PASS.**

---

## The lever

One-line constant change (`src/sim/pressure/phase3c_exhaustion_collapse_gating.ts`):

```
-const STRAIN_FRACTION = 0.05;
+const STRAIN_FRACTION = 0.15;
```

Strain model (line ~291): monotonic accumulator, **no decay** —
`strain = clamp(strain + exposure × STRAIN_FRACTION, 0, 100)`, accrued every turn for 188w.
×3 fraction ⇒ ×3 accrual ceiling.

## Artifacts measured (runs DONE — not re-run)

| | dir | final_state_hash |
|---|---|---|
| OFF (default) | `runs_ivc_off/apr1992_definitive_188w__acb538b04d79af3c__w188_n0/` | `ad190ed644972150` |
| ON (ENABLE_COLLAPSE) | `runs_ivc_on/apr1992_definitive_188w__acb538b04d79af3c__w188_n0/` | `eccfa5cd49ee1255` |

OFF hash `ad190ed644972150` == documented collapse-OFF baseline ⇒ **OFF inert / byte-identical** (expected).

---

## 1. Did Phase 3D write collapse_damage / capacity_modifiers? **NO.**

Parsing the ON `final_save.json` `state.political`:

- `collapse_damage` — **present: false** (key absent). `by_entity` count = **0**.
- `capacity_modifiers` — **present: false** (key absent). `by_sid` count = **0**.
- `collapse_eligibility_tier1` — **0 entities** with any eligible domain (entity count 0).

### But strain DID clear the floor — the lever's magnitude prediction was correct

`state.political.local_strain.by_entity` (ON) — **597 entries**, monotonic, max-strain:

| rank | OSID | strain |
|---|---|---|
| 1 | `op:doboj:boljanic_2` | **84.60** |
| 1 | `op:novo_sarajevo:lukavica` | **84.60** |
| 3 | `op:rogatica:brcigovo` | 84.00 |
| 4 | `op:donji_vakuf:komar_2` | 83.33 |
| 5 | `op:gorazde:sopotnica` | 83.33 |
| … | `op:gradacac:pelagicevo` | 71.40 |

- **Max local_strain = 84.60** (scope predicted ~84.6 — exact).
- **OSIDs strain > 40 (Tier-1 threshold): 83.**
- **OSIDs strain ≥ 55 (severity floor 40 + 0.25×60): 39.**
- OFF run: `local_strain` **absent** (collapse pipeline disabled).

So the answer to "did 0.15 triple it to ~84?" is **YES, linearly, exactly to 84.6** (the
clamp ceiling 100 was not the binding constraint; per-turn exposure × 0.15 × 188w lands
the most-exposed OSIDs at ~84.6). The magnitude model is sound.

### Why 3D fired ZERO despite 39 OSIDs over 55 — THREE independent downstream blocks

Phase 3D writes damage only for **Tier-1-eligible** entities. Tier-1 eligibility requires
(a) `strain > threshold`, **(b) the faction be Tier-0-eligible in that domain**, and
(c) a per-domain coherence gate. All three of the following independently zero it out:

**BLOCK 1 — Tier-1 entity→faction map is EMPTY (the decisive cut).**
`applyPhase3CExhaustionCollapseGating` builds `entityToFaction` solely from
`faction.areasOfResponsibility` (lines 614–619). In this OSID-native scenario
**`areasOfResponsibility` is `[]` for all three factions** (control actually lives in
`state.political.political_controllers`, 712 OSIDs). So `entityToFaction.get(entityId)`
returns `undefined` for *every* entity and the `if (!factionId) continue;` at line 632
**skips every entity before Tier-1 is evaluated** → `collapse_eligibility_tier1` = 0.
This alone guarantees no 3D write regardless of strain or Tier-0.

**BLOCK 2 — Tier-0 authority gate is dead.** `checkAuthorityDegradation` fires only when
`faction.profile.authority < 30`. In the ON save **all three factions have
`authority = 50`** (static — nothing drives it down). ⇒ `eligible_authority = false` for
RBiH/RS/HRHB despite persistence counters at 134–153.

**BLOCK 3 — Tier-0 cohesion gate is dead.** `checkCohesionDegradation` fires only when an
active formation has `ops.fatigue > 30`. Max active fatigue: RBiH **30** (exactly, `>30`
false), HRHB 29, RS 15. ⇒ `eligible_cohesion = false` for all.

Tier-0 result (ON): only **HRHB `eligible_spatial = true`**; RBiH/RS all-false; every
authority/cohesion domain false. Even HRHB's lone spatial-eligible domain cannot
propagate because of BLOCK 1 (empty AOR map).

> Note: the Phase IV-a unit reconciliation (`war_exhaustion/100`) IS working — war_exhaustion
> saturates at 10000 (cap) so `exhaustion = 100` clears all Tier-0 exhaustion thresholds and
> persistence is deep (134–156 turns). Tier-0 is blocked by the **coherence gates** (authority
> 50, fatigue ≤30), not by exhaustion.

---

## 2. §6 HARD GATE — **PASS** (load-bearing this time? No — 3D wrote nothing, so the guard
was not exercised on a real write; it still passed clean.)

**vitest** `tests/collapse_phase1_g2_section6_invariant.test.ts` (staged ON+OFF artifacts
under `runs/` so the marker-verified suites RAN, not skipped):

```
Test Files  1 passed (1)
     Tests  6 passed (6)
```
G2-A (collapse-ON proof) and G2-B (rupture-timing identity) both **RAN** (green, not skipped).

**`tools/verify_collapse_section6.cjs --compare`** (ON first, OFF as `--compare`): **PASS**, exit 0.

- Srebrenica `op:srebrenica:srebrenica_2` → **RS**. Žepa `op:rogatica:zepa_2` → **RS**.
- Goražde / Bihać / Sarajevo painted-core (`sarajevo_dio_centar_sajarevo`) / Teočak → **RBiH HELD**.
- `srebrenica_genocide_1995` rupture **recorded_turn = 162** (≥160), perpetrator RS,
  **IDENTICAL ON vs OFF (162 == 162)**.
- All 9 enclave families: **NO collapse_damage, NO capacity_modifier, will_not_recover NOT set.**
  Full-keyspace prefix/list scan: 0 breaches.
- collapse_damage entries (ON) = 0; capacity_modifier entries (ON) = 0.

§6 is intact. (Because 3D wrote nothing, the G1 write-exclusion guard was not stressed by a
real candidate write — it will become load-bearing only once BLOCK 1–3 are cleared and 3D
actually produces damage for non-enclave OSIDs.)

---

## 3. Territory delta ON vs OFF — **ZERO**

- `political_controllers`: **712/712 OSIDs identical. 0 differ.** No named flips.
- Per-faction control IDENTICAL: **RS 321 / RBiH 285 / HRHB 106** (ON == OFF).
- `control_delta.json`: **BYTE-IDENTICAL** ON vs OFF (`c5d76b0c…`) — the whole 188w control
  trajectory is unchanged, not just the endpoint.
- Anchors / 649 floor: `end_report.md` **BYTE-IDENTICAL** ON vs OFF ⇒ anchors and the
  territorial floor (the report still carries the `649/…` figures) are unchanged. No
  anchor regression possible — territory did not move.
- Washington-freeze (non-enclave central-Bosnia HRHB): held-in-OFF == held-in-ON (0 flips).

**OFF byte-identity proof vs known main baseline:** OFF `final_save` SHA256 =
`ad190ed644972150…` = the documented collapse-OFF baseline hash. Every behavioral artifact
is byte-identical ON vs OFF **except** `final_save.json` and `run_summary.json`, and those
differ ONLY because they serialize the new `local_strain.by_entity` floats
(`run_summary.json` diff is the single field `final_state_hash`). `formation_delta`,
`operation_aars`, `weekly_report`, `displacement_event_log`, `brigade_temporal_log`,
`destroyed_brigades`, `end_report.md`, `control_delta.json` — all IDENTICAL.

So the ON hash `eccfa5cd` moved vs D2's `802a15bf` **purely via local_strain magnitude**
(0.05→0.15 raised the stored floats), NOT via any territorial or behavioral change.

---

## 4. VERDICT for the re-floor panel — **CASE (c)**

> (a) 3D fired + territory moved → NO (territory byte-identical).
> (b) 3D fired but territory-inert (modifiers written, consumers don't read) → NO (nothing written).
> **(c) 3D STILL did not fire** → **YES**, but with the crucial qualification that the
> **strain magnitude lever SUCCEEDED** (84.6 > 55, 39 OSIDs over floor). The pipeline is now
> blocked one layer DOWNSTREAM of strain: the **Tier-1 eligibility chain**, not the
> magnitude model.

This is **not** "the fraction was too small / needs M2 or a bigger fraction." Raising the
fraction further would push more OSIDs over 55 but write **zero** additional damage, because
all candidates are filtered out by:

1. **Empty `entityToFaction` map** (BLOCK 1) — `areasOfResponsibility = []` in OSID-native
   scenarios. This is the single highest-leverage fix: re-source the entity→faction map from
   `political.political_controllers` (or the OSID control substrate) so Tier-1 entities map to
   their faction. Until this is fixed, **no fraction value can make 3D fire.**
2. **Dead Tier-0 authority gate** (BLOCK 2) — `authority` pinned at 50, never < 30.
3. **Dead Tier-0 cohesion gate** (BLOCK 3) — active fatigue caps at 30, never > 30.

### The re-floor question for the panel (do NOT decide here)

The scoped hypothesis ("0.15 lifts strain past 55 ⇒ 3D writes damage ⇒ territory moves ⇒
re-floor") is **half-confirmed and half-refuted**: the strain half is confirmed exactly; the
"⇒ 3D writes" half is refuted by three eligibility blocks the scope did not model. **There is
no re-floor candidate from this run — territory is byte-identical.** The panel question is
therefore *not* "do we re-floor to a new territory number" but:

> **Which Phase IV-d consumer-reroute / gate-reconciliation do we authorize next?**
> Ordered by leverage:
> - **IV-d.1 (mandatory first):** re-source the Tier-1 `entityToFaction` map from
>   `political_controllers` so OSID-native Tier-1 entities are no longer all skipped.
>   Without it every other lever is inert. §6 G1 write-exclusion becomes load-bearing the
>   moment this lands — re-run the §6 gate on that build.
> - **IV-d.2:** decide whether the Tier-0 authority/cohesion coherence gates are *meant* to
>   gate Tier-1 OSID collapse at all (they are faction-coarse), or whether spatial-only
>   Tier-0 (the one domain that DOES go eligible — HRHB) should be the sole Tier-1
>   precondition. This is a design call, not a tuning call.
> - Only AFTER 3D actually writes damage for a non-enclave OSID does the
>   "territory moved → re-floor" question become real. **STRAIN_FRACTION 0.15 should be
>   HELD (not merged to default) until that chain is unblocked**, so we don't ship a
>   no-op constant change.

§6 verdict: **PASS, intact, identical rupture timing.** Determinism preserved (control_delta
byte-identical). No territory risk in this lever as-is (it is inert by itself).
