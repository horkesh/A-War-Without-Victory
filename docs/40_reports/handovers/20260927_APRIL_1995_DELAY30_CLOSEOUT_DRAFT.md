# April 1995 delay-30 lane — draft owner closeout packet

**Status:** Draft handover for owner review, 27 September 2026. Isolated branch `codex/april1995-hv-integration-20260927`, commit `79c98ea8e`. No push, merge, baseline adoption, painted-reference change, or new campaign is implied by this packet.

## Measured result

The one retained 188-week delay-30 run is `runs/apr1992_definitive_188w__6deb5845c150c196__w188_n0` (initial-save SHA-256 `413CE64ACAA420E130E293230DFA470DCAA46C5B4DF2C6D3706D7E31CB8455E1`). Against the Doljani `n13` comparator, April 1995 rose **701→703/712**, with anchors **39/40→40/40**; October 1995 rose **664→668/712**, anchors **31/31**. January 1993 and April 1994 remain **707/712 with identical mismatch sets**. Doljani is RBiH at w104 by ordinary combat, its painted value stays RBiH, and Ljubunci, Lug and Paroš remain HRHB.

The HV preparation delay is a **scenario choice anchored to the historical Cincar date (BB1 p.243)**, not a claim that Washington historically required 30 weeks. In the measured run Cincar launches at t132 and captures all five objectives by t138; Mistral 1 later takes Glamoč town and Pribelja. The agreed April 1995 acceptance is still **unmet**: Vidimlije is HRHB at w156 where the unchanged paint is RS, and 703 is below the lane's ≥704 target. No additional delay or retune is authorized by this result. The verifier also exits 1 on the pre-existing Farz P-A §6 wrong-corps capture (3rd rather than 2nd Corps), seen in both `n13` and `n0`. The critical anomaly type remains `combat_ineffective_concentration`; it is not a new type, and the Central Bosnia anomaly remains open.

**Fresh closeout check:** With `C:\Program Files\Git\bin\bash.exe` first on PATH, one `npm run test:vitest` exited **0** on this isolated branch: 14,135 passed, 31 skipped across four balanced shards and the final test group. The deliberately failing child-process fixture is an expected passing harness control. Raw log, Bash path, and exit are in `logs/apr1995-closeout-055-20260927/`. This green suite does not close the 188-week acceptance or Farz gates.

## Parked April 1995 cells

| Cell | Reason for parking |
|---|---|
| `op:glamoc:vidimlije_2` | HV4's t130 probe did not flip it; generic HVO sector operation Operacija Pljusak captured it at t132, with HV4 also participating. No supported one-field fix. |
| `op:orasje:donja_mahala` | The 101st and 106th HVO brigades were physically defending; a three-brigade RS Bedem attack won at ratios 1.84 and 2.33. Must-hold and forced 4th Guards formation were withdrawn. BB1 p.182 supports the Orašje pocket, not this exact cell. |
| `op:konjic:bijela_2` | Probe victory does not transfer control; no real capturing operation identified. |
| `op:trnovo:gornja_presjenica` | Probe victory does not transfer control; no real capturing operation identified. |
| `op:travnik:gornje_krcevine` | Authored Vlašić chain plans t152–155, captures Paklarevo at t156, then loses three Varošluk attacks; it never attempts Gornje by the t156 checkpoint. No Federation-held neighbour exists before Paklarevo falls at t156. This is a checkpoint-timing artefact of the authored chain, not proof of the historical capture date. BB2 p.493 identifies Vitovlje as VRS Vlašić-group HQ in 1994; [Jusović's later account](https://saff.ba/sedmi-korpus-u-zavrsnim-operacijama-u-bosanskoj-krajini/) attributes Vitovlje to the later Domet-3 sequence. Neither source dates this exact OSID. |
| `op:brcko:brka_2` | Never contested in the retained run; the initial RBiH controller persists against RS paint. |
| `op:maglaj:jablanica` | Parked outside this April 1995 lane; no authorized reference or control change. |
| `op:ilijas:krivajevici` and `op:kalesija:seher_2` | Protected carry-over mismatches at January 1993 and April 1994; no checkpoint trade without authority and evidence. |

The open design question is whether HV Guards should be eligible for **generic bot operations** or only catalog operations (`src/sim/combat/commander/plan.ts` surplus pool). The Vidimlije trace does not establish that changing this rule would prevent its primary HVO attacker, so no mechanics change follows from it.

## Documentation and authority still open

Three pre-delay documents still state Washington **+6 weeks**: [operations gap audit](../audits/20260521_OPERATIONS_EXPERT_BB_CODE_GAPS.md), [tier-1 painted-target plan](../../plans/2026-05-21-tier1-painted-target-anchors-plan.md), and [Kupres/Cincar proposal](../proposals/20260522_KUPRES_CINCAR_FIX.md). They are historical records requiring a dated correction or supersession decision, not silent rewriting in this draft. The archived Q2 ledger also preserves the old value as history.

Owner adoption/merge remains separate from this handover. The April 1995 ≥704/712 and Vidimlije RS requirements, Farz P-A §6 gate, and any canon/panel ruling remain open. The external Doljani map is an inspection candidate, not the baseline.
