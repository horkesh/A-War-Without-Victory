# UI Overhaul Master Plan

**Date:** 2026-03-20
**Status:** Approved
**Owner:** Orchestrator
**Deputy:** Product Manager

---

## Pyrrhic Team Assessment

### Game Designer
The player needs to feel like a constrained wartime commander — too few good officers, too many fronts, every decision a trade-off. The current UI has the DATA but not the EXPERIENCE. The player opens panels to read numbers; they should open panels to make decisions. The Army HQ modal is the right centerpiece — it's the first UI element that puts command at the center. But it needs the surrounding system to be clean. A beautiful HQ modal sitting next to a broken EventDecisionModal with system-ui fonts and inline styles will feel like two different games.

### Modern Wargame Expert
Compared to EU4/HoI4/UoC2: AWWV has superior faction identity and atmosphere (the parchment events, the military vocabulary). What it lacks is the "outliner" — the at-a-glance summary that lets you scan 6 corps in 3 seconds. The Army HQ modal IS that outliner. The ops modal is already better than most wargames for operation planning. The main map's 7 modes are powerful but the legends are minimal. The settlement panel is informationally dense but not actionable.

### UI/UX Developer
Technical debt is concentrated in 4 areas: (1) float formatting leaks across 8+ components, (2) EventDecisionModal is a complete orphan from the pre-design-system era, (3) `accent-blue` token is missing from Tailwind config causing silent unstyling, (4) CorpsFrontPanel's white-paper interior creates visual whiplash. The Army HQ modal is the right investment but building it on a cracked foundation means the cracks show through the new walls.

### Technical Architect
The panel rail system is clean. Deck.gl + MapLibre coexistence is stable. The gameStore is growing (200+ fields) but manageable. The Army HQ modal adds ~12 components and 2 IPC channels — architecturally sound, no cross-cutting risk. The 3D terrain in the ops modal has a pmtiles/raster-dem integration issue that needs investigation, not code changes.

### Historian / War-or-Game
The officer system (succession, war crimes, experience, enclave lock) is the most historically grounded subsystem. The Army HQ modal finally surfaces this to the player. The constraint of "too few good officers" only works if the player can SEE the pool is thin. The current CommanderSelectionModal and OfficerEventBadge work but are disconnected — the HQ unifies them.

### Gameplay Programmer
No engine changes needed for Phase 0-2. Phase 3 requires 2 new IPC handlers (`forceReplaceCorpsCommander`, `dismissOfficer`) — both are simple state mutations, no pipeline or combat changes. Zero calibration risk.

---

## Decision: Stop Tinkering, Ship in 5 Phases

The UI has been getting incremental improvements every 2-3 days — icons here, a number format there, a modal fix. This creates churn without completion. The master plan locks scope and sequence. Each phase has a clear "done" gate. No feature creep between phases.

---

## Phase 0: Foundation Repair (1 session)

**Goal:** Fix every known display bug and visual inconsistency so subsequent phases build on solid ground.

**Done gate:** Zero raw floats visible anywhere. All panels use the design system. Smoke-test triad passes.

### 0.1 Float Formatting Sweep (PARTIALLY DONE this session)

Already fixed:
- FormationDetail: fatigue, cohesion, morale, entrenchment_turns
- BrigadeRow: fatigue, cohesion
- BrigadeCard: cohesion, fatigue
- CorpsCard: equipment operational counts
- Tooltip: cohesion
- TacticalCard: cohesion
- OperationDetail: axis momentum
- NarrativeTab: estimatedCasualties
- ArmyDetail: corpsExhaustion thresholds
- usePrediction: NaN protection

Remaining to verify (grep for raw numeric renders):
- CorpsFrontPanel: `combat_cohesion_avg`, `combat_morale_avg`, `combat_fatigue_avg` — these go through `FuzzyIntel` which calls `Math.round()`, so they're OK
- EnclaveDashboard: resilience values — uses `.toFixed(1)`, OK
- OfficerProfile: experience_points — uses `.toFixed(2)`, OK
- Supply reserves: go through `ReserveGauge` which calls `Math.round()`, OK

### 0.2 Missing Design Tokens

| Token | Fix |
|-------|-----|
| `accent-blue` | Add to `tailwind.config.ts`: `'accent-blue': '#6a9ec2'` (matches `interactive` token) |
| `text-status-good` | Add: `'#56d364'` — replace scattered `text-emerald-400` / `text-green-400` |
| `text-status-warn` | Add: `'#e8a838'` — replace scattered `text-amber-400` |
| `text-status-danger` | Add: `'#f47068'` — replace scattered `text-red-400` |

### 0.3 EventDecisionModal Migration

Current state: pure inline styles, `system-ui` font, `#1a1a2e` background, `#ffd700` text. Zero Tailwind classes.

Fix: Rewrite to use `bg-panel-bg`, `text-accent-gold`, `font-sans`/`font-mono`, `border-panel-border`. Match EventModal's parchment aesthetic for decision events. ~1 hour of work.

### 0.4 GlassPanel Color Fix

`GlassPanel.tsx` uses `bg-[#16191f]` (cool blue-black). Change to `bg-panel-bg` (`#1c1a17`, warm brown) for consistency with the rest of the system.

### 0.5 Deck.gl Click Handling (DONE this session)

Already fixed: MapboxOverlay `onClick` handler delegates to store. Uses `stack_count` from feature properties instead of re-filtering.

### 0.6 Ops Modal North-Up + Terrain

Already fixed: bearing hardcoded to 0, `computeAttackBearing` removed. Terrain source moved to style JSON. If terrain still doesn't render after this, defer 3D terrain to Phase 4 — it's visual polish, not functional.

---

## Phase 1: Army HQ Modal — Shell + Overview (2 sessions)

**Goal:** Player can open HQ, see all corps at a glance, answer "what needs attention" in 3 seconds.

**Done gate:** Modal opens via faction click or H key. Army commander + strategic situation + all corps cards visible. Alert strip shows pending actions.

**Implementation:** Follow `docs/plans/2026-03-20-army-hq-modal-implementation.md` Tasks 1.1–1.7 exactly.

Deliverables:
- gameStore: `armyHQ*` state fields
- ArmyHQModal shell (dark wood surface, breadcrumb bar, ESC handling)
- ArmyCommanderCard (officer stats on paper stock)
- StrategicSituationCard (territory %, personnel, ops, supply, this-week summary)
- ArmyHQCorpsCard collapsed grid (name, commander grade, personnel, cohesion bar, stance stamp, op indicator, critical left-border)
- Alert strip (pending officers, ops ready to launch, critical corps, battles this week)
- H hotkey

### New ideas incorporated:
- **Corps triage coloring:** Cards with avg cohesion <40% get red left-border. Cards with active battles this turn get a subtle pulse on the hotspot badge. Cards with no commander get amber left-border.
- **"This Week" badge row:** Small inline pills on each corps card: BATTLE (red, count), ADVANCE (green, OSIDs gained), RETREAT (amber, OSIDs lost), CASUALTY (count). Derived from `latestTurnSummary.battles` cross-referenced with corps territory.

---

## Phase 2: Army HQ Modal — Corps Drill-Down (2 sessions)

**Goal:** Player can drill into any corps and see full detail without leaving the HQ.

**Done gate:** Click corps card -> vertical expand. Commander, Sectors, Operations, ORBAT, Combat Record sections all functional. Breadcrumb navigation works.

**Implementation:** Follow implementation plan Tasks 2.1–2.7.

Deliverables:
- Corps card expand/collapse animation (other cards compress to name-only)
- CommanderSection (OfficerProfile + placeholder action buttons)
- SectorsSection + SectorSubCard (sector name, brigade count, density, stance label)
- OperationsSection + OperationSubCard (op name, phase badge, momentum, brigade count)
- OrbatSection (compact brigade list with cohesion bar, fatigue, status)
- CombatRecordSection (CombatSummaryPanel data)

---

## Phase 3: Army HQ Modal — Player Actions (2 sessions)

**Goal:** The HQ becomes a command center, not just a dashboard.

**Done gate:** Player can replace commanders, change stances, force-launch/stand-down operations, all from within the HQ.

**Implementation:** Follow implementation plan Tasks 3.1–3.6.

Deliverables:
- Replace Commander action + InlineOfficerPicker + `forceReplaceCorpsCommander` IPC
- Change corps stance (inline dropdown, existing IPC)
- Change sector stance (inline dropdown, existing IPC)
- Force Launch / Stand Down operation (existing IPC)
- Inline confirmation dialogs (not separate modals)

### New ideas incorporated:
- **Quick stance sweep:** At the army level, a "Set All Corps" stance dropdown that applies to all corps at once. For the "we're losing, go defensive everywhere" moment.
- **Operation readiness indicator:** On the ops sub-card, show a simple green/amber/red readiness composite (intel + supply + force ratio) so the player knows at a glance whether force-launch is reckless or reasonable.

---

## Phase 4: Army HQ Modal — Deep Drill-Down + Polish (1-2 sessions)

**Goal:** Full depth available without leaving HQ. Visual polish. Retire ArmyDetail.

**Done gate:** Brigade, operation, and sector sub-card expansion all work. Officer dismissal works. ArmyDetail.tsx retired. Wood/paper textures integrated.

**Implementation:** Follow implementation plan Tasks 4.1–4.8.

Deliverables:
- BrigadeSubCard expansion (stats, engagement history, narrative arc, equipment)
- OperationSubCard expansion (axes, objectives, per-brigade status)
- SectorSubCard expansion (brigade positions, recent battles)
- Officer dismissal (`dismissOfficer` IPC)
- Asset integration (wood texture, paper texture)
- Retire ArmyDetail.tsx

---

## Phase 5: Surrounding UI Polish (1-2 sessions)

**Goal:** Everything around the HQ matches its quality level.

**Done gate:** No visual orphans. Consistent design language across all panels. Player can navigate the full UI without encountering jarring style breaks.

### 5.1 CorpsFrontPanel Interior Theme Decision

The white-paper "intelligence dossier" interior is deliberate but creates a visual break. Two options:

**Option A (Recommended):** Keep the paper aesthetic but add a smooth transition. When the panel opens, the paper unfolds from the dark chrome. Add a subtle `bg-panel-card` header that bridges the dark shell and the light interior. This acknowledges the dossier metaphor while reducing the jarring switch.

**Option B:** Convert to dark theme matching all other panels. Lose the dossier personality.

Decision: Option A.

### 5.2 Settlement Panel Enhancement

The SelectionPanel shows good data but is passive. Add:
- **One-click brigade orders:** When viewing a settlement with friendly brigades, show "Dig In" / "Attack Adjacent" quick buttons per brigade.
- **Terrain profile card:** Compact visual showing elevation, friction, river crossing, road access as a small icon row instead of text lines.

### 5.3 Map Legend Enrichment

Current legends are minimal gradient bars. Add:
- Numeric scale labels at key thresholds (e.g., "0.5 — Thin", "1.0 — Dense" for density mode)
- Current-faction highlight in territory percentages

### 5.4 Keyboard Shortcut Expansion

Current: 1-7 map modes, Enter, Escape, Ctrl+S.

Add:
- `H` — Army HQ (Phase 1)
- `Tab` — Cycle through corps (select next corps in sidebar)
- `Space` — Advance turn (same as clicking ADVANCE TURN)
- `B` — Toggle briefing layer
- `O` — Open operations panel

### 5.5 Map Atmosphere — Deeper Hillshade + Warm Tint

The main map stays in day mode (night mode rejected — faction territory colors need a light base, and the dark chrome already provides contrast). But deepen the atmosphere:
- **Increase hillshade opacity** slightly for more terrain drama
- **Apply a subtle warm sepia tint** to the base map tiles (CSS filter or MapLibre paint property) to bring the map closer to the warm-brown palette of the surrounding UI
- **Do NOT go full dark/night** — the Army HQ modal provides the "dark table" experience; the main map stays readable

### 5.6 Command Briefing Actionability

Current `CommandBriefingLayer` shows AI-generated text items. Convert each item from passive text to an actionable button:
- "Drina Corps at 41% cohesion" -> Click -> Opens HQ with Drina expanded
- "Op Corridor 92 ready" -> Click -> Opens HQ with operation highlighted
- "2 officers pending" -> Click -> Opens OfficerEventModal

---

## Role Assignments

| Phase | Implementer | Reviewer | Sign-off |
|-------|-------------|----------|----------|
| Phase 0 | UI/UX Developer | /simplify (Code Simplifier) | Orchestrator |
| Phase 1 | UI/UX Developer + Technical Architect (store design) | /simplify + /code-review | Orchestrator + Game Designer |
| Phase 2 | UI/UX Developer | /simplify + /code-review | Orchestrator |
| Phase 3 | UI/UX Developer + Gameplay Programmer (IPC handlers) | /simplify + /canon-compliance-review | Orchestrator + /war-or-game |
| Phase 4 | UI/UX Developer | /simplify + /code-review | Orchestrator |
| Phase 5 | UI/UX Developer + Modern Wargame Expert (UX review) | /simplify | Orchestrator |

**Standing assignments:**
- `/orchestrator` owns the plan. Convenes team at phase boundaries. Resolves cross-role conflicts.
- `/architect` flags all architectural decisions (new store fields, new IPC channels, new component directories) as ADRs in the phase commit or in `docs/20_engineering/`. Specifically: Phase 1 (gameStore `armyHQ*` fields), Phase 3 (`forceReplaceCorpsCommander` + `dismissOfficer` IPC).
- `/product-manager` owns scope. If a phase threatens to expand beyond its deliverables, PM cuts scope back.
- `/game-designer` validates that player agency matches the design thesis ("constrained commander").

---

## Post-Phase Discipline (EVERY phase, NO exceptions)

This block is mandatory after each phase completes. It matches the Army HQ implementation plan's 7-step block and the project's established process.

1. **`/simplify`** — Review all changed files for reuse, quality, efficiency. Fix issues found.
2. **Smoke-test triad:** `npx tsc --noEmit` ; `npm run test:vitest` ; `npm run desktop:map:build`
3. **`/verification-before-completion`** — Run verification commands, confirm output before claiming done. Evidence before assertions.
4. **`/pre-commit-check`** — Canon, determinism, ordering, tests, ledger, life lessons compliance.
5. **Commit** with descriptive message following repo conventions.
6. **Documentation updates:**
   - Behavioral/output changes → append to `docs/PROJECT_LEDGER.md`
   - Thematic knowledge (design decisions, patterns, rationale) → append to `docs/PROJECT_LEDGER_KNOWLEDGE.md`
   - Update `.claude/napkin.md` — current state + backlog progress
   - Update `working-on.md` — progress snapshot for session continuity
7. **Canon propagation** (if applicable):
   - New IPC channels → `docs/10_canon/Systems_Manual_v0_7_0.md` §7.5
   - New state fields → `docs/20_engineering/REPO_MAP.md`
   - New component directory → `docs/40_reports/GUI_MASTER.md`, `REPO_MAP.md`
   - `/canon-compliance-review` if gameplay mechanics or state schemas changed

**Phase 3 additionally requires:**
- `/war-or-game` sign-off (napkin §Execution #2) — new IPC handlers mutate officer state
- `/architect` ADR for `forceReplaceCorpsCommander` and `dismissOfficer` IPC design

---

## Relevant Life Lessons (scan before each phase)

| Lesson | Applies to |
|--------|-----------|
| [MapLibre] Never use setData() on dynamic sources in modal maps | Phase 1 (ArmyHQModal has no map, but ops modal terrain fix in Phase 0) |
| [Process] Prove it in a test script BEFORE pushing renderer changes | Phase 0 (terrain investigation) |
| [Architecture] Classify phases by real code impact, not plan labels | Phase 3 (IPC handlers are engine-touching despite being called "UI") |
| Smoke-test triad after every change | ALL phases |
| One-change-then-verify calibration protocol | Phase 3 only IF IPC handlers affect sim behavior (they don't — pure state mutation) |
| /war-or-game sign-off after every phase | Phase 3 mandatory; other phases optional (UI-only) |

---

## Timeline

| Phase | Sessions | Depends On | Risk | Implementer |
|-------|----------|------------|------|-------------|
| Phase 0: Foundation Repair | 1 | Nothing | Low — mechanical fixes | UI/UX Dev |
| Phase 1: HQ Shell + Overview | 2 | Phase 0 | Low — new components, no engine changes | UI/UX Dev + Architect |
| Phase 2: HQ Drill-Down | 2 | Phase 1 | Low — data display, existing patterns | UI/UX Dev |
| Phase 3: HQ Actions | 2 | Phase 2 | Medium — 2 new IPC handlers | UI/UX Dev + Gameplay Prog |
| Phase 4: HQ Deep Drill + Polish | 1-2 | Phase 3 | Low — incremental depth | UI/UX Dev |
| Phase 5: Surrounding Polish | 1-2 | Phase 4 | Low — cleanup and enhancement | UI/UX Dev + Wargame Expert |

**Total: 9-11 sessions. No tinkering between phases.**

---

## Rules of Engagement

1. **No UI work outside this plan** until all 5 phases complete. If a bug is found during play, log it in napkin backlog; don't fix it ad-hoc unless it blocks testing.
2. **Post-phase discipline is mandatory** — all 7 steps, every phase. See block above.
3. **Phase 0 is mandatory before Phase 1.** Don't build the HQ on a cracked foundation.
4. **The Army HQ modal is the centerpiece.** Phases 1-4 are the priority. Phase 5 is polish that can be deferred if calibration or gameplay work is more urgent.
5. **3D terrain in ops modal:** If it doesn't work after the Phase 0 style-JSON fix, defer to Phase 5 or a separate investigation ticket. Don't chase it.
6. **`/architect` flags decisions** — Any new store fields, IPC channels, component directory structures, or design-system token additions get flagged as architectural decisions in the commit message and propagated to engineering docs.
7. **`/orchestrator` convenes at phase boundaries** — Brief team sync at the start of each phase (what's done, what's next, any blockers). Not a full standup — just alignment.
8. **Scope creep rule:** If during implementation a "nice to have" is discovered, it goes on the napkin backlog, NOT into the current phase. PM is the gatekeeper.
9. **`/create-report`** after Phase 4 completion — full implementation report to `docs/40_reports/` documenting the Army HQ modal, new IPC channels, retired components, and architectural decisions.

---

## References

- Army HQ design spec: `docs/plans/2026-03-20-army-hq-modal-design.md`
- Army HQ implementation plan: `docs/plans/2026-03-20-army-hq-modal-implementation.md`
- Army HQ mockups: `docs/60_visualisations/army_hq_mockup*.html`
- Map & UX strategic design: `docs/plans/2026-03-20-terrain-map-ux-strategic-design.md`
- Visual overhaul (completed): `docs/plans/2026-03-19-ui-visual-overhaul-design.md`
- Life lessons: `docs/life_lessons.md`
- Napkin runbook: `.claude/napkin.md`
