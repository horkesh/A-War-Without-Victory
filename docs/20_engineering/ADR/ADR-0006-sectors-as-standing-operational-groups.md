# ADR-0006: Sectors as Standing Operational Groups — Naming Reconciliation

## Status
Accepted (2026-05-28)

## Context

ADR-0005 (Tactical Groups as the Primary Ops Path) introduced **temporary** TGs / OGs for offensive operations. After that ADR was accepted, the lead asked a structural question: *if OGs are first-class, why do we still need sectors?*

A four-specialist Pyrrhic investigation (2026-05-28 PM) returned a 3-1 verdict against full sector removal, but with a single load-bearing synthesis insight that resolves the apparent conflict:

- **Historian**: Primary-source pattern across BB1/BB2 is unambiguous. Corps AORs were subdivided by named Operational Groups, NEVER by geometric "sectors." The word "sector" in BiH-war primary sources is either (a) a named command coextensive with an OG (HV "Zadar Sector"), or (b) journalistic shorthand for "an area." It is never an internal geometric primitive below the OG. Examples documented in BB: VRS Doboj OG 9, Drina Corps TG Kalinovik; ARBiH 5th Corps OG North + OG South, "Una-Sanska" OG (→ 5th Corps), OG 6-East, OG 7-South; HVO OZ Central Bosnia with subordinate brigades by name.
- **Tech Architect**: 197 files / 4,885 sector references. ~13 files are load-bearing front geometry (Voronoi-BFS partitioning, sub-segment handling, threat/density classification). Honest scope estimate for full removal: 9-15 months on top of ADR-0005, with a calibration cliff that may not stabilize. Critical insight: *"You'd churn 197 files to rename `CorpsFrontSector` to `StandingOperationalGroup` and end up with the same fields, the same pipeline steps, the same UI components."*
- **Ops Expert**: Multi-OG coverage gap catastrophic. With ADR-0005's `MAX_CONCURRENT_TGS_PER_FACTION = 4`, OGs cover ~20-50 OSIDs. Real friendly front is ~250-300 OSIDs touching enemy. Under OG-only, ~85% of friendly territory becomes ownerless. Expected calibration shift +30-60%, 95% confidence of regression beyond ±2pp sign-off gate.
- **Game Designer**: Sectors are the primary defensive interaction surface for the player (Front map mode IS sectors; stance dropdown IS sectors; Army HQ COS briefing IS structured by sectors). *"Sectors are how the map says 'this is yours to lose.' TGs say 'this is what I sent someone to take.' Those are different games."*

**The synthesis**: the engine's `CorpsFrontSector` entity already carries everything a standing OG carries (front-edge ownership, brigade roster, threat ratio, defensive power, density, sub-segments). The substance is correct. **Only the label is wrong.**

## Decision

Treat the engine's existing sector mechanism as the implementation of canon's "standing Operational Groups." Do not refactor the engine. Reconcile the vocabulary through a display-naming layer and one canonical clarification.

Three concrete actions:

1. **Add `display_name?: string` to `CorpsFrontSector`** (`src/state/game_state.ts`). Optional field; UI/AAR layers render `display_name ?? defaultSectorLabel(sector)` everywhere user-facing. Default label (when no display name set) stays as today.

2. **Scenario authors populate `display_name` with historically-attested OG / TG / OZ names.** The apr1992 scenario's vrs_drina sectors might be labeled "TG Drina" and "TG Foča"; vrs_1st_krajina sectors might be "Doboj OG 9" and "Prijedor OG 10"; arbih_5th_corps sectors "OG North" and "OG South"; hvo_central_bosnia sectors as "OZ Central Bosnia" (with sub-sectors named per OZ-internal OGs). Unauthored sectors fall back to engine default labels.

3. **Canon docs get a clarifying note.** Rulebook v0.9.0 §5.7 and Systems Manual v0.9.0 §6.3 — both currently describe OGs as "temporary coordination constructs" — gain a paragraph noting that the engine's `corps_front_sectors` are the **standing** OG implementation; temporary task forces (ADR-0005's TGs) are the offensive specialization. Both layers exist; the canon term "Operational Group" encompasses both.

Scope boundaries:
- **Zero structural code change.** The engine's sector partition, defensive math, brigade-to-sector assignment, sector_intel, sector_combat_ratings, and frontline rendering all remain exactly as today.
- **No effect on ADR-0005.** Temporary TGs for offensive ops proceed per the accepted r3 design.
- **HVO Operational Zones = HVO corps.** HVO `corps_command` entries already represent the four OZs (NW Herzegovina, SE Herzegovina, Central Bosnia, Posavina). Display labels render the OZ name; no new entity.
- **Future engine renames deferred.** A deeper code-level rename (`CorpsFrontSector` → `StandingOperationalGroup`, `sector_id` → `og_id` everywhere) is deferred to a v0.10 milestone ADR if-and-when calibration data demonstrates the naming inconsistency causes operational harm. Not now.

## Schema impact

Single optional field added to `CorpsFrontSector`:

```ts
interface CorpsFrontSector {
  // ...existing fields unchanged...
  display_name?: string;
}
```

No schema version bump required (additive optional field, backwards-compatible). Save migration: none.

## Determinism Impact

None. `display_name` is presentation-only — never participates in combat math, bot AI decisions, or hash inputs. Serializer omits empty strings via standard `omitEmpty`.

## UI / display layer changes

Files needing a display-label substitution (display function call site, not schema change):

- `src/ui/map/components/army_hq/SectorsSection.tsx` — section headers
- `src/ui/map/components/CorpsFrontPanel.tsx` — stance dropdown labels, sector list
- `src/ui/map/store/gameStore.ts` — `selectedCorpsFrontSectorId` selection chrome
- Map mode "Front" sector labels (`src/ui/map/builders/*GeoJSON.ts`)
- AAR + weekly_report sector references (lazy substitution at render time)

Pattern: helper `displaySectorLabel(sector, corps): string` centralizes the fallback logic. ~50 LOC across the UI surface for the helper + call-site adoption.

## Scenario authoring

For each scenario, identify which corps front sectors map to historically-attested OG / TG / OZ names. Initial authoring target: **apr1992 scenario** with the ~6-8 most-cited standing formations from BB.

Recommended initial set (per Historian r3 + this investigation):

| Faction | Corps (engine) | Sector index | Historical name |
|---|---|---|---|
| VRS | vrs_1st_krajina | 0 (Doboj area) | Doboj OG 9 |
| VRS | vrs_1st_krajina | (Prijedor area) | Prijedor OG 10 |
| VRS | vrs_drina | (Foča area) | TG Foča |
| VRS | vrs_drina | (Višegrad area) | TG Višegrad |
| VRS | vrs_sarajevo_romanija | (Vogošća area) | "Vogošća" OG |
| ARBiH | arbih_5th_corps | (north flank) | OG North |
| ARBiH | arbih_5th_corps | (south flank) | OG South |
| HVO | hvo_central_bosnia | (whole corps) | OZ Central Bosnia |

Additional names populated incrementally as calibration sessions surface other historically-attested formations.

## Consequences

### Positive
- Resolves the Historian's correct critique that "sector" is not a BiH-war term without a 9-15 month engine refactor.
- Player sees historically-grounded OG names ("Doboj OG 9", "TG Drina") while the engine keeps its proven sector mechanism.
- Zero calibration risk (additive optional field, presentation-only).
- Canon docs stay coherent with engine reality (both layers exist; both are "Operational Groups").
- Frees ADR-0005 to ship as-designed without scope creep.

### Negative / Risk
- Vocabulary asymmetry persists in engine code: developers read `sector_id` in source, see `Doboj OG 9` in tests / UI. Documented in this ADR as canonical; future contributors must learn the duality.
- Some scenarios will lack `display_name` coverage initially → fall back to engine default labels until incrementally authored.
- A future deeper rename remains an option but no longer urgent.

## Canon References

- `docs/10_canon/Rulebook_v0_9_0.md` §5.7 "Operational Groups" — needs a clarifying paragraph noting the engine's `corps_front_sectors` ARE the standing-OG implementation. (Manual edit; ADR does not auto-edit canon.)
- `docs/10_canon/Systems_Manual_v0_9_0.md` §6.3 "Operational Groups (OSID model)" — same clarification.
- `docs/10_canon/Game_Bible_v0_9_0.md` §3.3 — unchanged.

## Historical & Source References

- Balkan Battlegrounds Vol I pp. 150, 389, 446, 494 — ARBiH 5th Corps OG North/South, JNA/HV doctrine
- Balkan Battlegrounds Vol II pp. 419, 475, 479, 482, 490, 505 — VRS Doboj OG 9, TG Kalinovik, Drina Corps by named brigades, HVO OZ Central Bosnia
- ICTY *Krstić* IT-98-33-T — corps-level operation authority (Krivaja-95)
- Pyrrhic specialist investigation 2026-05-28 PM: Tech Architect (197-file scope analysis), Ops Expert (multi-OG coverage gap), Game Designer (player UX dependency), Historian (primary-source vocabulary verification)

## Companion ADR

- ADR-0005: Tactical Groups as the Primary Ops Path — handles **temporary** OGs / TGs for offensive operations. ADR-0006 (this doc) handles the **standing** OGs that own defensive AORs (today implemented as `corps_front_sectors`).

## Ledger Entry

Add to `docs/PROJECT_LEDGER.md`:
```
## [2026-05-28] ADR-0006: Sectors as Standing Operational Groups — Accepted
Reconciles ADR-0005 (temporary OGs/TGs for ops) with canon (OG as the universal C2 echelon) without refactoring the engine. Engine `corps_front_sectors` ARE the standing-OG implementation; add `display_name?: string` for historically-attested labels (Doboj OG 9, TG Drina, OG North/South, OZ Central Bosnia). Zero structural code change. Future deeper rename (CorpsFrontSector → StandingOperationalGroup) deferred to v0.10 if calibration data warrants. See ADR-0006.
```
