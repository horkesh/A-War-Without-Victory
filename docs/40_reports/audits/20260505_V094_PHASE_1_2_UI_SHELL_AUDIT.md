# v0.9.4 Phase 1 (Shell + Transition Polish) + Phase 2 (Visual Consistency) — UI Shell Audit + Backlog

**Lane:** `LANE-NIGHTSHIFT-V094-PHASE-1-2-UI-SHELL-AUDIT`
**Date:** 2026-05-05
**Status:** AUDIT-ONLY (no source modification)
**Parent SHA at audit:** `c406fd9cd15572cd7252ea6b0a8ad10b38fad1d9`
**Plan reference:** `docs/plans/2026-04-06-v094-visual-polish-legendary-map-features-plan.md`
**Sibling plan:** `docs/plans/2026-04-03-v08to09-ui-density-and-shell-cohesion-plan.md`
**Predecessors / Closed peers:**
- `docs/40_reports/implemented/20260504_MAP_THAT_SCARS_VALIDATION.md`
- `docs/40_reports/implemented/20260505_FORCE_QUALITY_GLOW_VALIDATION.md`
- `docs/40_reports/implemented/20260505_REFUGEE_COLUMN_VALIDATION.md`
- `docs/40_reports/implemented/20260505_CORRIDOR_HEARTBEAT_VALIDATION.md`

v0.9.4 Phase 3 (Legendary Map Features) is fully closed. v0.9.4 Phase 1 (Shell + Transition Polish) and Phase 2 (Visual Consistency) remain OPEN and are the subject of this audit.

---

## 1. Audit scope + methodology

### 1.1 Scope

**Phase 1 — Shell + Transition Polish:** tactical map ↔ Warroom ↔ Army HQ navigation handoffs; modal/overlay z-index + dismissal consistency; loading + transition states (scenario load, turn advance, Codex open, Replay scrub); keyboard shortcuts + focus management; error states (failed save load, network failure for icons, etc.).

**Phase 2 — Visual Consistency:** faction palette consistency across surfaces; typography hierarchy; spacing rhythm; color semantics; iconography; layer composition (deck.gl vs MapLibre vs DOM); empty states.

### 1.2 Methodology

Read-only audit across `src/ui/`, `docs/40_reports/`, `docs/plans/`. Source code was inspected (no edits) for shell composition, palette wiring, z-index assignments, transition affordances, error handling, and empty-state coverage. Sibling Phase 3 validation reports were used to fix the established faction-symmetric palette pattern (`FACTION_GLOW_RGB`).

### 1.3 Boundaries (binding)

- Read-only on `src/ui/`, `docs/40_reports/`, `docs/plans/`. No touch of `src/sim/` or `data/scenarios/`.
- Faction-agnostic analysis where applicable.
- Ring 1, no §6 surface, no FORAWWV / political_controllers / OOB / rupture-wiring touch.
- PostToolUse system-reminders treated as decorative per lane spec.

---

## 2. Current-state inventory

### 2.1 Shell surface map (canonical owners by `UI_OWNERSHIP_MATRIX.md`)

| Shell | Canonical owner | Code root | Live entry |
|---|---|---|---|
| Campaign / strategic shell (Warroom) | Warroom (TS, hotspot-driven) | `src/ui/warroom/` (`warroom.ts`, components/*.ts) | Electron entry; `src/ui/map/components/warroom/WarroomShellLayer.tsx` mirrors top status bar inside React shell |
| Battlespace shell (Tactical Map) | React + MapLibre + deck.gl | `src/ui/map/` (`App.tsx`, `MapContainer.tsx`) | `npm run dev:map`; `npm run desktop:map:build` |
| Command-review shell (Army HQ) | React modal | `src/ui/map/components/army_hq/` | `H` key, toolbar `RECORDS / SUMMARY / OPS / EVENTS`, Decision Room |
| Knowledge shell (Codex) | React panel | `src/ui/map/components/CodexPanel.tsx` + `components/codex/codexEssayResolver.ts` | Toolbar `CODEX` |

The shells are coherent at the ownership level (matrix is actively followed). The polish gap is below the ownership layer: visual rhythm across shells, transition affordances, and below-the-fold empty/error states.

### 2.2 Tactical map shell — current state

- `App.tsx` mounts ~50 panels/modals as siblings under one root, gated by `useGameStore` selectors.
- `PresidentialToolbar.tsx` (469 lines) is the live top shell at `z-[100]`, fixed `h-12`. It hosts WARROOM return, CHRONICLE, SUMMARY, RECORDS, OPS, EVENTS, CODEX, plus center alert badges.
- `OOBSidebar.tsx` left rail uses shared `--awwv-toolbar-clearance` (7.5–8.5rem) so it sits visibly below the centered crest. Documented residual: large empty band below the 48-px Presidential bar (see `implemented/20260327_COMMAND_SIDEBAR_LAYOUT_KNOWLEDGE.md`).
- `panelRail.ts` defines four canonical positions (primary at z=100, secondary at z=90, tertiary at z=50). This is the single density-aware rail contract — the rest of the shell does not consult it.
- `BottomStatusStrip.tsx` is a separate bottom-of-frame DOM element; alongside the Warroom-style `WarroomStatusBar.tsx` priority docket at `z-[60]` (bottom-right). Two bottom bars co-exist (the Warroom-style one is opt-in).
- Overlays / modals live in roughly **eight independent z-index tiers** (see §3.1): `z-[60]` (priority docket), `z-[100–120]` (toolbar / RecruitmentModal / SidePicker), `z-[200]` (RadialMenu, PresidentialToolbar crest), `z-[500]` (StrategicDashboard), `z-[900]` (CodexPanel), `z-[1000–1200]` (Army HQ, ChronicleOverlay, OpsPlanningModal, WarSummary), `z-[8000–9999]` (PauseMenu, MainMenu, FirstTurnOrientation, Settings, AdvanceTurnModal, Onboarding, EventDecisionModal, Dayton, Commander, OperationBriefing, OfficerEvent, PeacePlan), `z-[10000+]` (TurnAftermathModal at 10000, GameOverModal/VerdictScreen at 99999). No central z-index token file.

### 2.3 Army HQ shell — current state

- `ArmyHQModal.tsx` (457 lines) at `z-[1000]` with explicit five-tab structure (BRIEFING / SUMMARY / RECORDS / OPS / EVENTS) plus PresidentialDecisionRoomPanel at the BRIEFING root.
- 30 component files under `army_hq/`. Strong vertical discipline: `CollapsibleSection.tsx`, `FlipCard.tsx`, `OrbatSection.tsx` are reused.
- Color/typography is `bg-panel-bg / bg-panel-card / text-amber-400 / tracking-[0.22em] / font-mono` — fairly cohesive within Army HQ.
- Empty-state coverage exists in `PresidentialDecisionRoomPanel.tsx`, `CorpsSituationSection.tsx`, `AARPanel.tsx`. Several other surfaces (ForceReadiness, OperationsSection, SectorsSection, CommandRelationshipSection) render zero/null without explicit "no data" prose.

### 2.4 Warroom shell — current state

- `src/ui/warroom/warroom.ts` (776 lines) plus 19 component .ts files. Distinct from React shell (vanilla TS + DOM-injected modals).
- 12-anchor canonical hotspot contract is partially live (8/12 implemented, 4/12 prompt-ready). Per `WARROOM_MASTER.md`, asset bake of remaining four anchors is gated on art finalization (Phase 2 deliverable).
- `WarroomStatusBar.tsx` and `WarroomShellLayer.tsx` (under `src/ui/map/components/warroom/`) re-project Warroom-shell affordances inside the React tactical shell — implemented as an overlay strip, not a full Warroom-equivalent.
- Warroom-private faction palette (`warroom_utils.ts`: `FACTION_COLORS = {primary, dim, bg}`) is structurally different from the React-side palette (`utils/theme.ts`: Tailwind class strings + `FACTION_HEX_COLORS`).

### 2.5 Faction palette landscape (Phase 2 — primary visual-consistency gap)

Five separate faction palettes live in the codebase today:

| Palette | Location | Shape | Used by |
|---|---|---|---|
| `FACTION_GLOW_RGB` | `src/ui/map/layers/buildForceQualityOverlay.ts` (canonical, frozen) | `Record<faction, [r,g,b]>` | Force-Quality Glow, Refugee Column, Corridor Heartbeat (Phase 3) |
| `FACTION_HEX_COLORS` | `src/ui/map/utils/theme.ts` | `Record<faction, '#hex'>` | BottomStatusStrip, inline DOM styles |
| Tailwind class maps (`FACTION_COLORS`, `FACTION_COLORS_SUBTLE`, `FACTION_BG_SUBTLE`) | `src/ui/map/utils/theme.ts` | `Record<faction, 'tw-class'>` | All Tailwind-styled React components |
| Warroom `FACTION_COLORS` | `src/ui/warroom/components/warroom_utils.ts` | `Record<faction, {primary, dim, bg}>` | All Warroom modals (Newspaper, Magazine, Reports, Diplomacy, IVP, Faction Overview) |
| Warroom-local duplicate `FACTION_COLORS` | `src/ui/warroom/components/InvestmentPanel.ts` | `Record<faction, 'rgb()'>` | InvestmentPanel only (re-declared, slightly different RGB values) |

Plus a one-off conditional palette in `src/ui/warroom/components/SettingsModal.ts` (`factionId === 'RS' ? '#14316d' : factionId === 'HRHB' ? '#922026' : '#2b5042'`).

Color values **do not match** across these palettes:
- Force-quality / refugee / corridor: `FACTION_GLOW_RGB` (frozen tuples)
- Theme: `RS '#c04040', RBiH '#4a9a55', HRHB '#4080b8'`
- Warroom: `RBiH 'rgb(55, 140, 75)', RS 'rgb(180, 50, 50)', HRHB 'rgb(50, 110, 170)'`
- InvestmentPanel: `RBiH 'rgb(27, 94, 32)', RS 'rgb(226, 74, 74)', HRHB 'rgb(74, 144, 226)'`
- SettingsModal: `RS '#14316d' (blue!), HRHB '#922026' (red!), RBiH '#2b5042'`

The SettingsModal ad-hoc inversion (RS shown as blue, HRHB as red) is the most player-visible drift; the other four palettes are subtly different greens/reds/blues but readable per surface.

### 2.6 Z-index landscape (Phase 1 — primary transition/overlay gap)

Per §2.2, there are eight tiers in current code. The drift is not random — it grew organically as features landed. There is no `z-index` token file. The values found:

| Layer | z value | File |
|---|---|---|
| Floating priority docket | `z-[60]` | WarroomStatusBar |
| Toolbar | `z-[100]` | PresidentialToolbar |
| AttackConfirmation | `z-[100]` | AttackConfirmation |
| Recruitment / SidePicker | `z-[120]` | RecruitmentModal, SidePickerOverlay |
| Crest, RadialMenu | `z-[200]` | PresidentialToolbar (crest), RadialMenu |
| StrategicDashboard | `z-[500]` | StrategicDashboard |
| CodexPanel | `z-[900]` | CodexPanel |
| Army HQ, Chronicle, Ops Modal, StackExpansion | `z-[1000]` | ArmyHQModal, ChronicleOverlay, OpsPlanningModal, StackExpansionOverlay |
| Wrapped overlay | `z-[1100]` | WrappedOverlay |
| War Summary | `z-[1200]` (style) | WarSummaryModal |
| PauseMenu | `z-[8000]` | PauseMenu |
| FirstTurnOrientation, Credits, Settings | `z-[8500]` | FirstTurnOrientationCard, CreditsScreen, SettingsScreen |
| MainMenu, Onboarding | `z-[9000]` | MainMenu, OnboardingOverlay |
| Commander / Dayton / OperationBriefing / EventDecision / OfficerEvent / PeacePlan | `z-[9999]` | 6 modals |
| Tooltip | `zIndex: 9999` (inline) | Tooltip |
| TurnAftermath | `z-[10000]` | TurnAftermathModal |
| GameOver, Verdict | `z-[99999]` | GameOverModal, VerdictScreen |

Stacking order is mostly correct *for current usage* (game-over wins; turn-aftermath beats hard-turn modals; modals beat panels; panels beat toolbars). But: there is no central token file, and three modals live at `z-[1000]` in the same tier (Army HQ vs Chronicle vs Ops Planning vs StackExpansion), so opening Chronicle from inside Army HQ uses ad-hoc rendering order rather than declared layering. This is what ships the Phase-1 polish risk.

### 2.7 Transition / loading state coverage

- **Scenario load (`PresidentialToolbar.tsx`):** sets `setLoading(true)` then `setLoadError(...)` on failure. No spinner — buttons just disable. No skeleton frames anywhere on the map.
- **Turn advance (`AdvanceTurnModal.tsx` → `TurnAftermathModal.tsx`):** modal-to-modal handoff is direct; no transition. `globals.css` has `panelSlideInRight 200ms ease-out`, `crtFlicker`, `powerOn 0.3s`, `stanceFlash 500ms`, `stanceToastIn/Out 150–200ms` — but these are local to specific surfaces, not a shared transition vocabulary.
- **Codex open:** `CodexPanel.tsx` mounts at `z-[900]` over a black/70 backdrop; no in/out animation.
- **Replay scrub (`ReplayScrubber.tsx`):** no cross-fade between frames; the map state is replaced wholesale.
- **Empty states:** 11 components carry empty-state prose. Several mid-surface lists (ForceReadiness, OperationsSection, SectorsSection, OrbatSection) render quietly when input arrays are empty.
- **Error states:** `setLoadError` exists on the store (read at toolbar level). 21 catch blocks across `App.tsx` live; few present user-facing messages — most swallow or `console.warn`.

### 2.8 Iconography + typography

- React shell: `font-mono`, `text-[9px–14px]`, `tracking-[0.15em–0.30em]`, `uppercase`, `text-amber-400 / text-accent-gold / text-text-secondary / text-text-primary`. ~333 occurrences of these patterns across 30 files — the discipline is real.
- Warroom shell uses different label voice (`warroom_identity.ts`, plus per-modal class strings). Less mono-uppercase, more document-mimicking text.
- `Icon.tsx` is a minimal one-file icon shim. Equipment icons in CorpsCard, status icons in `composeTacticalDeckLayers`, and Heroicons-style imports are mixed; no central icon catalog.

---

## 3. Gap matrix

Severity convention: P0 = blocking shipping polish; P1 = visible to all players; P2 = visible under specific flow; P3 = engineering/code-health debt.

### 3.1 Phase 1 (Shell + Transition Polish) gaps

| ID | Severity | Effort | Title | Description |
|---|---|---|---|---|
| **P1-A** | P1 | M (3–4 h) | Centralize z-index tokens | No central z-index file. 17+ literal numbers ranging `60..99999` scattered across 24 files. Risk: a future modal lands at the wrong layer; Chronicle-from-Army-HQ stacking is ad-hoc. Action: introduce `src/ui/map/utils/zIndex.ts` (`Z.PANEL_RAIL_PRIMARY=100, Z.SHELL_TOP=100, Z.SHELL_FLOATING=200, Z.PANEL=500, Z.MODAL=1000, Z.MODAL_HARD=9000, Z.GAME_OVER=99000`), migrate literals. Faction-agnostic, pure code. |
| **P1-B** | P1 | M (4–5 h) | Modal entry/exit transitions | `globals.css` defines `animate-fadeIn / animate-slideUp` but ~12 modals open instantly with `fixed inset-0 z-[…]` and no animation. Action: move `animate-fadeIn` (or new `animate-modalIn`) into a shared `<Modal>` wrapper or a common util mixin. |
| **P1-C** | P1 | S (1–2 h) | Loading skeleton on first scenario load | Toolbar disables buttons but no top-level spinner / skeleton when `useGameStore.loadedGameState` is null. First-paint feels frozen. Action: add `<MapShellSkeleton/>` covering OOBSidebar + minimap shimmers; reuse existing `shimmer 1.5s` keyframe in `globals.css`. |
| **P1-D** | P1 | S (1–2 h) | Save-load error toast | `setLoadError` writes to store but no UI consumer renders the message. Action: tiny `<LoadErrorToast/>` mounted at App root, dismissible, `z-[8500]`. |
| **P1-E** | P1 | S (1 h) | Empty-state pass on Army HQ subpanels | ForceReadiness, OperationsSection, SectorsSection, OrbatSection, CommandRelationshipSection — render nothing if data array is empty. Inconsistent with PresidentialDecisionRoomPanel + CorpsSituationSection that already do this. Action: drop in 5 short "No active formations" / "No staff officers reporting" lines. |
| **P1-F** | P2 | S (1 h) | ESC dismissal consistency | `useKeyboardShortcuts.ts` correctly cedes ESC to ArmyHQModal; ChronicleOverlay, CodexPanel, OpsPlanningModal each install their own ESC handlers. Some inner deep-modals (CommanderSelection, Dayton, OperationBriefing) close via inline backdrop click but not always ESC. Action: audit and unify; move ESC into `<Modal>` wrapper alongside P1-B. |
| **P1-G** | P2 | S (1–2 h) | Replay scrub transition smoothing | `ReplayScrubber.tsx` swaps frames hard. Add a brief opacity cross-fade on the map canvas via `MapContainer.tsx` style transition when `isReplayScrubbing`. |
| **P1-H** | P2 | S (1–2 h) | Two bottom bars conflict potential | `BottomStatusStrip.tsx` (always-on) and `WarroomStatusBar.tsx` (opt-in priority pulse, `z-[60]`) can co-exist; they happen to lay out without colliding today only because Warroom one is bottom-right and small. Document the layout rule in `panelRail.ts` (or `UI_OWNERSHIP_MATRIX.md`) so a future enlargement of either stays safe. |
| **P1-I** | P3 | S (1 h) | Toolbar empty-band remediation | Documented gap from `20260327_COMMAND_SIDEBAR_LAYOUT_KNOWLEDGE.md`: large blank below 48-px Presidential bar in OOBSidebar. Three options proposed in that doc. Pick one (split CSS var, tighter list, or z-index pull). Faction-agnostic visual nit. |
| **P1-J** | P3 | M (2–3 h) | Focus management in modal stack | When closing TurnAftermath -> Inbox transition, focus does not always return to the originator. Add `aria-modal`, `role="dialog"`, and a small `useReturnFocus(ref)` hook in `<Modal>`. Accessibility-adjacent. |

**Phase 1 totals:** 10 gaps. P0=0, P1=5, P2=3, P3=2.

### 3.2 Phase 2 (Visual Consistency) gaps

| ID | Severity | Effort | Title | Description |
|---|---|---|---|---|
| **P2-A** | P1 | M (3–4 h) | Canonicalize faction palette across shells | Five distinct palettes (`FACTION_GLOW_RGB`, theme `FACTION_HEX_COLORS`, theme Tailwind classes, Warroom `FACTION_COLORS`, `InvestmentPanel.ts` private). Action: promote `FACTION_GLOW_RGB` (Wave 8 Lane D, frozen, faction-symmetric, already canonical for Phase 3 deck.gl features) to the project-wide source-of-truth; derive theme hex / Tailwind / Warroom shapes as projections of it. Delete InvestmentPanel + SettingsModal ad-hoc palettes. |
| **P2-B** | P1 | S (1–2 h) | Fix SettingsModal faction-color inversion | `SettingsModal.ts` uses RS=blue, HRHB=red — opposite of every other surface. Action: replace inline conditional with `factionGlowRgb(faction)` or warroom palette lookup. Player-visible; possibly historical-symbolism sensitive. |
| **P2-C** | P2 | M (2–3 h) | Typography scale token | Magic numbers `text-[8px]–text-[14px]` and `tracking-[0.15em]–tracking-[0.30em]` repeat widely. Action: define `FONT_SCALE = {micro:8, label:9, body:10, lead:12, head:14}` and `TRACKING = {tight:0.15, normal:0.22, wide:0.30}` in tailwind config or theme.ts; adopt via 1–2 sweep commits. |
| **P2-D** | P2 | M (2–3 h) | Spacing rhythm token | Padding/margin literal counts (`px-2.5 py-1.5`, `gap-3`, `space-y-3`) are stable but unspecified. Action: pull into a small `SPACING = {xs, sm, md, lg, xl}` map; mirror what the v0.8-to-v0.9 density plan asked for in Phase 2. |
| **P2-E** | P2 | M (3–4 h) | Iconography catalog | `Icon.tsx` is one-shim; equipment glyphs, status badges, deck.gl emoji, and Heroicons coexist. Action: stand up `src/ui/shared/icons/index.ts` re-exporting a curated 20–30 icon set; document allowed sizes (`12, 16, 20, 24`). |
| **P2-F** | P2 | M (3–4 h) | Color-semantic tokens | Success/warning/error/info live as ad-hoc class strings (`text-green-400`, `text-amber-400`, `text-red-400`, `text-blue-400`) plus engine helpers (`getCohesionColor`, `OUTCOME_COLORS`). Action: declare `STATUS = {ok, warn, alert, info, neutral}`; wire one usage example in BottomStatusStrip. |
| **P2-G** | P2 | M (4–6 h) | Layer composition contract | deck.gl features (Map That Scars / Force Quality / Refugee / Corridor Heartbeat) layer onto MapLibre + DOM overlays without a documented z-order. `composeTacticalDeckLayers.ts` decides ordering, but cross-layer rules (e.g., Force-Quality glow vs Map-That-Scars damage in the same OSID) are implicit. Action: document the deck.gl layer order in a single comment block; mirror in `TACTICAL_MAP_SYSTEM.md`. |
| **P2-H** | P2 | M (4–6 h) | Warroom art finalization (4 anchors) | Per `WARROOM_MASTER.md`: anchors 9–12 (`commander_coatrack`, `enclave_dispatch_folder`, `intelligence_packet`, `honors_memorial`) prompt-ready, not yet baked. Action: bake into all 6 (or 15) scene plates per the unified-room spec. Plan §2 Phase 2 deliverable. |
| **P2-I** | P3 | S (1–2 h) | Empty-state visual language | Existing empty-state strings vary in voice ("No data" vs "No formations reporting" vs italic `(none)`). Action: pick one voice and gloss; touch the 11 files identified. |
| **P2-J** | P3 | S (1–2 h) | Animation vocabulary alignment | `panelSlideInRight 200ms`, `crtFlicker 0.15s`, `powerOn 0.3s`, `stanceFlash 500ms`, `stanceToastIn 150ms`, `stanceToastOut 200ms`, `shimmer 1.5s` co-exist. Action: cap durations to a 3-tier vocabulary (`fast=150, base=300, slow=500`) and document in `globals.css` header. |

**Phase 2 totals:** 10 gaps. P0=0, P1=2, P2=6, P3=2.

---

## 4. Prioritized backlog (next 5–10 lanes)

Ordered by player visibility × low cross-cutting risk. Each lane is Ring 1 / faction-agnostic / no §6 / read-only on sim.

| Order | Lane code | Severity | Effort | What ships |
|---|---|---|---|---|
| 1 | LANE-V094-FACTION-PALETTE-CANONICALIZATION (P2-A + P2-B) | P1 | M | One canonical faction palette source; derived projections for Tailwind / hex / warroom; delete InvestmentPanel + SettingsModal ad-hoc forks. Includes the SettingsModal RS/HRHB color-swap fix (high player visibility). |
| 2 | LANE-V094-Z-INDEX-TOKENS (P1-A) | P1 | M | `src/ui/map/utils/zIndex.ts` with named tiers; migrate all literals. Faction-agnostic. |
| 3 | LANE-V094-MODAL-WRAPPER (P1-B + P1-F + P1-J) | P1 | M | Shared `<Modal>` wrapper that owns enter/exit animation, ESC handling, and focus return; migrate 3–4 representative modals. |
| 4 | LANE-V094-LOADING-AND-ERROR (P1-C + P1-D) | P1 | S | First-paint scenario-load skeleton + dismissible LoadErrorToast. |
| 5 | LANE-V094-EMPTY-STATE-PASS (P1-E + P2-I) | P1 | S | One-voice empty-state pass across Army HQ and 6–8 other surfaces. |
| 6 | LANE-V094-TYPOGRAPHY-SPACING-TOKENS (P2-C + P2-D) | P2 | M | Codify font scale + tracking + spacing into theme.ts and apply representative usage. |
| 7 | LANE-V094-COLOR-SEMANTICS-TOKENS (P2-F) | P2 | M | Status semantic tokens (ok/warn/alert/info/neutral). |
| 8 | LANE-V094-ICONOGRAPHY-CATALOG (P2-E) | P2 | M | Curated icon catalog; document allowed sizes. |
| 9 | LANE-V094-LAYER-COMPOSITION-CONTRACT (P2-G) | P2 | M | Documented deck.gl/MapLibre/DOM layer order; ties off the Phase 3 features cleanly. |
| 10 | LANE-V094-WARROOM-ART-ANCHORS-9-12 (P2-H) | P2 | M | Bake `commander_coatrack`, `enclave_dispatch_folder`, `intelligence_packet`, `honors_memorial` into the warroom scene plates per WARROOM_MASTER.md. Asset-side, not React. |

---

## 5. Quick wins (<2 hours of agent time)

| ID | Lane | Why it's a quick win |
|---|---|---|
| **QW-1** | P2-B (SettingsModal RS/HRHB color swap) | Single 1-line fix; high player visibility; clearly wrong (RS as blue contradicts every other surface). |
| **QW-2** | P1-C (loading skeleton) | Reuses existing `shimmer 1.5s` keyframe + 30 LOC `<MapShellSkeleton/>` mounted while `loadedGameState===null`. |
| **QW-3** | P1-D (LoadErrorToast) | `setLoadError` already writes to the store; consumer is one tiny component plus a 6-line subscribe. |
| **QW-4** | P1-E (empty-state subpanels) | 5 string additions across 5 files in the Army HQ subtree. |
| **QW-5** | P1-I (toolbar empty-band) | Pick option from `20260327_COMMAND_SIDEBAR_LAYOUT_KNOWLEDGE.md` (split CSS var has the smallest blast radius); ~10 LOC. |
| **QW-6** | P2-J (animation vocabulary) | Comment-only sweep + 1–2 duration corrections to fit 3-tier vocabulary. |

**Six quick-wins, all <2 h, all Ring 1, faction-agnostic, no §6 surface.**

---

## 6. Cross-cutting risks

| Risk | Affects | Mitigation |
|---|---|---|
| Faction palette canonicalization (LANE-1) touches both React shell and Warroom .ts shell | All visual layers, every modal, both rendering models | Land in two commits: (1) introduce canonical source + projections (no callsite changes); (2) sweep callsites. Verify-before-exit per Wave 9 lesson: `git show --stat HEAD` confirms expected file count. |
| Z-index migration (LANE-2) is wide-touch | All modals/panels/overlays | Same two-commit pattern: tokens first, then sweep. Smoke pass is visual-only — no determinism risk. |
| Modal wrapper (LANE-3) changes ESC + focus semantics | Any modal that locally handles ESC | Keep migration scoped to 3–4 representative modals in the first commit; do not ship a sweeping rewrite. |
| Typography/spacing tokens (LANE-6) touch ~30 files | All Tailwind-styled React surfaces | Land tokens first, then opt-in adoption. Avoid one-shot blanket sweep. |
| Warroom art bake (LANE-10) is asset-pipeline work | Bakery / scene plate generation | Asset-only; no code coupling to other lanes. Plan-§2 Phase 2 deliverable; can land out-of-order with the other 9 lanes. |
| Tutorial onboarding (`onboardingSteps.ts`) anchors via `data-tutorial-step` attributes | Modal wrapper migration | Preserve `data-tutorial-step="presidential-toolbar"` etc. when migrating; spotlight resolution depends on these. |
| Phase-3 deck.gl features (already shipped) consume `FACTION_GLOW_RGB` directly | Force-Quality / Refugee / Corridor / Map-That-Scars | LANE-1 must keep `FACTION_GLOW_RGB` byte-identical (or as the canonical source). All four Phase-3 lanes already validated against this palette — drift would re-open shipped features. |

**Determinism note:** all proposed lanes are UI-layer; none touch sim code, scenarios, or `state/`. Hash gate is not in scope. The Wave 8/9 lesson on parallel-agent index race applies if multiple of these lanes are dispatched concurrently; recommend solo dispatch for LANE-1 and LANE-2 since they both sweep wide.

---

## 7. Sensitive-history compliance (audit-only; Ring 1; no §6 surface)

This audit is read-only on `src/ui/`, `docs/40_reports/`, `docs/plans/`. **No** changes to:

- `src/sim/` (engine)
- `data/scenarios/` (scenarios)
- `data/derived/` (derived data)
- `docs/10_canon/` (canon)
- `docs/10_canon/FORAWWV.md` (manual-only)
- `political_controllers`, `OOB`, paint anchors, rupture wiring, `enclave_resilience.ts`
- §6 sensitive-history surface

The audit names asset and color work for v0.9.4 polish, all of which is faction-agnostic *mechanism* (palette is data, not logic) operating on pre-existing per-faction symmetric data. The SettingsModal RS=blue/HRHB=red color inversion (P2-B / QW-1) is the only finding that touches faction-specific visuals; the fix restores the existing canonical palette per `FACTION_GLOW_RGB` and removes the ad-hoc inversion. This is correction, not introduction, of faction symbology — Ring 1 / faction-agnostic mechanism with corrected data.

**Sensitive-history compliance: GREEN.**

---

## 8. Recommended next implementation lane

**`LANE-V094-FACTION-PALETTE-CANONICALIZATION` (LANE-1 in §4 backlog).**

Justification:
1. **Highest player visibility per hour of agent time.** SettingsModal RS=blue inversion is wrong on every other surface; correcting it is a 5-line edit in a single file. The wider canonicalization unblocks LANE-3 (Phase-2 token surface) and LANE-9 (deck.gl layer composition contract).
2. **Lowest cross-cutting risk among Phase-2 P1 items.** Palette is data; the mechanism is faction-symmetric lookup. No engine-side change required.
3. **Aligns with established Wave-8 Lane-D pattern.** `FACTION_GLOW_RGB` is already canonical for the four Phase-3 deck.gl features; promoting it to the React shell + Warroom .ts shell mirrors that proven structure.
4. **Faction-agnostic mechanism, asymmetric data per validated convention.** No §6 trigger.
5. **Fits the "two-commit" pattern recommended in §6.** Commit 1 = source-of-truth + projections. Commit 2 = callsite sweep + delete duplicates. Verify-before-exit at each commit.

Suggested binding criteria for the implementation lane:
- C1: One canonical `FACTION_GLOW_RGB`-equivalent source, frozen, in a non-`/layers/` location accessible from both `src/ui/map/` and `src/ui/warroom/` (likely `src/ui/shared/factionPalette.ts`).
- C2: `theme.ts` / `warroom_utils.ts` palettes derived from C1 (no duplicate literal RGBs).
- C3: `src/ui/warroom/components/InvestmentPanel.ts` and `src/ui/warroom/components/SettingsModal.ts` ad-hoc palettes deleted; SettingsModal accent uses canonical lookup.
- C4: All four Phase-3 deck.gl validation tests still GREEN (`force_quality_glow_overlay_builder.test.ts`, `refugee_column_overlay_builder.test.ts`, `corridor_heartbeat_overlay_builder.test.ts`, plus Map-That-Scars validator).
- C5: 40w smoke-test hash byte-identical (sim layer untouched; should be a freebie verification).
- C6: Verify-before-exit: `git show --stat HEAD` for each of the two commits matches expected file lists.
- C7: Sensitive-history compliance assertion in the implementation report (Ring 1, faction-agnostic mechanism, no §6 surface).

---

## 9. Output summary

- **Phase 1 gaps:** 10 total. P0=0, P1=5 (z-index tokens, modal transitions, loading skeleton, error toast, empty-state pass), P2=3, P3=2.
- **Phase 2 gaps:** 10 total. P0=0, P1=2 (faction palette canonicalization, SettingsModal RS/HRHB inversion), P2=6, P3=2.
- **Quick wins:** 6 items, all <2 h, all Ring 1.
- **Recommended next lane:** `LANE-V094-FACTION-PALETTE-CANONICALIZATION`.

End of audit.
