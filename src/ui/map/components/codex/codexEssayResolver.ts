import type { ComparisonResult } from '../../../../sim/endgame/endgame_comparison.js';

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

function evaluateAtom(token: string, context: CodexRenderContext): boolean {
    if (token === 'ALWAYS') return true;
    if (token === 'GAME_OVER') return Boolean(context.gameOver);
    if (token === 'COMPARISON_NOTES') return comparisonNotes(context).length > 0;

    if (token.startsWith('RUPTURE:')) {
        return hasRupture(context, token.slice('RUPTURE:'.length));
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

function interpolateDynamicContent(content: string, context: CodexRenderContext): string {
    return content.replace('{comparison_notes}', comparisonNotes(context).join('\n\n'));
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
