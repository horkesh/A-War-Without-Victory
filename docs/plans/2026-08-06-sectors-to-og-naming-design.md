# Sectors → Operational Groups: display rename + automatic historical naming

**Date:** 2026-08-06. **Status:** SCOPED (owner-requested; tackle eventually). **Owner:** sole roadmap implementer.
**Nature:** DISPLAY-LAYER ONLY. Zero calibration/engine impact — no `attack_resolution_osid.ts`, no sector geometry, no `sector_id` change. Aligns with ADR-0006's ruling ("sectors ARE standing OGs; naming-only fix via `display_name`; do NOT do a sector-removal refactor" — the 9–15-month refactor was rejected 3–1).

## The ask (owner, 2026-08-06)
1. **Rename the player-facing "sector" concept to "Operational Group" (OG).**
2. **Auto-name every OG with a real historical name** — the way sectors are auto-labelled today, but historical, for all of them (not just the handful currently attested).

## Current state (already half-built)
- Engine: `state.military.corps_front_sectors` keyed by `sector_id` (`sector:{corps}:{index}`). Internal; STAYS unchanged.
- `src/ui/map/data/GameStateAdapter.ts`:
  - `ATTESTED_OG_NAMES` — **6 ADR-0006-sourced, verbatim, no-invention** entries `(corps_id, anchor_mun) → name`: `Doboj OG 9`, `Prijedor OG 10`, `TG Foča`, `TG Višegrad`, `"Vogošća" OG`, `OZ Central Bosnia` (cites Balkan Battlegrounds Vol I/II + ICTY Krstić).
  - `resolveAttestedOgName(corpsId, munCounts)` — returns the attested name when the sector's DOMINANT municipality matches an attested anchor (deterministic dominant-mun pick, stable tie-break); else `undefined`.
  - Fallback for the rest: a computed `"{corps} – {top muns}"` label (real place names already, just not OG-formatted).
- Player UI currently says "sector" in labels/panels/tooltips.

## Design

### 1. Naming (all OGs get a real historical name)
- **Keep** `ATTESTED_OG_NAMES` as the first-choice source (historically attested → used verbatim). It is **extensible**: more BB/ICTY-attested OG/TG/OZ designations can be added over time, each historian-sourced (no invention — the ADR discipline).
- **Reformat the fallback** (the majority, where no specific OG is attested) from `"{corps} – {top muns}"` to an OG-style real-place name. Recommended: **`"{dominant_mun} OG"`** (e.g. `Banja Luka OG`, `Tuzla OG`) — the dominant municipality is already computed deterministically; it is a real historical place name; it reads as an OG designation. (Alternatives: `"{corps-short} OG – {mun}"`, or keep the multi-mun list suffixed with "OG".)
- Determinism: the dominant-mun selection is already stable (max edge-count, lexical tie-break). No RNG, no `Date.now`.

### 2. Terminology (sector → OG in the player surfaces)
- Sweep player-facing "Sector" strings → "Operational Group" / "OG" across `messages.en.ts` (+ `messages.bs.ts`) and the components that render sector labels/headers/tooltips (Army-HQ, field inspection, map hovers, corps briefing).
- **Engine term stays `sector`/`sector_id`/`corps_front_sectors`** internally — display-only rename, exactly the ADR-0006 boundary.
- Decide abbreviation policy: full "Operational Group" in headers, "OG" in dense/compact surfaces.

### 3. §6 / sourcing
- Attested names are ADR-0006-vetted (already shipped). Any NEW attested entries need historian sourcing (BB/ICTY). The geographic fallback (`{mun} OG`) is a real place name — no §6 exposure (unit designations, not sensitive-history content).

## Verification
- Deterministic-naming unit test (same sector → same OG name; dominant-mun tie-break pinned).
- No-raw-token / playerSafe test for the rendered labels (reuse the existing i18n label-discipline tests).
- `tsc` + `vitest` + `desktop:map:build`. **Calibration byte-identical by construction** (display layer; no sim read/write) — spot-check `test:baselines` unchanged.

## Effort & risk
- Moderate display + i18n work (naming resolver reformat is small; the terminology sweep is the bulk). **Zero engine/calibration risk.** No panel/canon gate needed (no `FORAWWV.md`/canon-behavior change; ADR-0006 already sanctions the rename).

## Decisions (owner-locked 2026-08-06 — build these)
1. **Fallback format = `"OG {dominant_mun}"`** (OG first, then the municipality — e.g. `OG Banja Luka`, `OG Tuzla`), matching real designations like "OG West".
2. **Do a historian pass for more attested names** — research real OG/TG/OZ designations across all corps from BB/ICTY and extend `ATTESTED_OG_NAMES` (owner example: ARBiH 3rd Corps had **OG West** / Operativna grupa Zapad). Attested names used verbatim where found; `"OG {mun}"` geographic fallback for the rest.
3. **Abbreviation:** **"OG" everywhere** as the compact shorthand; expand to **"Operational Group"** when an OG is SELECTED and shown in a header.

## Roadmap placement
Display/content item; fits alongside R7 (content/attribution/localization) or as a standalone display packet. Low-risk, no dependency on the exhaustion/scoring or morale lanes — schedulable any time.
