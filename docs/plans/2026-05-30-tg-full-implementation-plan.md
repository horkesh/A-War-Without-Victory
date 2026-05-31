# TG Full-Implementation Plan — ADR-0005 to FULLY IMPLEMENTED

**Author:** technical-architect | **Date:** 2026-05-30 | **Branch:** `claude/tactical-groups-2026-05-28`
**Source of truth:** `docs/20_engineering/ADR/ADR-0005-tactical-groups-as-primary-ops-path.md`

## Target end-state (user-ratified scope)
Default-ON primary ops path for bots; **every offensive forms a TG**; full donor model (BFS distance-falloff, equipment donation, adjacent-corps donors, concurrency caps); brigades never attack independently.

**Locked design decisions (4-specialist panel + user ratification, 2026-05-30):**
1. **PERSISTENCE = HYBRID.** No new standing-TG entity (would break ADR-0006 + force schema v34→v35 + a calibration cliff). Standing TG identity = the **sector's `display_name`** ("TG Drina" / "Majevica OG"); the **ephemeral op-TG** carries the assault; a **NAMED TG COMMANDER** rides on top via a new `tactical_commander` officer rank + an **optional scalar `op.tg_commander_officer_id`** (omitEmpty-safe — **schema stays v34**).
2. **PLAYER COMMAND ALTITUDE = INTENT + "BACK THE OFFICER."** Player decides **commit / withhold / override** and **which named CO to back** when caps force a choice. Donor selection / BFS falloff / readiness are **INVISIBLE smart defaults** — **NO donor-portfolio micro screen** (it would be an optimization minigame fighting the negative-sum identity). **Reuse existing surfaces** (Warroom intent altitude, Army HQ briefing, Decision Room board, Command-Friction log, Operation AAR, Chronicle cards) — **do NOT build a new panel.**
3. **FACTION TEXTURE = MODEL THE ASYMMETRY.** VRS = **geographic OG names**; ARBiH = **numbered OGs that PROMOTE into permanent Divisions** (mirror 1st OG→21st Div — a real promotion mechanic); HVO = **operational zones**. Per-faction naming generators; CO = corps-deputy-grade named officer.
4. **SECTORS = A + B-LITE.** (A) ship ADR-0006's unimplemented `display_name?` on `CorpsFrontSector` (~50 LOC, zero calibration risk) so TG identity attaches to the emergent sector; (B-lite) make the anchor an **explicit priority seed** in `sector_territory.ts` so the TG→sector binding is deterministic (~30-60 LOC, flag-gated, **one calibration run**).

## Grounded current state (verified in worktree)
- `tactical_group_config.ts`: all six flags `false`. v34 scaffold ships; flag-off hash holds at `78e231e35b08cf53` (40w) / `940251e4acaff3d4` (188w) — **NOT byte-identical to pre-v34, but steady at the v34 baseline**.
- `tactical_group_selection.ts:174` `distance_hops: 0` hardcoded; `:176` `heavy_equipment_lent` all-zero. No BFS, no equipment donation.
- No enforcement of `MAX_CONCURRENT_TGS_PER_FACTION` / `MAX_TGS_PER_CORPS` / `ARMY_HQ_TG_CAP_REDUCTION` anywhere in `src/`.
- `effectivePersonnel` = a comment in `game_state.ts:871` + one use in `recruitment_engine.ts`. **No central helper, no cascade, no ESLint plugin.**
- No `op_kind_donor_policy`; `tg_participations` never written; `donor_corps_ids: []` empty (`triggered_operations.ts:1275`).
- Territory-revert sub-clause is a TODO at `attack_resolution_osid.ts:~935`.
- Farz-95 uses `arbih_7th_vitezka_muslim_liberation` as El-Mujahid stand-in (real El-Mujahid has no OOB id — flagged for OOB authors).
- No TG surface in `src/ui/` or `src/desktop/`.

Phases are strict dependency order. **FLAG-OFF-SAFE** = lands with no re-floor (hash stays `78e231e35b08cf53`). **FORCES-CALIBRATION** = owner-gated.

---

### Phase 0 — SAFETY (effectivePersonnel cascade + ESLint guard) — HARD PREREQUISITE — ✅ DONE (commit `9b9614c7`, byte-identity proven)
- **(a) Goal:** Single source of truth for usable manpower so lent personnel is never double-counted. Build the guard *before* any new read-site can leak. (A separate verification is settling whether double-counting exists today; this phase is required regardless — it is the structural fix and the regression net.)
- **(b) Owner:** systems-programmer (helper + invariant) + build-engineer (ESLint plugin/CI).
- **(c) Files:** new `src/state/effective_personnel.ts` (pure `effectivePersonnel(brigade) = personnel − sum(values(personnel_lent_by_tg))`); migrate ~40+ read-sites (sector defense, supply, recruitment, morale, displacement — see ADR §Test Surface) to the helper; new `eslint-plugin-awwv/` (`awwv/no-raw-brigade-personnel`, type-checked, `requireDisableReason`); `package.json` (`lint:tg` script); CI smoke triad config; new `tests/tg_effective_personnel_invariant.test.ts`.
- **(d) Proof:** invariant test walks all `.personnel` reads and asserts parity with `effectivePersonnel`; `npm run lint:tg` zero unwhitelisted hits; full `tsc` + vitest green.
- **(e) Deps:** none — FIRST. Blocks all behavioral phases.
- **(f) Stop-gates:** ESLint rule must fail-build on a seeded violation before merge; any read-site that cannot mechanically migrate is escalated, not silently disabled. **FLAG-OFF-SAFE** (helper returns `personnel` when no loans; loans only exist under flags). **STATUS: shipped at commit `9b9614c7` with byte-identity proven against the v34 baseline.**

### Phase 1 — FIDELITY (full donor model) — 🔄 IN PROGRESS
- **(a) Goal:** Replace placeholders with the ratified model: BFS distance-falloff, equipment donation, adjacent-corps donor rule, concurrency-cap + Army-HQ-cap enforcement.
- **(b) Owner:** operations-expert (lead) + corps-army-commander (adjacency/caps) + determinism-auditor (BFS freeze).
- **(c) Files:** `tactical_group_selection.ts` (real `bfsDistance(donor→staging)`; `distance_hops` set once + frozen; `donation_factor`/`donation_cap`; equipment falloff ×0.5; populate `heavy_equipment_lent`); new constants in `tactical_group_config.ts` (`MAX_OG_DONOR_DISTANCE=6`, `MAX_CONCURRENT_TGS_PER_FACTION=4`, `MAX_TGS_PER_CORPS=2`, `ARMY_HQ_TG_CAP_REDUCTION=2`, `MIN_BRIGADE_PERSONNEL_AFTER_DONATION` by kind); `corps_command_meta.corpsAdjacency` cache (per-turn, sector-boundary refresh) + adjacent-corps filter in `selectDonors`; cap-enforcement at TG formation; combat synthesis to consume donated equipment.
- **(d) Proof:** extend `tg_invariants.test.ts` (cap enforcement, adjacency filter, distance ceiling); determinism assertions for BFS-frozen + `(distance_hops asc, corps_id, brigade_id)` sort; flag-off byte-identity at `78e231e35b08cf53`.
- **(e) Deps:** Phase 0.
- **(f) Stop-gates:** BFS computed once-per-TG and frozen (no per-turn recompute → graph drift). **FLAG-OFF-SAFE** (all gated by `ENABLE_TG_FORMATION`/`_COMBAT_SYNTHESIS`); behavioral effect deferred to Phase 6 activation.

### Phase 2 — ROUTING (every offensive forms a TG)
- **(a) Goal:** All offensives (pre-planned, triggered, bot emergency, probes) route through the anchor+donor pipeline; introduce `op_kind_donor_policy`.
- **(b) Owner:** operations-expert + gameplay-programmer.
- **(c) Files:** `bot_corps_operations.ts` (`buildEmergencyDefenseOperation`/`buildProbeOperation` set `anchor_brigade_id` + `selectDonors`); `pre_planned_operations.ts` / `triggered_operations.ts` (uniform anchor assignment); add `op_kind_donor_policy: 'full'|'limited'|'none'` to `CorpsOperation` (full=offensives, limited=emergency [max 2 donors, ×0.5 bleed], none=probes); `sector_offensive*.ts` readiness gate consistency.
- **(d) Proof:** new `tests/tg_routing.test.ts` — every offensive op-kind yields a TG; probe yields anchor-only; emergency caps at 2 donors. Flag-off byte-identity preserved.
- **(e) Deps:** Phase 1 (`selectDonors` complete).
- **(f) Stop-gates:** probes must stay `none` (low-commitment by design). **FLAG-OFF-SAFE**.

### Phase 3 — IDENTITY + COMMAND + FUN (the heart of the design)
This is the phase that turns the donor-model plumbing into a *game*: emergent sectors gain standing names, named commanders carry the assaults, factions feel different, and the player commands at the **intent** altitude by **backing officers** — all reusing existing surfaces. Split into **3A (engine: identity + CO)** and **3B (UI: surfacing on existing surfaces)**. **Schema stays v34 throughout** (the CO link is an optional scalar; the sector label is a display field).

#### Phase 3A — ENGINE: SECTOR IDENTITY + NAMED TG COMMANDER + FACTION ASYMMETRY
- **(a) Goal:** (1) Ship ADR-0006's unimplemented sector `display_name?` (decision **A**) so standing TG identity attaches to the emergent sector. (2) Make the anchor an explicit **priority seed** in sector growth (decision **B-lite**) so the TG→sector binding is deterministic. (3) Introduce a `tactical_commander` officer rank + optional scalar `op.tg_commander_officer_id`, and feed the TG-CO's competence/aggression into an **anchor combat-mod**. (4) Per-faction naming generators + the **ARBiH OG→Division promotion** mechanic.
- **(b) Owner:** sector-expert (lead, sectors A + B-lite) + gameplay-programmer (officer rank + CO link + anchor mod) + corps-army-commander (CO grade/derivation, promotion eligibility) + determinism-auditor (seed-priority freeze, naming determinism) + game-designer (promotion + asymmetry intent) + historian (faction-authentic OG/division/zone names).
- **(c) Files:**
  - **A — sector display_name:** `corps_front_sectors.ts` (add `display_name?: string` to `CorpsFrontSector`, omitEmpty-safe); label-emit so map/AAR can read it. ~50 LOC, **zero calibration risk** (pure display field).
  - **B-lite — anchor seed-priority:** `sector_territory.ts` (anchor OSID enters sector growth as an explicit high-priority seed so the assault sector forms around the anchor deterministically). ~30-60 LOC, **flag-gated** behind a TG flag, **one calibration run**.
  - **CO rank + link:** `game_state.ts` / officer model (new `tactical_commander` rank, corps-deputy grade); `CorpsOperation` gains optional `tg_commander_officer_id?: string` (scalar, omitEmpty-safe — **no schema bump**); `tactical_group_selection.ts` / `tactical_group_lifecycle.ts` assign/derive the CO when a TG forms.
  - **anchor combat-mod:** combat synthesis at the anchor consumes TG-CO competence/aggression as a bounded modifier (deterministic, gated by `ENABLE_TG_COMBAT_SYNTHESIS`).
  - **faction naming + promotion:** new per-faction naming generator (`tactical_group_naming.ts` or sim helper): VRS geographic OG names, ARBiH numbered OGs, HVO operational zones; **ARBiH OG→Division promotion** mechanic (eligibility + state transition mirroring 1st OG→21st Div) in the formation/lifecycle layer; sets the sector `display_name`.
- **(d) Proof:** unit tests for deterministic naming (same inputs → same name), CO assignment + anchor-mod bounds, OG→Division promotion eligibility/transition; `display_name` round-trips through save/load; B-lite seed-priority determinism (BFS/growth frozen). Flag-off byte-identity at the v34 baseline; B-lite seed-priority gets **one owner-gated calibration run** when its flag flips (tracked to Phase 6, not landed hot).
- **(e) Deps:** Phases 1-2 (donor model + routing produce the op-TGs that carry CO + bind to sectors).
- **(f) Stop-gates:** sector `display_name` must stay pure-display (no growth influence) — growth determinism owned solely by B-lite seed-priority; naming + CO derivation must be deterministic (no `Math.random`); promotion must be a real state transition, not a cosmetic relabel; CO link stays an optional scalar (**schema must NOT leave v34**). **FLAG-OFF-SAFE** for A + CO + naming + promotion (all omitEmpty / gated); **B-lite seed-priority FORCES one calibration run** at its flag flip (Phase 6).

#### Phase 3B — UI: SURFACE COMMAND ON EXISTING SURFACES ("back the officer")
- **(a) Goal:** Player commands at the **intent** altitude — **commit / withhold / override**, and **which named CO to back** when caps force a choice — with donor/BFS/readiness as invisible smart defaults. **NO new panel, NO donor-portfolio micro screen.** Reuse existing surfaces only.
- **(b) Owner:** ui-ux-developer (MANDATORY pre-build consult — confirm reuse-not-rebuild) + gameplay-programmer (intent plumbing / IPC) + narrative-designer (named-CO prose for AAR / Chronicle / Command-Friction).
- **(c) Files:**
  - **intent altitude (reuse):** Warroom intent altitude + Army HQ briefing + Decision Room board surface the **commit/withhold/override** decision and the **"back which named CO"** choice when `MAX_CONCURRENT_TGS`/`MAX_TGS_PER_CORPS` force a trade-off; route player intent → engine via existing IPC (extend, don't add a new TG panel).
  - **surfacing named COs + lineage (reuse):** Operation AAR + Chronicle cards + Command-Friction log read the TG `display_name` + `tg_commander_officer_id` + `tg_participations` lineage so the player *sees* "TG Drina under [CO]" and the friction of a withheld/overridden op.
  - **state plumbing:** write `tg_participations` records on dissolution (`tactical_group_lifecycle.ts`); populate `donor_corps_ids` (fix `triggered_operations.ts:1275`); AAR/history reads `tg_attributions` sidecar; surfaces consume sector `display_name` (ADR-0006, from 3A).
- **(d) Proof:** integration-tester round-trip (player backs a CO / withholds → engine respects intent → AAR + Chronicle show named CO + lineage → save/load survives); `tg_participations` non-empty post-op; Playwright screenshots prove **existing** surfaces (Warroom / Army HQ / Decision Room / AAR / Chronicle / Command-Friction) carry the new info — **and that no new TG panel was added.**
- **(e) Deps:** Phase 3A (sector `display_name`, CO link, naming all feed the surfaces).
- **(f) Stop-gates:** **NO new panel and NO donor micro-screen** (ui-ux-developer signs off on reuse); player intent flows Army→Corps→Sector only (no per-brigade attack order); donor selection stays an invisible default (never a player optimization screen). **FLAG-OFF-SAFE** (surfaces inert when flags off; history/CO fields omitEmpty-safe).

### Phase 4 — MIGRATION RECONCILIATION (degenerate TGs + OOB holes)
- **(a) Goal:** Resolve the 4 hand-review ops + the Farz-95 OOB hole + the territory-revert TODO so no degenerate/zombie TG forms.
- **(b) Owner:** operations-expert + formation-expert (OOB) + scenario-creator-runner-tester (validation).
- **(c) Files:** `triggered_operations.ts` / `pre_planned_operations.ts` (Op Podrinje Sweep anchor → `rs_5th_podrinje`; sequence/split bratunac dual-anchor `rs_1st_bratunac` to satisfy Hard-Inv #1; Op Višegrad replace JNA-phantom donors with VRS sister-sector or accept anchor-only; Op Prsten stays legacy until validated then VRS anchor backfill); OOB data for El-Mujahid stand-in (`formation-expert` decides real id vs accept stand-in); resolve territory-revert sub-clause at `attack_resolution_osid.ts:~935` (held OSID → contested unless 1-hop friendly non-TG present).
- **(d) Proof:** `tg_invariants.test.ts` Hard-Inv #1 (no shared anchor) + #6 (anchor-death → revert) green; flag-on smoke shows no phantom-anchor TGs.
- **(e) Deps:** Phases 1-2.
- **(f) Stop-gates:** op-definition edits are canon-adjacent — `tools/migrate_ops_to_tg.ts` emits a diff for operations-expert review, **no auto-apply**. **FLAG-OFF-SAFE** (op defs only bind under flag-on launch).

### Phase 5 — DETERMINISM / SCHEMA FREEZE
- **(a) Goal:** Lock determinism contract and schema before activation.
- **(b) Owner:** determinism-auditor + technical-architect.
- **(c) Files:** new `tests/tg_determinism.test.ts` (flag-ON save round-trip: donor-sort order, casualty pro-rata largest-remainder, BFS-frozen, B-lite seed-priority frozen, naming + CO-derivation deterministic, Record iteration via `sortedKeysForRecord`); confirm/freeze schema **v34** (ADR text drifts v19↔v34 — pin v34, the current value; **the hybrid-persistence decision keeps schema at v34: the TG-CO link is an optional scalar `op.tg_commander_officer_id` and the sector identity is a `display_name` field — NO v35 entity**); document one-way migration contract (no v34→pre-v34 downgrade — personnel ledger has no prior representation) in migration file + ADR ledger note.
- **(d) Proof:** flag-on round-trip hash-stable across serialize→deserialize→serialize; flag-off still `78e231e35b08cf53`/`940251e4acaff3d4`.
- **(e) Deps:** Phases 0-4 (all schema-touching work landed, incl. Phase 3A identity/CO + 3B surfaces).
- **(f) Stop-gates:** any nondeterminism (Math.random/Date.now/unsorted Record/unfrozen seed-priority or naming) blocks; schema must read **v34** (no v35). **FLAG-OFF-SAFE**.

### Phase 6 — ACTIVATION (LAST, owner-gated) — FORCES CALIBRATION
- **(a) Goal:** Flip flags to default-ON and re-floor baselines, **one flag at a time**.
- **(b) Owner:** orchestrator dispatches /scenario-creator-runner-tester per flag; **owner** signs UPDATE_BASELINES; war-or-game realism pass on the 188w HRHB −24 swing **and an HRHB-texture pass on the operational-zone naming**.
- **(c) Files:** `tactical_group_config.ts` (one flag flip per run, in sub-stage order: B-lite **sector anchor seed-priority flag** → `ENABLE_TG_FORMATION` → `_COMBAT_SYNTHESIS` → `_COHESION_BLEED` → `ENABLE_TACTICAL_GROUPS` umbrella → `ENABLE_TG_ARMY_HQ_OPS` → `ENABLE_TG_RECOVERY_SUPPRESSION`); baseline files post-sign-off only. **The B-lite seed-priority flip is its own dedicated calibration run** (it changes deterministic sector growth around anchors — the one Phase-3A behavioral lever that is NOT flag-off-safe).
- **(d) Proof per flag:** flip ONE flag → 40w → 188w → /scenario-creator-runner-tester GO (anchors ≥26/27, benchmarks 6/6, count within band) → war-or-game realism pass on combat-synthesis HRHB −24 swing → owner UPDATE_BASELINES. Never bundle. The B-lite seed-priority flag gets the same single-flag treatment first (sector-growth delta isolated).
- **(e) Deps:** Phases 0-5 ALL green.
- **(f) Stop-gates:** **owner-gated baselines**; **one-change-per-run sacred rule**; HRHB −24 must pass realism (a real commander's plausibility) before the new baseline locks. **FORCES CALIBRATION — every step (incl. the B-lite seed-priority flip).**

---

## Critical path & calibration map
**Critical path (strict order):** Phase 0 ✅ → Phase 1 (donor fidelity) 🔄 → Phase 2 (routing) → **Phase 3A (engine identity + CO + faction asymmetry)** → Phase 3B (UI surfacing) → Phase 4 (migration recon) → Phase 5 (determinism/schema freeze) → Phase 6 (activation).

**Flag-off-safe (land with NO re-floor; hash stays at v34 baseline):** Phase 0 (done), Phase 1, Phase 2, **Phase 3A except B-lite** (sector `display_name`, `tactical_commander` rank, `tg_commander_officer_id` scalar, anchor combat-mod [gated], faction naming, OG→Division promotion), Phase 3B (UI inert when flags off), Phase 4, Phase 5.

**Calibration-forcing (owner-gated runs):**
- **Phase 3A B-lite anchor seed-priority** — ONE dedicated calibration run (changes deterministic sector growth around the anchor). Flag-gated; tracked to Phase 6 for its flip.
- **Phase 6 activation** — full per-flag re-floor (every flag flip is a calibration run), plus the war-or-game HRHB −24 realism pass and HRHB operational-zone-naming texture pass.

Everything else ships flag-off-safe. The only behavioral levers that move calibration are the B-lite seed-priority flip and the Phase 6 flag activations — each isolated to its own owner-gated single-change run.

## Risk summary
The dominant risk is the **effectivePersonnel cascade** (~40+ silent read-sites): a single missed migration double-counts lent manpower and corrupts every downstream system — mitigated by making the type-checked ESLint guard + invariant test the literal first deliverable. Secondary risk is the **v2.2 combat-synthesis calibration cascade** (late-war ops flip "fires-and-fails" → "fires-and-fights", projected 188w RS +21/RBiH +3/**HRHB −24**); this is isolated to one flag flip and gated behind a war-or-game realism pass plus owner baseline sign-off. Schema is the lowest risk (**the hybrid-persistence decision keeps it at v34** — no new standing-TG entity; the CO link is an optional scalar and the sector identity is a `display_name` field, both omitEmpty-safe and one-way). A third, smaller cascade is the **B-lite anchor seed-priority** (deterministic sector growth shifts around anchors) — isolated to one flag-gated calibration run, not a hot landing. Faction asymmetry (VRS has more donor candidates) may need per-faction cap tuning post-activation. **Phases 0-5 are FLAG-OFF-SAFE and land without a re-floor — except the Phase-3A B-lite seed-priority flip and all of Phase 6, which force owner-gated calibration runs.** The product risk the panel guarded against — a donor-portfolio optimization minigame fighting the negative-sum identity — is closed by Decision 2: command stays at the intent/"back the officer" altitude on existing surfaces, with donor/BFS/readiness as invisible defaults and NO new panel.

## What needs user/owner sign-off
0. **(RATIFIED 2026-05-30)** The four locked design decisions (hybrid persistence / intent+back-the-officer command / faction asymmetry+ARBiH promotion / sectors A+B-lite) are panel-decided and user-ratified — no longer open questions; listed here for traceability.
1. **Every Phase-6 baseline re-floor** (UPDATE_BASELINES) — owner-gated, one flag per run, **including the B-lite anchor seed-priority flip** (its own dedicated run).
2. **HRHB −24 realism verdict** — war-or-game pass must be accepted before locking the combat-synthesis baseline (plus the HRHB operational-zone-naming texture pass).
3. **El-Mujahid OOB hole** (Farz-95) — owner decides: author a real El-Mujahid OOB id, or ratify the `arbih_7th_vitezka_muslim_liberation` stand-in.
4. **Op-definition anchor edits** (Podrinje/Višegrad/Prsten/bratunac) — canon-adjacent; operations-expert reviews the migration diff, owner ratifies before apply.
5. **Default-ON decision** — flipping the umbrella `ENABLE_TACTICAL_GROUPS` to default-true is the point of no return (one-way schema, new baseline becomes canonical).
