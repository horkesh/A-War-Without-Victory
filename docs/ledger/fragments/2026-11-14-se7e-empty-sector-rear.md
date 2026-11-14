## 2026-11-14 — SE7E: an empty front sector commits its own rear brigade (PR #625)

Calibration-moving lane (RF realism fix, register SD15). Under the owner's 2026-11-14 hold, checkpoint scores are recorded, not gated.

On main, ARBiH 1st Corps sector 4 (Visoko-Kiseljak) has no front brigade on t98-t188, the consistency-1 signature. Three passes each missed it:
- Construction's zero-assigned rescue reaches 3 hops and skips dug-in brigades.
- The bot sector march indexes assigned and reserve brigades only.
- Commander T1 relief counted a sector as empty only with no reserve or rear at all.

So the free 182nd (rear, 4 hops) never moved, and the dug-in 147th, 185th and 146th stayed put. A weekly-save probe of main found 136 frontless sector-turns that still had an own pool; only that front persisted.

`computeEmptySectorReliefReassignments` is now strictly additive. Sectors with no own pool are served first, exactly as before. Then a frontless sector with no eligible own reserve commits its own eligible rear brigade if it is still free (nearest, then id). It never borrows another sector's brigade, and donor eligibility is unchanged. It emits intent only; T2/T3 perform the march.

Measured in the cloud against main `4ff4a7665c0a35b5` (712/709/710/705):
- **v1:** rejected, guard breached.
- **v2** (`ace4e553a491aecb`, 712/711/708/701): superseded.
  - Its only early change (t4: frontless Ripac kept the 1st Drvar instead of fully empty Krupa getting it) diverged control.
  - It breached two tolerances (Oct95 −4; the cascade, gated at 49, 46). The canon seat caught that the first write-up named only one of them.
  - The historian seat rated its cell changes net less historical.
- **v3** (`3253da2f9a6d2502`), final: 712/709/710/705; 0 control cells differ; cascade 49/49; consistency 0; strict health PASS; guards intact; battles per week 0.00%.
  - Its only differing commander order in the whole campaign is t99: the 182nd marches from Fojnica Živčići and holds Rajčići t101-t188.
  - Brigade state differs: 30 formations at t188; RS 18 brigades destroyed against 16.
- **Pyrrhic gate** (canon, determinism, historian, war-or-game, integrator): GO WITH CONDITIONS. The conditions were the v3 baseline re-pin and disclosures, both done; what remains is rebase and re-bless.
- **Second case** (RF-AI2, #619): VRS 1st Krajina sector 0. A diagnostic run of v3 merged with #619's head shows it is a gap on the final turn only, t188. That front is new at t188 (redrawn by the Sana advance t185-187), and its only own brigade is a disrupted reserve.
  - No movement-authority relief issued at t188 can arrive by t188, and v3 does not borrow a sibling while the sector has an own pool.
  - Registered: SE7E-g (a disrupted-only pool blocks sibling relief) and SE7E-h (the validator's fresh-gap rule ignores fronts that did not exist on the previous turn).
- **Registered, not followed:**
  - SE7E-b: a dug-in reserve's sector march is rejected every turn and never released.
  - SE7E-c: the corps-wide `SIEGE_EXEMPT_CORPS` skip in `distributeBrigadesToFront`.
  - SE7E-d: a borrow order to a line holder is re-issued and dropped.
  - SE7E-e: a fully empty sector can still take a frontless neighbour's rear; an all-dug-in pool waits.
  - SE7E-f: some fully empty sectors flagged by the validator are not relieved.
- Report `docs/40_reports/implemented/20261114_SE7E_EMPTY_SECTOR_PROMOTION.md`; `MOVEMENT_AUTHORITY.md` §3; CALIBRATION_MASTER entry.
