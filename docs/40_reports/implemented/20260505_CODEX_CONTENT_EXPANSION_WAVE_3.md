# LANE-NIGHTSHIFT-CODEX-CONTENT-EXPANSION-WAVE-3 — Closeout

**Date:** 2026-05-05
**Type:** Content-only ghost-entry expansion. v0.9.1 Dynamic Codex content advance.
**Status:** SHIPPED.
**Predecessor:** `0ec2c28a feat(codex): ghost entry content expansion Wave 2 — 8 more counterfactual essays`.

## Outcome

6 NEW ghost entries (counterfactual / divergence-note essays) authored as Wave 3 of the Mission E ghost-entry pattern. Pure content lane — no substrate touched. No new observer flags. No builder edits. No event_types touched. Test is filesystem-only (static markdown reads).

Total Codex ghost entries after this lane: **20** (6 Mission E + 8 Wave 2 + 6 Wave 3).

## Phase 1 inventory (existing ghost entries)

Pre-lane catalogue at `data/codex/ghost_entries/` — 14 entries:

| # | id | source wave |
|---|---|---|
| 1 | alliance_held | Mission E |
| 2 | cleansing_refused | Mission E |
| 3 | early_peace_accepted | Mission E |
| 4 | enclave_defended | Mission E (AUDIT-ONLY) |
| 5 | force_quality_inversion | Mission E |
| 6 | patron_resisted | Mission E |
| 7 | paramilitary_streak_refused | Wave 2 |
| 8 | winter_held | Wave 2 |
| 9 | corridor_blocked | Wave 2 |
| 10 | doctrine_reform_completed | Wave 2 |
| 11 | arms_embargo_full_compliance | Wave 2 |
| 12 | political_unity_held | Wave 2 |
| 13 | equipment_quality_collapse | Wave 2 |
| 14 | negotiation_capital_exhausted | Wave 2 |

Canonical structural shape inferred from sampled entries (`winter_held`, `paramilitary_streak_refused`, `political_unity_held`, `corridor_blocked`, `arms_embargo_full_compliance`, `equipment_quality_collapse`):

1. Top-level `# Title` heading (declarative, identifies the divergence).
2. Ring 2 marker line: `**Ring 2 — narrative observation. <variant>. Ghost entry.**`.
3. Body: ~150–300 words with three structural moves —
   - **historical anchor** (BB I/II chapters + ICTY case identifiers + paragraph IDs where used);
   - **divergence rationale** (what the run's audit reading shows for the player faction track at the audit turn);
   - **AUDIT-ONLY disclaimer** (this entry does not displace canonical Codex / Tribunal findings).

Gap analysis identified room for 6 new counterfactuals from the Wave-3 prompt's themes:

- **Faction-symmetric streak counters** — `ceasefire_held`, `mediator_trust`, `rear_pocket_sustained` had no ghost-essay coverage.
- **Civilian/refugee dimension** — no displacement counterfactual existed.
- **Recovery counterparts** — Wave 2 authored `equipment_quality_collapse` and `negotiation_capital_exhausted` but no symmetric recovery essays.

## Wave 3 entries authored (Ring 2, AUDIT-ONLY framing, ICTY/BB-cited)

1. `ceasefire_streak_held.md` — sustained ceasefire counterfactual; Galić / Dragomir Milošević anchors; Vance–Owen / Owen–Stoltenberg / Dayton sequence.
2. `mediator_trust_sustained.md` — mediator-trust streak counterfactual; Carrington / Vance / Owen / Holbrooke / Contact Group sequence.
3. `rear_pocket_sustained.md` — rear-area discipline streak counterfactual; Tadić / Stakić / Prlić / Lukić & Lukić / Stanišić & Simatović anchors.
4. `civilian_displacement_contained.md` — civilian/refugee dimension counterfactual; UNHCR registration record + Krajišnik / Prijedor anchors + Annex 7.
5. `equipment_quality_recovered.md` — equipment-quality recovery counterfactual (complement to Wave 2 collapse); Perišić / Personnel Centre / Washington Agreement anchors.
6. `negotiation_capital_recovered.md` — negotiation-capital recovery counterfactual (complement to Wave 2 exhaustion); Karadžić / Prlić / Vance–Owen → Dayton phase sequence.

Per-entry record:

| id | length (chars) | primary anchors | observer concept |
|---|---|---|---|
| ceasefire_streak_held | ~1900 | Galić IT-98-29-T, Dragomir Milošević IT-98-29/1-T, BB II Ch.31/41/51 | ceasefire-held streak |
| mediator_trust_sustained | ~1800 | Carrington, Vance–Owen, Owen–Stoltenberg, Contact Group, Holbrooke / BB II Ch.31/51 | mediator-trust streak |
| rear_pocket_sustained | ~2000 | Tadić IT-94-1-T, Stakić IT-97-24-T, Prlić IT-04-74-T, Karadžić IT-95-5/18-T / BB II Ch.31/41 | rear-pocket discipline streak |
| civilian_displacement_contained | ~1900 | UNHCR, Krajišnik IT-00-39-T, Annex 7 / BB I Ch.16-18, BB II Ch.31-41 | displacement audit counter |
| equipment_quality_recovered | ~1900 | Perišić IT-04-81-T, Washington Agreement / BB II Ch.51 | equipment-quality audit reading |
| negotiation_capital_recovered | ~2000 | Karadžić IT-95-5/18-T, Prlić IT-04-74-T / BB II Ch.31/51 | negotiation-capital audit reading |

## Verification

- `npx vitest run tests/codex_ghost_entries_wave_3.test.ts` — **38/38 PASS** (8 describe-blocks; per-entry `it.each` expansion produces 38 total it-blocks, well above the ≥6 floor in the lane spec).
- `npx tsc --noEmit -p tsconfig.json` — clean against this lane's files. Pre-existing tsc errors in `tests/divergence_events_wave_16.test.ts` belong to the sibling Wave 16 events lane (different file ownership; not touched by this lane).
- `git show --stat HEAD` after commit — verifies only declared files changed.

## Sensitive-history compliance

- **Ring 1 / Ring 2 only**: All 6 entries are Ring 2 narrative observations. AUDIT-ONLY framing in body text + Ring 2 marker in heading. No Ring 3 surface.
- **No §6 sign-off chain**: No rupture-flip claims. No `enclave_resilience` references. No genocide-non-occurrence framing. No score-inversion. No atrocity-as-tactic essays. Test W7 enforces this with explicit token bans.
- **Faction-agnostic mechanism**: The divergence flag concept is symmetric across the three principal forces. Historical anchors cite specific factions where the canonical record requires it (e.g. Perišić–Personnel Centre cites the patron-supply mechanism by name, as Wave 2 did) — the prose mechanism (audit-reading divergence on the player faction's track) remains faction-agnostic.
- **ICTY-grounded**: All historical claims cite either an ICTY case identifier with paragraph anchors as appropriate, a BB I/II chapter, or both. No new historical claims; all anchors track Wave 1/2 conventions.
- **No new observer flags**: Substrate-then-content rule honoured. The observer-flag concepts referenced in the prose (ceasefire-held, mediator-trust, rear-pocket-sustained, displacement-counter, equipment-quality-audit, negotiation-capital-audit) are wired (or will be wired) in `consequences.ts` substrate work — never declared in this content lane.
- **No `political_controllers` / `OOB` / `paint anchor` / FORAWWV touch**.

## Files committed

- `data/codex/ghost_entries/ceasefire_streak_held.md` (NEW)
- `data/codex/ghost_entries/mediator_trust_sustained.md` (NEW)
- `data/codex/ghost_entries/rear_pocket_sustained.md` (NEW)
- `data/codex/ghost_entries/civilian_displacement_contained.md` (NEW)
- `data/codex/ghost_entries/equipment_quality_recovered.md` (NEW)
- `data/codex/ghost_entries/negotiation_capital_recovered.md` (NEW)
- `tests/codex_ghost_entries_wave_3.test.ts` (NEW)
- `docs/40_reports/implemented/20260505_CODEX_CONTENT_EXPANSION_WAVE_3.md` (NEW; this file)

## Sibling lane note

Wave 16 events lane operates on `data/scenarios/events/consequences.json` only — different files; collision impossible. Pathspec form used at commit to enforce isolation.

## Successor handoff

v0.9.1 Dynamic Codex ghost-entry content corpus now stands at **20 entries**. Next content-expansion wave can pick up:

- Recovery counterparts for the remaining Wave 2 collapse-style entries (`paramilitary_streak_refused` already paired by `cleansing_refused` symmetry; `winter_held` already a hold-style entry; `corridor_blocked` and `doctrine_reform_completed` are themselves hold/completion entries — minimal additional symmetry work needed here).
- Faction-symmetric streak counterparts where substrate exists but no essay yet (e.g. supply-corridor-health long-form; supply-streak counters).
- Dynamic-essay extensions for established Codex sections (faction overviews, key locations, key formations) gated on player decisions — separate from the ghost-entries pattern.
