# Life Lessons — Sectors, Design
> Split from docs/life_lessons.md on 2026-03-24. Master index: docs/life_lessons.md

---

### [Sectors] Enclave corps get absorbed by sector consolidation — brigade-presence must protect at component level (2026-03-19) — NEW
- **Context**: `hvo_central_bosnia` had 5 brigades at Kiseljak/Zepce front OSIDs but got 0 sectors. `consolidateCrossCorpsFronts` found CB edges in connected components dominated by `hvo_tomislavgrad`. Per-edge protection (`isEdgeProtectedFromReassignment`) saved edges where brigades stood, but adjacent edges without brigades were consolidated into Tomislavgrad. Over multiple components, CB lost all edges.
- **Wrong approach**: Per-edge brigade protection. An edge 50m from a brigade gets absorbed while the brigade's own edge is protected — splitting the sector boundary mid-pocket.
- **Right approach**: If ANY edge in a connected component has a brigade from the minority corps, protect ALL edges of that corps in the component. Brigade presence = corps has a physical claim to the entire local front, not just the specific OSID.
- **Do instead**: When debugging "corps X has 0 sectors despite brigades at front", trace through: (1) does the corps exist as a formation? (2) does `mapOsidsToCorps` assign its home OSIDs? (3) does `partitionFrontEdges` give it edges? (4) does consolidation steal them? Use debug logging at each step boundary.

### [Sectors] Small adjacent sectors in the same corps should merge (2026-03-18) — NEW
- **Context**: Brcko anchor failed (12/13) because the 215th and 108th brigades were in different sectors despite defending the same front. Reactive defense (which operates within sectors) never activated — each brigade fought alone against 3-11x odds. The sector system split co-located brigades into separate sectors.
- **Wrong approach**: Accepting any sector partition where brigades are technically "in a sector." The sector system created many 1-2 edge sectors at Brcko instead of merging them into a defensible unit.
- **Right approach**: Undersized sectors (fewer edges than a threshold) adjacent to same-corps sectors should be merged. This ensures reactive defense covers the full defensive line. The merge in `mergeUndersizedSubSegments` already existed but the threshold was wrong for this case.
- **Do instead**: When a front line defense fails despite having adequate forces present, check whether the forces are in the same sector. If two brigades are 1 hop apart but in different sectors, reactive defense won't help either one. Merge thresholds should be aggressive for same-corps sectors on the same front.

### [Design] Emergent constraints beat hardcoded gates — let the supply system do its job (2026-03-21) — NEW
- **Context**: Besieged enclave forces (Sarajevo, Gorazde, Srebrenica) launched full corps offensives despite supply strangulation. Initial fix was a hardcoded enclave gate that checked `getEnclaveIdForOsid()` and blocked enclave brigades from operations.
- **Wrong approach**: Hardcoding which enclaves can't attack. Fragile, not extensible, doesn't respond to changing game state (e.g. if a corridor opens, the hardcode still blocks).
- **Right approach**: The supply system already derives per-OSID supply state (`adequate`/`strained`/`critical`) via `findHeartlandComponent` + BFS. Sarajevo is correctly marked `strained` (local source disconnected from heartland). Filter supply-constrained brigades from the offensive pool and the constraint emerges naturally. Bihac works correctly without exemption — its sources ARE in the heartland.
- **Do instead**: When a game system needs to constrain behavior, look for an existing system that already derives the right signal. Wire the constraint to that signal rather than creating a parallel detection mechanism. The supply system knew Sarajevo was cut off — the offensive system just wasn't listening.

### [Design] Engine soundness over calibration percentage (2026-03-18) — NEW
- **Context**: After implementing 7 engine fixes, calibration dropped from 90.4% to 89.9% but AI commander observations dropped from 321 to 21. The engine is MORE correct (commanders stopped complaining) even though the number went down slightly.
- **Wrong approach**: Optimizing for area-weighted match %. A broken engine can hit 90% if errors cancel out — wrong mobilization rate offset by wrong defense stacking offset by wrong alliance timing. The percentage is a snapshot of one scenario; it doesn't validate that mechanics are sound.
- **Right approach**: Ask "does the command hierarchy work?" not "did the percentage go up?" When a general orders an offensive and nothing happens, that's a soundness failure regardless of the territory number. When operations claim to execute but produce zero battles, that's a broken pipeline. When alliance decays in 3 months instead of 12, the political model is wrong.
- **Do instead**: Use AI commander observations as the primary engine health metric. Target: 0 bugs, 0 calibration issues, minimal design gaps. The area-weighted % is a secondary sanity check (stay above 85%), not the goal. An 88% run where every system works correctly is better than a 92% run where operations are stuck and morale is broken.

### [Design] Design decisions cascade — capture them in memory before they get buried in conversation (2026-03-23) — NEW
- **Context**: Three major design decisions emerged in rapid conversation: (1) Codex is a dynamic encyclopedia, (2) game starts April 1992 only, (3) command hierarchy with AI slots. Each changes the foundational architecture. If captured only in conversation, they'd be lost on context compaction.
- **Right approach**: As soon as a design decision is made, write it to memory AND update the canonical docs (VERSIONING.md, napkin, ledger). Don't wait for implementation — the decision IS the deliverable.
- **Do instead**: When a conversation produces a design decision that changes the project's direction, immediately: (1) save to memory, (2) update VERSIONING.md or relevant canon doc, (3) note in napkin. Three touchpoints ensure the decision propagates to future sessions.
