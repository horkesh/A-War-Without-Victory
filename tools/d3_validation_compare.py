#!/usr/bin/env python3
"""D3 persona suppressor validation V3 — baseline vs post-cb13e605 comparison.

Counts noise-cluster occurrences in both diagnostic_report files and prints
delta/percentage reduction for each cluster. Used by V3 validation to deliver
empirical PASS/MARGINAL/FAIL verdict on the 4 D3.3 noise clusters.
"""
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

BASELINE = 'runs/three_commanders/diagnostic_report_baseline_d3_pre_cb13e605.json'
POST = 'runs/three_commanders/diagnostic_report.json'


def count_clusters(observations):
    """Count occurrences of each of the 4 D3.3 noise clusters per the
    persona_prompt_restructure.md (cb13e605) definitions."""
    n1 = n2 = n3 = n4 = 0
    for o in observations:
        haystack = (o.get('description', '') + ' ' + o.get('expected', '') + ' ' + o.get('actual', '')).lower()
        if 'political directive' in haystack:
            n1 += 1
        if 'alliance' in haystack:
            n2 += 1
        if 'planning' in haystack and ('phase' in haystack or 'trace' in haystack or 'planning status' in haystack
                                      or 'remain in planning' in haystack or 'in \'planning\'' in haystack):
            n3 += 1
        if 'oluja' in haystack:
            n4 += 1
    return n1, n2, n3, n4


def main():
    with open(BASELINE, encoding='utf-8') as f:
        base = json.load(f)
    with open(POST, encoding='utf-8') as f:
        post = json.load(f)

    bn1, bn2, bn3, bn4 = count_clusters(base)
    pn1, pn2, pn3, pn4 = count_clusters(post)

    btotal_noise = bn1 + bn2 + bn3 + bn4
    ptotal_noise = pn1 + pn2 + pn3 + pn4

    def pct_reduction(b, p):
        if b == 0:
            return 'N/A (baseline=0)'
        return f'{(1 - p / b) * 100:.1f}%'

    print('=' * 72)
    print('  D3 PERSONA SUPPRESSOR VALIDATION V3 — Cluster comparison')
    print('=' * 72)
    print(f'  Baseline obs total: {len(base)}')
    print(f'  Post-cb13e605 obs total: {len(post)}')
    print()
    print('  Cluster                    | baseline | post | reduction')
    print('  ---------------------------|----------|------|-----------')
    print(f'  C1 political directive     |   {bn1:5d}  | {pn1:4d} | {pct_reduction(bn1, pn1)}')
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


if __name__ == '__main__':
    main()
