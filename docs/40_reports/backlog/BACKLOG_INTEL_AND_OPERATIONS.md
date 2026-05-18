# Backlog: Intelligence System & Operations — Future Features

**Created:** 2026-03-14
**Source:** Sprint plan session, post-investigation of `sector_intel.ts`, `operation_preparation.ts`, `bot_corps_directives.ts`
**Scope:** Deferred enhancements — not gaps or bugs in current code, but deliberate design limits of the intel system as built through n700. The current implementation (passive buildup, decay, probes, recon-by-force, intel-gated launch) is **alive and functional**. These items extend it.

> **Why deferred:** Each item below touches combat math, state schema, or bot AI in ways that interact with calibration. They are held until the Phase 1–5 sprint stabilises area-weighted match above 90% and RS attack success is in the 60–75% historical band. Adding them before that baseline is solid would make calibration attribution impossible.

---

## 1. Per-OSID Intel Confidence

**Current state:** Intel is modelled at the **sector-pair level** — `state.military.sector_intel[friendlySectorId][]` gives a single `confidence` value for the entire enemy sector (typically 5–25 OSIDs). The `strength_category` and `visible_brigade_ids` are derived from that single number and apply uniformly to all OSIDs in the enemy sector.

**2026-05-18 status update:** First slice is implemented in `docs/40_reports/implemented/20260518_INTEL_EXTENSIONS_BATCH10.md`. The sector-pair record can now carry optional sorted `osid_confidence[]` entries for front-visible enemy OSIDs with source tags (`passive_contact`, `patrol`, `scout`, `combat`); combat refresh promotes the defender OSID to confidence `1`, and commander belief uses the entries when present. Batch 11 implements deterministic execution-time friction in `docs/40_reports/implemented/20260518_INTEL_EXECUTION_FRICTION_BATCH11.md`: stale/missing attacker intel reduces attack power from 1.0 down to 0.85, and OPSEC-marked defending sectors get a bounded 1.08 defender multiplier. Remaining work is per-OSID target scoring, public AAR/read-model annotations, and broader ambush modeling beyond this bounded OPSEC hook.

**What this misses:** Within a single enemy sector, some OSIDs are strongly held (a town OSID with 3 brigades and heavy weapons) and others are nearly empty (a mountain ridge with a platoon-sized screening force). A corps attacking into the sector treats all OSIDs as equally known or unknown.

**Design sketch:**
- Extend `SectorIntelRecord` with `per_osid_confidence: Record<OsidId, number>` — defaults to sector confidence when uninitialised
- `updateSectorIntelFromCombat` promotes the specific `targetOsid` to 1.0 independently of sector-level confidence
- Probe objectives set the probed OSID's confidence to `probe_confidence_gain`, adjacent OSIDs to `0.5 * probe_confidence_gain`
- `computeStrengthCategory` becomes per-OSID: each OSID reports its own strength class to the brigade-level attack evaluator
- Brigade AI (`bot_brigade_eval_attack.ts`) uses per-OSID confidence when choosing attack targets: prefer OSIDs where `per_osid_confidence >= CONFIDENCE_ROUGH_STRENGTH` (0.20) AND `strength_category === 'thin'`

**Prerequisites:** Phase 1.5 (intel attacker penalty) and Phase 3.5 (intel–op prep unification) must be live. Per-OSID confidence is only useful once intel feeds into combat math.

**Historical grounding:** ARBiH commanders in the Bihać pocket (5th Corps) maintained detailed knowledge of specific VRS checkpoints and strongpoints through local intelligence networks — they would probe specific positions, not entire sectors. The difference between attacking a mountain shoulder held by a platoon vs a fortified village held by a battalion was a matter of life and death.

**Owner:** Gameplay Programmer + Systems Programmer (state schema change). Requires Game Designer sign-off on combat integration.

**Estimated scope:** Medium — schema change + 3 call sites (intel update, target scoring, brigade eval).

---

## 2. Surprise / Ambush Mechanic

**Current state:** Low intel (confidence < 0.25) triggers a **probe instead of full attack** (via `shouldLaunchProbeInstead`). If the full attack proceeds despite low intel, the only penalty is the Phase 1.5 attacker power reduction (0.70–1.0× depending on confidence). There is no mechanic giving the **defender** a bonus for maintaining concealment.

**What this misses:** A defending force that knows it hasn't been scouted can prepare an ambush — concentrate at the expected axis of approach, hold fire until the attacker is committed, then engage from multiple sides. The attacker's low confidence should not only weaken the attack; it should **empower the defender** to punish it.

**Design sketch:**
- In `computeDefenderPower` (`combat_math.ts`), add `getSurpriseMult(attackerIntelConfidence)`:
  ```
  attacker confidence ≥ 0.8 → 1.0  (defender gains nothing from being unseen)
  attacker confidence 0.5–0.8 → 1.05
  attacker confidence 0.25–0.5 → 1.15 (defender concentrates on expected axis)
  attacker confidence < 0.25 → 1.25 (full ambush — attacker walks into prepared position)
  ```
- The `surprise_mult` is only applied when `defender_sector.sector_stance` is `Defend`, `Fortify`, or `Elastic` (defenders who are not themselves attacking can maintain concealment)
- Defenders in `Active Defense` or `Screening` stance forgo surprise bonus (aggressive posture is visible)
- Cap: surprise_mult cannot stack with fortress or urban mult above `DEFENSE_ENV_CAP_THRESHOLD` (existing diminishing returns apply)

**Prerequisites:** Phase 1.5 (intel attacker penalty) must be calibrated first. Stacking both an attacker penalty AND a defender bonus for the same intel gap could overcorrect. Only introduce after Phase 1.5's calibration is verified.

**Historical grounding:** The July 1995 VRS attack on Srebrenica succeeded partly because ARBiH had poor visibility on which VRS corps were actually converging. Conversely, ARBiH 5th Corps in the Bihać pocket used intimate knowledge of VRS approach routes to ambush flanking columns in 1994–95. In almost every Bosnian War engagement, the side that was surprised lost more, even when nominally better equipped. Ambushes were not exceptional — they were standard terrain for any force defending mountain approaches.

**Owner:** Gameplay Programmer. Requires War-or-Game sign-off on historical calibration of multiplier values.

**Estimated scope:** Small — one function in `combat_math.ts`, one call site in `attack_resolution_osid.ts`.

---

## 3. Patrol/Scout Intel Sources

**Current state:** Intel accumulates from three sources only: (1) passive buildup while sectors are in contact (`passive_buildup_per_turn`), (2) probe combat (`probe_confidence_gain`), and (3) recon-by-force from any battle. There are no scout units, patrol orders, or civilian intelligence networks. A corps gains intel on its neighbours simply by existing near them.

**What this misses:** Factions had radically different intelligence-gathering capabilities. ARBiH relied heavily on local civilian networks — every village in their territory was a potential source. VRS inherited JNA signals intelligence infrastructure. HVO in central Bosnia was often nearly blind due to fragmented enclaves with no radio links. The current passive buildup models this through different rates (RBiH 0.30/turn vs RS 0.20/turn) but doesn't model the mechanism — which means player choices about patrolling, reconnaissance, or intelligence networks have no effect.

**Design sketch (Phase 1 — passive, no player agency):**
- Add `patrol_intel_actions` field to `CorpsCommandState`: integer count of patrol events generated per turn by the corps
- `deriveSectorIntel` samples patrol intel as a small additive bonus: `patrol_bonus = patrol_intel_actions * PATROL_CONFIDENCE_GAIN_PER_ACTION` (e.g. 0.02/patrol)
- Patrol count is derived from: friendly brigade density near front + OSID ethnic composition (friendly ethnicity in enemy territory = civilian intel network) + corps officer intelligence skill
- This gives the ethnic-mix effect without hardcoding it: ARBiH sectors in Bosniak-majority municipalities generate more patrols naturally

**Design sketch (Phase 2 — player agency):**
- Add `recon_order` to the corps stance order system alongside `sector_stance`
- Player can issue "active recon" for a sector: +4 patrol actions, -1 brigade available for combat (the probe/recon force)
- This competes with the existing probe mechanic — a player-ordered recon is more targeted than an auto-probe

**Prerequisites:** Player agency version requires GUI work (corps orders panel, recon toggle). Passive version can be added to the engine without UI. Passive version first.

**Historical grounding:** The ARBiH's intelligence advantage in central Bosnia (1993+) came primarily from civilian networks in Bosniak villages that provided real-time movement reports on VRS and HVO columns. This was explicitly documented in post-war VRS after-action reviews as the primary reason for their defensive intelligence failures in 1994–95. The VRS had signals intelligence but poor human intelligence in ARBiH rear areas.

**Owner:** Gameplay Programmer (passive phase), UI/UX Developer (player agency phase). Game Designer for civilian network flavour text and design intent.

**Estimated scope:** Medium (passive) to Large (player agency).

---

## 4. Stale Intel Penalty During Operation Execution

**Current state:** An operation begins with the intel state at launch time. As the operation executes over multiple turns, `recon-by-force` updates intel immediately after each battle (confidence → 1.0 for that sector). But if the **enemy repositions between preparation turns** — pulling brigades from the sector, reinforcing with reserves, or changing sector stance — the operation's committed objectives and brigade assignments reflect the intelligence at preparation time, not current reality. The operation just continues as planned.

**What this misses:** A corps that spent 5 turns preparing an attack on a "thin" enemy sector, only to find the enemy has reinforced it in the interim, should re-assess before committing. Blindly executing against a now-fortress sector because the plan said "go" is exactly the kind of institutional inertia that led to disasters like Kupres 1994 (HVO attacked a sector that VRS had quietly reinforced without HVO's knowledge — the town fell in hours).

**Design sketch:**
- In `tickPreparation()`, at the `assessment` phase transition: re-check current sector intel confidence AND re-derive `strength_category` for the primary objective OSID
- If `strength_category` has changed from `thin/moderate` → `dense/fortress` since the operation was created (`op.created_turn`), increment `op.commander_assessment.postponement_count`
- If postponement_count < MAX_POSTPONEMENTS (2): move back to `intel_gathering` and issue a fresh probe — "something changed, re-assess"
- If postponement_count >= MAX_POSTPONEMENTS: proceed regardless (the commander has waited long enough; command pressure overrides caution)
- The `force_launch` player override bypasses this check entirely

**Additional mechanic — mid-operation withdrawal:**
- During execution, if after a failed battle (outcome `repulsed` or `catastrophic`) the combat-updated intel reveals a `fortress` sector where only `moderate` was known at launch, allow the corps commander to invoke `abort_operation` rather than continuing to attack into the revealed strength
- Threshold: `strength_category` upgrades to `fortress` AND `op.consecutive_failures >= MAX_CONSECUTIVE_FAILURES_ON_CURRENT` (already tracked)

**Prerequisites:** Phase 3.5 (intel–op prep unification) must be live — the re-assessment check needs `getSectorIntelConfidence()` to return current live intel, not internal prep tracking. Also requires Phase 2.5 (op objective focus) so that re-assessment targets a coherent geographic position, not a scattered objective list.

**Historical grounding:** Virtually every failed Bosnian War operation was preceded by a period where the attacking commander either had stale intelligence or knew the window had closed but attacked anyway due to political/command pressure. Op Storm (August 1995) is the positive counter-example: extensive intelligence gathering over weeks, with the attack date twice postponed when Krajina Serb repositioning was detected. The delay was rewarded with overwhelming success in 84 hours.

**Owner:** Gameplay Programmer. Game Designer for "command pressure overrides" flavour and max postponement tuning.

**Estimated scope:** Medium — `operation_preparation.ts` assessment phase + a new code path in `advanceSectorOffensives()`.

---

## Cross-cutting Note: OPSEC Player Orders

The existing `state.military.opsec_sectors` field (player-marked sectors that halve enemy passive intel buildup) is implemented but has **no player UI** to set it. This is a small gap between engine and UI — when the corps orders panel is expanded (GUI backlog), surfacing OPSEC as a toggle per sector would close this.

**Owner:** UI/UX Developer, trivial scope once the orders panel exists.

---

*Last updated: 2026-03-14 — initial capture from sprint plan session n700.*
