export interface TacticalFrameRef {
    readonly contentWindow: MessageEventSource | null;
    readonly src: string;
}

type TacticalFrameMessage = Pick<MessageEvent, 'origin' | 'source'>;

export function resolveTacticalFrameOrigin(src: string, parentHref: string): string | null {
    try {
        const origin = new URL(src, parentHref).origin;
        return origin === 'null' ? null : origin;
    } catch {
        return null;
    }
}

export function isTrustedTacticalFrameMessage(
    event: TacticalFrameMessage,
    frames: readonly (TacticalFrameRef | null)[],
    parentHref: string,
): boolean {
    if (!event.source) return false;
    const frame = frames.find((candidate) => candidate?.contentWindow === event.source);
    if (!frame) return false;

    const expectedOrigin = resolveTacticalFrameOrigin(frame.src, parentHref);
    return expectedOrigin === null
        ? event.origin === 'null'
        : event.origin === expectedOrigin;
}
