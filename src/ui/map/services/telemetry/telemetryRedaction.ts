const STRUCTURED_PAYLOAD_PATTERNS = [
    /\b(payload|save_data|scenario_dump|raw_save)\s*=\s*(\{.*\}|\[.*\]|[^\s]+)/gis,
    /\b(political_controllers|scenario_id|player_notes)\b\s*[:=]\s*("[^"]*"|'[^']*'|[^\s,}]+)/gis,
    /\b(political_controllers|scenario_id|player_notes)\b/gis,
];

const USER_PATH_PATTERNS = [
    /file:\/\/\/[A-Za-z]:\/Users\/[^/\s)]+(?:%20[^/\s)]+)*(?:\/[^\s)]*)?/gi,
    /[A-Za-z]:\\Users\\[^\\\r\n)]+(?:\\[^\r\n)]*)?/g,
    /\/Users\/[^/\s)]+(?:\/[^\s)]*)?/g,
    /\/home\/[^/\s)]+(?:\/[^\s)]*)?/g,
];

export function redactCrashDiagnosticText(input: unknown): string {
    const raw = String(input ?? '');
    let redacted = raw;

    for (const pattern of STRUCTURED_PAYLOAD_PATTERNS) {
        redacted = redacted.replace(pattern, '<redacted-structured-payload>');
    }

    for (const pattern of USER_PATH_PATTERNS) {
        redacted = redacted.replace(pattern, '<redacted-user-path>');
    }

    return redacted;
}
