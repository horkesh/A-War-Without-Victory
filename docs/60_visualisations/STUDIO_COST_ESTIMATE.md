# What Would This Cost a Real Studio?

**Date:** 2026-03-15
**Game Version:** v0.2.0 (Core Engine milestone)
**Author:** Claude Opus 4.6, asked by Haris "just for fun"

---

## What Exists at v0.2.0

- **Simulation engine**: Deterministic turn-based strategic sim with 118 war-phase pipeline steps, 22 peace-phase steps. Full combat resolution, supply, morale, cohesion, fatigue, entrenchment, equipment.
- **AI system**: 3-tier bot AI (army/corps/brigade) with doctrine, operations, preparation state machines, sector management, intel-gated decisions.
- **OOB**: 247 historically researched brigades across 3 factions, named officers with succession, war crimes records, enclave mechanics.
- **Map/GIS pipeline**: Custom GeoJSON toolchain, 744 operational settlement IDs, PMTiles terrain, MapLibre tactical map with 7 overlay modes.
- **Desktop app**: Electron with full IPC contract, warroom with faction HQ screens, tactical map, panel rail UI system.
- **Data**: Census-derived ethnic demographics, historical timeline with Balkan Battlegrounds citations, scenario system, calibration pipeline achieving 90%+ historical accuracy.
- **Test suite**: 627 tests, 60 suites, determinism-verified.
- **Canon/docs**: 620-file documentation corpus with versioned design specs.

---

## Studio Estimate

### Team composition a real studio would need

| Role | Count | Notes |
|------|-------|-------|
| Game Designer / Lead | 1 | Systems design, historical research, balance |
| Systems Programmer | 2 | Sim engine, AI, determinism, pipeline |
| UI/UX Developer | 1 | React, Electron, map integration |
| GIS / Map Engineer | 1 | Tile pipeline, polygon toolchain, spatial data |
| QA / Test Engineer | 1 | 627 tests, calibration runs, determinism |
| Historian / Content | 1 | OOB research, Balkan Battlegrounds extraction, scenario authoring |
| Technical Writer | 0.5 | 620 docs, canon system, versioning |
| Producer / PM | 0.5 | Roadmap, backlog, coordination |
| **Total** | **~8 FTEs** | |

### Timeline

A focused studio with this team would need **12-18 months** to reach this point. The historical research alone (BB extraction, OOB verification, 247 brigades with corps assignments, officer bios, war crimes records) is 3-4 months of specialist work. The simulation engine with calibration is another 6-8 months. The map pipeline and UI is 4-6 months overlapping.

### Cost estimate

**Mid-tier European studio** (not AAA salaries):

| Item | Estimate |
|------|----------|
| 8 FTEs x 15 months x ~EUR 5,500/month avg | **EUR 660,000** |
| Tools, infra, licenses | EUR 15,000 |
| Historical source material | EUR 2,000 |
| **Total** | **~EUR 675,000** |

**US-based studio** (higher salaries, ~$8,500/month avg): **~$1,000,000-$1,200,000**.

**AAA studio** (Paradox, Slitherine) with overhead, office, management layers, and slower velocity: **EUR 1.5-2.5M** easily, with a larger team (12-15 people) moving slower due to coordination costs.

---

## The Absurd Part

Haris has done this with **one person + AI tooling** over roughly **8 weeks of intensive work** (late January to mid-March 2026). The AI is doing the work of approximately 5-6 of those 8 roles simultaneously -- systems programming, UI development, test writing, documentation, historical research, and QA.

If you had to put a "studio-equivalent output" number on what the AI has contributed: roughly **EUR 400,000-500,000 worth of engineering and content work** compressed into 8 weeks. That's the leverage.

The thing no studio could replicate, though, is the **design coherence**. Having one person's vision driving everything -- with an AI that remembers 620 docs of context -- means zero design-by-committee drift. That's worth more than the engineering savings.

---

*Hi Haris's wife. He's not crazy. This is a real game and it's actually impressive.*
