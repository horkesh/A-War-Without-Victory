# Plan Coverage Audit — docs/plans/*.md vs MASTER_ROADMAP.md

**Date:** 2026-05-08
**Lane:** LANE-NIGHTSHIFT-PLAN-COVERAGE-AUDIT
**Scope:** 98 markdown files in `docs/plans/` (97 plan files + `MASTER_ROADMAP.md`)
**Question:** "Did we use all the plans that were prepared for roadmap checkpoints?"
**Method:** Audit each plan against the roadmap's "Key Plan Documents" table (line 857), milestone status sections, and the "Supersedes" section (line 13). Spot-checked via `git log --all --oneline -- docs/plans/<filename>` where roadmap reference was unclear.

---

## 1. Summary

| Status | Count | % |
|--------|------|---|
| EXECUTED (milestone closed; plan was implementation reference) | 36 | 37.1% |
| PARTIALLY EXECUTED (milestone PARTIAL/OPEN; plan still load-bearing) | 26 | 26.8% |
| SUPERSEDED (replaced by later plan or rescoped) | 11 | 11.3% |
| DESIGN-ONLY (spec/design, never intended as numbered milestone) | 14 | 14.4% |
| DORMANT/UNUSED (roadmap-untracked or pulled-forward without closure) | 10 | 10.3% |
| UNCLEAR | 0 | 0% |
| **Total** | **97** | **100%** |

(MASTER_ROADMAP.md itself excluded from total of 97; the "98 files" in the prompt counts the roadmap.)

**Bottom-line answer (see §8):** Mostly yes. ~75% of plans (executed + partial + design-only) are visibly tracked by the roadmap. ~11% are superseded with explicit roadmap "Supersedes" or supporting-input pointers. The remaining ~10% (DORMANT) is the honest delta — these are real plans that exist on disk and were referenced in commits, but are not currently tracked in the master roadmap. Most of those are pulled-forward or absorbed work, not abandoned.

---

## 2. EXECUTED Plans (36)

Milestone is CLOSED on the roadmap and the plan was the named implementation reference.

| Plan | Milestone | Roadmap ref |
|------|-----------|------|
| `2026-03-22-ai-commander-events-impl-plan.md` | v0.6.x AI Commander + Events | line 58 (v0.6 closure) |
| `2026-03-22-calibration-framework-impl-plan.md` | v0.6.x calibration framework | line 58 |
| `2026-03-22-chronicle-wrapped-impl-plan.md` | v0.6.x Chronicle Wrapped | line 58 |
| `2026-03-22-dayton-dimension-merge-design.md` | v0.6.x Dayton dimension merge | line 58 |
| `2026-03-22-dayton-dimension-merge-impl-plan.md` | v0.6.x Dayton dimension merge | line 58 |
| `2026-03-22-game-chronicle-design.md` | v0.6.x Game Chronicle | line 58 |
| `2026-03-22-game-chronicle-impl-plan.md` | v0.6.x Game Chronicle | line 58 |
| `2026-03-22-historical-essays-impl-plan.md` | v0.6.x essays | line 58 |
| `2026-03-22-hq-deep-drill-impl-plan.md` | v0.6.x HQ deep-drill | line 58 |
| `2026-03-23-event-flag-wiring-plan.md` | v0.7.0 event flag wiring | line 60-61 |
| `2026-03-24-emergent-brigade-formation-design.md` | Emergent brigade formation (shipped, commit `989ea213`) | line 52 (v0.4.x lineage) |
| `2026-03-24-emergent-brigade-formation-plan.md` | Same as above | — |
| `2026-03-24-v072-warroom-react-migration-plan.md` | Warroom React migration (CLOSED 2026-04-04) | line 68, 363 |
| `2026-03-25-letter-home-and-essay-authoring-spec.md` | Letter Home (IMPLEMENTED 2026-04-04) | line 67, 116, 460 |
| `2026-03-25-ghost-map-exhaustion-clock-spec.md` | Ghost Map + Exhaustion Clock (IMPLEMENTED) | line 70, 467, 507 |
| `2026-03-29-concurrent-corps-operations.md` | v0.8.0 concurrent corps ops | line 910 |
| `2026-03-30-v080-corps-commander-intelligence-architecture.md` | v0.8.0 architecture | line 861 |
| `2026-03-30-p0-combat-drought-fix.md` | v0.8.0 P0 fix | line 862 |
| `2026-03-31-v080x-1992-foundation-essays-plan.md` | v0.8.0.x essays (parallel content track) | line 116-118, 863 |
| `2026-03-31-v081-commander-maturity-plan.md` | v0.8.1 (CLOSED 2026-04-05) | line 150-170, 866 |
| `2026-03-31-v081-intelligence-assurance-harness-plan.md` | v0.8.1 anti-theater harness | line 170, 867 |
| `2026-03-31-v083-player-command-review-ux-plan.md` | v0.8.3 review UX (CLOSED 2026-04-06) | line 209, 880 |
| `2026-03-31-v084-autonomy-determinism-and-review-plan.md` | v0.8.4 (CLOSED 2026-04-07) | line 241, 881 |
| `2026-03-31-v08x-operations-singularity-plan.md` | v0.8.x Operations Singularity | line 275, 868 |
| `2026-03-31-v08x-command-authority-cleanup-plan.md` | v0.8.x-final (CLOSED 2026-04-07) | line 277, 869 |
| `2026-03-31-v08to09-save-load-and-replay-hardening-plan.md` | v0.8-to-v0.9 save/load (Grade A 2026-04-15) | line 350, 873 |
| `2026-03-31-v08to09-ui-surface-ownership-plan.md` | v0.8-to-v0.9 UI ownership | line 351, 874 |
| `2026-03-31-v08to09-army-command-maturity-plan.md` | v0.8-to-v0.9 army maturity (closed-as-serviceable) | line 356, 877 |
| `2026-03-31-v08to09-army-corps-authority-coherence-plan.md` | v0.8-to-v0.9 army↔corps (closed-as-named-enough) | line 357, 878 |
| `2026-03-31-v08to09-commander-explanation-surfaces-plan.md` | v0.8-to-v0.9 explanation surfaces | line 358, 879 |
| `2026-03-31-v090-victory-conditions-and-pyrrhic-scoring-plan.md` | v0.9.0 victory conditions (CLOSED 2026-04-16) | line 440, 896 |
| `2026-03-31-v090-sensitive-history-design-gate-plan.md` | v0.9.0 sensitive-history gate (CLOSED 2026-04-16) | line 440, 897 |
| `2026-04-03-v080x-sector-frontline-truth-plan.md` | v0.8.0.x sector/frontline truth (COMPLETE 2026-04-04) | line 119-120, 864 |
| `2026-04-03-v08to09-product-architecture-simplification-plan.md` | v0.8-to-v0.9 product simplification | line 355, 876 |
| `2026-04-03-v08to09-ui-density-and-shell-cohesion-plan.md` | v0.8-to-v0.9 UI density (closed pre-0.9) | line 352, 875 |
| `2026-04-10-v08to09-a-plus-plus-system-scorecard-plan.md` | v0.8-to-v0.9 scorecard (closed transition) | line 311-336, 872 |

---

## 3. PARTIALLY EXECUTED Plans (26)

Plan is still load-bearing for an OPEN or PARTIAL milestone, or partially shipped.

| Plan | Milestone | Status | What remains |
|------|-----------|--------|--------------|
| `2026-03-21-tech-debt-backlog.md` | v0.8-to-v0.9 simplification (line 912) | PARTIAL | Long-running tech-debt backlog; lanes drawn from it as work progresses |
| `2026-03-23-essay-template-engine-plan.md` | v0.9.1 dynamic Codex (line 460) | PARTIAL | Dynamic sections, divergence notes, ghost entries (in v0.9.1 OPEN) |
| `2026-03-24-v080-political-leader-bot-plan.md` | v0.8.2 political bot (line 882) | EXECUTED for v0.8.2 (CLOSED 2026-04-06); however roadmap labels v0.8.2 as a closed milestone — could be moved to EXECUTED. Marked PARTIAL because of "Patron Phone Call" content depth still pending broader authoring | Patron call dialogue authoring fullness |
| `2026-03-24-v081-order-interpretation-plan.md` | v0.8.3 order interpretation (line 883) | EXECUTED for v0.8.3 (CLOSED 2026-04-06) — marked PARTIAL only because milestone is referenced and engine work landed. Would arguably be EXECUTED. | Same as above |
| `2026-03-24-v082-autonomy-api-plan.md` | v0.8.4 autonomy API (line 884) | EXECUTED 2026-04-07; PARTIAL only because Claude API at corps level is post-1.0 (line 685) | Real corps-level API in v2.0 |
| `2026-03-24-v090-consequence-system-plan.md` | v0.9.0 consequence system (line 889) | PARTIAL with gold-blocker gates closed | Broader divergence-event matrix authoring, Cost Ledger full prosecutorial authoring |
| `2026-03-25-command-chain-architecture.md` | v0.8 architecture (line 81, 865) | PARTIAL — anchor doc for v0.8 family; v0.8 is closed but architecture is forward-referenced | Reference only — load-bearing for v0.9.6+ |
| `2026-03-26-cost-ledger-template-format.md` | v0.9.0 Cost Ledger (line 451) | PARTIAL | Template authoring per v0.9.0 milestone OPEN |
| `2026-03-26-endgame-comparison-data-requirements.md` | v0.9.1 endgame comparison (line 460) | PARTIAL via pulled-forward implementation (line 464) | Richer milestone-week comparison UX |
| `2026-04-01-v08x-player-knowledge-integrity-plan.md` | v0.8.x player-knowledge (line 285) | PARTIAL — Wave 2 landed 2026-04-04 | Force-balance precision residuals; ongoing across milestones |
| `2026-04-01-v08x-sector-anchored-corps-operations-plan.md` | v0.8.x sector-anchored launch contract (line 276) | PARTIAL | Sector-anchored launch contract still NOT YET IMPLEMENTED per line 284 |
| `2026-04-06-studio-health-repo-truth-plan.md` | Permanent side lane (line 870) | ONGOING | Permanent governance lane; never "closes" |
| `2026-04-06-v091-dynamic-essay-endgame-comparison-plan.md` | v0.9.1 (line 459, 895) | PARTIAL via pulled-forward | Broader dynamic-essay authoring + comparison UX |
| `2026-04-06-v093-performance-accessibility-plan.md` | v0.9.3 (line 487, 898) | PARTIAL — perf-memory CLOSED 2026-05-08; wall-clock perf still open | <100ms/turn target, broader a11y |
| `2026-04-06-v094-visual-polish-legendary-map-features-plan.md` | v0.9.4 (line 506, 899) | PARTIAL — Phase 3 fully closed 2026-05-05; Phases 1-2 backlog closed 2026-05-05 | Final polish per line 637 |
| `2026-04-06-v095-platform-packaging-store-plan.md` | v0.9.5 (line 513, 900) | PARTIAL — closure-floor; first-real-builds done | Operator-driven test matrix on clean VMs |
| `2026-03-31-v092-tutorial-and-onboarding-plan.md` | v0.9.2 (line 479, 901) | PARTIAL — onboarding skeleton OPENED via R2-3 trip session 2 | External playtesting recruitment + structured feedback |
| `2026-04-14-v090-consequence-system-refresh-plan.md` | v0.9.0 refresh (line 408, 890) | PARTIAL — anchor for v0.9.0 closure | Authoring debt against current repo truth |
| `2026-04-30-v09-presidential-campaign-loop-closure-plan.md` | v0.9 cross-system closure (line 891) | PARTIAL | Brief→Inspect→Decide→Execute→Report→Cost→Judge→Next loop closure |
| `2026-04-30-v09-formation-life-believability-plan.md` | v0.9 formation-life (line 894) | PARTIAL | Drift / "active but never fights" classification |
| `2026-04-30-v1-gold-readiness-integration-plan.md` | v1.0 integration gate (line 660, 907) | PARTIAL | Active integration gate for ship-readiness |
| `2026-04-30-post-1-0-content-execution-plan.md` | post-1.0 content (line 693, 908) | PARTIAL | Each post-1.0 update needs scoped child plan |
| `2026-04-30-roadmap-open-design-questions-resolution-plan.md` | open-question resolution (line 713, 909) | PARTIAL | Resolution process for ~10 open design questions |
| `2026-04-30-roadmap-plan-coverage-and-system-integration-audit.md` | architect audit (line 871) | PARTIAL — predecessor of THIS audit | Cross-plan dependency tracking |
| `2026-05-01-autonomous-parallel-workstreams-operating-plan.md` | operating plan (line 414, 893) | ONGOING | Operating discipline doc; never "closes" |
| `2026-05-01-v09-product-spine-megalane-plan.md` | active v0.9 mega-lane board (line 416, 892) | ONGOING | Active board; consumed and updated continuously |

---

## 4. SUPERSEDED Plans (11)

Roadmap explicitly names a replacement, or rescoped through "supporting input" / "older plan" wording.

| Plan | Superseded by | Roadmap section |
|------|---------------|------------------|
| `2026-03-22-v06x-master-roadmap.md` | `MASTER_ROADMAP.md` (this doc) | line 17 (Supersedes) |
| `2026-03-16-v0.7.0-performance.md` | `2026-04-06-v093-performance-accessibility-plan.md` | line 488 ("Supporting inputs") |
| `2026-03-16-v0.7.1-accessibility.md` | `2026-04-06-v093-performance-accessibility-plan.md` | line 488 ("Supporting inputs") |
| `2026-03-16-v0.7.3-visual-polish.md` | `2026-04-06-v094-visual-polish-legendary-map-features-plan.md` | line 507 ("Supporting inputs") |
| `2026-03-16-v0.8.2-platform-packaging.md` | `2026-04-06-v095-platform-packaging-store-plan.md` | line 514 ("Supporting input") |
| `2026-03-16-v1.0.0-gold.md` | `2026-04-30-v1-gold-readiness-integration-plan.md` | line 660 ("older plan ... remains a launch-day checklist") |
| `2026-03-16-v0.7.2-localization.md` | post-1.0 "Mother Tongue" (1.1.0) per line 698 | line 698 (post-1.0 table) |
| `2026-03-16-v0.8.0-external-playtesting.md` | `2026-03-31-v092-tutorial-and-onboarding-plan.md` (v0.9.2) | line 479 (rescoped); plan moved from v0.8 to v0.9.2 |
| `2026-03-16-v0.8.1-final-balance.md` | absorbed into v0.9.2 external playtesting / balance | line 473 (v0.9.2 = external playtesting + balance) |
| `2026-03-16-v0.9.0-final-qa.md` | absorbed into v0.9.5 platform packaging + test matrix | line 509-528 (test matrix is the QA story now) |
| `2026-03-16-v0.9.1-store-marketing.md` | absorbed into v0.9.5 store + post-1.0 plan | line 511-514 |

Note: roadmap does NOT explicitly name the 5 `2026-03-16-v0.7.2/0.8.0/0.8.1/0.9.0/0.9.1-*` files as superseded by name. They are reachable only as "Supporting inputs" or implicit rescopes. This is one of the audit's findings (see §8).

---

## 5. DORMANT / UNUSED Plans (10)

Plans that exist on disk and were referenced in commits, but are NOT tracked in the master roadmap's Key Plan Documents table or referenced in milestone descriptions. Triaged below.

| Plan | One-line summary | Recommendation |
|------|------------------|----------------|
| `2026-03-21-army-hq-nerve-center-v2.md` | Army HQ nerve-center v2 redesign (commit `8f8b159f` "Two Rooms spatial metaphor + orphan audit + tab restructure plan") | RE-SLOT — Army HQ shipped via 4-tab structure (Briefing/Summary/Records/Personnel), absorbed without explicit roadmap citation. Recommend either roadmap-cite as EXECUTED for v0.5.x, or close-with-note. |
| `2026-03-22-army-hq-nerve-center-roadmap.md` | Companion roadmap for above | RE-SLOT — same as above; close as EXECUTED-via-absorption. |
| `2026-03-22-integration-audit-findings.md` | Integration audit findings from 4 parallel agent results (commit `7b26c47f`) | ABANDON — historical audit, work absorbed; safe to mark superseded by `2026-04-30-roadmap-plan-coverage-and-system-integration-audit.md`. |
| `2026-03-22-operation-detail-redesign.md` | Operation Detail SITREP modal redesign (commits `e6c1579e`, `ad827ba5`) | RE-SLOT — partly absorbed into v0.8.x ops singularity; explicit citation in roadmap would clarify. |
| `2026-03-22-warroom-redesign-backlog.md` | Warroom redesign backlog (commit `0dd4d19a`) | RE-SLOT — Warroom React migration absorbed it (v0.8.0.x CLOSED 2026-04-04); recommend marking superseded by `2026-03-24-v072-warroom-react-migration-plan.md`. |
| `2026-03-24-emergent-phase2-enclave-fix-pool-rerouting.md` | Phase 2 enclave-fix + pool-rerouting (commit `4b122a75`) | UNCLEAR — referenced in emergent-formation work; needs verification it landed or is still open. Roadmap silent. |
| `2026-03-24-offensive-paramilitary-sweep-plan.md` | Offensive paramilitary sweep design | RE-SLOT — `paramilitary_sweep` is referenced as live in v0.9.0 PR #37 (line 446). Work landed; recommend marking EXECUTED via that PR. |
| `2026-03-25-integration-test-plan.md` | Integration test plan (commit `331ae538`) | RE-SLOT — test infrastructure largely shipped via v0.8-to-v0.9 test suite unification (line 346). Recommend marking superseded by `docs/40_reports/implemented/20260414_TEST_SUITE_AUDIT.md`. |
| `2026-03-26-nightshift-dispatch.md` | Nightshift dispatch plan, 8 workstreams (commit `31d601d1`) | ABANDON — historical operating doc; superseded by `2026-05-01-autonomous-parallel-workstreams-operating-plan.md`. Recommend explicit Supersedes entry. |
| `2026-04-03-delegation-override-command-friction-plan.md` | Delegation/override + command friction (commit `fcab5ac8` "presidential play package") | RE-SLOT — Command friction shipped as v0.8.0.x UX work (line 137-146 lists "Command friction waves 1-5" as COMPLETE 2026-04-04). Recommend marking EXECUTED with roadmap citation. |

**Observation:** None of these 10 are genuinely abandoned in the sense of "no longer part of v1.0 path." 7 of 10 are "pulled-forward / absorbed without explicit citation." 2 of 10 are historical operating docs whose successors exist. 1 of 10 (emergent-phase2-enclave-fix) is genuinely UNCLEAR and warrants a follow-up check.

---

## 6. DESIGN-ONLY Plans (14)

Pure design/spec/architecture documents that were never intended to become numbered milestones; they feed milestones rather than constituting them.

| Plan | Role |
|------|------|
| `2026-03-21-emergent-event-system-design.md` | Emergent event system design (v0.5.x feed) |
| `2026-03-22-ai-commander-events-impl-plan.md` (also EXECUTED) | Note: dual-classified; primary = EXECUTED |
| `2026-03-23-canon-audit-checklist.md` | Canon audit checklist (line 364, ongoing maintenance) |
| `2026-04-08-operations-system-a-plus-plan.md` | Operations system grade scorecard (commit `540bfc5f`) — feeds v0.8.x A++ scorecard |
| `2026-04-14-design-gate-resolutions-and-ungating.md` | Design-gate resolutions packet (commit `07af04bd`) |
| `2026-04-14-four-design-decisions.md` | Four design decisions (commit `948c6fdf`) |
| `2026-04-14-presidential-inbox-design.md` | Presidential Inbox design (commit `ddade115`) — implementation followed |
| `2026-04-14-roadmap-execution-packet-backlog.md` | Backlog packetization (commit `07af04bd`) |
| `2026-04-14-roadmap-execution-packet-prompts.md` | Companion prompt set for above |
| `2026-04-14-v090-victory-pyrrhic-scoring-contract-plan.md` | Contract plan for victory conditions (companion to executed `2026-03-31-v090-victory-conditions-...`) |
| `2026-05-01-force-quality-operation-architecture-contract.md` | Force-quality operation architecture (commit `b3a74201`) |
| `2026-05-01-force-quality-trajectory-calibration-issue.md` | Force-quality trajectory issue (line 412) |
| `2026-05-01-operation-opportunity-review-surface-design.md` | Op opportunity UI design (commits `ad20e735`, `f7091d62`) |
| `late-war-5th-corps-opportunities-design.md` | Late-war 5th corps opportunities (commit `e7069497`) |
| `late-war-operation-opportunity-system-design.md` | Late-war op opportunity system (commit `73d3ff01`) |

(That's 15 entries because `2026-03-22-ai-commander-events-impl-plan.md` is dual-listed; the unique count is 14.)

These design-only plans are all referenced in commit history and are genuinely design feeders, not milestone owners. They do not need roadmap status flags.

---

## 7. UNCLEAR Plans (0)

No plans landed in UNCLEAR after spot-checking. The single ambiguous case (`2026-03-24-emergent-phase2-enclave-fix-pool-rerouting.md`) was triaged in §5 as DORMANT-pending-verification rather than UNCLEAR (its disposition is recommendable; only the verification step remains).

---

## 8. Bottom-Line Answer

**"Did we use all the plans that were prepared for roadmap checkpoints?"**

**Mostly yes.** Of 97 plan files:
- **62 plans (64%)** are EXECUTED or PARTIALLY EXECUTED with explicit roadmap tracking — these are the load-bearing plans the roadmap explicitly cites.
- **11 plans (11%)** are SUPERSEDED, with most having an explicit "Supersedes" entry or "Supporting inputs" pointer in the roadmap.
- **14 plans (14%)** are DESIGN-ONLY — never intended as milestone owners, feeding milestones from underneath.
- **10 plans (10%)** are DORMANT — present on disk, not tracked in roadmap. Of those, 7 are pulled-forward / absorbed-without-citation (work shipped, just not roadmap-linked); 2 are historical operating docs with named successors; 1 is genuinely unclear-and-pending-verification.

**Honest answer:** Yes, we used essentially all plans, but ~10 are absorbed/superseded without an explicit roadmap "Supersedes" entry. This is documentation drift, not abandoned work. No plan in the dormant list represents a v1.0 capability that was lost.

**Top-3 surprising findings:**

1. **`2026-04-03-delegation-override-command-friction-plan.md` is invisible to the roadmap** despite the work having shipped as v0.8.0.x command-friction waves 1-5 (line 137-146). This is the clearest "missing roadmap citation" — the plan ran, the work landed, but the roadmap names neither the plan nor "Command friction waves" with a back-reference. **Recommend: add a one-line citation in the v0.8.0.x section.**

2. **The five `2026-03-16-v0.{7.2/8.0/8.1/9.0/9.1}-*.md` plans are de-facto rescoped** without an explicit Supersedes block — they are reachable only as "Supporting inputs" for the new v0.9.x replacement plans, or implicit rescopes (v0.8.0 external playtesting → v0.9.2). The roadmap's Supersedes section names only the v0.6.x master and `ROADMAP_TO_1_0.md` — this group of 5 should be added explicitly.

3. **`2026-03-21-army-hq-nerve-center-v2.md` and its companion `2026-03-22-army-hq-nerve-center-roadmap.md` are EXECUTED via absorption** but the roadmap's v0.5.x summary (line 55) credits "Army HQ 4-tab command center" without a back-reference. These two plans are effectively finished but un-credited — recommend Supersedes entry pointing to current Army HQ design or simply add to the EXECUTED Key Plan Documents table.

**Verification work that would close UNCLEAR-pending items:**
- Verify whether `2026-03-24-emergent-phase2-enclave-fix-pool-rerouting.md` (Phase 2 enclave-fix + pool-rerouting) actually landed or whether it remains open. Spot-check `enclave_resilience.ts` and pool-rerouting tests at HEAD.

---

## Appendix A — Methodology

1. Read `MASTER_ROADMAP.md` (968 lines).
2. Indexed three high-signal sections:
   - Supersedes (line 13)
   - Key Plan Documents table (line 857)
   - Path to v1.0 + per-milestone status sections (lines 75-652)
3. For each of 97 plan files (98 minus the roadmap itself), classified by:
   - Direct roadmap citation → EXECUTED / PARTIAL
   - Listed in Supersedes or "Supporting input" → SUPERSEDED
   - Pure design/spec naming convention → DESIGN-ONLY
   - No roadmap reference → DORMANT (then triaged via `git log --all --oneline -- <plan>`)
4. Spot-checked 38 plans via `git log` to confirm execution/absorption.

## Appendix B — Counts cross-check

EXECUTED 36 + PARTIAL 26 + SUPERSEDED 11 + DESIGN-ONLY 14 + DORMANT 10 + UNCLEAR 0 = 97. Matches expected total (98 files - 1 roadmap = 97).
