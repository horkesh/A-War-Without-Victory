# Life Lessons — Sectors, Design
> Split from docs/life_lessons.md on 2026-03-24. Master index: docs/life_lessons.md

---

### [Sectors] Enclave corps get absorbed by sector consolidation — brigade-presence must protect at component level (2026-03-19) — NEW
- **Context**: `hvo_central_bosnia` had 5 brigades at Kiseljak/Zepce front OSIDs but got 0 sectors. `consolidateCrossCorpsFronts` found CB edges in connected components dominated by `hvo_tomislavgrad`. Per-edge protection (`isEdgeProtectedFromReassignment`) saved edges where brigades stood, but adjacent edges without brigades were consolidated into Tomislavgrad. Over multiple components, CB lost all edges.
- **Wrong approach**: Per-edge brigade protection. An edge 50m from a brigade gets absorbed while the brigade's own edge is protected — splitting the sector boundary mid-pocket.
- **Right approach**: If ANY edge in a connected component has a brigade from the minority corps, protect ALL edges of that corps in the component. Brigade presence = corps has a physical claim to the entire local front, not just the specific OSID.
- **Do instead**: When debugging "corps X has 0 sectors despite brigades at front", trace through: (1) does the corps exist as a formation? (2) does `mapOsidsToCorps` assign its home OSIDs? (3) does `partitionFrontEdges` give it edges? (4) does consolidation steal them? Use debug logging at each step boundary.

### [Sectors] A sector is one frontline, not a bag of sub-segments (2026-04-03) — NEW
- **Context**: Drina Corps produced a saved sector that still carried multiple sub-segments under one sector label. Even when the corps bucket looked plausible, the product rule was broken: one sector no longer described one commanded frontline slice.
- **Wrong approach**: Treating same-corps territory or shared friendly-side geometry as enough to preserve one sector. That keeps bookkeeping tidy while frontline truth rots.
- **Right approach**: Treat sector state as a frontline invariant. If a sector resolves to multiple sub-segments, rebuild or split it until one sector equals one frontline.
- **Do instead**: When auditing sectors, ask "does this sector describe one commanded line?" before asking whether the territory set or brigade roster looks neat.

### [Sectors] Sector merge guards must use front-edge adjacency, not OSID polygon contact (2026-04-01) — NEW
- **Context**: `areSectorsTerritoryAdjacent` returned true for Herzegovina sectors (Drina Foča vs West Herzegovina) because `op:foca:donje_zesce` and `op:foca:izbisno` have min_dist=0 — genuine polygon neighbors. But they face completely different fronts. The merge guard was answering the wrong question: "do these territories touch?" instead of "do these front edges form a contiguous line?"
- **Impact**: Sectors on opposite sides of the country were merging into a single sector via Step 4d and `mergeSmallAdjacentSectors`. Brigades from different fronts were pooled together, disrupting assignment logic.
- **Wrong approach**: Using OSID polygon adjacency (territory contact) as a sector merge predicate. Two OSIDs can share a polygon edge across a mountain range with no tactical connection.
- **Right approach**: `areSectorsFrontEdgeAdjacent` — check whether any edge from sector A is triple-junction adjacent (Cases A/B at 33m threshold) to any edge from sector B. Two front-line segments form a contiguous sector only if their edges actually meet at a shared polygon vertex shared with the same friendly/hostile OSID.
- **Do instead**: When writing any "are these two sectors adjacent?" check, always ask: adjacent in territory, or adjacent along the front LINE? For sector merge decisions, always use front-edge adjacency, never polygon contact. Enclave rings (Srebrenica, Goražde) are valid isolated sectors — small + isolated is correct topology for a besieged enclave.

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

### [Sectors] Sub-segment IDs must use sector_id as prefix, not corps_id (2026-04-01) — NEW
- **Context**: `splitNonContiguousSectors` used `subseg:${sector.corps_id}:split${ci}` for generated IDs. `corps_id` is shared by all sectors in a corps; the counter resets per call. Two sectors in the same corps produce identical IDs (`vrs_1st_krajina:split0` twice). The second silently overwrites the first in every Map lookup. Brigades assigned to the lost sub-segment are permanently invisible to correction passes and at-front detection.
- **Wrong approach**: Using `corps_id` (shared across all sectors in the corps) as the prefix. ID collisions are silent — no error, no warning, just phantom sub-segments.
- **Right approach**: Use `sector.sector_id` as the prefix — it is unique per sector. New format: `subseg:sector:vrs_1st_krajina:3:split0`. Apply consistently to all four ID generation sites in `sector_splitting.ts`.
- **Do instead**: Any generated ID that must be globally unique must be prefixed by the most specific unique parent (sector_id, not corps_id). Before using an ID scheme, verify two sectors in the same corps produce different IDs.

### [Sectors] `else if (meta.side_b === faction)` in sector splitting = contested OSID blind spot (2026-04-01) — NEW
- **Context**: `splitNonContiguousSectors` strict Case B used `else if` instead of bare `else`. When an OSID on the friendly side of a front edge is contested or null-controlled at snapshot time (just changed hands), neither condition fires and `compFriendly` stays empty. The sub-segment survives the filter (`edge_ids` non-empty) but has no valid front OSID — brigades assigned to it can never be routed.
- **Wrong approach**: `else if (meta.side_b === faction)` — fails on any OSID that is contested, null-controlled, or in transition. Produces structurally sound-looking sub-segments with empty `friendly_osids`.
- **Right approach**: Use bare `else` matching the `findSubSegments` pattern. The fallback (treat `meta.b` as friendly when `side_a` is not faction) handles all edge cases gracefully, including contested and null-controlled OSIDs.
- **Do instead**: In front-edge parsing that assigns "friendly" and "hostile" sides, use `else` not `else if` for the fallback assignment. Any `else if` that can fail leaves a gap for contested/transitional OSID states.

### [Sectors] SRK siege ring is a load-bearing architectural assumption — Phase B cannot be its sole source of coverage (2026-04-01) — NEW
- **Context**: The Sarajevo siege ring (vrs_sarajevo_romanija) maintained coverage via Phase B cross-front marching — accidental emergent behavior, not intentional design. Any Phase B eligibility filter checking corps or sector boundaries caused SRK coverage to drop from ~4 to ~2 brigades near Sarajevo. Three separate fix attempts all hit this cascade.
- **Wrong approach**: Modifying Phase B march eligibility without verifying SRK's brigade coverage independently. The siege ring silently depends on cross-front marching that any boundary filter breaks.
- **Right approach**: Before modifying Phase B march eligibility, verify that SRK can maintain siege ring coverage through sub-segment assignment alone. If it can't, the sub-segment assignment is broken — fix that first.
- **Do instead**: The siege ring must be maintained by explicit sector sub-segment coverage (brigades assigned via `classifyBrigadesByTerritory`), not by Phase B march accidents. When testing any Phase B change, check SRK coverage as a canary: if SRK drops below 3 brigades on the siege ring, the change is breaking load-bearing march behavior.

### [Sectors] Alphabetical tiebreak in sub-segment assignment = architectural cascade risk (2026-04-01) — NEW
- **Context**: Sub-segment first-pass assignment uses alphabetical tiebreak when all brigades have equal tiny scores for a distant sub-segment. This is deterministic but fragile: any change to scoring that shifts one brigade's assignment can cascade unpredictably to ALL other brigades in the sector. boljanic_2 fix attempts repeatedly hit this.
- **Wrong approach**: Treating alphabetical tiebreak as "safe" because it's deterministic. It is deterministic but highly sensitive — a 0.01 score delta for one brigade reshuffles all downstream assignments.
- **Right approach**: Before committing any sub-segment scoring change, test cross-sector effects by checking whether other brigades' assignments change. If they do, that change is not isolated.
- **Do instead**: When modifying sub-segment assignment scoring, diff the brigade-to-subsegment mapping before and after. If assignments change for brigades NOT in the targeted sector, the change has architectural cascade risk and must be analyzed before proceeding.
