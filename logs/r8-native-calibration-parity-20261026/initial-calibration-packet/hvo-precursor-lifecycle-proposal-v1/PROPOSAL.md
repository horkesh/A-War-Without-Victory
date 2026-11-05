# HVO precursor lifecycle proposal

## Finding

The five active-at-opening rows are not five source-supported April 1992 brigades. BB2 p.446 says Ban Josip Jelačić Brigade, HQ Kiseljak, was “Established 20 December 1992,” “Formed from the Kiseljak, Kresevo, Fojnica municipal HVO headquarters,” and “Later split into” the 94th Ban Josip Jelačić and 95th Marinko Bošnjak Home Defense Regiments. BB2 p.460 repeats the parent-to-two-successors relationship. This supports a reorganization/subdivision lineage—not concurrent April activation of Ban, 94th, and 95th.

`hrhb_kiseljak_brigade` and `hrhb_kreevo_brigade` are plausible counters for two April municipal precursors, but that identification is not proved merely by their names. No separate HRHB Fojnica row exists; `hrhb_95th_brigade` has `home_settlement: Fojnica` but a Kreševo municipality/OSID and is itself a later successor, so it cannot safely stand in for the missing April Fojnica headquarters. The current five rows each seed 700 personnel and separate equipment at turn 0, creating 3,500 personnel before any reorganization.

Ban’s date maps between engine boundaries: scenario epoch `{year:1992, month:3, day:6}` means 6 April (zero-based month); turn 36 is 14 December and turn 37 is 21 December. `runTurn` increments first, then lifecycle reads the incremented turn. Therefore `trigger_turn:36` acts on the 14 December boundary and `37` on 21 December. Whether a 20 December formation becomes effective during turn 36’s week or not before turn 37 is a canon convention requiring explicit review—not an arithmetic inference.

The 94th/95th split date remains **UNRESOLVED**. Later OOB placement supports 94th/Kiseljak and 95th/Kreševo–Fojnica successor roles, but not an April date, exact division, or whether these are new tactical counters versus administrative redesignation.

## Smallest coherent implementation proposal

Do not remove April municipal forces, merely delay Ban while retaining successor duplicates, or use existing `merge` entries. First obtain historian/canon rulings for: (1) exact April representation of the Fojnica municipal HVO headquarters; (2) Ban effective-turn convention (36 or 37); (3) split date/bound; (4) personnel/equipment shares and whether one Ban counter is operationally valid across separated municipalities.

Then add one deterministic, atomic **reorganization** lifecycle operation using the normal lifecycle phase: multi-source→one successor and one parent→two successors. It must conserve personnel and every equipment/composition bucket; preserve casualty/provenance history; leave predecessor records inactive with successor links; deterministically remap/remove attack, movement, sector, corps-operation and recruitment references; validate same-faction controlled placement/reachable transfer so no teleport occurs; and record an idempotent receipt for save replay. Legacy saves containing all five require a versioned migration or explicit grandfather policy; OOB edits alone do not rewrite serialized formations.

Existing machinery is insufficient: `rename` changes only the display name, while `merge` needs an already-active target, moves personnel only, and cleans only active-operation participation. No identity aliases exist, and exact-ID recruitment matching would not recognize predecessors/successors.

## Vitezovi residual (out of scope)

BB2 p.437 distinguishes the locally raised ~1,500-man Vitez brigade from the 100–150-man Vitezovi special-purpose detachment formed late 1992/early 1993. Any shared identity is a separate audit; no change belongs in this proposal.

**Gate:** independent historian/canon review is required before implementation. No health-cap, protected-control, or baseline change is proposed.
