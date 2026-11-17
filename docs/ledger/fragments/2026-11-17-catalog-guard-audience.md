## 2026-11-17 — Catalog-files guard now covers the notice-audience gate

`src/ui/map/data/eventAudience.ts` (#784) imports all six event catalogs; it joins both consumer lists in `tests/ui/event_catalog_files_loaded.test.ts` (the war_* list and the consequences list), closing the follow-up recorded with the guard. Test only; hash-untouched.
