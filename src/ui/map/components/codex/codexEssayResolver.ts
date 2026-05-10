import type { ComparisonResult } from '../../../../sim/endgame/endgame_comparison.js';
import type { CostLedger, CostLedgerFinding } from '../../../../sim/endgame/cost_ledger.js';
import { strictCompare } from '../../../../state/validateGameState.js';

export interface DynamicSection {
    id?: string;
    condition?: string;
    insert_after_paragraph?: number;
    variant?: 'note' | 'divergence' | 'ghost';
    content: string;
}

export interface EssayEntry {
    id: string;
    event_id: string;
    title: string;
    year: number;
    category: string;
    content?: string;
    sources?: string[];
    generated?: boolean;
    tier?: number;
    ghost_when?: string;
    ghost_summary?: string;
    dynamic_sections?: DynamicSection[];
}

export interface CodexRenderContext {
    firedEventIds: Set<string>;
    eventFlags?: Record<string, string | number | boolean>;
    historicalComparison?: ComparisonResult;
    costLedger?: CostLedger;
    gameOver?: boolean;
}

export interface ResolvedEssayParagraph {
    kind: 'canonical' | 'dynamic' | 'ghost';
    text: string;
    variant?: DynamicSection['variant'];
}

export interface ResolvedEssay {
    isUnlocked: boolean;
    isGhost: boolean;
    paragraphs: ResolvedEssayParagraph[];
}

function tokenizeCondition(condition: string): string[] {
    return condition.match(/\(|\)|[^\s()]+/g) ?? [];
}

function isTruthyValue(value: string | number | boolean | undefined): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') return value.trim().length > 0 && value !== '0' && value.toLowerCase() !== 'false';
    return false;
}

function comparisonNotes(context: CodexRenderContext): string[] {
    const raw = context.historicalComparison?.divergence_notes;
    return Array.isArray(raw)
        ? raw.filter((note): note is string => typeof note === 'string' && note.trim().length > 0)
        : [];
}

function hasRupture(context: CodexRenderContext, ruptureId: string): boolean {
    const raw = context.historicalComparison?.rupture_divergence;
    return Array.isArray(raw) && raw.includes(ruptureId);
}

type MilestoneRow = NonNullable<ComparisonResult['milestone_comparison']>[number];

function milestoneRows(context: CodexRenderContext): MilestoneRow[] {
    const raw = context.historicalComparison?.milestone_comparison;
    return Array.isArray(raw)
        ? raw
            .filter((row): row is MilestoneRow => Boolean(row && typeof row.id === 'string'))
            .slice()
            .sort((a, b) => {
                if (a.historical_week !== b.historical_week) return a.historical_week - b.historical_week;
                return strictCompare(a.id, b.id);
            })
        : [];
}

function findMilestone(context: CodexRenderContext, id: string): MilestoneRow | undefined {
    return milestoneRows(context).find((row) => row.id === id);
}

/** Safe numeric getter for a ratio/delta field on historicalComparison.
 *  Returns undefined when the field is absent or non-finite; callers treat
 *  that as "condition does not match". */
function comparisonNumber(
    context: CodexRenderContext,
    field: 'casualty_ratio' | 'displacement_ratio' | 'duration_delta_weeks'
): number | undefined {
    const value = context.historicalComparison?.[field];
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function territoryDelta(context: CodexRenderContext, factionKey: string): number | undefined {
    const map = context.historicalComparison?.territory_divergence;
    if (!map) return undefined;
    const value = map[factionKey];
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function costFindings(context: CodexRenderContext): CostLedgerFinding[] {
    const raw = context.costLedger?.findings;
    return Array.isArray(raw)
        ? raw.filter((finding): finding is CostLedgerFinding => Boolean(finding && typeof finding.id === 'string'))
        : [];
}

function hasCostFinding(context: CodexRenderContext, id: string): boolean {
    return costFindings(context).some((finding) => finding.id === id);
}

function hasCostFindingField(
    context: CodexRenderContext,
    field: 'category' | 'severity' | 'faction',
    value: string,
): boolean {
    return costFindings(context).some((finding) => finding[field] === value);
}

/** Parse a threshold from a token like "CASUALTY_ABOVE:1.2". Returns NaN on
 *  malformed input, which the caller treats as a non-match. */
function parseThreshold(rest: string): number {
    return Number.parseFloat(rest);
}

function evaluateAtom(token: string, context: CodexRenderContext): boolean {
    if (token === 'ALWAYS') return true;
    if (token === 'GAME_OVER') return Boolean(context.gameOver);
    if (token === 'COMPARISON_NOTES') return comparisonNotes(context).length > 0;

    // v0.9.1: comparison-derived condition atoms. Each returns false when the
    // historicalComparison field is missing or NaN — an author can't accidentally
    // match against absent data.

    if (token === 'DURATION_LONGER') {
        const delta = comparisonNumber(context, 'duration_delta_weeks');
        return delta !== undefined && delta > 0;
    }
    if (token === 'DURATION_SHORTER') {
        const delta = comparisonNumber(context, 'duration_delta_weeks');
        return delta !== undefined && delta < 0;
    }

    if (token.startsWith('CASUALTY_ABOVE:')) {
        const ratio = comparisonNumber(context, 'casualty_ratio');
        const thr = parseThreshold(token.slice('CASUALTY_ABOVE:'.length));
        return ratio !== undefined && Number.isFinite(thr) && ratio > thr;
    }
    if (token.startsWith('CASUALTY_BELOW:')) {
        const ratio = comparisonNumber(context, 'casualty_ratio');
        const thr = parseThreshold(token.slice('CASUALTY_BELOW:'.length));
        return ratio !== undefined && Number.isFinite(thr) && ratio < thr;
    }

    if (token.startsWith('DISPLACEMENT_ABOVE:')) {
        const ratio = comparisonNumber(context, 'displacement_ratio');
        const thr = parseThreshold(token.slice('DISPLACEMENT_ABOVE:'.length));
        return ratio !== undefined && Number.isFinite(thr) && ratio > thr;
    }
    if (token.startsWith('DISPLACEMENT_BELOW:')) {
        const ratio = comparisonNumber(context, 'displacement_ratio');
        const thr = parseThreshold(token.slice('DISPLACEMENT_BELOW:'.length));
        return ratio !== undefined && Number.isFinite(thr) && ratio < thr;
    }

    // TERRITORY_ABOVE:<faction>:<pct> — e.g. TERRITORY_ABOVE:RS:5 means
    // player run ended with RS holding >5 percentage points more than the
    // historical baseline. Uses `territory_divergence` map from ComparisonResult
    // (which is player_pct - historical_pct).
    if (token.startsWith('TERRITORY_ABOVE:') || token.startsWith('TERRITORY_BELOW:')) {
        const isAbove = token.startsWith('TERRITORY_ABOVE:');
        const rest = token.slice(isAbove ? 'TERRITORY_ABOVE:'.length : 'TERRITORY_BELOW:'.length);
        const sep = rest.lastIndexOf(':');
        if (sep < 0) return false;
        const factionKey = rest.slice(0, sep);
        const thr = parseThreshold(rest.slice(sep + 1));
        const delta = territoryDelta(context, factionKey);
        if (delta === undefined || !Number.isFinite(thr)) return false;
        return isAbove ? delta > thr : delta < thr;
    }

    if (token.startsWith('RUPTURE:')) {
        return hasRupture(context, token.slice('RUPTURE:'.length));
    }

    if (token.startsWith('MILESTONE:')) {
        const parts = token.slice('MILESTONE:'.length).split(':');
        const id = parts[0];
        if (!id) return false;
        const milestone = findMilestone(context, id);
        if (!milestone) return false;
        const status = parts[1];
        return status ? milestone.status === status : true;
    }

    if (token.startsWith('FINDING:')) {
        return hasCostFinding(context, token.slice('FINDING:'.length));
    }
    if (token.startsWith('FINDING_CATEGORY:')) {
        return hasCostFindingField(context, 'category', token.slice('FINDING_CATEGORY:'.length));
    }
    if (token.startsWith('FINDING_SEVERITY:')) {
        return hasCostFindingField(context, 'severity', token.slice('FINDING_SEVERITY:'.length));
    }
    if (token.startsWith('FINDING_FACTION:')) {
        return hasCostFindingField(context, 'faction', token.slice('FINDING_FACTION:'.length));
    }

    if (token.startsWith('EVENT:')) {
        return context.firedEventIds.has(token.slice('EVENT:'.length));
    }

    if (token.startsWith('FLAG:')) {
        return isTruthyValue(context.eventFlags?.[token.slice('FLAG:'.length)]);
    }

    return isTruthyValue(context.eventFlags?.[token]);
}

function parseExpression(tokens: string[], context: CodexRenderContext, start = 0): [boolean, number] {
    return parseOr(tokens, context, start);
}

function parseOr(tokens: string[], context: CodexRenderContext, start: number): [boolean, number] {
    let [value, index] = parseAnd(tokens, context, start);
    while (tokens[index] === 'OR') {
        const [rhs, next] = parseAnd(tokens, context, index + 1);
        value = value || rhs;
        index = next;
    }
    return [value, index];
}

function parseAnd(tokens: string[], context: CodexRenderContext, start: number): [boolean, number] {
    let [value, index] = parseNot(tokens, context, start);
    while (tokens[index] === 'AND') {
        const [rhs, next] = parseNot(tokens, context, index + 1);
        value = value && rhs;
        index = next;
    }
    return [value, index];
}

function parseNot(tokens: string[], context: CodexRenderContext, start: number): [boolean, number] {
    if (tokens[start] === 'NOT') {
        const [value, index] = parseNot(tokens, context, start + 1);
        return [!value, index];
    }
    return parsePrimary(tokens, context, start);
}

function parsePrimary(tokens: string[], context: CodexRenderContext, start: number): [boolean, number] {
    const token = tokens[start];
    if (!token) return [false, start];

    if (token === '(') {
        const [value, index] = parseExpression(tokens, context, start + 1);
        if (tokens[index] !== ')') {
            return [false, tokens.length];
        }
        return [value, index + 1];
    }

    return [evaluateAtom(token, context), start + 1];
}

export function evaluateEssayCondition(condition: string | undefined, context: CodexRenderContext): boolean {
    if (!condition || condition.trim().length === 0) return false;
    const tokens = tokenizeCondition(condition.trim());
    if (tokens.length === 0) return false;
    const [value, index] = parseExpression(tokens, context, 0);
    return index === tokens.length ? value : false;
}

function splitParagraphs(content: string | undefined): string[] {
    if (!content || content.trim().length === 0) return [];
    return content
        .split('\n\n')
        .map((paragraph) => paragraph.trim())
        .filter((paragraph) => paragraph.length > 0);
}

/** Format a signed number with an explicit `+` for positives. `-6` or `+4`.
 *  Used by delta-flavored interpolation tokens so authors can write
 *  "Your war ran {duration_delta_weeks} weeks" and get a grammatical result. */
function signed(n: number): string {
    if (n > 0) return `+${n}`;
    return String(n);
}

function formatCostFinding(finding: CostLedgerFinding): string {
    const faction = finding.faction ? ` [${finding.faction}]` : '';
    return `${finding.title}${faction}: ${finding.text}`;
}

function costFindingSources(context: CodexRenderContext): string[] {
    const sources = new Set<string>();
    for (const finding of costFindings(context)) {
        for (const source of finding.sources ?? []) {
            if (typeof source === 'string' && source.trim().length > 0) {
                sources.add(source.trim());
            }
        }
    }
    return [...sources].sort(strictCompare);
}

function formatCostFindingsByCategory(
    context: CodexRenderContext,
    category: CostLedgerFinding['category'],
    faction?: string,
): string {
    return costFindings(context)
        .filter((finding) => finding.category === category)
        .filter((finding) => faction === undefined || finding.faction === faction)
        .map(formatCostFinding)
        .join('\n\n');
}

/** Expand a single template token against the render context. Returns
 *  undefined when the token is not recognized — caller leaves the literal
 *  `{token}` in place so missing tokens are visible in content review. */
function formatMilestoneDelta(deltaWeeks: number | null): string {
    return deltaWeeks === null ? '' : `${signed(deltaWeeks)}w`;
}

function formatMilestoneRow(row: MilestoneRow): string {
    const player = row.player_week === null ? 'not recorded' : `W${row.player_week}`;
    const delta = row.delta_weeks === null ? '' : `; delta ${formatMilestoneDelta(row.delta_weeks)}`;
    return `${row.label}: historical W${row.historical_week}; player ${player}${delta}; status ${row.status}. ${row.summary}`;
}

function milestoneTokenValue(token: string, context: CodexRenderContext): string | undefined {
    if (token === 'milestone_comparison') {
        return milestoneRows(context).map(formatMilestoneRow).join('\n\n');
    }

    const suffixes = [
        { suffix: '_summary', field: 'summary' as const },
        { suffix: '_status', field: 'status' as const },
        { suffix: '_delta_weeks', field: 'delta_weeks' as const },
    ];
    for (const { suffix, field } of suffixes) {
        if (!token.startsWith('milestone_') || !token.endsWith(suffix)) continue;
        const id = token.slice('milestone_'.length, -suffix.length);
        const milestone = findMilestone(context, id);
        if (!milestone) return '';
        if (field === 'delta_weeks') {
            return milestone.delta_weeks === null ? '' : signed(milestone.delta_weeks);
        }
        return String(milestone[field]);
    }

    return undefined;
}

function expandToken(token: string, context: CodexRenderContext): string | undefined {
    if (token === 'comparison_notes') return comparisonNotes(context).join('\n\n');
    const milestoneValue = milestoneTokenValue(token, context);
    if (milestoneValue !== undefined) return milestoneValue;
    if (token === 'cost_findings') return costFindings(context).map(formatCostFinding).join('\n\n');
    if (token === 'cost_rupture_findings') return formatCostFindingsByCategory(context, 'rupture');
    if (token === 'cost_human_findings') return formatCostFindingsByCategory(context, 'human_cost');
    if (token === 'cost_displacement_findings') return formatCostFindingsByCategory(context, 'displacement');
    if (token === 'cost_duration_findings') return formatCostFindingsByCategory(context, 'duration');
    if (token === 'cost_war_crimes_findings') return formatCostFindingsByCategory(context, 'war_crimes');
    const factionWarCrimesMatch = /^cost_war_crimes_findings_([A-Za-z0-9_-]+)$/.exec(token);
    if (factionWarCrimesMatch?.[1]) return formatCostFindingsByCategory(context, 'war_crimes', factionWarCrimesMatch[1]);
    if (token === 'cost_finding_sources') return costFindingSources(context).join('; ');

    if (token === 'duration_delta_weeks') {
        const n = comparisonNumber(context, 'duration_delta_weeks');
        return n === undefined ? '' : signed(n);
    }
    if (token === 'duration_delta_abs') {
        const n = comparisonNumber(context, 'duration_delta_weeks');
        return n === undefined ? '' : String(Math.abs(n));
    }

    if (token === 'casualty_ratio_pct') {
        const n = comparisonNumber(context, 'casualty_ratio');
        return n === undefined ? '' : String(Math.round(n * 100));
    }
    if (token === 'displacement_ratio_pct') {
        const n = comparisonNumber(context, 'displacement_ratio');
        return n === undefined ? '' : String(Math.round(n * 100));
    }

    if (token === 'rupture_list') {
        const raw = context.historicalComparison?.rupture_divergence;
        return Array.isArray(raw) ? raw.join(', ') : '';
    }

    // territory_<factionKey>_delta — e.g. territory_RS_delta or
    // territory_RBiH_HRHB_Federation_delta. Signed percentage with one decimal.
    const territoryMatch = /^territory_(.+)_delta$/.exec(token);
    if (territoryMatch) {
        const delta = territoryDelta(context, territoryMatch[1]);
        if (delta === undefined) return '';
        const rounded = Math.round(delta * 10) / 10;
        return signed(rounded);
    }

    return undefined;
}

/** Apply `{token}` interpolation to dynamic section content. Tokens that
 *  are not recognized are left as literal text so content review can catch
 *  typos; tokens that resolve to an absent baseline render as empty strings. */
function interpolateDynamicContent(content: string, context: CodexRenderContext): string {
    return content.replace(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g, (match, token) => {
        const expanded = expandToken(token, context);
        return expanded === undefined ? match : expanded;
    });
}

function ghostSummary(essay: EssayEntry): string {
    if (essay.ghost_summary && essay.ghost_summary.trim().length > 0) {
        return essay.ghost_summary.trim();
    }
    return 'This historical entry remained unrealized in your war.';
}

export function resolveCodexEssay(essay: EssayEntry, context: CodexRenderContext): ResolvedEssay {
    const eventUnlocked = context.firedEventIds.has(essay.event_id);
    const isGhost = !eventUnlocked && evaluateEssayCondition(essay.ghost_when, context);
    const isUnlocked = eventUnlocked || isGhost;
    if (!isUnlocked) {
        return { isUnlocked: false, isGhost: false, paragraphs: [] };
    }

    const canonicalParagraphs = splitParagraphs(essay.content);
    const paragraphs: ResolvedEssayParagraph[] = [];
    if (isGhost) {
        paragraphs.push({ kind: 'ghost', text: ghostSummary(essay), variant: 'ghost' });
    }

    const dynamicInsertions = new Map<number, ResolvedEssayParagraph[]>();
    const rawDynamicSections = Array.isArray(essay.dynamic_sections) ? essay.dynamic_sections : [];
    for (const section of rawDynamicSections) {
        if (!section || typeof section.content !== 'string') continue;
        if (section.condition && !evaluateEssayCondition(section.condition, context)) continue;

        const renderedParagraphs = splitParagraphs(interpolateDynamicContent(section.content, context))
            .map((text) => ({
                kind: 'dynamic' as const,
                text,
                variant: section.variant ?? 'note',
            }));

        if (renderedParagraphs.length === 0) continue;
        const requestedIndex = section.insert_after_paragraph ?? (canonicalParagraphs.length - 1);
        const targetIndex = canonicalParagraphs.length === 0
            ? -1
            : requestedIndex < 0
                ? canonicalParagraphs.length - 1
                : Math.min(requestedIndex, canonicalParagraphs.length - 1);
        const existing = dynamicInsertions.get(targetIndex) ?? [];
        existing.push(...renderedParagraphs);
        dynamicInsertions.set(targetIndex, existing);
    }

    const leadingDynamic = dynamicInsertions.get(-1);
    if (leadingDynamic) paragraphs.push(...leadingDynamic);

    canonicalParagraphs.forEach((text, index) => {
        paragraphs.push({ kind: 'canonical', text });
        const inserts = dynamicInsertions.get(index);
        if (inserts) paragraphs.push(...inserts);
    });

    return {
        isUnlocked: true,
        isGhost,
        paragraphs,
    };
}
