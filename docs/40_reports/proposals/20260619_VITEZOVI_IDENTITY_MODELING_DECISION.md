# Vitezovi Identity Modeling Decision Packet

**Date:** 2026-06-19; Pyrrhic decision-prep update 2026-06-22
**Lane:** OOB historical identity / HRHB Central Bosnia polish
**Status:** DECISION PREPARED / POST-D2 OOB LANE REQUIRED BEFORE SOURCE MUTATION
**Owner roles dispatched 2026-06-22:** historian, formation expert, canon reviewer, scenario tester

## Finding

The current OOB row `hrhb_vitezovi_brigade_vitez` is not a loader bug. The loader now preserves existing `elite_commander` metadata, and the Vitezovi row is intentionally allowlisted as the one elite HRHB row without commander metadata while its identity is reviewed.

The historical modeling problem is that the current row conflates two distinguishable formations:

- Current source row: `"Vitezovi" Brigade (Vitez)`, HRHB, motorized, `is_elite: true`, 700 personnel, no commander.
- BB2 p.437 distinguishes a company-sized PPN Vitezovi elite detachment led by Darko Kraljevic from the larger local Vitez brigade under Mario Cerkez, about 1,500 troops with heavier weapons.
- BB2 p.438 says the Vitez brigade/artillery likely supported Ahmici while Jokeri/Vitezovi were separate select small units, with Cerkez likely exercising tactical control in the area.
- BB2 p.439 endnote 25 identifies the later 92nd "Vitez" Home Defense Regiment lineage for the local brigade.
- BB2 p.441 later refers to HVO's Vitezovi special operations unit counterattacking at Bobas.

Repo evidence points the same way: `docs/PROJECT_LEDGER_KNOWLEDGE.md` warns not to attach Darko Kraljevic or Mario Cerkez to the current conflated row, and `docs/knowledge/WIKIPEDIA_OOB_CROSS_REFERENCE.md` identifies the proper brigade as Viteska/Vitez brigade while PPN Vitezovi was separate. `docs/knowledge/HVO_ORDER_OF_BATTLE_MASTER.md` is the older conflating source and should not be treated as final authority for this row.

## Specialist Findings

- Historian: Option B is historically strongest. BB2 repeatedly separates a brigade-scale local Vitez formation from a small PPN/special-operations Vitezovi unit. The exact formal wartime "Viteska brigada" label is less certain from BB2 pp.437-441 than the distinction itself; "Viteska" comes from repo cross-reference evidence.
- Formation expert: only one current HRHB Vitez/Vitezovi row exists. `is_elite` creates `elite_loan_state`; personnel, equipment class, and formation count are not cosmetic. Option A changes `data/source/oob_brigades.json`, `data/source/oob_brigade_designations.json`, localization, and OOB/formation tests. Option B adds a second row and has a larger scenario/baseline surface.
- Canon reviewer: Option A is canon-safe with sign-off. Option B is historically strongest but canon-silent/riskier because the current formation model does not clearly authorize a persistent company-sized special-purpose detachment as a separate combat formation without formation/design approval. Option C is canon-safe as a temporary accepted abstraction.
- Scenario tester: Option B should wait until after D2; Option A should also wait if it changes mechanics or canonical identity. Option C can remain pre-D2 only as docs/source-note cleanup.

## Decision Options

### Option A - One Gameplay Abstraction

Rename/source-note the row as the local Vitez/Viteska brigade, remove the misleading elite-special-unit implication, and treat commander metadata as the local brigade question. This preserves one runtime formation but may require changing `is_elite`, personnel, equipment, and visible names.

Implementation implication: sim-affecting if `is_elite`, personnel, equipment class, mandatory status, home/corps placement, or canonical identity changes. Even display/name-only changes can move output surfaces because OOB loading and reports depend on formation names.

### Option B - Split Model

Model the local Vitez brigade and the PPN Vitezovi as separate formations: one territorial brigade-scale HVO unit and one small elite/special-purpose detachment. This best matches the source distinction, but it changes formation count, HRHB Central Bosnia manpower, elite behavior, map/ORBAT display, possible sector assignment, and recruitment/formation deltas.

Implementation implication: historically preferred, but post-D2 only unless owner explicitly reopens calibration-bearing OOB work. Requires formation/game-design sign-off on whether a company-sized PPN is a persistent combat formation, an attachment, or an abstracted elite reserve.

### Option C - Accepted Abstraction

Keep the current row as a deliberate abstraction, preserve the commander allowlist, and add stronger source notes explaining why no single commander is assigned. This is lowest risk for calibration but leaves the visible identity less precise.

Implementation implication: safe before D2 only if strictly docs/source-note cleanup and the OOB row remains unchanged.

## Prepared Decision

The Pyrrhic specialist packet recommends **Option B as the historical target model after D2**, with **Option C as the current pre-D2 freeze**. Do not mutate OOB source data, split formations, or assign commander metadata before D2 owner playthrough unless the owner deliberately reopens a calibration-bearing OOB lane.

No commander should be assigned to the current conflated row:

- Do not assign Darko Kraljevic to `hrhb_vitezovi_brigade_vitez`; that would make the row look like the PPN while it is currently brigade-scale.
- Do not assign Mario Cerkez to `hrhb_vitezovi_brigade_vitez` while the row remains named/typed as Vitezovi elite-special abstraction.
- If Option A is later selected, Mario Cerkez needs a non-elite local-brigade commander representation decision; the current `elite_commander` field is not a clean fit.
- If Option B is later selected, Darko Kraljevic may belong only on the PPN/special-purpose representation after historian/canon sign-off.

## Post-D2 Implementation Gate

If the owner chooses Option A or Option B after D2, run it as a dedicated OOB lane with no unrelated polish:

1. Confirm the selected model with historian, formation expert, game designer, canon reviewer, and scenario tester.
2. Update only the necessary OOB source/designation/localization files.
3. Keep Ahmici-sensitive wording third-person, historical, and non-rewarding; do not create an atrocity lever, achievement framing, calendar-triggered rupture, or postwar legal outcome display on live command surfaces.
4. Run focused checks:
   - `npx.cmd vitest run tests/oob_loader.test.ts tests/oob_elite_commander_contract.test.ts tests/oob_early_war_entry.test.ts tests/recruitment_engine.test.ts tests/recruitment_existing_formation_identity.test.ts tests/activate_corps.test.ts --reporter=dot`
   - relevant UI/localization tests if formation names or ORBAT labels change
   - `npm.cmd run ci:structural-fingerprint:check`
5. For Option B, add explicit formation-count/HRHB Central Bosnia ORBAT review and schedule 40w/188w scenario proof before any calibration re-bless.

## Likely Implementation Targets

- `data/source/oob_brigades.json`
- `data/source/oob_brigade_designations.json`
- `src/ui/map/data/formationNameLocalizations.ts`
- `tests/oob_elite_commander_contract.test.ts`
- `tests/oob_loader.test.ts`
- `tests/oob_early_war_entry.test.ts`
- `tests/recruitment_engine.test.ts`
- `tests/recruitment_existing_formation_identity.test.ts`
- `tests/activate_corps.test.ts`
- Active OOB knowledge docs after the modeling decision is implemented

## Stop Gate

No OOB source mutation in mixed polish/docs branches. This packet records the decision boundary and prepared recommendation only. The current repo state remains frozen for D2 unless the owner explicitly reopens the OOB/calibration lane.
