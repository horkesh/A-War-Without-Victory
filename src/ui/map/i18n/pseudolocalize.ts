import type { MessageKey } from './messages.en';

const PROTECTED_SEGMENT_PATTERN = /(\{[a-zA-Z0-9_]+\}|<[^>]+>|&(?:#[0-9]+|#x[0-9a-fA-F]+|[a-zA-Z]+);|%(?:\d+\$)?[a-zA-Z%])/g;
const LETTER_PATTERN = /[A-Za-z]/;
const ACCENT_MAP: Readonly<Record<string, string>> = {
    C: 'Č',
    D: 'Đ',
    S: 'Š',
    Z: 'Ž',
    c: 'č',
    d: 'đ',
    s: 'š',
    z: 'ž',
};

function strictCompare(a: string, b: string): number {
    return a < b ? -1 : a > b ? 1 : 0;
}

function transformTextSegment(value: string): string {
    const letterCount = [...value].filter((character) => LETTER_PATTERN.test(character)).length;
    let expansionRemaining = Math.round(letterCount * 0.4);
    let result = '';
    for (const character of value) {
        result += ACCENT_MAP[character] ?? character;
        if (expansionRemaining > 0 && LETTER_PATTERN.test(character)) {
            result += '~';
            expansionRemaining -= 1;
        }
    }
    return result;
}

/** Deterministic QA-only transform. It preserves runtime tokens and markup. */
export function pseudolocalizeMessage(source: string): string {
    const segments = source.split(PROTECTED_SEGMENT_PATTERN);
    const transformed = segments.map((segment, index) => (
        index % 2 === 1 ? segment : transformTextSegment(segment)
    )).join('');
    return `[[${transformed}]]`;
}

export function buildPseudolocaleDictionary(
    messages: Readonly<Record<string, string>>,
): Record<string, string> {
    const result: Record<string, string> = {};
    for (const key of Object.keys(messages).sort(strictCompare)) {
        result[key] = pseudolocalizeMessage(messages[key]);
    }
    return result;
}

export function buildTypedPseudolocaleDictionary(
    messages: Readonly<Record<MessageKey, string>>,
): Record<MessageKey, string> {
    return buildPseudolocaleDictionary(messages) as Record<MessageKey, string>;
}
