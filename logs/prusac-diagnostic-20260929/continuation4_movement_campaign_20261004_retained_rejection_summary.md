# Retained movement rejection extraction

The complete bounded inventory examined 36 target weekly rows: actor `arbih_737th_muslim_light` at completed turns 137–139 in n25, n29, n30, n37, n39, n40, and n41 where those turns exist, plus actor `arbih_517th_light` at completed turns 186–188 in the five 188-week runs n25, n29, n30, n37, and n39.

- Syntax exit: `0`.
- Extraction exit: `0`.
- Verdict: `COMPLETE_BOUNDED_RETAINED_REJECTION_EXTRACTION`.
- Weekly rows present: 36/36.
- `column_rejections` unreported: 30 rows.
- `column_rejections` reported nonempty: 6 rows, all six n39 actor-window rows.
- Reported empty arrays: 0.
- Matching target-actor rejection receipts: 1.

The one exact target receipt is n39, completed turn 139, actor 737:

```json
{
  "formation_id": "arbih_737th_muslim_light",
  "reason": "posture_dig_in",
  "location_osid": "op:busovaca:gornja_rovna",
  "destination_osid": "op:bugojno:udurlije",
  "formation_corps_id": "arbih_3rd_corps",
  "loaned_to_corps_id": null,
  "routing_corps_id": "arbih_3rd_corps",
  "routing_scope_osid_count": null,
  "source_in_routing_scope": null,
  "destination_in_routing_scope": null
}
```

The n39 receipt proves that n39's actor 737 order was rejected by the `posture_dig_in` branch at completed turn 139. Its actor, location, and destination match the n41 phase-34 removal context, but n39 is a different retained run and cannot supply n41's actual branch result.

The n41 row at completed turn 139 reports `column_movement` aggregate counts but does not report `column_rejections`. Therefore the existing n41 weekly artifact cannot select a rejection reason. The same limitation applies to all n25/n29/n30/n37/n40 target rows. Absence of the field is unreported diagnostic coverage, not evidence of no rejection.

For actor 517 at completed turns 186–188, n39 reports a nonempty rejection array each week but no actor 517 receipt. That is an explicit absence of a matching formation receipt within the reported array; it does not establish broader movement success or explain the original n37 cause. The other retained runs do not report the field.

The earlier 21-row helper output is preserved. It covered only actor 517 in the long runs and actor 737 in n40/n41. This complete 36-row receipt supersedes it for review without overwriting it.

Evidence:

- `continuation4_movement_campaign_20261004_retained_rejection_complete.json`
- `continuation4_movement_campaign_20261004_retained_rejection_complete.stderr.log` (empty)
- `continuation4_movement_campaign_20261004_retained_rejection_complete.exit.txt`
- `continuation4_movement_campaign_20261004_retained_rejection_complete_syntax.exit.txt`
- `continuation4_movement_campaign_20261004_retained_rejection_complete_extract.cjs`
