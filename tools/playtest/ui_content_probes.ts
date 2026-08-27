/**
 * Runtime content probes — the half of content correctness that needs the app running.
 *
 * WHY THIS EXISTS
 * The original UI probes only detect BROKEN rendering: empty surfaces, dead controls,
 * zero-size hit boxes, clipped text, error banners. On 2026-08-27 the owner read one
 * screenshot and found eight defects, and every single one was **wrong content rendered
 * correctly** — text that displayed perfectly and said the wrong thing. The harness was
 * structurally blind to the entire category.
 *
 * These probes read what the screen SAYS, not whether it rendered.
 *
 * Every predicate here is inline: no `const fn = () => {}` inside `evaluate()`, because
 * esbuild's keepNames wraps named function expressions in a `__name` helper that does
 * not exist in the page context.
 */

import type { Frame, Page } from 'playwright';
import type { Finding, Severity } from './types.js';

function finding(
    kind: Finding['kind'],
    severity: Severity,
    probe: string,
    title: string,
    detail: string,
    surface: string,
    evidence?: Record<string, unknown>,
): Finding {
    return { kind, severity, probe, title, detail, surface, turn: 0, faction: 'RBiH', evidence };
}

/** Visible text of the surface, across every frame. */
async function surfaceText(win: Page): Promise<string> {
    const parts = await Promise.all(
        win.frames().map((f) => f.evaluate(() => document.body.innerText || '').catch(() => '')),
    );
    return parts.join('\n');
}

// ── 1. Place-name casing ─────────────────────────────────────────────────────

/**
 * Bosnian place names are multi-word and every word is capitalised. The UI renders
 * "Donji dubovik (bosanska krupa)" — a capitalise-first-letter transform applied to an
 * id-derived string instead of a display name.
 *
 * Scoped to all-lowercase parentheticals and the capitalised-then-lowercase pair that
 * precedes them. That shape is distinctive enough to avoid flagging ordinary prose.
 */
export async function probePlaceNameCasing(win: Page, surface: string): Promise<Finding[]> {
    const text = await surfaceText(win);
    const bad = new Set<string>();

    // "(bosanska krupa)" — a parenthetical that is entirely lower-case words.
    for (const m of text.matchAll(/\(([a-zà-ž]+(?:[ -][a-zà-ž]+){0,3})\)/g)) {
        const inner = m[1];
        if (inner.length < 4) continue;
        if (/^(and|or|the|of|per|via|est|max|min|avg|n\/a)$/.test(inner)) continue;
        bad.add(m[0]);
    }

    // "Donji dubovik" — Capitalised word followed by a lower-case word, immediately
    // before an all-lower-case parenthetical.
    for (const m of text.matchAll(/\b([A-ZÀ-Ž][a-zà-ž]+ [a-zà-ž]{3,})\s*\(([a-zà-ž ]+)\)/g)) {
        bad.add(m[1]);
    }

    if (bad.size === 0) return [];
    return [
        finding('bug', 'medium', 'ui-place-name-casing',
            'Place names rendered with lower-case words after the first',
            `On ${surface}, ${bad.size} place-name fragment(s) capitalise only the first word. Bosnian `
            + `place names capitalise every word: "Donji Dubovik (Bosanska Krupa)", not "Donji dubovik `
            + `(bosanska krupa)". Signature of a capitalise-first-letter transform over an id-derived `
            + `string rather than a display name.`,
            'content:place_names', { samples: [...bad].slice(0, 12), count: bad.size, seen_on: surface }),
    ];
}

// ── 2. Allied territory counted as hostile ───────────────────────────────────

/**
 * The status bar reads "Friendly 31.5% | Hostile-held 68.5%" while the same screen shows
 * ALLIED and "Alliance posture: close coordination". Allied ground is not hostile ground.
 * The alliance also DEGRADES over a campaign, so this must be re-checked every turn
 * rather than assumed fixed.
 */
export async function probeAllianceAccounting(win: Page, surface: string): Promise<Finding[]> {
    const text = await surfaceText(win);
    const hostile = /hostile[- ]held\s+([\d.]+)\s*%/i.exec(text);
    if (!hostile) return [];

    const friendly = /friendly\s+([\d.]+)\s*%/i.exec(text);
    const alliedBadge = /\bALLIED\b/.test(text);
    const posture = /Alliance posture:\s*([^\n]+)/i.exec(text);
    const allianceActive = alliedBadge || (posture ? !/none|broken|hostile|war/i.test(posture[1]) : false);
    if (!allianceActive) return [];

    const f = friendly ? Number(friendly[1]) : NaN;
    const h = Number(hostile[1]);
    const binary = Number.isFinite(f) && Math.abs(f + h - 100) < 0.6;

    return [
        finding('bug', 'high', 'ui-alliance-hostile-accounting',
            'Territory bar counts allied ground as "hostile-held"',
            `On ${surface} the bar reads Friendly ${friendly?.[1] ?? '?'}% / Hostile-held ${h}% while an `
            + `alliance is active${posture ? ` ("${posture[1].trim()}")` : ''}. An ally's territory is not `
            + `hostile.${binary ? ' Friendly + hostile sums to 100%, so this is a binary player-vs-everyone-else '
            + 'split that ignores alliance state entirely.' : ''} The alliance changes over a campaign, so the `
            + `split has to track the relationship, not a fixed faction list.`,
            'content:territory_bar',
            { friendly_pct: friendly?.[1], hostile_pct: hostile[1], alliance_posture: posture?.[1]?.trim(), sums_to_100: binary, seen_on: surface }),
    ];
}

// ── 3. Typography drift ──────────────────────────────────────────────────────

/**
 * The opening uses a serif display face with large italics; the shell uses monospace and
 * condensed sans. Reported per surface so a genuinely mixed design shows up as a number
 * rather than an opinion.
 */
export async function probeFontDrift(win: Page, surface: string, budget = 3): Promise<Finding[]> {
    const families = new Set<string>();
    for (const f of win.frames()) {
        const found = await f
            .evaluate(() =>
                [...document.querySelectorAll('body *')]
                    .filter((e) => {
                        const r = e.getBoundingClientRect();
                        if (r.width < 4 || r.height < 4) return false;
                        const own = [...e.childNodes].some((n) => n.nodeType === 3 && (n.textContent ?? '').trim());
                        return own && window.getComputedStyle(e).display !== 'none';
                    })
                    .map((e) => window.getComputedStyle(e).fontFamily.split(',')[0].replace(/["']/g, '').trim())
                    .filter(Boolean),
            )
            .catch(() => [] as string[]);
        for (const fam of found) families.add(fam);
    }

    if (families.size <= budget) return [];
    return [
        finding('friction', 'medium', 'ui-font-family-drift',
            `Surface "${surface}" renders text in ${families.size} different font families`,
            `${families.size} distinct primary font families are in use on one surface (budget ${budget}): `
            + `${[...families].join(', ')}. Typography inconsistency across surfaces was raised by the owner `
            + `as a defect rather than deliberate contrast. Once a typographic system is agreed, set the `
            + `budget to it and this becomes a regression guard.`,
            'content:typography', { families: [...families].sort(), budget, seen_on: surface }),
    ];
}

// ── 4. Front pairs that reference themselves ─────────────────────────────────

/**
 * 1990 municipality names and their RS renames. A "front" whose two sides resolve to the
 * same municipality under different names is not a front.
 *
 * Deliberately small and explicit: this table is the part that makes the probe work, and
 * a wrong entry produces a wrong finding, so it is extended only from a source.
 */
const MUNICIPALITY_ALIASES: string[][] = [
    ['bosanska dubica', 'kozarska dubica'],
    ['bosanski novi', 'novi grad'],
    ['bosanski brod', 'srpski brod'],
    ['bosanska gradiska', 'gradiska'],
    ['skender vakuf', 'knezevo'],
    ['foca', 'srbinje'],
];

function canonicalMunicipality(name: string): string {
    const n = name.toLowerCase().trim();
    for (const group of MUNICIPALITY_ALIASES) if (group.includes(n)) return group[0];
    return n;
}

export async function probeFrontPairSelfReference(win: Page, surface: string): Promise<Finding[]> {
    const text = await surfaceText(win);
    const line = /Priority fronts:\s*([^\n]+)/i.exec(text);
    if (!line) return [];

    const out: Finding[] = [];
    for (const pair of line[1].split(';')) {
        const places = [...pair.matchAll(/([A-Za-zÀ-ž .-]+?)\s*\(([^)]+)\)/g)].map((m) => ({
            settlement: m[1].replace(/^[\s–—-]+/, '').trim(),
            municipality: canonicalMunicipality(m[2]),
        }));
        if (places.length !== 2) continue;
        if (places[0].municipality !== places[1].municipality) continue;

        out.push(
            finding('bug', 'high', 'ui-front-pair-self-reference',
                'A "front" has both sides in the same municipality',
                `On ${surface}, the priority front "${pair.trim()}" names two places that resolve to the same `
                + `municipality ("${places[0].municipality}") once 1990 and RS names are reconciled. A front `
                + `between a municipality and itself is not a front. Expected reading: one place — `
                + `"${places[0].settlement} in ${places[1].settlement}".`,
                'content:priority_fronts',
                { pair: pair.trim(), resolved_municipality: places[0].municipality, places, seen_on: surface }),
        );
    }
    return out;
}

// ── Registry ─────────────────────────────────────────────────────────────────

/** Run every content probe against the current screen. */
export async function runContentProbes(win: Page, surface: string): Promise<Finding[]> {
    const results = await Promise.all([
        probePlaceNameCasing(win, surface),
        probeAllianceAccounting(win, surface),
        probeFontDrift(win, surface),
        probeFrontPairSelfReference(win, surface),
    ]);
    return results.flat();
}

export type { Frame };
