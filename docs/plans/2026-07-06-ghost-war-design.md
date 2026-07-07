# The Ghost War — playing against history itself

**Date:** 2026-07-06
**Status:** IDENTIFIED + FEASIBILITY-VERIFIED + SEED SHIPPED (extractor tool + tests). Player-facing surfaces are design-gated (Pyrrhic panel: game-designer + historian + §6 review on copy) — see §6.
**Origin:** Owner directive 2026-07-06 ("find something that might revolutionize the genre; identify it first").

---

## 1. The identification

Racing games have had ghost laps for thirty years: you drive against a recording of a real lap, and the delta is visible every second. **No strategy game has ever had a ghost war** — because no strategy engine has ever been able to produce one. A ghost war requires an engine that (a) deterministically reproduces a real historical war at map granularity, and (b) lets a player diverge from it under identical rules. Paradox games have neither: their "history" is scripted flavor, and their sandbox diverges from tuned abstractions, not from a calibrated reconstruction.

AWWV has both, and has had both for months, as a **calibration instrument that was never turned around to face the player**:

- The engine reproduces the 1992–95 war to 91%+ settlement-level endpoint fidelity with 30/30 dated anchors, deterministically, CI-pinned by a structural fingerprint.
- The player's emergent war runs under the exact same rules.

That means: **at any week of the player's war, the engine knows — settlement by settlement, casualty curve by casualty curve — what the real war looked like at that same week.** The comparison is engine-truth, not authored text.

This is the mechanic:

> **The Ghost War**: a compact, shipped artifact of the historical run's weekly trajectory (712 OSIDs × 188 weeks + weekly cost aggregates). As the player's war passes week N, the game can show — retrospectively, never predictively — how their Bosnia diverges from the Bosnia that was: which towns hold that history lost, which fell that history held, how many more or fewer are dead, displaced, exhausted.

It lands exactly on the game's thesis. "A war without victory" currently pays off at the verdict screen; the Ghost War makes it a **weekly lived experience**: you cannot win, but every week you can see whether your war is crueler or kinder than the real one — and the game's central question ("author a better tragedy, or a worse one") becomes measurable without ever becoming a score.

What exists today vs. this:
- `src/ui/map/data/distanceFromHistory.ts` — decision-level divergence only ("6/13 choices diverged"); its own header names the constraint: *"the cheapest, most direct divergence signal available **with no new reference data**."*
- `src/sim/endgame/endgame_comparison.ts` — endpoint-only aggregate scalars (duration, territory %, casualty ratio, milestones).
- Nothing compares **trajectories**, and nothing compares **the map**. The reference data the first file wished for has existed all along in the calibration harness.

## 2. Feasibility — verified receipts (2026-07-06, current `main`)

Every link in the chain was verified by reading code and live run artifacts:

1. **The historical run is deterministic and reproducible.** Structural fingerprint CI gate; `decision_mode: historical`; bots take historical defaults. (CALIBRATION_MASTER, `.github/workflows`, memory of record.)
2. **The weekly trajectory is emittable today, zero engine changes.** `run_scenario.ts` `--video` flag → `scenario_runner.ts:1974` forces `effectiveEmitEvery ≥ 1` → `scenario_runner.ts:2778-2795` writes `save_w<N>.json` full-state frames every week (plus `replay_timeline.json`).
3. **Per-settlement control is canonical and OSID-keyed in every frame.** `state.political.political_controllers: Record<SettlementId, FactionId|null>` (`game_state.ts:2885`, Engine Invariants §9.1 "no duplicate storage"); verified on a live run dir: exactly **712 OSID entries** (`runs/apr1992_definitive_40w__…_w2_n38/initial_save.json`). Also present: `initial_political_controllers` (`game_state.ts:2887`).
4. **Weekly aggregates already stream.** `weekly_report.jsonl` rows carry `control_counts`, `battles`, `settlement_displacement_total`, `municipality_displacement_total`, `control_change_attribution` (counts-only — which is WHY frames are needed for the per-OSID map; verified live: week-1 row shows `{combat: 11, total_changes: 11}` with no OSID list).
5. **Endpoint artifacts cannot substitute.** `control_delta.json` flips carry no week (`scenario_end_report.ts:80-95`) — endpoint diff only. The frame-diff approach is the correct and only zero-engine-change path.
6. **The UI consumption pattern is proven calibration-inert.** `distanceFromHistory.ts` already statically imports build-time JSON (event catalogs) into a pure read-model; the repo's own lesson of record: *UI-only import ⇒ off the artifact path ⇒ byte-identical baselines.*

Artifact size sanity: 712 controllers + a few thousand dated flips + 188 weekly aggregate rows ≈ 100–400 KB JSON. Shippable as a bundled asset.

## 3. The shipped seed (this change)

`tools/build_historical_shadow.cjs` — deterministic extractor:
- Input: any scenario run directory (`initial_save.json`, `save_w*.json` frames, `weekly_report.jsonl`, `run_summary.json`).
- Output: `historical_shadow.json` **written into the run dir** (a diagnostics artifact, deliberately NOT `data/derived/` — see §5 promotion gate): `{schema_version, kind, source{scenario_id, weeks, final_state_hash}, granularity, start{controllers}, flips[{week, osid, from, to}], weekly[{week, control_counts, displaced_total, battle_count}]}`.
- Pure: no timestamps, no randomness, stable key-sorted serialization; degrades honestly (`granularity: weekly | sparse | endpoint`) when frames are absent.
- Tested: `tests/build_historical_shadow.test.ts` (synthetic run-dir fixtures: flip derivation, gap handling, determinism byte-equality, endpoint fallback) + end-to-end proof against a real `--video` run.

Generation of the canonical ghost (one command): run the definitive 188w historical scenario with `--video`, then the extractor. Anyone can regenerate it byte-identically — determinism is the provenance.

**FIRST CANONICAL GHOST COMPUTED (2026-07-07, local):** full 188w `--video` run of `apr1992_definitive_188w` (`final_state_hash edc08a7e12d9377a`, endpoint fit 611/712 ≥ the 609 floor of record) extracted to `historical_shadow.json` — **712 OSIDs, 217 dated control flips, 188 weekly rows, granularity `weekly`, 55 KB**. The flip distribution IS the war's historiography: **1992: 121 flips** (takeover storm) · **1993: 11** (the positional year) · **1994: 26** · **1995: 59** (endgame avalanche), closing at Sanski Most / Bosanski Petrovac / Drvar in weeks 186–188 — Operation Sana, as it happened. Artifact lives in the run dir (`runs/apr1992_definitive_188w__acb538b04d79af3c__w188_n39/`); the heavy frames were deleted after extraction (~2.2 GB reclaimed). Promotion to `data/derived/` remains gated on §5.5. NOTE: a shipped ghost must be regenerated on release hardware from the blessed floor commit — this local artifact is the proof-of-existence, not yet the blessed asset.

## 4. Player-facing surfaces (design-gated, build order)

All retrospective-only: ghost data for week N is revealed only once the player's war has passed week N. The ghost is a **mirror, not an oracle** — it must never leak future intelligence ("history says the offensive comes next week") into play. It is an extradiegetic layer in the Codex/Chronicle family, not a war-room intel product; the president's staff never cites it.

- **GW-1 Shadow Ledger** (Chronicle/Records card): running cumulative comparison to date — killed, displaced, settlements changed hands — your war vs. the war that was. One row, two columns, one delta. No grade, no score.
- **GW-2 Ghost map mode** (tactical map, one new mode): at current week, tint each OSID by divergence class — *holds-where-history-lost* / *lost-where-history-held* / *matches history*. The existing map-mode registry and overlay patterns carry it.
- **GW-3 Chronicle shadow beats**: on weeks where the ghost has an anchor-grade event (the ~30 dated anchors + event-owned receipts), a quiet entry: "This week, in the war that was: Jajce fell. In your war it holds." Gap-filling discipline applies (never displace real entries).
- **GW-4 Verdict/Wrapped depth**: the endgame comparison upgrades from endpoint scalars to trajectory charts (`TerritoryOverTimeChart` gains a ghost line).

## 5. Guardrails (these are the design, not caveats)

1. **Honesty about what the ghost is.** The ghost is the engine's calibrated reconstruction, not archival truth. Map-level shading is presented as reconstruction ("the war as this engine reconstructs it — see Codex"); only the ~30 dated anchors and event-owned receipts (Srebrenica, Žepa, milestones) may be voiced as historical fact. This is the direct answer to the repo's own genre audit: "UI implies clarity the war did not have" — the ghost must not imply mid-war archival precision the calibration never claimed. A Codex essay explains the instrument.
2. **§6 is absolute.** Atrocity divergence is never rewarded, scored, or celebrated. "Srebrenica did not fall in your war" renders through the existing rupture/§6-vetted framing (facts and costs, no praise arithmetic); Srebrenica/Žepa remain event-owned receipts. Any GW-3 copy touching §6 events goes through the Pyrrhic panel (historian + game-designer + §6 red-team) before shipping.
3. **Mirror, not oracle.** Retrospective reveal only, enforced in the read-model (`week <= currentWeek`), test-pinned.
4. **Calibration inertness.** UI consumes the artifact via static import only; no sim/scenario import may touch it. The artifact itself is generated OUTSIDE the engine from run outputs.
5. **Promotion gate.** Committing the canonical ghost under `data/derived/` and wiring the generator into the data pipeline REQUIRES the data-pipeline-engineer consultation (CLAUDE.md mandatory) + a provenance stanza in the artifact (source scenario id, weeks, final_state_hash, generator schema_version) + regeneration instructions. Until then the extractor writes only into run dirs.
6. **Ghost staleness discipline.** The ghost must be regenerated whenever the blessed historical floor moves (re-floor ⇒ re-ghost); the artifact's embedded `final_state_hash` makes staleness machine-checkable against the current baseline of record — a mismatch is a CI-visible fact, not a silent lie.

## 6. Why this is the revolution and not a feature

Every strategy game asks "can you do better?" against an abstraction: a score, an AI, a victory condition. This game can ask it against **the real war, at the granularity of individual towns and weeks, under identical rules** — and its subject is precisely a war whose only meaningful question is "did it have to be this bad?" The Ghost War turns the engine's most expensive achievement (historical calibration, ~two years of work) into the player's central experience, makes the negative-sum thesis legible every single week, and cannot be copied by any existing engine without first doing what this repo already did. That is a genre capability, not a genre feature.

## 7. Receipts index

| Claim | Where verified |
|---|---|
| `--video` weekly frames | `tools/scenario_runner/run_scenario.ts:72-73`, `src/scenario/scenario_runner.ts:1974, 2778-2795` |
| OSID-keyed canonical control | `src/state/game_state.ts:2885-2887`; live: 712 entries in `runs/...w2_n38/initial_save.json` |
| control_delta endpoint-only | `src/scenario/scenario_end_report.ts:80-134` |
| weekly_report fields | live row: `runs/...w2_n38/weekly_report.jsonl` (control_counts, battles, displacement, attribution counts-only) |
| decision-divergence ceiling | `src/ui/map/data/distanceFromHistory.ts:1-27` ("no new reference data") |
| endpoint comparison ceiling | `src/sim/endgame/endgame_comparison.ts:37-52` |
| UI static-import inertness | `distanceFromHistory.ts:31-43` pattern + calibration lesson of record |
