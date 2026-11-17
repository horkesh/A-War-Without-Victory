## 2026-11-17 — Guard: every event catalog file reaches every consumer

**Why.** A red-team note said `DataLoader` skips `war_1992_hrhb_summer.json`, so those five events' definitions would never reach the UI. Checked on current main: it does not. Both browser loaders (`loadEventDefinitions`, `loadEventDefinitionsFull`), the resource map, the Electron main process, the adapter's static info, the display-copy index, the verdict, distance-from-history and dilemma read models and the engine loader all list the file. The note was stale or read another tree.

**Change** (test only): `tests/ui/event_catalog_files_loaded.test.ts` is list-driven: the catalog directory holds only `war_*.json` files and `consequences.json`; each of nine consumers must reference every `war_*` file (hrhb_summer included), seven must reference `consequences.json`, and DataLoader must list the hrhb_summer file in both of its loaders. A new catalog file, or a dropped one, fails the test. Read with comments stripped (negative-source hygiene).

**Not done.** `eventAudience.ts` (#784) should join both consumer lists when it lands.
