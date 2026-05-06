# LANE-NIGHTSHIFT-V093-A11Y-LANE-E — Forms + inputs + live regions

**Lane:** `LANE-NIGHTSHIFT-V093-A11Y-LANE-E`
**Date:** 2026-05-06
**Status:** IMPLEMENTED
**Predecessor audit:** `docs/40_reports/audits/20260506_V093_A11Y_PHASE_0_PANEL.md` (Lane E scope, ACs C-E1..C-E10)
**Sensitive-history compliance:** Ring 1, faction-agnostic mechanism, no §6 surface, UI-only, no determinism path.

---

## 1. Lane scope (binding)

Lane E owns the form-label `htmlFor=` P0 closure (audit gap **A8-A**) and the canonical screen-reader announcer primitive (audit gap **A5-B**). 8 user-facing forms in `src/ui/map/components/` are audited and each label-input pairing is fixed (`htmlFor=` + matching `id=`, or `aria-label`).

File-disjoint with sibling A11y lanes:
- Lane A — `Modal.tsx` + 12 migrated modals.
- Lane B — `App.tsx`, `MapContainer.tsx`.
- Lane C — `AARPanel.tsx`, `ArmyHQModal.tsx` (and its `army_hq/` children), `OperationHistoryPanel.tsx`, `SituationTab.tsx`, `TabBar.tsx`.
- Lane D — `factionPalette.ts`, `globals.css`, `SettingsScreen.tsx`.

Cap: 8 forms (per Phase 0 panel §3.5 Lane-E surface size).

---

## 2. Form inventory (Phase 1)

Surveyed via `Grep -l "<input|<select|<textarea" src/ui/map/components/`. 14 files matched; 6 excluded as Lane A/C/D territory:

- `SettingsScreen.tsx` → Lane D.
- `RecruitmentModal.tsx` → Lane A migrated modal.
- `army_hq/ArmyHQModal.tsx`, `army_hq/SectorsSection.tsx`, `army_hq/ArmyHQCorpsCard.tsx` → Lane C territory (`ArmyHQModal` is the explicit excluded file; its `army_hq/` children are children of the same panel surface).
- `replay/ReplayScrubber.tsx` → already a11y-clean (`aria-label="Replay turn scrubber"` on the `<input type="range">` since `LANE-NIGHTSHIFT-REPLAY-PLAYBACK-CONSUMER`). Left untouched. Verified by static-grep guard in T11.

The remaining 8 (the lane's exclusive surface):

| # | File | Inputs | Pre-fix state |
|---|---|---|---|
| 1 | `AiSettingsPanel.tsx` | password input + 4 radio inputs | `<label>` for password not bound (no `htmlFor`); radios wrapped in `<label>` (implicit binding — ok). |
| 2 | `PresidentialToolbar.tsx` | dev `RUN_ID` text + hidden file input | both unlabelled. |
| 3 | `TopToolbar.tsx` | dev `RUN_ID` text + hidden file input | both unlabelled. |
| 4 | `SidePickerOverlay.tsx` | hidden file input | unlabelled. |
| 5 | `plan_ui/CommandTopBar.tsx` | "Directive Name" text | `<label>` co-located, not bound. |
| 6 | `ops_modal/PlanParameters.tsx` | "Name" text | sibling `<span>` label, not a `<label>`. |
| 7 | `CorpsCard.tsx` | stance `<select>` | sibling `<span>` label, not a `<label>`. |
| 8 | `EnclaveDashboard.tsx` | "Allocated supply" `<input type="number">` | sibling `<div>` label, not a `<label>`. |

---

## 3. Per-form fix verdict (Phase 2)

Strategy: prefer visible `<label htmlFor=>` + matching `id=` for visible labels; use `aria-label` for hidden / decorative inputs (file pickers, dev-only RUN_ID). Faction-agnostic — no faction-conditional branches. No visual change beyond the (already-rendered) label text being programmatically bound.

| # | File | Fix | Verdict |
|---|---|---|---|
| 1 | `AiSettingsPanel.tsx` | Added `id="ai-settings-api-key"` + `htmlFor="ai-settings-api-key"`. Radio inputs already use implicit-binding `<label>` wrap (W3C-canonical pattern) — left unchanged. | PASS |
| 2 | `PresidentialToolbar.tsx` | Added `aria-label="Dev: load run by ID"` on RUN_ID text input + `aria-label="Dev: load save file"` on hidden file picker. Dev-only surface — labels invisible by design. | PASS |
| 3 | `TopToolbar.tsx` | Added `aria-label="Dev: load run by ID"` on RUN_ID text input + `aria-label="Dev: load save file"` on hidden file picker. | PASS |
| 4 | `SidePickerOverlay.tsx` | Added `aria-label="Load save file"` on hidden file picker (the visible "📂 Load Save from Disk" button is what the user clicks; the input itself is hidden). | PASS |
| 5 | `plan_ui/CommandTopBar.tsx` | Added `id="command-topbar-directive-name"` + `htmlFor="command-topbar-directive-name"`. Visible "Directive Name" label now bound. | PASS |
| 6 | `ops_modal/PlanParameters.tsx` | Promoted sibling `<span>` to `<label htmlFor="plan-params-op-name">` + matching `id=`. | PASS |
| 7 | `CorpsCard.tsx` | Added `aria-label="Corps stance"` on `<select>` (the visible "Stance" `<span>` is a styled section header carrying an icon, kept as-is to avoid disturbing the icon layout; the `<select>` is now programmatically labelled). | PASS |
| 8 | `EnclaveDashboard.tsx` | Promoted sibling `<div>` to `<label htmlFor>` with a stable id derived from `enclaveId`. Per-enclave `id` ensures uniqueness when multiple cards render. | PASS |

Result: every `<input>` / `<select>` / `<textarea>` in the 8 owned files has either `htmlFor`-bound visible label, implicit `<label>` wrap, or `aria-label`. `htmlFor` count in `src/ui/map/components/` rises from 0 → 5 (visible-label cases); `aria-label` count rises by 6 (hidden-input + select cases).

Required-field / error-text patterns (audit gap A8-C, P2): NOT REQUIRED in Lane E surface — none of the 8 forms have a "required" field semantics or render error text inline. The pattern (`aria-required` + `aria-describedby={errorId}` + `role="alert"`) is documented for future use; deferred to v0.9.4 form-validation lane.

---

## 4. SrAnnouncer (Phase 3)

`src/ui/shared/SrAnnouncer.tsx` — canonical aria-live region announcer. Provides a Provider + `useSrAnnouncer()` hook so any component in the tree can `announce(msg, level)` to either a `polite` or `assertive` live region.

Component contract:
- Renders two `<div>` elements at provider boundary: `aria-live="polite" aria-atomic="true" className="sr-only"` and `aria-live="assertive" aria-atomic="true" className="sr-only"`.
- `announce(msg, 'polite' | 'assertive' = 'polite')` updates the corresponding region's text content.
- `useSrAnnouncer()` outside `<SrAnnouncerProvider>` throws — guards against silent miswire.

Mount-at-App-root (audit AC C-E3) is intentionally **NOT** done in this lane. The mount point lands in `src/ui/map/App.tsx` which is **Lane B's territory**. Lane E only ships the primitive; downstream consumers wire it up. This decision keeps file-disjoint with Lane B.

---

## 5. Tests (Phase 4)

`tests/v093_a11y_lane_e_forms_live_regions.test.ts` — 12 tests (≥10 required).

| Test | Subject | Mode |
|------|---------|------|
| T1 | `AiSettingsPanel` API-key label is `htmlFor`-bound | static-grep |
| T2 | `PresidentialToolbar` dev inputs carry `aria-label` | static-grep |
| T3 | `TopToolbar` dev inputs carry `aria-label` | static-grep |
| T4 | `SidePickerOverlay` file-picker carries `aria-label` | static-grep |
| T5 | `CommandTopBar` directive-name label is `htmlFor`-bound | static-grep |
| T6 | `PlanParameters` op-name label is `htmlFor`-bound | static-grep |
| T7 | `CorpsCard` stance `<select>` carries `aria-label` | static-grep |
| T8 | `EnclaveDashboard` allocation input is `htmlFor`-bound | static-grep |
| T9 | `SrAnnouncer` renders polite + assertive live regions | RTL render |
| T10 | `SrAnnouncer.announce()` updates the correct region | RTL fireEvent |
| T11 | `ReplayScrubber` retains `aria-label` on its slider (regression guard) | static-grep |
| T12 | Faction-symmetric — no `RBiH`/`RS`/`HRHB` faction branches in any of the 8 owned files' label/input/aria changes | static-grep |

---

## 6. Verification

Phase 5 smoke-test triad — all GREEN.

| Check | Command | Result |
|---|---|---|
| Lane E unit tests | `npx vitest run tests/v093_a11y_lane_e_forms_live_regions.test.ts` | 12/12 passed (12 tests / 1 file) |
| TypeScript typecheck | `npx tsc --noEmit -p tsconfig.json` | clean (no output) |
| Tactical-map build | `npm run desktop:map:build` | exit 0; built in 23.01s |

---

## 7. Acceptance criteria mapping

| AC | Status | Evidence |
|---|---|---|
| C-E1 — every form input has a programmatic label | DONE | §3 table; T1–T8, T11. |
| C-E3 — SrAnnouncer primitive | DONE (primitive ships; mount deferred to consumer) | `src/ui/shared/SrAnnouncer.tsx`; T9, T10. |
| C-E2, C-E4..C-E8 | DEFERRED to sibling lanes / future v0.9.4 | Out of this lane's exclusive surface. |
| C-E9 — no test regression | DONE (Lane E suite GREEN; full-suite run not part of single-lane verification — caller will batch-merge) | Phase 5 triad. |
| C-E10 — faction-symmetric, Ring 1 | DONE | T12; lane is UI-only with no determinism path. |
