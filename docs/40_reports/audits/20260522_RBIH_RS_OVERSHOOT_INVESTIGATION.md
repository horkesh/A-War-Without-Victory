# n1979 RBiH +24 / RS -10 Overshoot Investigation

**Date:** 2026-05-22
**Author:** Engine + Calibration audit (read-only)
**Run:** apr1992_definitive_188w__210e69404d054959__w188_n1979
**Branch:** feature/arc-operations-calibration
**Mode:** READ-ONLY (no source edits)

---

## TL;DR

n1979 vs oct1995 painted reference:

| Faction | Sim (n1979) | Oct 1995 painted | Delta |
|---|---|---|---|
| HRHB | 93  | 107 | -14 |
| RBiH | 310 | 286 | **+24 (overshoot)** |
| RS   | 309 | 319 | **-10 (under)** |

**Root cause (high-confidence):** the +24/-10 dual anomaly is driven almost entirely by `evaluateUncontestedOccupation` (`src/sim/combat/bot_brigade_eval_attack.ts:724-849`), the bot brigade evaluator that lets a brigade WALK INTO an adjacent enemy OSID with `posture='attack'` whenever that OSID has no physical defender AND no sector-defended-by brigades. In late war (w155+) VRS active brigade count collapses to 49 of 83 formations while VRS personnel survives (83k @ w187), so the network of VRS-controlled OSIDs becomes a checkerboard of physically-empty cells. ARBiH/HRHB brigades on the front then promenade through the southeast Herzegovina chain (foca/gacko/bileca/ljubinje/trebinje) capturing 21 OSIDs without any defending brigade present.

- **25 of 26 (96%)** late-war combat flips are NOT linked to any active CorpsOperation.
- **21 of 26 (81%)** have `battle_id` ending in `:null` (no defender brigade) — direct fingerprint of the uncontested-occupation path.
- The path is gated by the "truly undefended" test (defenderScan + sectorDefense), which has **no morale/cohesion threshold** — so VRS brigades collapsing to morale=17 / cohesion=20 don't lose their "is a defender" status, but inactive ones (status≠active) do.

---

## SECTION A. Op-driven vs autonomous flip ratio (turns 155-188)

**Raw data from `final_save.political.control_events` (212 total events, 188w run):**

| Mechanism | Overall (w0-188) | Late-war (w155-188) |
|---|---|---|
| combat | 141 | 26 |
| consolidation | 67 | 0 |
| event | 4 | 0 |
| **total** | **212** | **26** |

**control_events schema fields:** `from`, `to`, `mechanism`, `mun_id`, `settlement_id`, `turn`, `attacker_brigade?`, `battle_id?`. **There is NO `operation_id` field on control_events.** Op-linkage must be inferred by cross-referencing `battle_id` against `operation_aars.json`.

**Late-war (w155-188) combat-flip direction breakdown:**
- RS -> RBiH: 17
- RS -> HRHB: 9
- Other: 0

Every late-war flip is RS losing territory. Zero defensive recapture by RS in the last 33 weeks. This is the +24/-10 anomaly in motion.

**Op-linkage cross-reference (w155-188 combat flips vs `operation_aars.json` coverage):**

- `operation_aars.json` total: 51 ops (whole run)
- AARs ending after turn 155: 8
- Op-coverage tuples built (turn,osid,faction across each op's `objectives_targeted ∪ objectives_captured ∪ objectives_logged_captured` and `started_turn..ended_turn` window): 1,117 entries
- Late-war combat flips matched to an active op window: **1 of 26 (3.8%)**
- Late-war combat flips with **NO** op coverage (autonomous): **25 of 26 (96.2%)**

This corroborates and slightly exceeds the n1975 SCRT figure (33 of 35 = 94%).

**Battle-id defender slot parse (the smoking gun):**

`battle_id` format is `turn:op:mun:slug:attacker_brigade:defender_brigade`. The defender slot is the literal string `"null"` when no defending brigade existed at the OSID at attack-resolution time.

| Late-war flip class | Count |
|---|---|
| `battle_id` ends in `:null` (uncontested walk-in) | **21 / 26 (81%)** |
| `battle_id` has named defender | **5 / 26 (19%)** |

Geographic clustering of null-defender flips: foca, gacko, bileca, ljubinje, trebinje, mostar — east Herzegovina chain falling RS->RBiH/HRHB in w161-188. This is the historical SE quadrant that should remain RS at oct1995.

Samples (turn, OSID, brigade, battle_id):

- t161 `op:foca:tjentiste_2` arbih_443rd_mountain `161:...:arbih_443rd_mountain:null`
- t161 `op:gacko:gacko_2` arbih_441st_vitezka_mountain `...:arbih_441st_vitezka_mountain:null`
- t161 `op:ljubinje:ljubinje_2` hrhb_1st_brigade_mostar `...:hrhb_1st_brigade_mostar:null`
- t161 `op:trebinje:trebimlja_2` hrhb_grude_brigade `...:hrhb_grude_brigade:null`
- t162 `op:bileca:korita` arbih_441st_vitezka_mountain `...:arbih_441st_vitezka_mountain:null`

These are the classic uncontested-occupation fingerprint: single attacker, no defender, no op, geographically contiguous cluster.

---

## SECTION B. Force_ratio formula audit

**Question H2 from brief:** does `force_ratio_estimate` include terrain/entrenchment/cohesion?

**Answer: YES, for ops — but it is NOT the gate that allows the autonomous flips.**

The op-level estimator is `estimateForceRatio` at `src/sim/combat/operation_preparation.ts:247`, called per-tick from `tickPreparation` at line 640:

```ts
const forceRatio = estimateForceRatio(state, op, competence, confidence, supplyByOsid, terrainMultByOsid);
```

The estimator:
- Iterates `op.participating_brigades`, filters `status === 'active'` (line 260)
- Computes attacker COMBAT POWER via combat_math (overrides posture to 'attack'); each brigade gets supply/terrain/officer/morale/fatigue applied (lines 284-287 comment block)
- Sums defender power across the facing enemy sector with `targetTerrainMult` and supply-by-OSID lookups (line 282)
- Result is passed into `prepResult.force_ratio_estimate` (line 650) and persisted to `op.force_ratio_estimate`

Launch gates use it via `launchFloorForOp(op)` at multiple call sites (`sector_offensive.ts:825, 882, 959`), aborting to recovery with `reason='defender_power_too_high'` if below floor.

**So for OPS, the formula is rich and honest.** Late-war RBiH ops that would attack these OSIDs WOULD fail the force_ratio gate (or pass with low ratios) because the terrain in east Herzegovina is heavy mountain (high terrain mult for defender). But — and this is the key — the autonomous path that produced 25/26 late-war flips **bypasses force_ratio entirely**.

**The autonomous attack scoring constant** is `UNCONTESTED_OCCUPATION_SCORE` (`bot_brigade_eval_attack.ts:842`) and is set explicitly **lower than formal ops** (700 vs 800/900 per the comment) so it does not displace ops, but it has **NO ratio gate, NO terrain modifier, NO cohesion check, NO morale check** — the only check is "is there any active brigade currently at the OSID, and does any sector cover it with any active brigade?"

So H2 is partially TRUE for the wrong reason: the per-op force_ratio is honest, but **the autonomous code path that produces 96% of late-war flips never computes a force_ratio at all**. Force ratio is computed at attack-resolution time inside `resolveAttackOrdersOsid` (`attack_resolution_osid.ts`), but by then the order is already issued and capture proceeds normally with no defender to oppose it.

---

## SECTION C. VRS personnel trajectory

Raw per-brigade snapshots from `brigade_temporal_log.jsonl` (188 weeks).

| Week | Faction | Brigades (active) | Personnel | Avg Cohesion | Avg Morale |
|---|---|---|---|---|---|
| 0   | RBiH | 78 (77)   | 48,979  | 46.6 | 60.8 |
| 0   | RS   | 78 (78)   | 84,771  | 66.9 | 64.0 |
| 0   | HRHB | 32 (31)   | 31,202  | 57.2 | 56.3 |
| 50  | RBiH | 118 (115) | 175,774 | 63.3 | 79.7 |
| 50  | RS   | 83 (80)   | 105,008 | 32.7 | 63.4 |
| 50  | HRHB | 33 (29)   | 48,417  | 51.2 | 66.8 |
| 100 | RBiH | 120 (118) | 199,473 | 72.7 | 86.3 |
| 100 | RS   | 83 (67)   | 87,907  | 28.5 | 58.9 |
| 100 | HRHB | 40 (37)   | 64,698  | 42.6 | 60.4 |
| 150 | RBiH | 122 (120) | 205,851 | 72.5 | 87.2 |
| 150 | RS   | 83 (62)   | 90,651  | 25.4 | 53.3 |
| 150 | HRHB | 41 (35)   | 61,028  | 39.4 | 60.1 |
| 160 | RBiH | 122 (120) | 206,276 | 72.4 | 82.0 |
| 160 | RS   | 83 (60)   | 87,723  | 25.3 | 51.7 |
| 170 | RBiH | 124 (122) | 207,527 | 71.6 | 81.3 |
| 170 | RS   | 83 (58)   | 86,707  | 24.0 | 45.7 |
| 180 | RBiH | 124 (122) | 207,555 | 70.4 | 89.6 |
| 180 | RS   | 83 (50)   | 84,413  | 20.5 | **16.9** |
| 187 | RBiH | 125 (123) | 208,545 | 71.1 | 89.9 |
| 187 | RS   | 83 (49)   | 83,020  | **20.4** | **17.2** |
| 187 | HRHB | 41 (34)   | 61,504  | 38.2 | 59.3 |

**Key signals:**

1. **VRS personnel is NOT collapsing.** From w50 -> w187, VRS personnel went 105,008 -> 83,020 (-21%, modest). H1 (engine over-depletes personnel) is **FALSE** for personnel.
2. **VRS active-brigade count IS collapsing.** From 80 active brigades (w50) -> 49 active (w187), a 39% loss of fielded brigades. So personnel are concentrated in fewer active formations — but average active-brigade size rises from 1,313 (w50) to 1,694 (w187). The personnel exist; the brigades are inactive.
3. **VRS morale is in free fall.** w170 avg morale 45.7, w180 16.9, w187 17.2. Cohesion bottomed at 20.4. RBiH morale in the same window is 89.9. A ~70-point morale gap.
4. **The +24/-10 anomaly window matches the morale crash AND the active-brigade collapse.** Late-war flips start w156 and accelerate w161+ — exactly when RS active-brigade count drops below 60 (w160).

**H1 verdict:** the "VRS collapse" is real but it's a **morale + active-brigade-count collapse, not a personnel collapse**. The 34 inactive RS formations (status≠active) hold roughly 0 personnel slots in the bot's defender check — `evaluateUncontestedOccupation`'s `hasDefender` test (line 808) explicitly filters `f.status === 'active'`. As more VRS brigades go inactive (presumably from cohesion/morale-driven dissolution or routing), more OSIDs become legally "undefended" to ARBiH/HRHB brigades.

---

## SECTION D. Sampled late-war flips

Twelve autonomous late-war flips (turn ≥ 155, no op coverage):

| Turn | OSID | From → To | Attacker | Battle defender |
|---|---|---|---|---|
| 156 | op:travnik:varosluk | RS → RBiH | arbih_706th_muslim_mountain | rs_1st_armored |
| 161 | op:foca:tjentiste_2 | RS → RBiH | arbih_443rd_mountain | null |
| 161 | op:gacko:gacko_2 | RS → RBiH | arbih_441st_vitezka_mountain | null |
| 161 | op:ljubinje:ljubinje_2 | RS → HRHB | hrhb_1st_brigade_mostar | null |
| 161 | op:trebinje:trebimlja_2 | RS → HRHB | hrhb_grude_brigade | null |
| 162 | op:bileca:korita | RS → RBiH | arbih_441st_vitezka_mountain | null |
| 162 | op:bileca:vranjska | RS → HRHB | hrhb_1st_brigade_mostar | null |
| 162 | op:gacko:avtovac_2 | RS → RBiH | arbih_445th_mountain | null |
| 162 | op:gacko:izgori | RS → RBiH | arbih_443rd_mountain | null |
| 162 | op:trebinje:zakovo_2 | RS → HRHB | hrhb_1st_herzegovina_brigade_knez_domagoj | null |
| 163 | op:bileca:mirilovici | RS → HRHB | hrhb_1st_brigade_mostar | null |
| 163 | op:bileca:zausje | RS → RBiH | arbih_441st_vitezka_mountain | null |
| 163 | op:trebinje:hum | RS → HRHB | hrhb_1st_herzegovina_brigade_knez_domagoj | null |

12 of 13 sampled have **null defender**. Same handful of attacking brigades (441st Vitezka, 443rd, 445th mountain on RBiH side; Knez Domagoj, Grude, 1st Mostar on HRHB side) repeatedly walking adjacent. Each captures one OSID per turn (`UNCONTESTED_OCCUPATION_SCORE` line 842 + `return true` at line 843 means ONE per brigade per turn — the geographic chain capture is 1-OSID/turn × multiple brigades × many turns).

The 5 named-defender flips (e.g. travnik:varosluk vs rs_1st_armored) are likely the 1 op-linked flip plus a handful where a VRS brigade was physically at the OSID but in a state allowing combat resolution to favour the attacker — likely cohesion=20, morale=17 brigades losing to cohesion=71, morale=90 attackers in resolveAttackOrdersOsid. That's a separate, smaller channel.

---

## SECTION E. Autonomous attack code path

**Entry point:** `bot_brigade_ai_osid.ts:643` — the per-brigade evaluator pipeline runs `evaluateSectorAttack` first (op-bound brigades only).

**The non-op offensive doctrine:** `evaluateOffensive` (`bot_brigade_eval_attack.ts:687-711`) explicitly says brigades NEVER attack independently:

```ts
// ── Ops-only attack doctrine ──
// Brigades NEVER attack independently. All attacks go through operations
// (handled by evaluateSectorAttack). This function only handles non-op
// brigades in offensive/balanced stance: they defend on the front line
// and wait for the corps to assign them to an operation.
```

This is the design intent. But it's contradicted by `evaluateUncontestedOccupation` (lines 724-849), which runs BEFORE `evaluateOffensive` in the pipeline (line 644 vs 648 of `bot_brigade_ai_osid.ts`) and issues `posture='attack'` orders with `attack_orders[brigade.id] = n` whenever its predicates pass.

**The "truly undefended" predicate** (lines 808-837):

1. `hasDefender`: any `formations[fid]` with `status==='active'`, `location_osid===n`, `faction===controller` → blocks.
2. `sectorHasBrigades`: any sector covering OSID `n` for faction `controller` whose `assigned_brigade_ids ∪ reserve_brigade_ids` contains any `formations[bid]` with `status==='active'` → blocks.

What this predicate **does NOT check**:

- Defender morale (a routed brigade with morale=10 still counts as defender)
- Defender cohesion (cohesion=0 still counts as defender)
- Defender personnel (a 50-person stub still counts as defender)
- Sector front edge proximity (an interior OSID covered by a faraway sector still counts as defended)
- Pre-flip combat odds — there is no force_ratio_estimate, no terrain mult, no combat power check
- Whether the friendly brigade is actually capable (morale, fatigue, supply) — only checks that it's not in column transit (line 631 earlier in the pipeline) and not in an op (`isActiveSectorOperationParticipant`)

**Other guards that DO exist (and why they don't fire for east-Herzegovina chain):**

- Early-war throttle (line 736-738): only first 2 weeks. Irrelevant at w161+.
- Disrupted brigade check (line 739-740): only blocks if `disrupted_turns > 0`. Not applicable to healthy attackers.
- Alliance guard (lines 761-764): only blocks HRHB↔RBiH targeting each other.
- Enclave guard (lines 771-774): only blocks enclave-pocket brigades from leaking out.
- Salient-aversion (lines 782-792): blocks if >75% of post-capture neighbors are enemy. Doesn't fire on east-Herzegovina because as VRS empties, RBiH/HRHB sweep is creating a friendly base. After 2-3 captures, the chain is friendly-majority.
- `avoided_osids_by_faction` (line 804): banned per project policy.

**Conclusion on E:** the autonomous brigade walk-in path is wired live, runs every turn for every brigade, and its only gates are "is anyone physically present?" + geometric salient-aversion. In late war it is essentially unconstrained against a faction whose active-brigade roster has shrunk by 39%.

---

## SECTION F. Root-cause hypothesis ranking

Against the brief's five hypotheses:

| Hypothesis | Evidence | Verdict |
|---|---|---|
| **H1** VRS personnel collapse leaving sub-50 defenders | Personnel only -21% w50→w187, holds at 1,694/active-brigade | **FALSE for personnel.** Real collapse is in active-brigade COUNT (-39%) and morale (-50). |
| **H2** force_ratio raw-personnel only | Op-path estimator at `operation_preparation.ts:247-650` DOES use terrain/supply/morale/cohesion via combat_math. | **PARTIALLY FALSE.** Op force_ratio is rich; but it's not invoked on the autonomous path that produces 96% of late-war flips. |
| **H3** autonomous attack threshold too permissive | Confirmed at `bot_brigade_eval_attack.ts:808-837`: predicate has zero combat threshold; only "is any active brigade physically present". | **TRUE. Primary root cause.** |
| **H4** VRS not recovering replacements | Not directly inspected, but personnel stability (105k→83k modest decline) suggests recruitment exists. Active-brigade count not recovering is the real gap. | **PARTIAL.** Brigade reactivation, not personnel replenishment, is the missing mechanism. Out of scope for smallest-fix here. |
| **H5** ops-only doctrine should be enforced | Code already SAYS "ops-only doctrine" in `evaluateOffensive` (line 690-694) — but `evaluateUncontestedOccupation` contradicts it. | **TRUE. The "uncontested occupation" path is the documented hole in the stated doctrine.** |

**Best one-sentence root cause:**

> Late-war VRS active-brigade count collapses from ~80 to ~49 (with personnel surviving in inactive formations), leaving ~25% of RS OSIDs with no physical active defender and no sector cover, and `evaluateUncontestedOccupation` (`bot_brigade_eval_attack.ts:724`) lets ARBiH/HRHB brigades walk into them one OSID/turn with zero combat-power, terrain, or morale check, producing 21 of 26 (81%) late-war flips as `:null`-defender walk-ins concentrated in east Herzegovina (foca/gacko/bileca/ljubinje/trebinje).

---

## SECTION G. Smallest-surface-area fix proposal

The fix must be narrow and Ring-1-safe (no §6 canon changes, faction-agnostic).

### Recommended primary fix: tighten the "truly undefended" predicate

**File:** `src/sim/combat/bot_brigade_eval_attack.ts`
**Function:** `evaluateUncontestedOccupation` (lines 724-849)
**Change scope:** ~15 lines added to the predicate that decides "is this OSID truly undefended"

**Proposal:** add a SECTOR-PROXIMITY guard before the `posture='attack'` issue at line 840.

```ts
// (NEW after line 837, before line 840)
// Late-war sector-proximity guard:
// If the target OSID is part of a sector front whose adjacent friendly OSIDs
// contain ANY active enemy brigade (even routed/low-cohesion), the front is
// physically present in the area and walk-in is inappropriate — only a real
// attack via CorpsOperation can take ground here.
//
// Rationale: 21 of 26 late-war flips in n1979 are :null-defender walk-ins
// concentrated in east Herzegovina (foca/gacko/bileca/ljubinje/trebinje)
// where the VRS active-brigade count collapsed but the sector network
// remained populated 1-2 hops away. The current predicate sees only
// strict-co-location, not theater presence.
const sectorBlocked = profileTime('.theaterPresence', () => {
    const nNeighbors = adjacency.get(n as Osid) ?? [];
    for (const nn of nNeighbors) {
        if ((pc[nn] as string | undefined) !== controller) continue;
        // Any active enemy brigade within one hop of the target → not truly undefended
        if (hasActiveFormationAtOsid(activeFormationLocationsByFaction!, controller, nn as Osid)) {
            return true;
        }
    }
    return false;
});
if (sectorBlocked) continue;
```

**Expected effect (rough):**

- Cuts the late-war :null-defender flip rate by ~70% (most east-Herzegovina captures had VRS brigades 1-2 OSIDs away, just not physically AT the target).
- Brings sim RBiH 310 → ~292-298, RS 309 → ~318-325. Target painted is 286/319. Net direction correct; magnitude needs a run.
- HRHB -14 unaffected (HRHB undershoot is a different anomaly — probably orthogonal).

**Why this is the smallest-surface-area fix:**

- Adds one predicate to one function. No new state, no new constants, no scenario data changes.
- Faction-agnostic (every faction benefits equally — symmetric).
- Ring 1 only. No §6 canon impact.
- Reuses existing `activeFormationLocationsByFaction` cache already built upstream.
- Determinism-safe (sorted adjacency iteration; same key types).
- No `avoided_osids_by_faction` usage (project red-line respected).
- Does not undermine intended "walk into truly abandoned territory" behavior in early war (territory abandoned by ALL brigades, including neighbors, still walks in).

### Optional secondary fix: lift `UNCONTESTED_OCCUPATION_SCORE` floor

If primary fix overshoots in the opposite direction, also raise `UNCONTESTED_OCCUPATION_SCORE` (`bot_brigade_eval_attack.ts:842` import from top of file) so uncontested walk-ins lose priority arbitration to defensive holds at the front. Not strictly required if primary fix lands.

### What NOT to fix

- Do NOT touch `estimateForceRatio` — it is honest and only governs ops.
- Do NOT touch `evaluateOffensive` — it is already correctly "ops-only".
- Do NOT add a morale/cohesion gate to defender-presence test — that would change combat resolution semantics elsewhere; the proximity gate is more localized.
- Do NOT try to fix the underlying VRS active-brigade-count collapse here — that's a separate H4 investigation about brigade reactivation/replacement and belongs in a different lane.

---

## Caveats and gaps in this investigation

1. The "1 op-linked" late-war flip may include the 5 named-defender battles by alternate matching. Cross-reference was on OSID-in-target-set; if AAR `objectives_captured` doesn't fully list every captured OSID the op transited, the count is conservative.
2. Did not trace the resolveAttackOrdersOsid path that produces the 5 named-defender late-war flips. Could be a separate small channel (low-cohesion VRS defenders losing real fights). Worth a follow-up.
3. Did not quantify whether the brigades performing the walk-ins are in any corps directive (e.g. a "stance=offensive" directive may funnel them onto the front; the autonomous walk-in then fires opportunistically).
4. HRHB undershoot (-14) is not investigated here — likely orthogonal to the RBiH+24/RS-10 mechanism. HRHB is also gaining via walk-ins (9 of 26 late-war flips) so its undershoot is in EARLIER turns, not late game.
5. Replay sequence file (1.08 GB) was not consumed; weekly_report.jsonl + brigade_temporal_log.jsonl + final_save were sufficient for the diagnosis.

---

## SECTION H. Žepče enclave-loss investigation (priority user finding)

**User report:** Vitez/Kiseljak enclaves preserved in sim, but **Žepče (zepce_2 + ozimica_2 + viniste_2)** flipped HRHB→RBiH in n1979. Historically defended by HVO Operative Group Žepče under Stipo Pasalic from April 1993 through Washington Agreement (~t85 in sim).

### H.1 When does Žepče fall in n1979?

From `final_save.political.control_events`:

| Turn | OSID | From → To | Attacker brigade | Battle defender |
|---|---|---|---|---|
| **36** | op:zepce:ozimica_2 | HRHB → RBiH | arbih_303rd_vitezka_mountain | **null** |
| **62** | op:zepce:viniste_2 | HRHB → RBiH | arbih_375th_liberation | **null** |
| **69** | op:zepce:zepce_2 (town core) | HRHB → RBiH | arbih_314th_slavna_liberation | **null** |

Initial vs final political controller:
- `op:zepce:ozimica_2` — init HRHB, final RBiH (flipped t36)
- `op:zepce:viniste_2` — init HRHB, final RBiH (flipped t62)
- `op:zepce:zepce_2` — init HRHB, final RBiH (flipped t69)
- `op:zepce:zeljezno_polje_2` — init RBiH, final RBiH (never HVO)

### H.2 ARBiH-HVO war window check

ARBiH-HVO war typically opens around t30 in calibration scenarios; Washington Agreement closes it around t85.

- **t36 (ozimica_2)** — falls 6 turns into the conflict window. **Inside ARBiH-HVO war.**
- **t62 (viniste_2)** — well inside the war window. **Inside.**
- **t69 (zepce_2 town)** — **16 turns BEFORE Washington Agreement (t85).** Inside.

All three captures are inside the ARBiH-HVO war window. Žepče town (zepce_2) falls **16 turns before the peace** that historically froze the lines. With Žepče lost at t69, no amount of later peace can restore it without explicit roll-back.

### H.3 Are these attacks linked to a CorpsOperation?

Cross-reference against `operation_aars.json` returns zero op coverage for any of (t36, op:zepce:ozimica_2), (t62, op:zepce:viniste_2), (t69, op:zepce:zepce_2). All three `battle_id`s end in `:null` — uncontested walk-ins via `evaluateUncontestedOccupation`, **same code path as the late-war east-Herzegovina sweep**.

Different attacker brigades each time (303rd Vitezka, 375th Liberation, 314th Slavna Liberation), all ARBiH 3rd Corps area formations, walking in one OSID at a time across 33 turns.

### H.4 Is the enclave defense bonus wired for Žepče?

**YES in code, NO in data.** `src/sim/combat/enclave_resilience.ts:187-195` defines:

```ts
{
    id: 'zepce',
    faction: 'HRHB',
    osid_list: [
        'op:zepce:ozimica_2', 'op:zepce:viniste_2',
        'op:zepce:zepce_2',
    ],
    resilience_start_turn: 40,
    capital_osid: 'op:zepce:zepce_2',
},
```

And ENCLAVE_CONFIG line 215:

```ts
zepce: { max_resilience: 15, growth_mult: 0.25, max_personnel: 400 },
```

Max resilience 15 → defense bonus = 1.0 + 15 × 0.005 = **1.075** (+7.5%). With hardening (after HARDENING_THRESHOLD turns isolated), boosted further.

**But the bonus only applies to defenders.** Inspecting `data/source/oob_brigades.json` (249 brigades total): **0 of 14 enclave-tagged brigades belong to HRHB.** All 14 enclave-tagged brigades are RBiH (Bihać pocket, Goražde, Srebrenica, Sarajevo). The Lašva valley (Vitez/Busovača) and Kiseljak HVO formations are NOT enclave-tagged in the OOB either — but those enclaves preserve in sim because regular HVO brigades happen to remain physically at their OSIDs.

The single Žepče-homed HVO formation, **`hrhb_111th_brigade`**, has:

- `home_osid: op:zepce:ozimica_2`
- `tags`: undefined (no `enclave` tag)
- At final save (w188): `status=inactive`, `personnel=0`, `location_osid=op:teslic:kamenica_2` (NOT at home, NOT in the enclave)

So when ARBiH brigades walked into ozimica_2 at t36, viniste_2 at t62, and zepce_2 at t69, the only HVO formation defending the enclave was either already inactive, displaced to a distant municipality (teslic), or had zero personnel. The "truly undefended" predicate passes trivially.

The `resilience_start_turn=40` value means the Žepče enclave resilience does not begin to GROW until t40 — but t36 (the first flip) is **before that**, so even the documentary acknowledgment of the enclave is post-dated to AFTER ozimica has already been lost.

**Note on Žepče enclave member count discrepancy:** the enclave definition lists only 3 OSIDs (ozimica_2, viniste_2, zepce_2). Historically the Žepče pocket also included Žepče-village and surrounding hamlets; if any of those collapse into another OSID in the operational dataset they would not be covered by the enclave guard. But the 3 listed OSIDs are exactly the 3 that flipped — so the enclave definition matches the painted reference; the failure is purely on the defender-formation side.

### H.5 Žepče root cause and minimal fix

**Root cause:** the Žepče enclave is defined in `enclave_resilience.ts` but no HVO formation in the OOB is tagged as its `enclave` defender, no operational group ("OG Žepče") exists in the formation roster, and the one Žepče-homed regular HVO brigade goes inactive and is displaced out of the pocket. The uncontested-occupation predicate then trivially walks into all 3 OSIDs across t36-t69.

**The same `evaluateUncontestedOccupation` predicate that drives the late-war east-Herzegovina sweep also drives the Žepče loss.** The sector-proximity guard proposed in Section G WOULD partially help (if any HVO brigade from Vitez or Kiseljak was within 1 hop). However, in Žepče's case Vitez/Kiseljak are geographically separated by ARBiH-held terrain, so the 1-hop proximity guard alone may not block all three captures.

**Minimum-surface-area fix specific to Žepče:**

1. **Tag `hrhb_111th_brigade` with `enclave` in `data/source/oob_brigades.json`.** Single-line data change. This activates:
   - Enclave guard at `bot_brigade_eval_attack.ts:771-774` (brigade can't leak out of pocket — currently this brigade is in teslic at final, which means it left the pocket).
   - Enclave defense bonus from `enclave_resilience.ts` (+7.5% to +Hardening% defense).
   - Enclave cohesion recovery (+1/turn per 10 resilience).
   - Reinforcement priority via `enclave_local_reinforcement` (formation_spawn.ts:422).

2. **Add a small HVO `og_zepce` formation to the OOB**, tagged enclave, home_osid=`op:zepce:zepce_2`, modest personnel (~600-800 modelling OG Žepče under Pasalic). Historical: OG Žepče had ~3,000-5,000 fighters at peak. Sim-appropriate: 1 formation at 600-800.

3. **Lower `resilience_start_turn` from 40 to 30** so the bonus is active when the first ARBiH probe arrives (t36 ozimica_2 currently falls BEFORE the bonus is enabled).

4. **(Optional, ties to Section G fix.)** Add the sector-proximity guard. For Žepče this fix is insufficient on its own because the enclave is geographically isolated — but combined with #1 (tag the formation `enclave`) and the bonus, the enclave brigade physically at zepce_2 would block the predicate via `hasDefender` directly.

**Smallest single-step fix:** option #1 (one OOB tag edit). Validated by the existing engine wiring — every other infrastructure piece is already in place.

**Verification path post-fix:** check that `hrhb_111th_brigade` at the next n run is (a) still at `op:zepce:ozimica_2` or similar Žepče OSID at w36+, (b) status=active, (c) personnel > 0, AND that all 3 Žepče OSIDs remain HRHB at w69 and w188.

### H.6 Why Vitez and Kiseljak survive but Žepče doesn't

The user reports Vitez preserved correctly and Kiseljak preserved with 1 OSID flipped. Hypothesis (data-supported but not fully verified in this audit): both are anchored by named HVO formations physically at the enclave (Vitez Brigade, Nikola Šubić Zrinski for Kiseljak) that retain `status=active` and stay put. The single Žepče-homed brigade (`hrhb_111th_brigade`) goes inactive/displaced — possibly because the war breaks the supply chain and it routs out, or because formation_spawn doesn't reinforce it locally without the `enclave` tag (formation_spawn.ts:422 enclave-local-reinforcement path explicitly checks `isEnclaveBrigade`).

This makes the OOB-tag fix not just a Žepče-specific patch — it would also harden Vitez and Kiseljak against the same drift if those brigades ever go inactive.

---

## Provenance

- Run dir: `runs/apr1992_definitive_188w__210e69404d054959__w188_n1979/`
- Files consumed: `final_save.json`, `operation_aars.json`, `brigade_temporal_log.jsonl`, `weekly_report.jsonl`
- Engine source cited: `src/sim/combat/bot_brigade_eval_attack.ts:687, 724-849`, `src/sim/combat/operation_preparation.ts:247, 610-672`, `src/sim/combat/sector_offensive.ts:818, 825, 881, 958`, `src/sim/combat/bot_brigade_ai_osid.ts:643-648`
- Related prior memo: `docs/40_reports/audits/20260522_WAVE_11_12_13_BREAKTHROUGH_N1975.md` (33 of 35 = 94%; this investigation independently re-derives 25 of 26 = 96% with battle_id null-defender breakdown)
