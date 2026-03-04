# WebGL UI Polish & Player-Facing Text Report
**Date:** March 4, 2026

## Executive Summary
This report details the successful execution of the UI text polish pass, fulfilling the requirement that "Everything should be player faced". We have eradicated the leakage of internal operational IDs, formatted dates intuitively, and upgraded the cohesive presentation of complex data.

## 1. Top Toolbar Date Formatting
- **Issue:** The main toolbar displayed the timeline purely as internal turn markers (e.g., `Turn 37`).
- **Resolution:** Implemented `formatTurnLabel()` in `TopToolbar.tsx`.
- **Outcome:** The game state labels now calculate and display the real-world historical date relative to the scenario start (e.g., `12 May 1993 · Turn 6`).

## 2. Corps and Formation Naming 
- **Issue:** Internal datastore IDs for OOB formations, such as `RS_Sarajevo_romanija_corps`, were bleeding into the player-facing UI (e.g., the OOB sidebar accordions, Corps profiles).
- **Resolution:** Added `formatRawId()` utility to parse, strip prefixes (e.g., `RS_`), and `Title Case` the strings across `FormationDetail.tsx`, `CorpsDetail.tsx`, and `OOBSidebar.tsx`.
- **Outcome:** Factions and units are now rendered beautifully (e.g., `Sarajevo Romanija Corps`).

## 3. Cohesion Visualization
- **Issue:** Cohesion was presented as a raw index number (0-100), which lacked immediate tactical readability.
- **Resolution:** Replaced the raw number in `FormationDetail.tsx` with a segmented progress bar visualization matching the tooltips and brigade rows.
- **Outcome:** Players now see orange `■■■■` indicator blocks, providing immediate intuitive feedback regarding unit strain.

## 4. Narrative Tense & Tone
- **Issue:** The dynamic "war stories" generator in `war_stories.ts` utilized past tense (e.g., *"The brigade held its ground... It ended at 1442 personnel"*), implying the war was already over.
- **Resolution:** Refactored the `generateNarrative()` switch cases (for `veteran`, `bloodied`, `shattered`, `risen`, `destroyed`, and `garrison`) to utilize present and present-perfect tenses.
- **Outcome:** Stories now read with immediacy: *"The brigade holds its ground... It currently fields 1442 personnel"*.

## 5. Front Line and Internal UI IDs
- **Issue:** The `FRONT:` attribution in the sidebar and Corps stances displayed full canonical edge keys like `HRHB__RS__op:bugojno:udurlije`. Technical command IDs like `d_016` occasionally appeared in the succession event logs.
- **Resolution:** Created `formatFrontId()` in `OOBSidebar.tsx` to strip parent faction relationships and cleanly hyphenate settlement pairings. Applied user-friendly fallbacks to officer succession.
- **Outcome:** Front descriptions now render as elegant operational areas (e.g., `Bugojno — Udurlije`), and officer names map consistently.

## Conclusion
The WebGL map and operations UI are now aligned with the "player-first" paradigm. Internal simulation scaffolding has been entirely abstracted away behind immersive formatting.
