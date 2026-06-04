# Root UI Dependency Declarations

**Date:** 2026-06-03
**Type:** Build/dependency hygiene

## Summary

Current `origin/main` failed `npm.cmd run typecheck` in a clean isolated
worktree because the root `package.json` did not declare packages imported by the
root TypeScript project:

- `maplibre-gl`
- `pmtiles`
- `@deck.gl/core`
- `@deck.gl/layers`
- `@deck.gl/mapbox`
- `@deck.gl/extensions`
- `@vitejs/plugin-react`

After those were declared, `desktop:map:build` exposed a second root build
dependency gap in `src/ui/map/postcss.config.js`: `tailwindcss` and
`autoprefixer` were required by the map PostCSS config but absent from the root
dependency tree used by the root build script.

## Change

Root runtime UI dependencies now include MapLibre, PMTiles, and Deck.gl packages
used by the tactical map source. Root dev dependencies now include the Vite 5
compatible React plugin and the PostCSS toolchain used by the tactical map build.

No source behavior, scenario data, save schema, event content, or generated
scenario artifacts changed.

## Verification

| Gate | Result |
| --- | --- |
| Untouched-main repro | `npm.cmd run typecheck` failed on missing MapLibre/PMTiles/Deck.gl/Vite plugin declarations. |
| Typecheck after dependency declarations | PASS: `npm.cmd run typecheck`. |
| Tactical map build | PASS: `npm.cmd run desktop:map:build` (existing bundle-size/static-dynamic import and Node externalization warnings only). |
| Diff hygiene | PASS: `git diff --check`. |

## Notes

`@vitejs/plugin-react` is pinned to the Vite-5-compatible `4.x` line rather than
latest `6.x`, whose peer dependency expects Vite 8. The map PostCSS versions
match the already-present `src/ui/map/package.json` / package-lock intent.
