# NW Bosnia OOB Audit — close BUG-01 via OOB-data alignment

**Lane**: `LANE-NIGHTSHIFT-NW-BOSNIA-OOB-AUDIT`
**Date**: 2026-05-07
**Verdict**: **(A) GENUINE-OOB-MISCALIBRATION** — 4 OOB rows realigned to BB1 historical evidence
**Engine code touched**: NONE (Ring 1 / OOB-data only, faction-symmetric mechanism unchanged)

---

## Background

API smoke `bft5bixcj` (Petković Turn 1) found `hvo_northwest_bosnia` declared at t0 with role + stance assigned but **0 brigades / 0 personnel** for 2-8 turns. D3.3 triage `af2400764` reconfirmed.

Q1 (`6cbcaa00`) tried to fix this in the engine (defer corps creation in `recruitment_engine.ts` until `available_from <= currentTurn`). Reverted at `8ccdbff8` because deferring **all 5 HRHB OZ corps** to w10 produced **-17% RBiH territory loss** — Posavina HVO units that historically pinned VRS were absent.

Per durable knowledge from that revert: **the proper fix is in OOB DATA, not engine code.**

---

## Phase 0 — Mini-panel verdict

### Historical evidence (BB1 Chapter 25 / Annex 28, p.181-182)

> "During 1992 some of the largest battles of the Bosnian war — engaging more than 50,000 troops on both sides — occurred in the most strategic area of the country, the Posavina region of northern Bosnia. One of the first clashes of the conflict enveloped the Sava River town of Bosanski Brod in **early March**, when mixed Croat and Muslim HVO forces used weapons provided by the Croatian Army to stop a Serb takeover of the municipality."
>
> "During **April and May**, as HV troops reinforced the HVO, their combined formations pushed JNA and Serb TO troops completely out of Bosanski Brod, **overran the towns of Modrica and Derventa**, and temporarily severed the east-west route running between the Serb-controlled Bosanska Krajina region (and the Republic of Serbian Krajina) and the rest of the Serb Republic… No supplies could reach these areas, and the nascent Serb Republic was cleft in two."

The HVO Posavina/Northwest Bosnia OZ is **uniquely early** among HRHB Operative Zones: combat began before any formal HZ-HB or OZ structure existed. Other HRHB OZs (Main Staff, Southeast Herzegovina, Central Bosnia, Tomislavgrad) are correctly modeled at `available_from=10` (HVO formed politically 8 April 1992 in Grude; Operative Zones formalized through 1992).

### Per-brigade citations

| Brigade | Pre-fix `available_from` | Post-fix | BB1 evidence |
|---|---|---|---|
| `hrhb_101st_oraje_brigade` (Orašje) | 2 | **0** | BB1 p.181: HVO held Orašje April 1992; pocket survived all of 1992 (BB1 p.182: "VRS November offensive failed; it would be May of 1995 before VRS would attempt another assault on Orasje") |
| `hrhb_102nd_brigade` (Orašje) | 8 | **0** | BB1 p.181-182: same Orašje pocket as 101st |
| `hrhb_106th_bosanska_posavina_brigade` (Orašje) | 8 | **0** | BB1 p.181-182: same Orašje pocket |
| `hvo_hrvoje_vukcic_brigade` (Odžak) | 0 | 0 (unchanged) | Already correctly modeled |

### Corps citation

| Corps | Pre-fix `available_from` | Post-fix | BB1 evidence |
|---|---|---|---|
| `hvo_northwest_bosnia` | 10 | **0** | BB1 p.181: "early March 1992" first Bosanski Brod combat; HVO Posavina OZ active before scenario t0 (April 1992) |

### Out-of-scope rows (kept unchanged)

- `hvo_main_staff` / `hvo_southeast_herzegovina` / `hvo_central_bosnia` / `hvo_tomislavgrad`: kept at `available_from=10` (correct per their formation histories).
- `hrhb_103rd_derventa_brigade`: kept at 8 — `pocket_destroyable` mechanism handles 4-5 July 1992 fall.
- `hrhb_104th_bosanski_brod_brigade`: kept at 8 — `pocket_destroyable` mechanism handles 6 October 1992 fall.
- `hrhb_105th_modrica_brigade`: kept at 8 — out of scope; missing `pocket_destroyable` tag is a separate pre-existing OOB inconsistency (logged for follow-up).

---

## Phase 1 — Implementation

### Files modified (exclusive ownership)

- `data/source/oob_brigades.json` — 3 brigade rows updated (101st `2→0`, 102nd `8→0`, 106th `8→0`)
- `data/source/oob_corps.json` — 1 corps row updated (`hvo_northwest_bosnia` `10→0`)
- `tests/nw_bosnia_oob_correctness.test.ts` — NEW (7 tests)
- `docs/40_reports/implemented/20260507_NW_BOSNIA_OOB_AUDIT.md` — NEW (this report)

### Files NOT touched (frozen surfaces respected)

- `src/sim/recruitment_engine.ts` — Q1's territory; Q1 revert in place
- A1-A5, B1+B2, C1+C2, D1+D2 frozen surfaces — none touched
- `src/sim/combat/commander/briefing.ts` — C1 frozen surface; verdict was (A) not (B)
- `docs/10_canon/FORAWWV.md` — never auto-edited

---

## Phase 2 — Tests

### `tests/nw_bosnia_oob_correctness.test.ts` — 7/7 GREEN

| ID | Verdict | Description |
|---|---|---|
| T1 | PASS | Corps + 3 brief-scoped brigades all `available_from=0`; corps not later than its earliest brigade |
| T2 | PASS | Other 4 HRHB OZ corps `available_from=10` UNCHANGED from pre-Q1 baseline |
| T3 | PASS | Determinism — re-load OOB JSON byte-identical |
| T4 | PASS | Backward-compat — loaders accept current OOB shape; all brigades reference defined corps; `available_from` is non-negative integer |
| T5 | PASS | Static-grep — no per-faction OOB branches added (faction-symmetric mechanism preserved) |
| T6 | PASS | `hvo_hrvoje_vukcic_brigade` unchanged at `available_from=0` (not in scope; verify no regression) |
| T7 | PASS | Sibling NW-Bosnia brigades 103rd/104th/105th kept at `available_from=8`; pocket_destroyable tag present on 103rd + 104th |

### Regression tests

- `tests/recruitment_engine.test.ts` — 19/19 GREEN (no regression)
- `npx tsc --noEmit -p tsconfig.json` — clean

---

## Verification commands for parent

### 40w smoke (will drift hash; that's expected — OOB-data change)

```bash
NODE_OPTIONS="--max-old-space-size=8192" npm run sim:scenario:run:40w > runs/_40w_nw_bosnia_oob_audit.log 2>&1
```

Expected: hash will drift from current 40w baseline (`575aca8c8adfdae2` post-Krivaja). Behavioral expectation:

- HVO `hvo_northwest_bosnia` corps active at t0 with brigades present (no longer "0-brigade shell")
- Posavina HVO units pinning VRS in Posavina from t0 (resolves Q1 revert root cause)
- RBiH territory should NOT regress (Q1 revert removed -17% RBiH; this fix should restore parity or improve)
- Anchors brka_2 / zenica_2 / etc. must NOT regress
- Full benchmark suite stays at 5/6 PASS or better

### 188w A/B (parent runs background)

```bash
# A: with fix (current HEAD)
NODE_OPTIONS="--max-old-space-size=12288" npm run sim:scenario:run -- --scenario data/scenarios/apr1992_definitive.json --weeks 188 > runs/_188w_nw_bosnia_oob_audit_A.log 2>&1

# B: control (revert this commit, run, then re-apply)
git revert HEAD --no-commit && NODE_OPTIONS="--max-old-space-size=12288" npm run sim:scenario:run -- --scenario data/scenarios/apr1992_definitive.json --weeks 188 > runs/_188w_nw_bosnia_oob_audit_B.log 2>&1 && git reset --hard
```

Expected gates:
- Anchors: regression ≤ 1 vs baseline
- Benchmarks: stays at 5/6 or better
- §6 floor: Krivaja-95 fires t≥170; Stupčanica-95 fires t≥170 (unchanged)
- Petković Turn 1 API smoke: `hvo_northwest_bosnia` shows ≥1 brigade ≥1 personnel at t0 (BUG-01 closed)

---

## Sensitive-history compliance

- Ring 1 / OOB-data tweak; no §6 surface; no FORAWWV touch
- Faction-symmetric mechanism unchanged (engine `available_from` integer gate)
- Faction-asymmetric *data* — only HRHB rows changed, but the mechanism stays uniform

---

## Open follow-ups (not in this lane)

1. `hrhb_105th_modrica_brigade` lacks `pocket_destroyable` tag (sibling 103rd + 104th have it). Modriča fell 28 June 1992; brigade should dissolve via the canonical pocket mechanism. Pre-existing OOB inconsistency.
2. After this lane lands, downstream consumers (briefing reducer, smoke-test anomaly checker) may want to flag any remaining `available_from > 0` corps that have any `available_from = 0` brigades (consistency check).

---

## Commit shape

```
fix(oob): hvo_northwest_bosnia available_from audit — close BUG-01 via OOB-data alignment (LANE-NIGHTSHIFT-NW-BOSNIA-OOB-AUDIT)
```

`git commit -o` pathspec form mandatory per durable KNOWLEDGE 2026-05-06 multi-agent git-index sweep risk.

Files:
- `data/source/oob_brigades.json`
- `data/source/oob_corps.json`
- `tests/nw_bosnia_oob_correctness.test.ts`
- `docs/40_reports/implemented/20260507_NW_BOSNIA_OOB_AUDIT.md`
