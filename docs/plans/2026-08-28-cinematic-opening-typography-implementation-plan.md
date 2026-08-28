# Cinematic Opening and Typography Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver one cinematic React-owned opening for browser and packaged-host startup, preview each faction's exact 1992 Warroom before confirmation, continue into that same Warroom after campaign creation, and enforce a locally bundled two-family typography system across the active player UI.

**Architecture:** Keep all new behavior renderer-only. The outer Electron Warroom document continues as the IPC/iframe host and boots the existing embedded React shell into its default menu route, with the legacy menu retained only as a bounded load-failure fallback. A shared aspect-fit scene component renders both opening previews and the playable Warroom from the same URL/geometry; a pure presentation state machine coordinates cancellable transform/opacity transitions without touching campaign state.

**Tech Stack:** React 18, TypeScript, Tailwind/CSS, Vite asset imports, existing Electron iframe bridge, Vitest, Testing Library. No new runtime dependency.

**Design authority:** `docs/plans/2026-08-28-cinematic-opening-typography-design.md`

---

## Implementation Receipt — 2026-08-28

| Task | Status | Evidence / remaining action |
|---:|---|---|
| 1 | Complete | R7 amendment registered in roadmap, command board, and accepted functional-opening plan. |
| 2–8 | Complete | Scene substrate, transition state machine, React opening, exact-room handoff, desktop host ownership/recovery, and recursive typography enforcement landed. Healthy startup constructs/loads no legacy `WarPlanningMap`. |
| 9 | **Open — owner art** | Temporary splash is `hq_presidential_desk_1992.webp`; neutral room is CSS fallback; foreground/portal art is absent. Integrate the four owner surfaces without reopening mechanics. Validate the final RBiH plate against the 2752-wide contract; the retained source is 2750×1536 and this is an asset-validation item, not a mechanics defect. |
| 10 | Browser/build/focused proof complete; packaged open | Five viewports and 83+ screenshots pass the fallback-art matrix. Live packaged-Electron first-paint/acceptance was not run. The blocked packaged probe/RE route was untouched and earns no credit. |
| 11 | Complete | Focused corrections, recovery retry semantics, source-bound readiness, short-screen coverage, and lazy legacy-map simplification landed. |
| 12 | Complete in documentation commit | Living architecture, GUI/Warroom masters, roadmap/control docs, ledger, knowledge, and napkin synchronized without editing canon. |

Material implementation commits: design/roadmap `3fd1a15b5`, `b67925484`, `9c8f34332`, `892909ca9`, `2af6aeba1`; typography `84828e9a5`, `079470d96`, `47e878a3c`, `44b42f28b`, `5a9244215`; scene/transition/menu/handoff `14b139cd6`, `8fd70ebca`, `8718f17b0`, `8a89d5930`, `65994aa90`, `3e9c8541b`, `5151dae6a`, `bc4c837a1`; host/readiness/recovery `1c2055751`, `c68755deb`, `a8e04ca28`, `5f8bef696`, `02aaf45a9`, `44d6aeaed`, `bdcab07fe`, `6c0055295`; verification/harness `2299c4299`, `7f2e7dd31`, `aaa737491`.

Verification is intentionally reported as separate overlapping gates, not one invented total: architecture 27/27; host/Warroom 199/199, then lazy-map 268/268; responsive 51/51; Task 10 139/139 before later fixes; typecheck and both builds green. The ignored browser receipt is `.tmp_first_hour_browser_gate/first_hour_browser_gate.json`; the harness is tracked at `tools/ui/first_hour_browser_gate.cjs`. The five-view matrix (1920×1080, 1366×768, 1024×768, 700×900, 1024×560) recorded exact 0px scene continuity, no black/uncovered frames, overflow, or occlusion, 9.61:1 minimum contrast, 2px focus, transform-free 155ms reduced motion, and local fonts with no remote references.

The canonical `npm run test:vitest:balanced` result is **red**: 1335 files / 13273 tests; 1325 files pass, 5 fail, 5 skip; 13231 tests pass, 6 fail, 36 skip. Three former UI/docs assertions were corrected and separately pass. Remaining inherited failures cover the same three unstaffed sectors in deterministic 40-week deployment-health/run-diagnostics tests and a Cutileiro RBiH accepted-control expectation (43.6798% current vs 44% offer). The delta from the authorized base contains no relevant engine/canon paths. Plain `test:vitest` was interrupted after more than 30 minutes on an unsharded property file; the balanced command remains the full-suite authority under CODE_CANON.

The active-player typography audit positively covers 254 shipped map-UI TS/TSX/JS/JSX sources, including Deck/canvas constants, with narrow exclusions for debug, painter, story, standalone, and map-glyph PBF surfaces. IBM Plex Sans Condensed owns command/prose; IBM Plex Mono Latin-1 plus Latin-2 owns data/code/status and Bosnian glyphs. Exact upstream provenance and hashes are in `assets/ui/fonts/README.md`.

---

## Scope Lock

Allowed implementation surfaces:

- `src/ui/map/**` presentation code and active UI tests
- `src/ui/warroom/index.html` and `src/ui/warroom/warroom.ts` only for normal-start delegation and fallback ownership
- existing Warroom image/region registries
- local font assets and font license/provenance
- R7/GUI documentation and ledger

Forbidden surfaces:

- `src/sim/**`, `src/state/**`, scenarios, calibration, and data truth
- `src/desktop/electron-main.cjs`, `desktop_sim.ts`, preload, IPC channels/payloads, or save schema
- package/probe configuration, Army-HQ chunking, RE P2B/P3, or packaged-probe diagnosis
- MapLibre mechanics and map glyph PBF migration
- audio, localization Phase 3, canon, and `docs/10_canon/FORAWWV.md`
- replacement/regeneration of faction Warroom plates or hotspot manifests

Determinism checklist:

- No random selection, wall-clock-derived presentation state, or timestamps in persisted output.
- Timers are UI-only, are cleaned up on unmount, and never affect campaign payload or success.
- Faction iteration stays in canonical `RBiH`, `RS`, `HRHB` order.
- Rapid selection uses a monotonically increasing in-memory token; latest explicit input wins.
- Asset load failure degrades to the currently visible neutral/room plate without changing game state.

## Task 1: Register the R7 Amendment Before Code

**Files:**

- Modify: `docs/plans/MASTER_ROADMAP.md`
- Modify: `docs/plans/COMMAND_BOARD.md`
- Modify: `docs/plans/2026-08-23-opening-screens-implementation-plan.md`

**Step 1: Add the bounded amendment**

Mark R7 opening presentation active with this exact scope: cinematic neutral splash/monitoring room, faction Warroom preview/continuity, two-family typography, browser/host verification. State that the existing functional opening mechanics remain accepted.

**Step 2: Pin exclusions and dependency**

Record that RE remains blocked and untouched. Actual packaged acceptance waits for an authorized non-conflicting packaged-runtime verification route; browser/build/unit work proceeds independently.

**Step 3: Verify roadmap synchronization**

Run:

```powershell
rg -n "cinematic|typography|2026-08-28-cinematic-opening" docs/plans/MASTER_ROADMAP.md docs/plans/COMMAND_BOARD.md docs/plans/2026-08-23-opening-screens-implementation-plan.md
```

Expected: all three documents point to this packet and describe the same status.

**Step 4: Commit**

```powershell
git add docs/plans/MASTER_ROADMAP.md docs/plans/COMMAND_BOARD.md docs/plans/2026-08-23-opening-screens-implementation-plan.md
git commit -m "docs: register cinematic opening amendment"
```

## Task 2: Make the Two-Family Contract Real

**Files:**

- Add: `assets/ui/fonts/IBMPlexMono-Regular-Latin1.woff2`
- Add: `assets/ui/fonts/IBMPlexMono-SemiBold-Latin1.woff2`
- Add: `assets/ui/fonts/OFL-1.1.txt`
- Add: `assets/ui/fonts/README.md`
- Modify: `src/ui/map/styles/globals.css`
- Modify: `src/ui/map/tailwind.config.ts`
- Create: `tests/ui/typography_contract.test.ts`

**Step 1: Write the failing contract test**

Assert that:

- `globals.css` defines `--font-command` and `--font-data`.
- local `@font-face` rules exist for Sans Condensed regular/semibold/bold and Mono regular/semibold.
- Tailwind `sans` and `mono` resolve through those variables; `serif` resolves to command, preventing a default serif escape.
- the two Mono WOFF2 assets and OFL license exist and are non-empty.
- no external `http(s)` font URL is referenced.

**Step 2: Run RED**

```powershell
npx vitest run tests/ui/typography_contract.test.ts
```

Expected: FAIL because the variables, font faces, and Mono files do not exist.

**Step 3: Vendor only required official Mono files**

Obtain Regular and SemiBold Latin1 WOFF2 files from IBM's official Plex distribution at a pinned revision. Record source revision, original paths, SHA-256 hashes, and SIL OFL 1.1 in `assets/ui/fonts/README.md`. Do not add an npm font dependency or the full family.

Use the existing repository Sans Condensed files:

- `assets/ui/fonts/IBMPlexSans_Condensed-Regular.ttf`
- `assets/ui/fonts/IBMPlexSans_Condensed-SemiBold.ttf`
- `assets/ui/fonts/IBMPlexSans_Condensed-Bold.ttf`

**Step 4: Define central tokens and faces**

At the top of `globals.css`, define local faces with `font-display: swap`, then:

```css
:root {
  --font-command: "IBM Plex Sans Condensed", sans-serif;
  --font-data: "IBM Plex Mono", monospace;
}
```

Map `body` to `var(--font-command)`. Update Tailwind:

```ts
fontFamily: {
  sans: ['var(--font-command)'],
  serif: ['var(--font-command)'],
  mono: ['var(--font-data)'],
},
```

**Step 5: Run GREEN**

```powershell
npx vitest run tests/ui/typography_contract.test.ts
```

Expected: PASS.

**Step 6: Commit**

```powershell
git add assets/ui/fonts src/ui/map/styles/globals.css src/ui/map/tailwind.config.ts tests/ui/typography_contract.test.ts
git commit -m "feat(ui): bundle canonical interface fonts"
```

## Task 3: Extract One Warroom Scene Substrate

**Files:**

- Create: `src/ui/map/components/warroom/WarroomScenePlate.tsx`
- Create: `src/ui/map/components/opening/openingScenes.ts`
- Modify: `src/ui/map/components/warroom/warroom-asset-urls.ts`
- Modify: `src/ui/map/components/warroom/WarroomShellLayer.tsx`
- Create: `tests/ui/warroom_scene_continuity.test.ts`
- Modify: `tests/ui/warroom_shell_accessibility.test.ts`

**Step 1: Write the failing continuity test**

Prove that:

- the typed registry exposes exact 1992 URLs for all three canonical factions;
- both preview and playable rendering use `WarroomScenePlate`;
- the plate fixes `2752 / 1536` geometry and aspect-fit positioning;
- the scene image is decorative and cannot intercept input;
- the existing Warroom still mounts hotspots/projected map/date over the shared plate.

**Step 2: Run RED**

```powershell
npx vitest run tests/ui/warroom_scene_continuity.test.ts tests/ui/warroom_shell_accessibility.test.ts
```

Expected: FAIL because the shared plate/typed preview registry do not exist.

**Step 3: Implement the passive scene plate**

`WarroomScenePlate` accepts:

```ts
interface WarroomScenePlateProps {
  src: string;
  state?: 'current' | 'incoming';
  transformOrigin?: string;
  className?: string;
  children?: ReactNode;
}
```

It owns only the centered 2752 x 1536 aspect-fit frame and decorative image. It does not know faction, year, hotspots, game state, or animation timing.

**Step 4: Export opening scene identities**

Add a typed `WARROOM_1992_SCENE_URLS` projection from the existing `WARROOM_SCENE_URLS`; do not import duplicate images. Define the canonical map-anchor bounds from the region manifests in `openingScenes.ts` and derive CSS transform-origin percentages.

**Step 5: Refactor WarroomShellLayer**

Compose the new plate around the current projected map, date, toolbar, status, and hotspots without changing their geometry, behavior, or z-order.

**Step 6: Run GREEN and the existing shell slice**

```powershell
npx vitest run tests/ui/warroom_scene_continuity.test.ts tests/ui/warroom_shell_accessibility.test.ts tests/warroom_shell_layer.test.ts
```

Expected: PASS.

**Step 7: Commit**

```powershell
git add src/ui/map/components/warroom src/ui/map/components/opening/openingScenes.ts tests/ui/warroom_scene_continuity.test.ts tests/ui/warroom_shell_accessibility.test.ts tests/warroom_shell_layer.test.ts
git commit -m "refactor(ui): share warroom scene substrate"
```

## Task 4: Build the Pure Opening Transition Controller

**Files:**

- Create: `src/ui/map/components/opening/openingTransition.ts`
- Create: `src/ui/map/components/opening/OpeningCinematicLayer.tsx`
- Create: `tests/ui/opening_transition.test.ts`
- Modify: `src/ui/map/styles/globals.css`

**Step 1: Write failing state-machine tests**

Cover:

- neutral initial scene;
- explicit faction request without campaign start;
- latest request wins during an active transition;
- asset decode failure retains the current scene and settles accessibly;
- reduced-motion chooses dissolve with no camera transform;
- cancellation and unmount clear timers/listeners;
- transition completion is not required for campaign submission.

**Step 2: Run RED**

```powershell
npx vitest run tests/ui/opening_transition.test.ts
```

Expected: FAIL because the controller does not exist.

**Step 3: Implement the pure reducer/controller**

Use explicit presentation phases:

```ts
type OpeningPhase = 'idle' | 'push' | 'masked' | 'resolve';
type OpeningScene = 'neutral' | 'RBiH' | 'RS' | 'HRHB';
```

The controller carries `displayedScene`, `requestedScene`, `token`, `phase`, and `reducedMotion`. It never stores or accepts `GameState`.

**Step 4: Implement the cinematic layer**

Render at most current + incoming plates. Decode only the requested image. Use the canonical map transform origin. Animate transform/opacity only; use a CSS map-texture portal that can later accept the owner asset without changing mechanics.

**Step 5: Add CSS and reduced-motion/narrow gates**

Normal duration: 1000-1150 ms. Reduced-motion/short/narrow: 150-160 ms dissolve. Do not use blur/filter animation, forced timers, or `transitionend` as a correctness dependency.

**Step 6: Run GREEN**

```powershell
npx vitest run tests/ui/opening_transition.test.ts tests/ui/accessibility_reduced_motion.test.ts
```

Expected: PASS.

**Step 7: Commit**

```powershell
git add src/ui/map/components/opening src/ui/map/styles/globals.css tests/ui/opening_transition.test.ts tests/ui/accessibility_reduced_motion.test.ts
git commit -m "feat(ui): add cancellable warroom preview transition"
```

## Task 5: Replace the Case-File Composition With the Cinematic Flow

**Files:**

- Modify: `src/ui/map/components/MainMenu.tsx`
- Create: `src/ui/map/components/opening/OpeningSplash.tsx`
- Modify: `src/ui/map/styles/globals.css`
- Modify: `tests/ui/main_menu_opening_flow.test.ts`
- Modify: `tests/ui/main_menu_language.test.ts`
- Modify: `tests/ui/main_menu_field_records.test.ts`
- Create: `tests/ui/opening_splash.test.ts`

**Step 1: Write failing DOM tests**

Assert:

- splash precedes the menu and is dismissible by click, Enter, Space, and Escape;
- splash has real DOM title/version and decorative art semantics;
- landing/faction/records remain neutral until a deliberate faction selection;
- faction options preserve canonical order and selected semantics;
- clicking RS previews RS without calling `onNewGame`;
- changing RS -> HRHB leaves HRHB as the final preview;
- dossier and mode keep the same room identity;
- Back never starts a campaign;
- Begin remains exactly-once with the unchanged payload;
- existing Field Records and locale behavior remain functional.

**Step 2: Run RED**

```powershell
npx vitest run tests/ui/main_menu_opening_flow.test.ts tests/ui/opening_splash.test.ts tests/ui/main_menu_language.test.ts tests/ui/main_menu_field_records.test.ts
```

Expected: FAIL on missing splash/preview behavior.

**Step 3: Implement the splash**

Use the existing `hq_presidential_desk_1992.webp` only as a clearly documented temporary fallback for the owner-provided `opening_splash_neutral_master`. Do not use `game start.webp`. No forced timer; input may dismiss immediately.

**Step 4: Recompose MainMenu**

- Remove the giant serif title, italic slogan, cream paper card, and decorative rotation.
- Place a compact institutional title/action rail over the neutral scene.
- Keep the faction choices visible while dossier/mode content changes.
- Feed selected faction into `OpeningCinematicLayer`.
- Keep all current copy, start payload, records, locale, error, and focus behavior unless a test proves the composition requires a presentational adjustment.

Use a CSS-built monitoring-room fallback/neutral plate until the owner-generated monitoring asset lands. Put the neutral source behind a single registry entry so asset replacement is one-line and cannot affect mechanics.

**Step 5: Run GREEN**

```powershell
npx vitest run tests/ui/main_menu_opening_flow.test.ts tests/ui/opening_splash.test.ts tests/ui/main_menu_language.test.ts tests/ui/main_menu_field_records.test.ts
```

Expected: PASS.

**Step 6: Commit**

```powershell
git add src/ui/map/components/MainMenu.tsx src/ui/map/components/opening/OpeningSplash.tsx src/ui/map/styles/globals.css tests/ui/main_menu_opening_flow.test.ts tests/ui/opening_splash.test.ts tests/ui/main_menu_language.test.ts tests/ui/main_menu_field_records.test.ts
git commit -m "feat(ui): create cinematic faction opening"
```

## Task 6: Preserve the Room Through Campaign Confirmation

**Files:**

- Modify: `src/ui/map/App.tsx`
- Modify: `src/ui/map/components/PeaceWarTransitionOverlay.tsx`
- Modify: `src/ui/map/components/WarHasBegunSplash.tsx`
- Modify: `tests/ui/app_boot_main_menu.test.ts`
- Modify: `tests/ui/peace_war_transition_overlay.test.ts`
- Modify: `tests/ui/first_hour_browser_gate_contract.test.ts`

**Step 1: Write failing handoff tests**

Prove that:

- successful new-campaign start routes to `appScreen='warroom'`;
- failed start remains on the selected menu preview;
- Continue/load retain their existing routes;
- the date handoff overlays the Warroom instead of replacing it with an opaque unrelated background;
- opening brief/foundational-decision order remains unchanged;
- no second faction dossier or second campaign invocation appears.

**Step 2: Run RED**

```powershell
npx vitest run tests/ui/app_boot_main_menu.test.ts tests/ui/peace_war_transition_overlay.test.ts tests/ui/first_hour_browser_gate_contract.test.ts
```

Expected: FAIL because successful start currently sets `appScreen='game'` and the date sting is opaque.

**Step 3: Route new campaigns to Warroom**

Change only the success branch of `handleSelectFaction`. Do not alter payload, IPC call, replacement transaction, reset ordering, or error handling.

**Step 4: Make the date sting translucent**

Retain the existing Warroom below the transition surface. Replace hardcoded serif/Arial stacks while touching these files. Preserve skip, seen-flag, same-faction restart, keyboard, and reduced-motion behavior.

**Step 5: Run GREEN**

```powershell
npx vitest run tests/ui/app_boot_main_menu.test.ts tests/ui/peace_war_transition_overlay.test.ts tests/ui/first_hour_browser_gate_contract.test.ts
```

Expected: PASS.

**Step 6: Commit**

```powershell
git add src/ui/map/App.tsx src/ui/map/components/PeaceWarTransitionOverlay.tsx src/ui/map/components/WarHasBegunSplash.tsx tests/ui/app_boot_main_menu.test.ts tests/ui/peace_war_transition_overlay.test.ts tests/ui/first_hour_browser_gate_contract.test.ts
git commit -m "feat(ui): carry campaign start into selected warroom"
```

## Task 7: Make Packaged-Host Startup Use the Same Opening

**Files:**

- Modify: `src/ui/warroom/index.html`
- Modify: `src/ui/warroom/warroom.ts`
- Modify: nearest existing host/bridge tests under `tests/`
- Create if absent: `tests/warroom_react_opening_owner.test.ts`

**Step 1: Write the failing host-ownership test**

Assert that normal host initialization:

- creates the operational React iframe with `embedded=1` and no forced `view=warroom` route;
- displays that frame as the opening owner;
- keeps the legacy `#main-menu/#side-picker` hidden and available only after a bounded iframe load failure;
- continues to proxy `startNewCampaign`, save listing/loading, and game-state subscriptions through the existing bridge;
- after campaign success, the React app itself changes to Warroom rather than the host starting a parallel legacy flow.

**Step 2: Run RED**

```powershell
npx vitest run tests/warroom_react_opening_owner.test.ts
```

Expected: FAIL because the legacy overlay currently owns first paint and starts on faction click.

**Step 3: Delegate normal startup**

Reuse `ensureOperationalShellIframe` and the current postMessage bridge. Add an opening URL without `view=warroom`; do not change Electron main, protocol handlers, preload, IPC, or build config. Normal startup displays this iframe. Existing loaded-game return continues to post `awwv-shell:show-warroom`.

**Step 4: Retain bounded recovery**

Keep legacy menu markup/handlers only for an iframe error/timeout path. It must not race the healthy React frame or be separately restyled as a second product flow. Label this fallback in source and docs.

**Step 5: Run host/bridge GREEN**

```powershell
npx vitest run tests/warroom_react_opening_owner.test.ts tests/warroom_tactical_embed.test.ts tests/warroom_react_shell_transition.test.ts
```

Use the actual nearest test filenames found by `rg --files tests | rg 'warroom.*(embed|shell|bridge)'` if names differ.

Expected: PASS with unchanged bridge semantics.

**Step 6: Commit**

```powershell
git add src/ui/warroom/index.html src/ui/warroom/warroom.ts tests
git commit -m "refactor(ui): make React opening the desktop host owner"
```

## Task 8: Remove Active Typography Escapes

**Files:**

- Modify: active offender files reported by the scoped audit under `src/ui/map/components/**`
- Modify: `src/ui/map/layers/buildTacticalDeckLayers.ts`
- Modify: `src/ui/map/map/formationIcons.ts` only if it does not already use Plex Mono
- Modify: `src/ui/map/components/warroom/WarroomShellLayer.tsx`
- Modify: `tests/ui/typography_contract.test.ts`

Initial active offender set includes:

- `MainMenu.tsx`
- `CodexPanel.tsx`
- `EventModal.tsx`
- `chronicle/ChronicleOverlay.tsx`
- `chronicle/ChronicleCard.tsx`
- `army_hq/ChiefOfStaffBriefing.tsx`
- `WarHasBegunSplash.tsx`
- `SettingsScreen.tsx`
- `CreditsScreen.tsx`
- `PeacePlanModal.tsx`
- `DaytonNegotiationModal.tsx`
- `components/ops_modal/*.tsx`
- `army_hq/CombatRecordSection.tsx`
- `warroom/WarroomShellLayer.tsx`
- `layers/buildTacticalDeckLayers.ts`

**Step 1: Extend the failing audit**

Create a scoped active-surface file inventory and fail on authored `Georgia`, `Times New Roman`, `Courier New`, `Arial`, `Helvetica`, `Segoe UI`, or `font-serif`. Explicitly exclude debug/painter/story/standalone tools and map glyph PBF configuration.

**Step 2: Run RED**

```powershell
npx vitest run tests/ui/typography_contract.test.ts
```

Expected: FAIL with the audited offender list.

**Step 3: Replace roles, not semantics**

- Prose/headings/documents/navigation -> `font-sans` or `var(--font-command)`.
- Dates/codes/tabular/status -> `font-mono` or `var(--font-data)`.
- Preserve semantic italic through the Plex family only.
- Deck/canvas labels use exported literal family constants because CSS variables are not resolved by canvas/WebGL text APIs.
- Do not convert all prose to uppercase or add tracking merely because the font is condensed.

**Step 4: Run GREEN and affected UI tests**

```powershell
npx vitest run tests/ui/typography_contract.test.ts tests/ui/gui_polish_typography_floor.test.ts tests/ui/warroom_shell_accessibility.test.ts
```

Expected: PASS.

**Step 5: Commit**

```powershell
git add src/ui/map tests/ui/typography_contract.test.ts tests/ui/gui_polish_typography_floor.test.ts tests/ui/warroom_shell_accessibility.test.ts
git commit -m "refactor(ui): unify active interface typography"
```

## Task 9: Integrate Owner Assets Without Reopening Mechanics

**Files:**

- Modify: `src/ui/map/components/opening/openingScenes.ts`
- Add when supplied: `src/ui/map/assets/opening/opening_splash_neutral.webp`
- Add when supplied: `src/ui/map/assets/opening/opening_monitoring_room_neutral.webp`
- Add optionally: `src/ui/map/assets/opening/opening_monitoring_foreground.webp`
- Add optionally: `src/ui/map/assets/opening/opening_map_portal.webp`
- Modify: `assets/manifests/assets_manifest.json` if required by its schema/current practice

**Step 1: Validate each supplied asset**

Verify dimensions, color space, alpha, file size, safe zones, and absence of baked text/logos/faction truth. Reject any room art that moves existing faction hotspots.

**Step 2: Replace only registry entries**

Swap the neutral fallback imports for the owner assets. Do not change state, timings, UI layout, or faction room assets.

**Step 3: Verify fallback behavior**

Temporarily force an image error in the focused test and prove the neutral CSS/retained plate remains usable; restore immediately.

**Step 4: Commit assets separately**

```powershell
git add src/ui/map/assets/opening src/ui/map/components/opening/openingScenes.ts assets/manifests/assets_manifest.json
git commit -m "assets(ui): add cinematic opening plates"
```

If the owner assets have not yet been supplied, leave this task explicitly open; all mechanics and typography can still complete, but visual-art acceptance cannot be claimed.

## Task 10: Browser and Build Verification

**Files:**

- Modify as needed: existing `tools/ui/first_hour_browser_gate.cjs`
- Add evidence under the existing R7/UI evidence convention

**Step 1: Run focused suites**

```powershell
npx vitest run tests/ui/main_menu_opening_flow.test.ts tests/ui/opening_splash.test.ts tests/ui/opening_transition.test.ts tests/ui/warroom_scene_continuity.test.ts tests/ui/typography_contract.test.ts tests/ui/app_boot_main_menu.test.ts tests/ui/peace_war_transition_overlay.test.ts tests/ui/first_hour_browser_gate_contract.test.ts
```

Expected: all PASS.

**Step 2: Run typecheck**

```powershell
npx tsc --noEmit
```

Expected: exit 0.

**Step 3: Run full Vitest**

```powershell
npm run test:vitest
```

Expected: exit 0. Record counts.

**Step 4: Build the tactical map**

```powershell
npm run desktop:map:build
```

Expected: exit 0; emitted CSS contains local bundled font URLs and no external font request.

**Step 5: Browser visual verification**

Start the existing Vite server and use the repository browser harness. Capture:

- splash
- neutral landing
- neutral faction selector
- RBiH/RS/HRHB selected previews
- mode view
- first confirmed Warroom frame
- reduced-motion view

At 1920 x 1080, 1366 x 768, and 1024 x 768; add a narrow/short viewport if the sheet breakpoint differs.

Verify no black flash, crop jump, horizontal overflow, missing focus ring, low-contrast copy, or console/network error. Compare preview and confirmed room geometry numerically, not only by eye.

**Step 6: Do not run blocked packaged probe**

No packaged-probe command, retry, diagnosis, or RE credit is authorized by this packet. Actual packaged first-paint acceptance remains a separately scheduled R7 verification when its route is explicitly non-conflicting and authorized.

## Task 11: Independent Review and Simplification

**Required roles:**

- Implementer: UI/UX/frontend specialist
- Reviewers: Technical Architect, Modern Wargame Expert, Quality Assurance Process
- Orchestrator: scope/verdict only; does not self-approve implementation

**Step 1: Request code review**

Review for state correctness, cancellation cleanup, accessibility, focus/input behavior, host bridge preservation, and forbidden-surface changes.

**Step 2: Request visual/wargame review**

Reject generic generated-art tells, false operational map truth, faction tint fog, direct-military-command framing, and transition/crop discontinuity.

**Step 3: Run a simplification pass**

Remove duplicated scene math, dead legacy normal-path code, unnecessary state, and repeated font literals. Do not introduce abstractions outside this feature.

**Step 4: Re-run focused tests, typecheck, and build**

Expected: all remain green.

## Task 12: Synchronize Canonical GUI Docs and Ledger

**Files:**

- Modify: `docs/40_reports/GUI_MASTER.md`
- Modify: `docs/40_reports/WARROOM_MASTER.md`
- Modify: `docs/20_engineering/AWWV_GUI_ARCHITECTURE_REWORK_v2.md`
- Modify: `docs/20_engineering/TACTICAL_MAP_SYSTEM.md` only for the new Warroom-first presentation handoff
- Modify: `docs/plans/MASTER_ROADMAP.md`
- Modify: `docs/plans/COMMAND_BOARD.md`
- Modify: `docs/plans/2026-08-23-opening-screens-implementation-plan.md`
- Modify: `docs/PROJECT_LEDGER.md`
- Modify: `.claude/napkin.md` only if a durable new rule emerged

**Step 1: Record actual ownership**

State that React `MainMenu` is the normal opening owner in browser and Electron host, with the legacy host markup retained only as load-failure fallback. Remove the previous false implication that two independent live openings are equivalent.

**Step 2: Record the typography contract**

Document the two bundled families, semantic roles, local asset provenance, and explicit map-glyph/debug exclusions.

**Step 3: Record the handoff**

New campaign Begin enters the selected Warroom; the existing date handoff/opening brief/foundational decision remain ordered and appear over/from that shell.

**Step 4: Update R7 status honestly**

- If code/tests/build/browser proof are green but owner art is absent: mark mechanics/typography complete and art acceptance waiting on the four-file asset drop.
- If owner art is integrated and browser proof is green: mark browser presentation complete, with actual packaged first-paint acceptance still open if it could not be run.
- Never mark RE, R8, or release completion from this work.

**Step 5: Append the ledger receipt**

Include commits, exact tests/builds, evidence paths, asset status, excluded surfaces, and remaining packaged/art gates. State explicitly that `FORAWWV.md` was not edited.

**Step 6: Verify docs and diff hygiene**

```powershell
git diff --check
rg -n "cinematic|typography|React.*opening|packaged" docs/plans/MASTER_ROADMAP.md docs/plans/COMMAND_BOARD.md docs/40_reports/GUI_MASTER.md docs/40_reports/WARROOM_MASTER.md docs/PROJECT_LEDGER.md
```

Expected: no whitespace errors; all control documents agree.

**Step 7: Commit**

```powershell
git add docs .claude/napkin.md
git commit -m "docs: close cinematic opening implementation"
```

## Done Means

**Canonical owner:** React `MainMenu` + shared `WarroomScenePlate`; outer Warroom document is host/fallback only.

**Demoted path:** Legacy outer-menu normal flow; generic case-file visual language; authored serif/typewriter/Arial exceptions.

**Player-visible truth:** Neutral before selection; selected national Warroom only after deliberate faction input; real operational map appears only after state exists.

**Canonical UI surface:** Shared 2752 x 1536 aspect-fit plate used by preview and playable Warroom.

**Implementation-slice done means:** One healthy opening owner in both entry paths, exact room continuity, two real bundled font families, keyboard/reduced-motion support, green focused/typecheck/build/browser gates, an executed canonical full-suite gate with inherited residuals explicitly routed, independent review, and synchronized R7 docs. R7 itself remains open until owner art, live packaged acceptance, and its other roadmap gates close.
