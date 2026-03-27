# UI/UX Blank Space Audit — Live (Dev Map)
**Date:** 2026-03-26  
**Auditor:** UI/UX Developer (Pyrrhic)  
**Build:** Vite dev map (`npm run dev:map`)  
**Method:** Live walkthrough + screenshot evidence, focused on wasted space in modals/panels

---

## Evidence (screenshots captured)

All captured from a live browser inspection run:

- `devmap-3003-initial.png`
- `devmap-hq-open.png`
- `hq-summary-overview.png`
- `hq-summary-ivp.png`
- `hq-summary-casualties.png`
- `hq-personnel.png`
- `devmap-back-on-map.png`
- `map-political-overlay.png`
- `map-ivp-modal.png`
- `20260326-live-main-map.png`
- `20260326-live-warsummary-ivp.png`
- `20260326-live-vance-owen-modal.png`
- `20260326-live-hq-briefing.png`
- `20260326-live-hq-summary-overview.png`
- `20260326-live-hq-summary-ivp.png`
- `20260326-live-hq-summary-casualties.png`
- `20260326-live-hq-records-aar.png`
- `20260326-live-hq-records-operation-history.png`
- `20260326-live-hq-records-codex.png`
- `20260326-live-hq-personnel.png`
- `20260326-live-hq-corps-drilldown-1kk.png`
- `20260326-live-hq-corps-drilldown-1kk-sectors.png`
- `20260326-live-hq-corps-drilldown-1kk-orbat.png`
- `20260326-live-orbat-overlay-1kk.png`
- `20260326-live-after-orbat-escape.png`
- `20260326-live-mainstaff-overlay.png`
- `20260326-live-chronicle-overlay.png`
- `20260326-live-ops-dropdown.png`
- `20260326-live-ops-planning-modal-phase1.png`
- `20260326-live-ops-planning-modal-planning.png`
- `20260326-live-ops-planning-modal-planning-2.png`

Screenshot directory (local): `C:\Users\User\AppData\Local\Temp\cursor\screenshots\`

---

## Findings log (append as encountered)

> Format per item:
> - **ID**: BS-###
> - **Surface**: where it occurs
> - **Problem**: what wasted space / layout failure is present
> - **Impact**: why it matters (player experience / scan cost)
> - **Evidence**: screenshot filename(s)
> - **Suggested fix direction**: concise, spec-aligned direction (no new mechanics)

### BS-001 — Army HQ → Summary → Overview uses ~25% width
- **Surface**: Army HQ modal → `SUMMARY` → `Overview`
- **Problem**: Content occupies a narrow left column; ~70% of modal is unused empty background.
- **Impact**: Screen feels unfinished; forces unnecessary scrolling/tabbing for a small amount of data.
- **Evidence**: `hq-summary-overview.png`
- **Suggested fix direction**: Redesign as full-width 2–3 column dashboard (match density patterns from `PERSONNEL` tab).

### BS-002 — Army HQ → Summary → IVP repeats narrow-left layout
- **Surface**: Army HQ modal → `SUMMARY` → `IVP`
- **Problem**: Same narrow left-column layout; large unused empty area.
- **Impact**: Same as BS-001; IVP is high-salience and should not be buried in a cramped strip.
- **Evidence**: `hq-summary-ivp.png`
- **Suggested fix direction**: Full-width dashboard; avoid vertical scroll for short blocks; visually emphasize thresholds/consequences.

### BS-003 — Army HQ → Summary → Casualties duplicates IVP and wastes width
- **Surface**: Army HQ modal → `SUMMARY` → `Casualties`
- **Problem**: Narrow strip layout persists; also repeats IVP panel content on same sub-tab.
- **Impact**: Duplication increases scan cost and reduces information density where it matters.
- **Evidence**: `hq-summary-casualties.png`
- **Suggested fix direction**: Remove duplication; integrate key IVP callouts as a small inline chip row if needed.

### BS-004 — War Summary modal (opened from map alert) wastes width
- **Surface**: Main map alert “Review IVP” → War Summary modal
- **Problem**: Modal still uses narrow content strip with large unused space.
- **Impact**: Urgent alert flows route into a layout that visually downplays urgency.
- **Evidence**: `map-ivp-modal.png`
- **Suggested fix direction**: Use full modal width; split into 2 columns (metrics left, consequences/thresholds right) and reserve bottom for actions/close.

### BS-005 — Army HQ → Briefing has large vertical dead space in Daily Briefing card
- **Surface**: Army HQ modal → `BRIEFING`
- **Problem**: Daily Briefing “paper” card is tall relative to its content, leaving large unused vertical space.
- **Impact**: Wastes prime area in the player’s nerve center; reduces room for actionable intelligence.
- **Evidence**: `devmap-hq-open.png`
- **Suggested fix direction**: Compress to a shorter document card or convert to a compact briefing strip; preserve aesthetic, increase density.

### BS-006 — Army HQ → Briefing commander panel is a large empty slab
- **Surface**: Army HQ modal → `BRIEFING` (top row, left “COMMANDER” panel)
- **Problem**: The commander card + war crimes block occupy a small fraction of a very tall/wide container; the remaining area is mostly empty background.
- **Impact**: The “nerve center” reads as under-filled; pushes the player’s attention away from actionable intel (briefing + situation).
- **Evidence**: `devmap-hq-open.png`
- **Suggested fix direction**: Reduce container height, or add density within the same visual language (e.g., compact “current directives / priorities / constraints” rows) without introducing new mechanics.

### BS-007 — Army HQ → Briefing crest center column creates a dead center void
- **Surface**: Army HQ modal → `BRIEFING` (top row, center crest block)
- **Problem**: A large central area is devoted to a crest + label with substantial surrounding blank space; it doesn’t carry information proportional to its footprint.
- **Impact**: In a primary command screen, the dead center should carry either information or serve as a deliberate focal anchor; currently it reads as “missing content.”
- **Evidence**: `devmap-hq-open.png`
- **Suggested fix direction**: Shrink the crest block or pair it with dense “today’s headline metrics” (small, typographic) so the center column earns its real estate.

### BS-008 — War Summary modal uses a narrow, underfilled content column inside a full modal frame
- **Surface**: War Summary modal (opened from main map alert cards)
- **Problem**: Within the modal, the active tab content (e.g., IVP) occupies a narrow left column; the remainder of the modal frame is empty, and the lower half is underfilled even on data-rich sections.
- **Impact**: The modal looks like a placeholder; urgent “review” flows downshift into a low-density panel, increasing scan time and reducing confidence.
- **Evidence**: `map-ivp-modal.png`
- **Suggested fix direction**: Convert to a 2-column layout (metrics + thresholds on left, consequences + posture/ops health on right) or a full-width stacked card grid; maintain typographic hierarchy.

### BS-009 — Pause menu is a tiny center card inside a full-screen blur
- **Surface**: In-map pause overlay (triggered via `ESC`)
- **Problem**: The pause “RESUME / SAVE GAME / SETTINGS / MAIN MENU / QUIT” card uses a small fixed box while the rest of the screen is a full blur dimmer with no additional information or structure.
- **Impact**: Reads like a placeholder and wastes attention budget; the player’s eye has to hunt for a small target in a huge dead field.
- **Evidence**: `20260326-live-after-orbat-escape.png`
- **Suggested fix direction**: Either (A) expand to a wider, denser pause panel (save metadata, run id, scenario, last autosave) or (B) reduce the dimmer footprint and tighten the overlay to feel intentionally “compact.”

### BS-010 — Army Reserve overlay underfills a large panel footprint
- **Surface**: Army Reserve overlay (opened via `★ Main Staff`)
- **Problem**: The panel is large but the actionable content (reserve pool list) occupies the top; the remainder is mostly empty background, with the “Campaign History” section collapsed and no secondary density.
- **Impact**: The system looks unfinished; reserve decisions feel de-emphasized despite being a key strategic lever.
- **Evidence**: `20260326-live-mainstaff-overlay.png`
- **Suggested fix direction**: Keep the same mechanics but increase density: show compact “loan episodes / recall triggers / current assignments” below the pool, or auto-expand “Campaign History” into a scroll region.

### BS-011 — Chronicle overlay devotes most width to empty/blurred map
- **Surface**: Chronicle overlay (War Chronicle timeline view)
- **Problem**: Events render in a narrow left strip; the central/right majority of the screen is a blurred map area with minimal additional information density.
- **Impact**: Chronicle feels like a side panel stretched to full screen; increases scan time and reduces perceived “chronicle” authority.
- **Evidence**: `20260326-live-chronicle-overlay.png`
- **Suggested fix direction**: Convert to a 2–3 column layout (timeline list + event detail + optional map inset), or reclaim space as a dense “newspaper” / dossier view with typographic hierarchy.

### BS-012 — Ops Planning / Operation modal is a narrow strip with large surrounding void
- **Surface**: Operation modal (opened via map alert “Open operation”)
- **Problem**: Operation details are presented as a narrow, fixed-width column; large surrounding area is empty/underutilized even when the map is visible behind/adjacent.
- **Impact**: Planning/execution feels like a sidebar rather than the core workflow; reduces information density precisely where the player expects multi-step detail.
- **Evidence**: `20260326-live-ops-planning-modal-phase1.png`, `20260326-live-ops-planning-modal-planning.png`, `20260326-live-ops-planning-modal-planning-2.png`
- **Suggested fix direction**: Keep the map, but widen the operation surface into a 2-column “planner” (left: status/commander/constraints; right: objectives/axes/roster/logistics), with scroll confined to subpanels rather than the whole screen.

### BS-013 — Operations list uses a tall space but shows only a few dense rows
- **Surface**: Left command panel → `OPERATIONS` dropdown/list
- **Problem**: The operations list appears as a tall region but only contains a small number of operations, leaving significant unused space above/below and forcing the eye to scan empty panel chrome.
- **Impact**: Reinforces the “thin strip UI” problem; makes operations feel less legible than they should be.
- **Evidence**: `20260326-live-ops-dropdown.png`
- **Suggested fix direction**: Use a tighter list container, or fill remaining space with compact per-op secondary fields (supply, timeline, roster chips, last outcome) in a consistent, low-ink style.

---

## Items to validate during the full walkthrough
- Army HQ: `RECORDS` density + whitespace (AAR / Operation History / Codex)
- Ops Planning / Operation modal: panel density + map-to-panel balance across execution vs planning states
- Map overlays: Army Reserve, Chronicle, pause menu, operation modal — confirm blank-space offenders logged

---

## Reconciled vs prior audits

Compared against:
- `docs/40_reports/UI_UX_AUDIT_20260325.md`
- `docs/40_reports/20260324_UI_UX_COMPREHENSIVE_AUDIT.md`

**Still reproduces (confirmed live):**
- **“Narrow-left strip inside wide modal”**: Army HQ `SUMMARY` tabs and War Summary modal remain major offenders (BS-001/002/003/004/008).
- **“HQ nerve center underfilled”**: Briefing top-row panels still read as oversized containers with sparse content (BS-005/006/007).
- **“Chronicle is low-density / feels like a stretched sidebar”**: still true (BS-011).
- **“Ops workflow feels like a sidebar”**: operation UI still presents as a thin column rather than a planner surface (BS-012/013).

**Changed / clarified by live run:**
- Army Reserve is now reachable and functional; the issue is less “missing UI” and more **underfilled panel density** (BS-010).
- ORBAT and corps drilldown are reachable; blank-space issues are present but less severe than the HQ Summary/War Summary patterns (see evidence screenshots; not elevated into top offenders here).

**No longer applicable / not reproduced in this pass:**
- No items from the prior audits were invalidated outright; this pass was scoped strictly to blank-space/wasted-area patterns rather than functional bugs.

