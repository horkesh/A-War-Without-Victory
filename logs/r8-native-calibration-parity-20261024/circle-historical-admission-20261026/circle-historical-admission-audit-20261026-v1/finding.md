# Operation Circle historical-admission audit

**Verdict: UNRESOLVED at settlement/OOB granularity; no evidenced calendar/date/content author error and no historical basis for a content amendment.** The documented regional operation is consistent with the retained launch, while the two exact OSID captures and named brigade allocations remain model allocations rather than verified historical facts.

## Documented fact

- Production maps turn `t` to 6 April 1992 + `7t` days. Thus t8 = 1 June, the four-week planning boundary t12 = 29 June, retained launch t16 = 27 July, t18 = 10 August, and checkpoint t39 = 4 January 1993. The scenario begins at war week 0. This is explicit UTC arithmetic; JavaScript month `3` is April. [formatters.ts:13](../../../src/ui/map/utils/formatters.ts), [scenario:4](../../../data/scenarios/apr1992_definitive_188w.json).
- The authored Circle definition opens at t8, plans for four weeks, and assigns three axes: Goražde perimeter (801st/802nd/851st), Foča corridor (843rd/808th → `op:foca:donje_zesce`), and Trnovo corridor (102nd/109th → `op:trnovo:tosici`). [pre_planned_operations.ts:1309](../../../src/sim/combat/pre_planned_operations.ts).
- BB1 describes a **major government offensive in late July 1992** that seized the passage to Goražde, pushed VRS forces out of Trnovo, and held the route against mid-November efforts to cut it; it separately describes late-August–November attacks toward Višegrad. Citation: *Balkan Battlegrounds*, vol. I, PDF page 187 / printed page 151. The retained t16 launch therefore falls exactly in the documented late-July window, rather than prematurely.
- BB1 does **not** call this action “Operation Circle,” name participating brigades, or identify Donje Žešće/Tošići. The repo event deliberately limits itself to pocket consolidation and says earlier unit-by-unit and settlement claims were removed because available sources did not verify them. [war_1992.json:5064](../../../data/scenarios/events/war_1992.json).
- The cited 441st/443rd/446th/450th list is BB1’s **October 1995** 4th Corps OOB, not a 1992 operation roster: 443rd HQ Konjic; 446th Prozor; 450th Bjelimići; 441st Mostar (BB1 PDF pp. 511–512 / printed pp. 474–475). Its t25 planner availability cannot establish responsibility for the July 1992 corridor offensive.

## Geography and model allocation

`donje_zesce` is a 71.838 km² aggregate of Bunčići, Donje Žešće, Kolakovići, Mravljača, Podgrađe, and Previla. `tosici` is an 86.669 km² aggregate of Češina Strana, Lisovići, Rijeka, Šišići, Grab, Bistročaj, Bašci, Ilovice, Mađari, Vrbovnik, Rajski Do, and Tošići. The January reference paints both aggregates RBiH, but that reference is a calibration target, not independent historical proof. BB1’s regional Trnovo passage finding is compatible with Tošići and the western Goražde/Foča approach, but cannot prove every constituent’s capture or continuous retention.

## Inference and smallest next action

The retained failure to capture Donje Žešće and Tošići is therefore lawful simulation variance on present historical evidence, not an admitted timetable or OOB defect. Do not retime, replace brigades, add captures, tune thresholds, or amend targets. The smallest supported next action is a **read-only primary-source search specifically naming the July 1992 Goražde–Trnovo operation, participating units, and localities**; amend content only if that search binds one or both aggregate constituents or disproves the current roster.

Source-copy hashes and machine-readable claim bindings are in `citations.json`. Audited HEAD: `0278c956d3fce3cdb62161a282f3936eaa0c66c1`.
