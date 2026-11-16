## 2026-11-16 — Pass 43: #710 (B2 and B3) recorded; main pin 03159b9ee1e5877f

Docs only; no `src/` or `data/` change, no hash change.

- #710, B3 + B2: the produced political-directive chain (producer, A3 role translation, C1 briefing overlay and its Wave 6 exception) is retired for every faction, including the player's staff at autonomy 1 and above; `army_directive_pushback` is no longer produced and the 538 stale events are drained (save migration v39, schema 38 to 39; the briefing and the decision manifest no longer count them). The player's own directive tool is a separate path and untouched. Control-identical in the measured runs (commander state byte-identical); main's pin is final_save 03159b9ee1e5877f (schema v39), the main hash at #710. Merged with the full suite, engine-health-188w and Baseline pins green. It is also P3 step 1 of Fable consult 4's order.
- Next from that lane: #734 (the FORAWWV §X and §XIV amendment, with a unanimous panel) and the t76 Belgrade historical-default fix.
