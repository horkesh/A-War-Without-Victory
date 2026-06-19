# Vitezovi Identity Modeling Decision Packet

**Date:** 2026-06-19  
**Lane:** OOB historical identity / HRHB Central Bosnia polish  
**Status:** PROPOSAL / DECISION REQUIRED BEFORE OOB MUTATION  
**Owner roles:** historian, formation expert, canon reviewer, scenario tester

## Finding

The current OOB row `hrhb_vitezovi_brigade_vitez` is not a loader bug. The loader now preserves existing `elite_commander` metadata, and the Vitezovi row is intentionally allowlisted as the one elite HRHB row without commander metadata while its identity is reviewed.

The historical modeling problem is that the current row appears conflated:

- Current source row: `"Vitezovi" Brigade (Vitez)`, HRHB, motorized, `is_elite: true`, 700 personnel, no commander.
- BB2 p.437 distinguishes a company-sized PPN Vitezovi elite detachment led by Darko Kraljevic from the larger local Vitez brigade under Mario Cerkez, about 1,500 troops with heavier weapons.
- BB2 p.438 says the Vitez brigade/artillery likely supported Ahmici while Jokeri/Vitezovi were separate select small units, with Cerkez likely exercising tactical control in the area.
- BB2 p.441 later refers to HVO's Vitezovi special operations unit counterattacking at Bobas.

Repo evidence already points the same way: `docs/PROJECT_LEDGER_KNOWLEDGE.md` warns not to attach Darko Kraljevic or Mario Cerkez to the current conflated row, and `docs/knowledge/WIKIPEDIA_OOB_CROSS_REFERENCE.md` identifies the proper brigade as Viteska/Vitez brigade while PPN Vitezovi was separate. `docs/knowledge/HVO_ORDER_OF_BATTLE_MASTER.md` is the older conflating source and should not be treated as final authority for this row.

## Decision Options

### Option A - One Gameplay Abstraction

Rename/source-note the row as the local Vitez/Viteska brigade, remove the misleading elite-special-unit implication, and treat commander metadata as the local brigade question. This is the smallest gameplay model but may require changing `is_elite`, personnel, equipment, and visible names.

### Option B - Split Model

Model the local Vitez brigade and the PPN Vitezovi as separate formations: one territorial brigade-scale HVO unit and one small elite/special-purpose detachment. This best matches the source distinction, but it changes formation count, potentially personnel, elite behavior, and Army HQ/ORBAT display.

### Option C - Accepted Abstraction

Keep the current row as a deliberate abstraction, preserve the commander allowlist, and add stronger source notes explaining why no single commander is assigned. This is lowest risk for calibration but leaves the visible identity less precise.

## Recommendation

Do not assign Darko Kraljevic or Mario Cerkez to the current row yet. Pick Option A, B, or C in a dedicated OOB lane after historian/canon review. If implementation changes `is_elite`, personnel, equipment class, formation count, or row identity, treat it as sim-affecting and run OOB/formation tests plus structural fingerprint and scenario baseline gates.

## Likely Implementation Targets

- `data/source/oob_brigades.json`
- `data/source/oob_brigade_designations.json`
- `src/ui/map/data/formationNameLocalizations.ts`
- `tests/oob_elite_commander_contract.test.ts`
- `tests/oob_loader.test.ts`
- Active OOB knowledge docs after the modeling decision is made

## Stop Gate

No OOB source mutation in mixed polish/docs branches. This packet records the decision boundary only.
