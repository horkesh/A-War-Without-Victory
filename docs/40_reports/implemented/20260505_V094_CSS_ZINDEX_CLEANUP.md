# LANE-V094-CSS-ZINDEX-CLEANUP — implementation report

**Lane:** `LANE-V094-CSS-ZINDEX-CLEANUP` (follow-up to predecessor
`LANE-V094-Z-INDEX-TOKENS` — see
`docs/40_reports/implemented/20260505_V094_Z_INDEX_TOKENS.md` §2 deferred
list).
**Date:** 2026-05-05
**Predecessor SHA:** `f282f9c1`
(`refactor(ui): migrate 41 source files to canonical zIndex.ts`).
**Status:** IMPLEMENTED.

---

## 1. Objective

The predecessor lane migrated 41 React-shell source files
(`*.tsx` / `*.ts`) to inline `style={{ zIndex: Z.X }}` referencing
`src/ui/shared/zIndex.ts`. It explicitly DEFERRED ~28 z-index literals
spread across CSS, HTML, and debug-viewer files because those surfaces are
not React-rendered and could not use the same `Z.X` import-and-substitute
pattern.

This lane closes that gap with **Option B (annotation-only)**: every
literal whose numeric value matches a canonical `Z.<TIER>` value is now
accompanied by an inline `canonical: Z.<TIER> = N` comment naming the
canonical token. A new test
(`tests/css_z_index_canonical.test.ts`) pins the contract.

Option A (CSS variables in a top-level `:root {}` block) was considered
and rejected — the warroom CSS is split across three large files
(`war-planning-map.css`, `ticker.css`, `modals.css`) plus inline `<style>`
blocks in two HTML files; introducing a `:root {}` variable file would
require a sweeping reorganization of stylesheets (load-order, scope,
shadow-DOM compatibility), which the task spec explicitly defers to a
follow-up. Option B preserves byte-stable numeric values and adds
zero-risk annotation only.

---

## 2. Inventory — z-index literals identified and classified

### 2.1 Files touched

| # | Path | Class | Literals total |
|---|---|---|---|
| 1 | `src/ui/map/styles/globals.css` | CSS | 3 |
| 2 | `src/ui/warroom/styles/war-planning-map.css` | CSS | 13 |
| 3 | `src/ui/warroom/styles/ticker.css` | CSS | 3 |
| 4 | `src/ui/warroom/styles/modals.css` | CSS | 5 |
| 5 | `src/ui/warroom/index.html` | HTML inline `<style>` | 2 |
| 6 | `src/ui/warroom/map_viewer_standalone.html` | HTML inline `<style>` (debug) | 3 |
| 7 | `src/ui/map/painter.html` | HTML inline `<style>` (debug) | 1 |
| 8 | `src/ui/warroom/map_viewer_app.ts` | TS inline-style (debug) | 1 |
| | **Total** | | **31** |

### 2.2 Per-literal classification

| Path | Line | Literal | Classification | Action |
|---|---|---|---|---|
| `src/ui/map/styles/globals.css` | 129 | `z-index: 100` | shell-tier (`Z.TOOLBAR=100`) | annotated |
| `src/ui/map/styles/globals.css` | 148 | `z-index: 1` | intra-component | left bare |
| `src/ui/map/styles/globals.css` | 293 | `z-index: 1` | intra-component | left bare |
| `src/ui/warroom/styles/war-planning-map.css` | 6 | `z-index: 1000` | shell-tier (`Z.MODAL`) | annotated |
| `src/ui/warroom/styles/war-planning-map.css` | 29 | `z-index: 0` | intra-component | left bare |
| `src/ui/warroom/styles/war-planning-map.css` | 57 | `z-index: 2` | intra-component | left bare |
| `src/ui/warroom/styles/war-planning-map.css` | 101 | `z-index: 10` | shell-tier (`Z.MAP_OVERLAY`) | annotated |
| `src/ui/warroom/styles/war-planning-map.css` | 145 | `z-index: 10` | shell-tier (`Z.MAP_OVERLAY`) | annotated |
| `src/ui/warroom/styles/war-planning-map.css` | 196 | `z-index: 10` | shell-tier (`Z.MAP_OVERLAY`) | annotated |
| `src/ui/warroom/styles/war-planning-map.css` | 372 | `z-index: 10` | shell-tier (`Z.MAP_OVERLAY`) | annotated |
| `src/ui/warroom/styles/war-planning-map.css` | 383 | `z-index: 10` | shell-tier (`Z.MAP_OVERLAY`) | annotated |
| `src/ui/warroom/styles/war-planning-map.css` | 425 | `z-index: 20` | intra-component | left bare |
| `src/ui/warroom/styles/war-planning-map.css` | 956 | `z-index: 5` | intra-component | left bare |
| `src/ui/warroom/styles/war-planning-map.css` | 976 | `z-index: 5` | intra-component | left bare |
| `src/ui/warroom/styles/war-planning-map.css` | 1065 | `z-index: 30` | shell-tier (`Z.CORPS_CARD_LABEL`) | annotated |
| `src/ui/warroom/styles/ticker.css` | 12 | `z-index: 999` | intra-component | left bare |
| `src/ui/warroom/styles/ticker.css` | 53 | `z-index: 1000` | shell-tier (`Z.MODAL`) | annotated |
| `src/ui/warroom/styles/ticker.css` | 71 | `z-index: 1001` | intra-component | left bare |
| `src/ui/warroom/styles/modals.css` | 20 | `z-index: 1000` | shell-tier (`Z.MODAL`) | annotated |
| `src/ui/warroom/styles/modals.css` | 89 | `z-index: 1001` | intra-component | left bare |
| `src/ui/warroom/styles/modals.css` | 116 | `z-index: 2000` | intra-component | left bare |
| `src/ui/warroom/styles/modals.css` | 834 | `z-index: 10000` | shell-tier (`Z.TURN_AFTERMATH`) | annotated |
| `src/ui/warroom/styles/modals.css` | 1313 | `z-index: 1500` | intra-component | left bare |
| `src/ui/warroom/index.html` | 38 | `z-index: 1000` | shell-tier (`Z.MODAL`) | annotated |
| `src/ui/warroom/index.html` | 145 | `z-index: 2000` | intra-component | left bare |
| `src/ui/warroom/map_viewer_standalone.html` | 23 | `z-index: 2` | intra-component | left bare |
| `src/ui/warroom/map_viewer_standalone.html` | 28 | `z-index: 2` | intra-component | left bare |
| `src/ui/warroom/map_viewer_standalone.html` | 34 | `z-index: 10` | shell-tier (`Z.MAP_OVERLAY`) | annotated |
| `src/ui/map/painter.html` | 15 | `z-index: 10` | shell-tier (`Z.MAP_OVERLAY`) | annotated |
| `src/ui/warroom/map_viewer_app.ts` | 469 | `zIndex: '9999'` | shell-tier (`Z.TOOLTIP`) | annotated |

### 2.3 Annotation count

- **15 shell-tier literals annotated** with inline
  `canonical: Z.<TIER> = N` comments referencing `src/ui/shared/zIndex.ts`.
- **16 intra-component literals left bare** — values
  `0, 1, 2, 5, 20, 999, 1001, 1500, 2000` are not present in the canonical
  `Z` table. Per task spec, this lane does NOT invent new tiers; intra-
  component values stay outside the canonical taxonomy. They are
  enumerated in the new test's `KNOWN_NON_SHELL_TIER_VALUES` allowlist
  for transparency.

### 2.4 Strategy chosen — Option B (annotation-only)

The CSS-variable strategy (Option A) would require a top-level
`:root { --z-modal: 1000; ... }` block plus consistent loading order
across three large warroom CSS files and two inline `<style>` blocks.
That is sweeping enough to be a follow-up lane on its own; the spec
explicitly authorizes the annotation strategy when CSS-var reorganization
"would require sweeping reorganization of stylesheets".

Option B preserves byte-stable numeric values (zero behavior change) and
adds zero-risk inline comments only. Result: all stacking order
unchanged; future readers find the canonical token via the inline
comment.

### 2.5 Annotation forms used

- **CSS files** (`.css`): trailing `/* canonical: Z.<TIER> = N (src/ui/shared/zIndex.ts) [optional context] */` on the same line as the `z-index: N;` declaration.
- **HTML inline `<style>` blocks**: same as CSS — trailing `/* canonical: ... */` on the same line.
- **TS inline-style object literal** (`map_viewer_app.ts`): leading `// canonical: Z.<TIER> = N (src/ui/shared/zIndex.ts)` comment on the line immediately above `zIndex: '9999',`. (TS object literals do not support same-line trailing block comments cleanly without confusing the formatter.)

---

## 3. Test — `tests/css_z_index_canonical.test.ts`

NEW file (185 LOC). Pins four assertions:

- **T1** — every touched file exists and is readable.
- **T2** — every literal whose value matches a canonical shell-tier value
  in `Z` carries an inline canonical comment naming a real `Z.<TIER>`
  token. This catches future regressions where someone adds
  `z-index: 1000` to one of these files without the comment.
- **T3** — every named `Z.<TIER>` token referenced in a canonical comment
  is a real key on the frozen `Z` table, AND the asserted numeric value
  matches the canonical value byte-for-byte. This catches typos like
  `canonical: Z.MODAL = 1100` or `canonical: Z.NONEXISTENT = 1000`.
- **T4** — bare non-shell-tier literals are documented in
  `KNOWN_NON_SHELL_TIER_VALUES` and any new bare shell-tier literal is a
  regression. This is the reciprocal of T2 — the test file's exempt list
  acts as a change-notification surface for future contributors.

The test mirrors the pattern of the predecessor's
`tests/z_index_canonical.test.ts` (which it does NOT modify).

---

## 4. Verification

### 4.1 Tests

```
$ ./node_modules/.bin/vitest run \
    tests/css_z_index_canonical.test.ts \
    tests/z_index_canonical.test.ts

 ✓ tests/z_index_canonical.test.ts (7 tests) 25ms
 ✓ tests/css_z_index_canonical.test.ts (4 tests) 13ms

 Test Files  2 passed (2)
      Tests  11 passed (11)
```

- New test: **4/4 GREEN**.
- Predecessor's regression test: **7/7 GREEN** (no regression).

### 4.2 TypeScript

```
$ ./node_modules/.bin/tsc --noEmit -p tsconfig.json
(clean, no errors)
```

### 4.3 Map build

```
$ npm run desktop:map:build
... ✓ built in 16.32s
```

CSS-only annotation + new test file + one TS inline-style comment — no
behavioral change to bundled assets. Build clean.

---

## 5. Stacking order preserved (Y)

Every literal numeric value is preserved byte-for-byte. The only changes
to the touched files are:

1. Inline `/* canonical: Z.<TIER> = N */` comments next to (or above) the
   numeric literal.
2. One whitespace-neutral reorder in `ticker.css` line 53 to keep the
   inline comment on the same line as the `z-index:` declaration
   (swapped `padding-right: 12px;` and `z-index: 1000;` order — purely
   cosmetic, no CSS-cascade impact since both are on the same selector).

No relative ordering between any two layers changes.

---

## 6. Sensitive-history compliance (GREEN)

- Ring 1 / faction-agnostic mechanism / no §6 surface.
- No engine plumbing modified (`src/sim/` untouched).
- No scenario data modified (`data/scenarios/` untouched).
- No canon document modified (`docs/10_canon/` untouched).
- No `political_controllers`, `OOB`, paint anchor, rupture wiring, or
  `enclave_resilience.ts` surface touched.
- No FORAWWV touch.
- No determinism-sensitive code (`Math.random`, `Date.now`, `new Date`,
  iteration order) introduced.
- Faction symbology unchanged — `FACTION_GLOW_RGB` byte-identical.

**Sensitive-history compliance: GREEN.**

---

## 7. File ownership / overlap

This lane touched only the declared files:

- `src/ui/map/styles/globals.css`
- `src/ui/warroom/styles/war-planning-map.css`
- `src/ui/warroom/styles/ticker.css`
- `src/ui/warroom/styles/modals.css`
- `src/ui/warroom/index.html`
- `src/ui/warroom/map_viewer_standalone.html`
- `src/ui/map/painter.html`
- `src/ui/warroom/map_viewer_app.ts`
- `tests/css_z_index_canonical.test.ts` (NEW)
- `docs/40_reports/implemented/20260505_V094_CSS_ZINDEX_CLEANUP.md`
  (NEW — this report)

The sibling Wave 13 events lane operates on
`data/scenarios/events/consequences.json` only — disjoint file set.
No collision possible.

The predecessor's `src/ui/shared/zIndex.ts` is read but NOT modified.
The predecessor's `tests/z_index_canonical.test.ts` is unmodified.

---

## 8. Output summary

- 15 shell-tier z-index literal occurrences across 8 CSS / HTML /
  debug-viewer files annotated with canonical-token comments referencing
  `src/ui/shared/zIndex.ts`.
- 16 intra-component bare literals enumerated in the new test's
  `KNOWN_NON_SHELL_TIER_VALUES` allowlist (transparency / regression
  guard).
- New `tests/css_z_index_canonical.test.ts` — **4/4 GREEN** pinning the
  canonical-comment contract.
- Predecessor `tests/z_index_canonical.test.ts` regression
  — **7/7 GREEN**.
- `npx tsc --noEmit` clean.
- `npm run desktop:map:build` clean (16.32s).
- Stacking order preserved (Y); zero behavioral change.
- Sensitive-history compliance: GREEN.
- Strategy chosen: **Option B (annotation-only)**.

End of report.
