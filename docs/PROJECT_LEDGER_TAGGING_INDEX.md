# Project Ledger Tagging Index

**Date:** 2026-02-09  
**Purpose:** Drive migration to thematic knowledge base; verify no substantive entry is dropped.  
**Themes:** `identity` | `architecture` | `implementation` | `canon` | `process` | `decisions`

Full chronological record remains in `docs/PROJECT_LEDGER.md`. This index maps changelog entries to themes for placement in `docs/PROJECT_LEDGER_KNOWLEDGE.md`.

---

## By theme (summary)

| Theme | Ledger source | Notes |
|-------|----------------|--------|
| identity | Ledger §Identity, §Non-negotiables, §Current Phase, §Allowed/Disallowed | Static copy into Knowledge §Project Identity & Governance |
| architecture | Ledger §Geometry Contract, §Decisions (Path A, drzava, union, hull); entries 2026-01-24–26 (Path A, outlines, borders, adjacency); 2026-02-07 (A1, WGS84, Voronoi, canonical map) | Path A evolution, outline modes, geometry patterns |
| implementation | Changelog: map tools, viewers, pipeline, determinism, OOB, bots, control, displacement, formation spawn; napkin Patterns That Work / Don't Work / Corrections | Proven patterns, failed experiments, domain notes |
| canon | Changelog: Phase 0/I/II specs, Systems Manual, Engine Invariants; 2026-02-06 (canon checkpoint), 2026-02-09 (Phase I §4.8, Washington) | Specification updates log |
| process | Changelog: roadmap, MVP, Phase 6/7, Paradox meetings, handovers, ledger skill, 50_research; 2026-02-06–09 (Orchestrator, PM) | Meetings, handovers, backlog |
| decisions | Ledger §Decisions table; changelog entries that state "Decision:" or "Rationale:" | Decision registry + chains |

---

## Changelog entry → theme mapping (representative)

Entries are in chronological order (oldest first). Each row: Date | First line (abbreviated) | Themes.

| Date | First line | Themes |
|------|------------|--------|
| 2026-01-24 | Initial ledger creation | identity, decisions |
| 2026-01-24 | Clarified outline modes and operational notes | architecture, implementation |
| 2026-01-24 | Municipality borders extraction from drzava.js | architecture, decisions |
| 2026-01-24 | Municipality coverage audit script | implementation |
| 2026-01-24 | Municipality ID normalization for border coverage audit | implementation |
| 2026-01-24 | Settlement-to-municipality alignment audit | implementation |
| 2026-01-25 | Fix drzava.js extraction; municipality geometry failure diagnostics | architecture, implementation |
| 2026-01-25 | Re-enable municipality outlines derived from settlement polygon fabric | architecture |
| 2026-01-25 | Rule change — inferred municipality borders permitted | decisions, architecture |
| 2026-01-25 | Determinism + invariants audit | implementation, canon |
| 2026-01-25 | Derive municipality boundaries from polygon fabric adjacency (no union) | architecture |
| 2026-01-25–27 | Phase 0/1 settlement substrate, adjacency, contact graph, SVG substrate canon | architecture, implementation |
| 2026-01-27 | Phase 2 contact graph enrichment | implementation |
| 2026-02-06 | Orchestrator execution; executive roadmap; Phase 2–6; canon checkpoint; scenario control/OOB | process, canon, implementation |
| 2026-02-07 | A1 NATO Map handoff; orientation; Phase A1 STABLE; Voronoi/WGS84; canonical map | architecture, implementation, process |
| 2026-02-08 | War Planning Map scene; formation spawn; Phase 0 runner; militia/brigade 800, authority, minority decay | implementation, canon |
| 2026-02-08 | MVP declaration and freeze | identity, process |
| 2026-02-08 | Brigade AoR Phase II; displacement killed + fled-abroad | implementation, canon |
| 2026-02-08 | 50_research knowledge base; Paradox meetings; OOB init; tactical map canonical | process, implementation |
| 2026-02-08 | Phase I displacement application; external expert handover | canon, process |
| 2026-02-09 | Bot simulation OOB/supply fix; primary sources OOB; Early Docs plan; Phase A (bots, victory, production) | implementation, process |
| 2026-02-09 | Adaptive bot doctrine; RBiH/HRHB alliance design + canon + implementation; start-control hardening | implementation, canon, decisions |
| 2026-02-09 | Project ledger reorganization (plan and implementation guide) | process |
| 2026-02-09 | IMPLEMENTATION: RBiH–HRHB Alliance Lifecycle | canon, implementation |
| 2026-02-09 | Smart-bot reporting completion | implementation |
| 2026-02-10 | (multiple 2026-02-10 entries — see ledger) | various |
| 2026-02-11 | Brigade Realism and Military Fronts; attack orders, casualties, garrison | implementation, canon |
| 2026-02-11 | Recruitment canon propagation; ethnic/hybrid init control; no-flip calibration | canon, implementation, process |
| 2026-02-11 | Phase II direct-start AoR; hard/dynamic frontage cap; urban fortress; same-HQ/missing-HQ AoR fix | architecture, implementation |
| 2026-02-11 | No-flip policy finalization; player_choice GO, ethnic/hybrid NO-GO; cloneGameState centralization | process, implementation |
| 2026-02-11 | Municipality supra-layer; ensure step only brigade-home muns; ongoing recruitment | implementation |
| 2026-02-12 | RBiH-aligned municipalities; battle resolution engine; tactical viewer standardization | implementation, canon |
| 2026-02-12 | Orchestrator scenario runs handoff; recruitment spawn priority | process, implementation |
| 2026-02-13 | Scenario-run remediation (no-flip semantics, Phase II attack summary); casualty_ledger serialization | implementation |
| 2026-02-13 | Brigade strength/AoR investigation; MAX_MUNICIPALITIES_PER_BRIGADE; Orchestrator absorption + canon update | implementation, process, canon |

---

## Decision chains (for §Technical Decision Chains)

1. **Geometry:** Path A (2026-01-24) → crosswalk/outline issues → union failure → drzava.js borders (2026-01-24) → adjacency/edge cancellation (2026-01-25–26) → A1/WGS84/Voronoi (2026-02-07). See PROJECT_LEDGER.md entries 2026-01-24 through 2026-02-07.
2. **Bots:** Random/placeholder → determinism requirement → seeded RNG, strategy profiles (2026-02-09 Phase A) → time-adaptive, front-length/manpower (2026-02-09). See PROJECT_LEDGER.md 2026-02-09.
3. **Map / control:** Tactical map canonical (2026-02-08) → formation positions, viewer data → start-control hardening, no null (2026-02-09). See PROJECT_LEDGER.md 2026-02-08–09.
4. **Phase II combat:** Garrison-based (2026-02-11) → battle resolution engine with terrain/casualty_ledger/snap events (2026-02-12); RBiH–HRHB gate in resolve_attack_orders. See PROJECT_LEDGER.md 2026-02-11–12.
5. **Phase I no-flip:** Stasis (2026-02-11) → military-action branch → calibration → player_choice GO only, ethnic/hybrid NO-GO (2026-02-11). See PROJECT_LEDGER.md 2026-02-11; PARADOX_PHASEI_NOFLIP_FINAL_PROPOSAL_2026_02_11.md.

---

## Verification

- All changelog entries remain in `docs/PROJECT_LEDGER.md` (append-only).
- Thematic doc `docs/PROJECT_LEDGER_KNOWLEDGE.md` holds consolidated knowledge and links to ledger by date/section where appropriate.
- When adding new ledger entries, tag with theme(s) and optionally add a line to this index or update the knowledge doc.
