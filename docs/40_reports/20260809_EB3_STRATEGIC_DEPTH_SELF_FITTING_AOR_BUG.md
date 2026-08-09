# E-B3 BUG — strategic_depth (and AOR-contested) are self-fitting; inert to territorial collapse

**Found:** 2026-08-09, surfaced by the E-B1 slice-4.1 coherence diagnostic during the slice-4.2 op-launch-block experiment (which was RETIRED — see `20260809_EB1_SLICE42_PYRRHIC_PANEL_BRIEF.md`). **Owner:** sector-expert / E-B3 strategic_depth. **Severity:** MEDIUM-HIGH — `strategic_depth` feeds combat defender-power math (`combat_math.ts` `0.5 + 0.5×depth`), so a depth signal that never degrades on collapse silently over-credits a collapsing corps' defence.

## The defect
`strategic_depth` for VRS 2nd Krajina reads **1.00** at turns 175 & 180 (Sept–Oct 1995) — i.e. through the exact window its western AOR (Jajce / Drvar / Šipovo / Sanski Most) historically falls, and does fall in-sim (the calibration reproduces it via injected ops). The system's OWN documented intent says the opposite:

> `game_state.ts:~1061` — "Storm event drops 2KK strategic_depth ~0.7 → ~0.1."

Observed 1.00 ⇒ the documented degradation never happens.

## Root cause — the AOR is re-fit to current control every cycle
Both `computeAorContestedFraction` (`corps_coordination_coherence.ts`) and `collectCorpsAdjacency` (`strategic_depth.ts`) derive a corps' AOR from `state.military.corps_front_sectors[*].territory_osids` filtered to `sector.corps_id === corps.id`. But `sector_territory.ts` **re-derives `territory_osids` from current political control every cycle** (`kept` = currently-held set; lines ~409 / 515 / 558). So when a corps loses OSIDs, those OSIDs simply **exit** its AOR set rather than lingering as "contested-but-assigned". The corps is left with a smaller rump that is, by construction, ~fully held and internally uncontested:
- `aor_contested_fraction → ≈0` (nothing in the current set is enemy-held),
- `collectCorpsAdjacency → allFriendly=true` over the rump ⇒ `strategic_depth → ~1.0`.

The metrics have **no memory of the magnitude or velocity of loss** — only whether what is *currently assigned* is *currently held*. A corps reduced to 20% of its territory reads identically to one at full extent.

## Impact
- **strategic_depth**: over-credits a collapsing corps' defensive strength in `combat_math` (the `0.5 + 0.5×depth` defender term). Magnitude of live calibration effect: UNKNOWN — needs measurement (the western collapse is currently injected-op-driven, so the depth over-credit may be partially masked; but any commander-emergent defence in a shrinking pocket is over-credited).
- **coordination_coherence** (slice 4.1 diagnostic): reads collapsing corps as coherent — this is what made the slice-4.2 op-launch block dormant-by-construction.

## Fix direction (for the E-B3 sector-expert lane — NOT this experiment)
Give the AOR/adjacency inputs **memory of loss**. Candidate approaches (design, then adopt-or-retire):
1. Anchor a corps' AOR to its **initial/assigned** territory_osids (a stable reference), and compute contested/lost against that reference rather than the self-fitting current set. Then a corps that lost 80% reads contested≈0.8.
2. Track a per-corps **peak-extent** high-water mark; contested = 1 − current/peak.
3. A decayed loss-history term.

Each risks the Zvornik/Brčko knife-edge corridors (the AOR reference change alters depth → defender power on exactly the contested corridors). Must be validated at 188w with the full anchor_checks diff (matched ≥634, no new flips) under one-change-per-run.

## Determinism
Any fix must stay pure/sorted (strictCompare), event-truth + field reads only — the current derivations already are; the reference set must be deterministic too.

---

## CORRECTION (2026-08-09, post-measurement) — the root is FROZEN-AT-INIT, and the disposition is DO-NOT-REVIVE

Direct measurement refined the root cause and REVERSED the "fix it" direction:

- **strategic_depth==1.0 for ALL 16 corps in ALL snapshots** (turns 154–180) — the signal is fully inert, not merely self-fitting.
- **Grep-definitive root:** `updateStrategicDepth` (the only writer, via `computeStrategicDepth`) has **no per-turn caller anywhere** in `src/`/`tools/`. Only `initStrategicDepth` runs — **once, at `scenario_runner.ts:1910`** (turn 0). At turn 0 every corps holds its full assigned AOR (uncontested) → `computeStrategicDepth` returns 1.0 for all → the field is **frozen at 1.0 for the entire war.** `combat_math.ts:1636` reads that frozen field, so the `0.5+0.5×depth` defender term is permanently neutral (1.0). The self-fitting property is real for the *function* but moot: it's only ever evaluated at init.
- **The live post-Storm collapse signature is delivered elsewhere** — `getKrajinaCollapseMult` (×0.65) + NATO Deliberate Force (×0.70) + injected `pre_planned_operations` — NOT by `strategic_depth`. Per the 2026-05-25 ledger, `strategic_depth` was wired into defender power but couldn't deliver the collapse signature, so the explicit Krajina mult was added to supersede it.

**Disposition: DO NOT REVIVE.** `strategic_depth` is a **vestigial feed superseded by the Krajina collapse mult**. Wiring `updateStrategicDepth` per-turn would make it live and **stack** on the Krajina mult + NATO — double-counting the Krajina collapse (exactly the redundancy the slice-4.2 panel flagged for the ×0.80 peripheral modifier) and risking a calibration regression on the western-RS knife-edge corridors. The correct action is to **document it as vestigial** (and optionally remove the dead `updateStrategicDepth`/frozen-field wiring for clarity, as a determinism-flat cleanup) — not to activate it. This also means slice-4.1 coherence's `depth` modulator term is currently a constant 1.0; any future coherence consumer should drop the depth factor rather than depend on reviving E-B3.
