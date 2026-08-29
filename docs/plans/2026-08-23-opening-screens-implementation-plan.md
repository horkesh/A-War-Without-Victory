# Opening Screens Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task.

**Goal:** Replace the instant faction picker with a functional, accessible campaign opening that carries the player through faction dossier and campaign mode into the command shell, while consolidating the existing duplicate war briefing. The 2026-08-28 amendment supersedes this plan's original case-file presentation with the cinematic monitoring-room/faction-Warroom composition while retaining these mechanics.

**Architecture:** Keep the sequence local to `MainMenu` until the final Begin action, then pass one typed campaign-start payload through the existing desktop/browser campaign start boundary. Reuse the current loaded save as Continue and add a records surface for available desktop saves without exposing filesystem paths. The existing post-start transition becomes a short handoff instead of repeating the faction dossier.

**Tech Stack:** React 18, TypeScript, Tailwind/CSS, Electron IPC, Vitest, Testing Library.

## R7 Presentation Amendment Status — 2026-08-28

The functional opening mechanics delivered by this plan remain accepted: landing, faction selection,
dossier, campaign-mode selection, Field Records, campaign-start payload, and the consolidated
post-start handoff are not reopened.

The presentation-only amendment is
[Cinematic Opening and Typography Implementation Plan](2026-08-28-cinematic-opening-typography-implementation-plan.md).
Its mechanics, two-family typography, host ownership, and five-viewport fallback-art browser proof
are complete. React `MainMenu` now owns healthy browser and desktop-host opening; the outer legacy
menu is bounded recovery only. The two required analogue-first owner images (splash and neutral monitoring room; no computers/screens)
and live packaged-Electron first-paint acceptance remain open; foreground/portal prompts are
optional later enhancements.

RE remains blocked and untouched. Actual packaged acceptance waits for an authorized non-conflicting
packaged-runtime verification route. The canonical balanced suite was run and remains red only on
inherited deployment-health/run-diagnostics and Cutileiro expectation residuals; that does not
reopen this UI implementation or authorize engine/canon repair. This
amendment does not authorize a packaged probe, RE diagnosis, or changes to engine, simulation,
state, calibration, canon, IPC, campaign payloads, or save behavior.

---

### Task 1: Pin the opening interaction contract

**Files:**
- Create: `tests/ui/main_menu_opening_flow.test.ts`
- Modify: `tests/ui/app_boot_main_menu.test.ts`

1. Write failing DOM tests proving the landing page initially shows menu actions rather than faction cards.
2. Prove `New War` reveals factions in canonical RBiH/RS/HRHB order.
3. Prove selecting a faction opens its four-slot dossier and does not start a campaign.
4. Prove `Take command` advances to the mode choice and `Begin` calls `onNewGame` exactly once with faction plus mode.
5. Prove Back returns one beat without starting and focus moves to the primary action on each beat.
6. Run the focused tests and confirm the failures are caused by the missing sequence.

### Task 2: Build the functional menu and faction dossier

**Files:**
- Modify: `src/ui/map/components/MainMenu.tsx`
- Modify: `src/ui/map/i18n/messages.en.ts`
- Modify: `src/ui/map/i18n/messages.bcs.ts`
- Modify: `src/ui/map/styles/globals.css`

1. Add explicit `landing`, `factions`, `dossier`, `mode`, and `records` UI states.
2. Build the landing composition from existing paper/wood textures and CSS atmosphere; do not introduce unreviewed historical/generated imagery.
3. Replace Courier New with the established Georgia + IBM Plex Sans Condensed pairing.
4. Implement canonical faction cards, the shared four-slot dossier, command descriptor, Back, and focus handoff.
5. Use reviewed existing identity copy where possible; keep draft `Your war` copy out of the shipped surface until historian/§6 review.
6. Implement the mode choice with emergent selected by default and plain-language labels.
7. Run the focused tests to green, then the existing main-menu localization and accessibility tests.

### Task 3: Carry campaign mode through the real start boundary

**Files:**
- Modify: `src/ui/map/desktop/types.ts`
- Modify: `src/ui/map/App.tsx`
- Modify: `src/ui/map/desktop/campaignStartActions.ts`
- Modify: `src/desktop/electron-main.cjs`
- Modify: `src/desktop/desktop_sim.ts`
- Modify: `tests/browser_campaign_start_fallback.test.ts`
- Modify: `tests/desktop_campaign_start_contract.test.ts`

1. Write failing tests for emergent and historical payloads, including rejection of an unknown mode.
2. Extend `StartNewCampaignPayload` with `decisionMode: 'emergent' | 'historical'`.
3. Pass the mode through App, browser fallback, preload IPC, and Electron validation.
4. Set `meta.decision_mode` explicitly for both modes. Verification showed canonical save loading restores `historical` when the field is absent, contradicting the earlier assumption that an unset value remains semantically distinct.
5. Run focused browser/desktop contract tests and typecheck.

### Task 4: Make Field Records functional

**Files:**
- Modify: `src/desktop/electron-main.cjs`
- Modify: `src/desktop/preload.cjs`
- Modify: `src/ui/map/desktop/useIPC.ts`
- Modify: `src/ui/map/desktop/types.ts`
- Modify: `src/ui/map/App.tsx`
- Modify: `src/ui/map/components/MainMenu.tsx`
- Create: `tests/ui/main_menu_field_records.test.ts`
- Modify: `tests/desktop_persistence_contract.test.ts`

1. Write failing positive-controlled tests for deterministic save ordering, safe filenames, and rejection of traversal/non-JSON records.
2. Add a read-only `list-save-records` IPC that returns filename, display label, turn/date, faction, and modified time, sorted newest-first with deterministic filename tie-break.
3. Add a `load-save-record` IPC that resolves only a listed basename under the saves directory.
4. Render Field Records with Resume on the newest record and Import file as a secondary action.
5. Keep browser mode functional with the currently loaded campaign record plus file import.
6. Run focused IPC and DOM tests.

### Task 5: Consolidate the post-start introduction

**Files:**
- Modify: `src/ui/map/components/PeaceWarTransitionOverlay.tsx`
- Modify: `src/ui/map/components/WarHasBegunSplash.tsx`
- Modify: `tests/ui/peace_war_transition_overlay.test.ts` (or nearest existing transition test)

1. Write a failing test proving a campaign started through the new opening does not repeat a second faction dossier.
2. Reduce the overlay to one short, dismissible date handoff and route directly to the command desk.
3. Preserve the shared seen flag, same-faction restart reset, keyboard skip, and reduced-motion behavior.
4. Run the full opening/transition UI test slice.

### Task 6: Verify and document

**Files:**
- Modify: `docs/PROJECT_LEDGER.md`
- Modify: `.claude/napkin.md` only if a durable new runbook lesson emerged

1. Run `npx vitest run` on all touched UI/desktop test files.
2. Run the repository smoke-test triad sequentially: `npx tsc --noEmit`, `npm run test:vitest`, `npm run desktop:map:build`.
3. Start the built UI, inspect landing/faction/dossier/mode/records at desktop and narrow widths, and capture screenshots.
4. Positive-control the interaction harness by temporarily breaking one assertion target, observe the intended failure, restore, and rerun green.
5. Append the measured implementation and verification results to `docs/PROJECT_LEDGER.md`.
6. Do not claim final hero art complete: generated hero/loading imagery and draft faction thesis sentences remain behind historian + §6 review.
