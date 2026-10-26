# Korenici T34–37 combat-input finding

This was one retained-file extraction. It made no engine import/API call, query, turn advance, campaign run, state mutation, or source/test edit.

## First meaningful boundary

Current P03/a306 and older native-04/77a2 reach Korenici T34 with the same sole physical attacker (RS 16th Krajina Motorized), primary defender (ARBiH 330th), three-brigade defender set, target and attacker-location supply (`adequate` / `strained`), stale-intel annotation, Operation Donji Vakuf execution multiplier (1.65), axis roster, and axis-mate locations. Terrain is common: source-formula defender multiplier 1.1379167 and mean slope 0.3376667. RS 22nd is three hops away and contributes zero concentration weight; RS 5th is two hops away and contributes 0.5, floored with the total to zero. Both therefore use reconstructed concentration multiplier 1.0.

The concrete material discrepancy is operational fatigue. Current RS 16th has fatigue 11, yielding the current source-formula attack multiplier 0.8533333; older native-04 has fatigue 0, multiplier 1.0. Current defenders have small nonzero fatigue (multipliers 0.9917, 0.9958, 0.9583), while the older defenders are all zero-fatigue. Other exact T34 differences are small: the older 770th has 191 personnel versus current 206; attacker personnel, morale, cohesion, posture, readiness, artillery, and tanks match.

The recorded outcome crosses a defined boundary: older native-04 is `victory`, so effective attacker/defender power ratio is in [1.5, 2.0); current is `costly_victory`, ratio [1.0, 1.5). Casualties are 216/564 versus 291/360. The public records do not retain exact powers, exact ratio, or a decomposed resolution trace, so those values cannot be recovered honestly.

## T35–37 trajectory

The T34 outcome creates compounding state differences. Current RS 16th fatigue rises 14.5→19→22.5, with reconstructed attack multipliers 0.8067→0.7467→0.7000; older fatigue remains 0. Current outcomes become repulsed/stalemate/repulsed, while older becomes costly victory/victory/decisive victory and flips Korenici T37. Current attacker readiness degrades after T34; older remains active through T36 and overextended at T37. Defender personnel, cohesion, and later equipment consequently diverge.

Axis support does not explain the cohort difference. It is identical per turn: reconstructed concentration multipliers 1.0, 1.1, 1.1, 1.2. RS 22nd affects the lawful concentration calculation from T35 onward, but its position is identical in both cohorts and it never appears as a physical attacker. Supply and terrain also match.

n101 and n102 retain battle outputs but no immediately-prior autosaves, so their prebattle terms are unreported. n101/a306 faces a different defender set and wins decisively T34. n102 first records two stalemates, then a decisive T37 win; this is outcome evidence, not comparable input evidence.

Verdict: no new combat defect is evidenced. The 77a2 save migration reset fractional fatigue to zero; a306 deliberately preserves finite fractional fatigue. Korenici is a lawful trajectory divergence caused at least materially by that correction, followed by casualties/readiness feedback. The smallest unresolved question is whether the required 707 reference gate should tolerate this intended fatigue correction; no code change or tuning follows from retained evidence alone.
