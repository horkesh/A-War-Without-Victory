# Korenici T34–37 retained combat finding — corrected scope

This amendment narrows `REPORT.md` after independent review. The original report, extraction result, streams, wrapper receipt, and machine receipt remain unchanged. No engine/API call, query, turn advance, campaign, source/test edit, or new extraction was made.

## What the retained records establish

Current P03/a306 and comparison-only native-04/77a2 record the same sole physical Korenici attacker at T34–37: RS 16th Krajina Motorized. Current P03 also records ordinary operation admission and movement to Donji Vakuf before the first attack. RS 22nd never appears as a physical Korenici attacker. These records provide no affirmative evidence of a missing movement, admission, or combat-resolution path.

The retained current pre-turn T33 autosave that feeds the T34 advance has RS 16th fatigue 11; the corresponding older retained state has fatigue 0. Under the inspected current formula, that term reconstructs to attack multipliers 0.8533333 and 1.0. This is a material observed difference. It is not a retained phase-local T34 precombat snapshot: other phases may run between the T33 autosave and combat, and no full precombat power trace was recorded.

The compared records also agree on the extracted T34 attacker identity, attacker personnel/morale/cohesion/posture/readiness/heavy equipment, target and attacker-location supply labels, operation multiplier, axis roster and locations, and reconstructed terrain/concentration subset. They differ in defender fatigue and 770th personnel. The resolver consumes additional power terms that this packet did not reconstruct or prove equal, including command/officer, disruption, distance, equipment effectiveness, environment/front density, event, seasonal, exhaustion, firepower-deficit, and intel terms.

The deterministic outcome categories bound the unrecorded ratio: native-04 `victory` implies [1.5, 2.0), while current `costly_victory` implies [1.0, 1.5). Exact powers and the exact ratio are unreported. There is no random-roll limitation; this combat path classifies outcomes deterministically.

After T34, casualties, fatigue, readiness, personnel, cohesion, and equipment diverge, so T35–37 cannot isolate an independent cause. n101/n102 provide outcome chronology without comparable immediately-prior inputs.

## Narrow verdict

The retained evidence shows valid admission, movement, and deterministic combat resolution and reveals no affirmative evidence of a new combat defect. Persisted fatigue is a plausible material contributor to the T34 boundary change, but this packet neither isolates the complete effective-power calculation nor proves fatigue preservation caused the different result. The 707 acceptance criterion and Korenici mismatch remain unmet and unwaived. No tuning or code change follows from this retained-only packet.
