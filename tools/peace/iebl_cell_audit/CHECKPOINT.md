# Historian IEBL audit — working checkpoint (2026-11-08)
- Method found: data/source/bih_census_1991.json = 1991 census republished by BHAS on the post-1995 (Dayton) municipal structure; settlement -> post1995 code (1xxxx FED / 2xxxx RS / 3xxxx Brcko D.). settlements_wgs84_1990.geojson carries census_ids per S-sid; operational cells carry constituent_sids. => per-cell entity share by settlement-polygon area (split settlements weighted by BHAS population split).
- Computed: work/cells_computed.json (252 cells in scope), work/cells_summary.txt, work/crossed_cells.txt (58 cells with >=3% minority share), work/wartime_controllers.json (save = turn 104 emergent run, reference only).
- Sources fetched: OHR Annex 2 text (dl/ohr_annex2.html), BB KB snippets (tool-results b4dvoopgg), Wikipedia raw (dl/wiki_*.txt, in progress).
- TODO: Prlic TJ Vol2 (Mostar line), Brcko Final Award, canton lists, Jajce 1995 BB check; then write dayton_cell_assignments.json + AUDIT.md.

- 15:40 builder run OK: 252 cells, verified 190 / approximate 57 / unresolved 5; outputs dayton_cell_assignments.json written. Next: AUDIT.md generator.

- 15:55 AUDIT.md + JSON regenerated with sensitivity notes; schema checks pass.
