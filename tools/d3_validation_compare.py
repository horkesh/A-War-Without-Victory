#!/usr/bin/env python3
"""D3 persona suppressor validation V3 — baseline vs post-cb13e605 comparison.

Counts noise-cluster occurrences in both diagnostic_report files and prints
delta/percentage reduction for each cluster. Used by V3 validation to deliver
empirical PASS/MARGINAL/FAIL verdict on the 4 D3.3 noise clusters.

V098 upgrade — substantive-aware classifier (LANE-NIGHTSHIFT-V098-PERSONA-CLASSIFIER-UPGRADE):
The V097 empirical surprise (C1 went 59 -> 97 under president-cue enrichment) revealed
that the legacy keyword classifier conflates two distinct surfaces:
  (a) filler "no_directive" / "directive issued" framing — genuine C1 noise
  (b) substantive sim-mechanic mismatch claims — GENUINE SIGNAL incorrectly counted as noise

The substantive-aware mode (--substantive-aware) subtracts (b) from the C1 count,
reporting both raw and adjusted counts for honesty. Default behavior (no flag)
preserves the V097 closeout's exact "97 / 166 / FAIL" numbers for reproducibility.
"""
import argparse
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

BASELINE = 'runs/three_commanders/diagnostic_report_baseline_d3_pre_cb13e605.json'
POST = 'runs/three_commanders/diagnostic_report.json'

# Substantive markers — observations matching ANY of these in addition to the
# generic "political directive" keyword are GENUINE SIGNAL, not C1 noise.
# Markers fall into four families:
#   1. Compliance-score analysis (sim-mechanic claim about scoring)
#   2. Logical contradiction / structural mismatch claims (capacity vs intent)
#   3. Explicit role analysis ('secondary'/'primary'/'economy' role with content)
#   4. Canonical verbs paired with deviation/escalation analysis
SUBSTANTIVE_MARKERS = (
    # 1. Compliance-score analysis
    'compliance_score_low',
    'compliance_score_high',
    'compliance scoring',
    'compliance-scoring',
    # 2. Logical contradiction / structural mismatch
    'logical contradiction',
    'structural mismatch',
    'tension between political intent',
    'mismatch between presidential intent',
    'mismatch between political intent',
    'presidential intent and army',
    'presidential intent and military',
    'feasibility constraint',
    'operational feasibility',
    'army capacity',
    'corps capacity',
    'military feasibility',
    'logistical constraint',
    'logistics constraint',
    # 3. Explicit role analysis (must be quoted-style indicating prose analysis,
    #    not just keyword presence)
    "'secondary' role",
    "'primary' role",
    "'economy' role",
    'all five corps',  # role-distribution analysis
    'all four corps',
    'all six corps',
    'all corps assigned',
    'all corps marked',
    'all corps roles',
    # 4. Canonical verbs paired with deviation/escalation analysis
    'aggressive_preference',  # army CO translation deviation reason
    'press_offensive targeting',  # specific-target analysis
    'balance_fronts targeting',
    'balance_fronts issued',
    'balance_fronts assigned',
    'balance_fronts via',
    'multi-corps offensive',
    'multi-axis pressure',
    'corps-wide offensive',
    'systematic escalation',
)


def is_substantive_directive_obs(haystack):
    """True if the observation contains a substantive sim-mechanic claim that
    the legacy classifier would mis-count as C1 noise."""
    return any(marker in haystack for marker in SUBSTANTIVE_MARKERS)


def count_clusters(observations, substantive_aware=False):
    """Count occurrences of each of the 4 D3.3 noise clusters per the
    persona_prompt_restructure.md (cb13e605) definitions.

    When substantive_aware is True, the C1 cluster excludes observations
    matching SUBSTANTIVE_MARKERS (which are reclassified as genuine signal).
    Returns (n1_adjusted, n2, n3, n4, n1_raw, n1_substantive_subtracted).
    In legacy mode (substantive_aware=False), n1_adjusted == n1_raw and
    n1_substantive_subtracted == 0.
    """
    n1_raw = n2 = n3 = n4 = 0
    n1_substantive = 0
    for o in observations:
        haystack = (o.get('description', '') + ' ' + o.get('expected', '') + ' ' + o.get('actual', '')).lower()
        if 'political directive' in haystack:
            n1_raw += 1
            if substantive_aware and is_substantive_directive_obs(haystack):
                n1_substantive += 1
        if 'alliance' in haystack:
            n2 += 1
        if 'planning' in haystack and ('phase' in haystack or 'trace' in haystack or 'planning status' in haystack
                                      or 'remain in planning' in haystack or 'in \'planning\'' in haystack):
            n3 += 1
        if 'oluja' in haystack:
            n4 += 1
    n1_adjusted = n1_raw - n1_substantive
    return n1_adjusted, n2, n3, n4, n1_raw, n1_substantive


def collect_reclassified_samples(observations, max_samples=5):
    """Return up to max_samples observations the substantive-aware classifier
    moves from C1-noise to genuine-signal — for honest reporting."""
    samples = []
    for o in observations:
        haystack = (o.get('description', '') + ' ' + o.get('expected', '') + ' ' + o.get('actual', '')).lower()
        if 'political directive' in haystack and is_substantive_directive_obs(haystack):
            samples.append(o)
            if len(samples) >= max_samples:
                break
    return samples


def main():
    parser = argparse.ArgumentParser(description='D3 persona suppressor validation V3')
    parser.add_argument('--substantive-aware', action='store_true',
                        help='Enable V098 substantive-aware classifier — subtract genuine-signal '
                             'directive observations from the C1 noise count. Default OFF preserves '
                             "V097 closeout's exact numbers for reproducibility.")
    args = parser.parse_args()
    substantive = args.substantive_aware

    with open(BASELINE, encoding='utf-8') as f:
        base = json.load(f)
    with open(POST, encoding='utf-8') as f:
        post = json.load(f)

    bn1, bn2, bn3, bn4, bn1_raw, bn1_sub = count_clusters(base, substantive_aware=substantive)
    pn1, pn2, pn3, pn4, pn1_raw, pn1_sub = count_clusters(post, substantive_aware=substantive)

    btotal_noise = bn1 + bn2 + bn3 + bn4
    ptotal_noise = pn1 + pn2 + pn3 + pn4

    def pct_reduction(b, p):
        if b == 0:
            return 'N/A (baseline=0)'
        return f'{(1 - p / b) * 100:.1f}%'

    mode_label = 'SUBSTANTIVE-AWARE (V098)' if substantive else 'LEGACY (V097-compatible)'
    print('=' * 72)
    print(f'  D3 PERSONA SUPPRESSOR VALIDATION V3 — Cluster comparison')
    print(f'  Mode: {mode_label}')
    print('=' * 72)
    print(f'  Baseline obs total: {len(base)}')
    print(f'  Post-cb13e605 obs total: {len(post)}')
    print()
    print('  Cluster                    | baseline | post | reduction')
    print('  ---------------------------|----------|------|-----------')
    print(f'  C1 political directive     |   {bn1:5d}  | {pn1:4d} | {pct_reduction(bn1, pn1)}')
    if substantive:
        print(f'    (raw "political directive" keyword match: baseline={bn1_raw} post={pn1_raw})')
        print(f'    (substantive-signal subtracted:           baseline={bn1_sub} post={pn1_sub})')
    print(f'  C2 alliance hand-wringing  |   {bn2:5d}  | {pn2:4d} | {pct_reduction(bn2, pn2)}')
    print(f'  C3 ops in planning         |   {bn3:5d}  | {pn3:4d} | {pct_reduction(bn3, pn3)}')
    print(f'  C4 op-name confabulation   |   {bn4:5d}  | {pn4:4d} | {pct_reduction(bn4, pn4)}')
    print(f'  TOTAL noise                |   {btotal_noise:5d}  | {ptotal_noise:4d} | {pct_reduction(btotal_noise, ptotal_noise)}')
    print()
    print(f'  Baseline noise %: {btotal_noise / len(base) * 100:.1f}%')
    print(f'  Post     noise %: {ptotal_noise / max(len(post), 1) * 100:.1f}%')
    print()

    # Verdict
    overall_reduction = (1 - ptotal_noise / max(btotal_noise, 1)) * 100
    if overall_reduction >= 70:
        verdict = 'PASS'
    elif overall_reduction >= 40:
        verdict = 'MARGINAL'
    else:
        verdict = 'FAIL'
    print(f'  OVERALL VERDICT: {verdict}  (reduction: {overall_reduction:.1f}%)')
    print('=' * 72)

    # Sample post-suppressor LLM prose for the report
    print()
    print('=== Sample post-suppressor LLM prose (5 random) ===')
    for i, o in enumerate(post[:5]):
        print(f'[{o["faction"]} w{o["turn"]}] {o["commander"]}: {o["description"][:200]}')

    # In substantive-aware mode, also show observations RECLASSIFIED from
    # C1-noise to genuine-signal — honest accounting of what the heuristic catches.
    if substantive:
        print()
        print('=== Substantive-aware reclassification: C1-noise -> genuine-signal ===')
        samples = collect_reclassified_samples(post, max_samples=5)
        if not samples:
            print('  (no reclassified observations — heuristic caught nothing)')
        else:
            for o in samples:
                print(f'[{o["faction"]} w{o["turn"]}] {o["commander"]}: {o["description"][:240]}')


if __name__ == '__main__':
    main()
