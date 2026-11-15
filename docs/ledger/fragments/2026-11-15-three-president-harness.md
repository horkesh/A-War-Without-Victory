## 2026-11-15 — Three test Presidents in the desktop harness (appendix C tooling)

- **What.** `tools/ai_play/desktop_calibration_compare.ts --president hands_off|engaged|meddler` drives the player branch with one of the three test Presidents of proposal §5D. The policies are in `tools/ai_play/president_policies.ts`.
  - **hands_off** initiates nothing and pays for nothing.
  - **engaged** makes each gesture as soon as it is off cooldown and affordable. It sends a Request-op every 8 weeks and a Stop-op on the plan's main-effort operation every 12 weeks. It insists on every army clash and backs every proposal.
  - **meddler** does the same with a Request-op every 4 weeks and a Stop-op every 6. A Stop-op that falls due carries over until the main-effort corps has an operation.
- **How.** Every act goes through the desktop's own contracts: availability, the Authority debit, then the staged order or queued decision. A clash left unanswered at Advance lapses, as in electron-main.
  - Each turn row records Authority `current`/`max`, the reserve, the income and its breakdown, and the President's acts and refusals.
- **Scope.** Tooling only. Without `--president` the harness output is unchanged. No sim, data or canon change.
