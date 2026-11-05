# Ključ-first catalog candidate result

Date: 2026-09-30
Scope: one bounded 5th Corps catalog/roster candidate and cheap gates only.

## Verdict

**Candidate implemented and cheap gates green.** This is a plausible catalog
candidate, not a measured w188 success claim. No full suite, campaign, paint,
denominator, combat rule, retiming, canon, or baseline change was made.

## Red then green evidence

- Red focused evidence: `october_kljuc_candidate_red.log`, exit 1. The new
  contract failed on the pre-change catalog: no flank axis and the old
  five-brigade Petrovac roster.
- Green focused evidence: `october_kljuc_candidate_green_admission.log`, exit
  0, `tests/operation_opportunities_catalog.test.ts` **45/45**.
- Direct TypeScript check: `october_kljuc_candidate_typecheck.log`, exit 0.
- Graph check: `october_kljuc_candidate_graph_check.log`, exit 0; **8/8**
  pursuit edges present in `data/derived/operational/operational_contact_graph.json`.
- `git diff --check`: `october_kljuc_candidate_diff_check.log`, exit 0.

Intermediate focused failures and targeted corrections are retained in
`october_kljuc_candidate_green.log` and
`october_kljuc_candidate_green_retry.log`; no broader gate was repeated.

## Candidate shape

- `sana_krupa`: `511th + 505th + 503rd` (one-for-one replacement of 510th).
- `sana_bihac_petrovac`: `501st + 510th`, with the shorter ordered route:
  `ripac → racic → vrtoce → dobro_selo_2 → bosanski_petrovac_2 → kolonic_2
  → jasenovac_2 → hadzici → kljuc_2 → krasulje_2`.
- `sana_bihac_petrovac_approach`: disjoint authored roster
  `502nd + 504th + HVO 101st`, retaining `orasac_2`, `prkosi`, and
  `vodjenica` through a legal adjacent consolidation walk.
- `sana_sanski_most_kljuc`: unchanged `506th + 517th` axis and objectives.

The test verifies unique brigade ownership across all four axes and exercises
approval/admission on a retained-style state. In that RBiH-only fixture, HVO
101st remains an authored flank participant but is not admitted; the two RBiH
flank brigades are admitted without duplicate live commitment.

## Historical and residual risk

The roster swap is grounded in local BB1 p.419 evidence that 501st + 510th
pursued from Bosanski Petrovac into Ključ, while 503rd + 505th + 511th took
Krupa. All candidate pursuit edges were checked against the derived contact
graph. The approach axis deliberately shares objective cells, not brigades;
friendly-objective filtering is relied on when the pursuit axis captures one.

This does not establish combat tempo, town capture by w188, Ključ-before-Sanski
in a campaign, preservation of the four Sanski belt wins/five Jajce gains, or
zero critical anomalies. Those remain the later authorized measurement gates.

## Review readiness

Ready for independent operations/canon review and, only after that review,
the separately authorized single w188 measurement. No measurement was run in
this task.
