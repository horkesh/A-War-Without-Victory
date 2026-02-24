# Dead-code report verification (2026-02-24)

**Source:** Root files `DEAD_CODE_AND_FILES.md` / `DEAD_CODE_AND_FILES_UTF8.md` (knip audit, 451 unused files + unused deps/exports).

**Conclusion:** The report is **stale and no longer valid as a direct cleanup list**. Do not delete by that list without re-verification.

---

## 1. Report is stale

- **knip** is not in `package.json`; the audit was run in the past (see PROJECT_LEDGER: ts-morph + knip, 451 dead files).
- Many of the 451 “unused files” are **false positives** because knip did not see:
  - Vite/HTML entry points (script `src="...ts"` in `.html`),
  - Scripts referenced only by other tooling or docs.

---

## 2. False positives (do not delete)

These are listed as “unused” but are in active use:

| Path | How it’s used |
|------|----------------|
| `src/ui/map/MapApp.ts` | 2D tactical map; referenced in docs/diagrams. |
| `src/ui/map/map_operational_3d.ts` | Entry in `map_operational_3d.html`: `<script type="module" src="./map_operational_3d.ts">`. |
| `src/ui/warroom/warroom.ts` | Entry in `warroom/index.html`: `<script type="module" src="./warroom.ts">`. |
| `src/sim/run_phase_ii_browser.ts` | Imported by `ClickableRegionManager.ts` (`runPhaseIITurn`). |
| `dev_ui/main.ts`, `dev_ui/phase_g.ts`, `dev_ui/ui0_map.ts`, `dev_ui/vite.config.ts` | `dev_ui/index.html` loads `main.ts`; `phase_g.html` and `ui0_map.html` are linked; Phase G and dev_ui are documented and tested. |

**Unused dependencies section:**  
- `three` and `@types/three` are listed as unused; they are used by the 3D map (HoI / operational 3D). Treat as false positives.

---

## 3. Likely still valid cleanup targets (verify before delete)

- **Root .cjs / .mjs scripts** (e.g. `align_names.cjs`, `calc_offsets.cjs`, `refactor.mjs`) — not referenced in `package.json` or found in code/docs; safe to treat as candidates after a quick grep.
- **tools/** — many OOB/debug/validation scripts (`tools/check_scenario_init.ts`, `tools/deduplicate_oob.ts`, etc.) may be unused; confirm no npm scripts or docs invoke them.
- **scripts/map/** — legacy phase_h6 and old derive scripts; confirm not used by current map pipeline or `package.json`.
- **data/derived/political_control.js**, **data/source/census-loader.ts**, **data/source/settlement.ts** — verify no imports or scripts reference them.
- **tools/map/.cache/** and **data/source/.extracted/** — cache/generated paths; not in `.gitignore` in the checked snippet. If regeneratable, consider adding to `.gitignore` or documenting as build artifacts rather than deleting from repo if still needed for builds.

---

## 4. Recommended next steps

1. **Do not** bulk-delete using the 451 list; you will remove active entry points and dev UI.
2. **Re-run a proper unused-file audit** if you want a fresh list:
   - Add **knip** (or similar) with config that includes **Vite entry points** and HTML `script` targets (e.g. `src/ui/**/*.html`, `src/ui/warroom/index.html`, `dev_ui/*.html`, `map_operational_3d.html`), then re-run; or
   - Use the existing **repo cleanup audit** (`scripts/repo/cleanup_audit.ts` / `npm run repo:cleanup:audit` if present) and exclude entry points manually.
3. **Use the report only as a candidate list:** for each path, confirm “not in package.json scripts, not imported, not an HTML entry point” before delete.
4. Update **CONSOLIDATED_BACKLOG** to state that the dead-code report is stale and that cleanup must be re-verified (see §6).

---

## 5. References

- `DEAD_CODE_AND_FILES.md`, `DEAD_CODE_AND_FILES_UTF8.md` (repo root)
- `docs/40_reports/CONSOLIDATED_BACKLOG.md` §6 (Tech Debt: 451 dead files)
- `docs/PROJECT_LEDGER.md` (knip / 451 dead files commit)

---

## 6. New repo-wide check (2026-02-24)

**Command run:** `npm run repo:cleanup:audit` (in-repo script `scripts/repo/cleanup_audit.ts`).

**Output:** Deterministic reports written to **`docs/cleanup/`**:
- **`docs/cleanup/cleanup_audit.json`** — full classification (path, category, reasons)
- **`docs/cleanup/cleanup_audit.md`** — summary + orphan candidates grouped by directory

**Results:**

| Metric | Count |
|--------|--------|
| Total files scanned | 4,644 |
| USED | 546 |
| ORPHAN_CANDIDATE | 3,345 |
| EXEMPT | 753 |

**Caveats:**
- The audit scans **TS/JS imports**, **package.json scripts**, and **docs/PROJECT_LEDGER.md** (and two doc paths that were not found). It does **not** scan HTML for `<script src="...">`, so **HTML entry points** can appear as ORPHAN_CANDIDATE.
- **dev_ui/main.ts**, **dev_ui/ui0_map.ts**, **dev_ui/phase_g.ts**, **dev_ui/vite.config.ts** are correctly in use (loaded from dev_ui/index.html / phase_g.html / ui0_map.html) but show as orphan in this run — **do not delete**.
- **Core app entry points** (MapApp.ts, map_operational_3d.ts, warroom.ts, run_phase_ii_browser.ts) are correctly classified as **USED** in this run.

**Use the report for:** Identifying likely-unused root scripts (e.g. `.cjs`/`.mjs`), tools, and scripts; then verify each with grep before deletion. Re-run `npm run repo:cleanup:audit` after any cleanup to refresh the list.

---

## 7. Orphan cleanup (2026-02-24) — verified-safe only

**Request:** Check that nothing uses the orphans; if nothing does, delete them.

**Finding:** The cleanup audit has **false positives**. Many files it marks as ORPHAN_CANDIDATE are in use:
- **src/** — e.g. `src/data/operational_data.ts`, `src/desktop/electron-main.cjs`, `src/desktop/preload.cjs`, `src/scenario/oob_loader.ts`, `src/scenario/initial_formations_loader.ts` are imported or referenced by `package.json` ("main") but appear as orphan (audit does not resolve all imports / package.json fields).
- **dev_ui/** — HTML entry points; excluded from deletion.
- **.agent/, .claude/** — tooling; not deleted.

**Deleted (verified unused):**
- Root scripts: `align_names.cjs`, `calc_offsets.cjs`, `calc_transform.cjs`, `check_orientation.cjs`, `check_small_settlements.cjs`, `compare_coords.cjs`, `debug_labels.cjs`, `debug_vk.cjs`, `find_sarajevo.cjs`, `inspect_roads.cjs`, `inspect_settlements.cjs`, `list_road_keys.cjs`, `major_settlement_bounds.cjs`, `survey_coords.cjs`, `top_settlements.cjs`, `refactor.mjs`.
- Obsolete reports: `DEAD_CODE_AND_FILES.md`, `DEAD_CODE_AND_FILES_UTF8.md`, `TYPE_CHECK_DEBUG.md`, `TYPE_CHECK_DEBUG_UTF8.md`, `IDENTITY_MIGRATION_SUMMARY.md`, `PHASE_21_SUMMARY.md`, `mass_audit.ps1`.
- Logs/temp: `vite_server.log`, `tsc_out.txt`.
- Temp dirs: `.tmp_baseline_ops_h1_9`, `.tmp_data_prereq_h1_2`, `.tmp_phase0_full_progression`, `.tmp_phase2_smoke`, `.tmp_scenario_activity_h1_7`, `.tmp_scenario_init_control_apr1992`, `.tmp_scenario_init_formations_a`, `.tmp_scenario_no_initial_brigades`, `.tmp_sep_1991_phase0_schedule`.

**Not deleted:** All other orphan candidates (src/, tests/, data/, runs/, tools/, scripts/, .claude, .agent, assets, etc.) — audit cannot be trusted for those without per-file verification; many are in use.
