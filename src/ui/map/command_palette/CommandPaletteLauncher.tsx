import type { CommandEntry } from './search';
import React, { useEffect, useRef, useState } from 'react';
import { CommandPalette } from './CommandPalette';
import { t, useLocale } from '../i18n';
import { Z } from '../../shared/zIndex';

/** Named navigation controls retain Ctrl/Cmd+K; text editing keeps its native shortcut. */
function isPaletteEditingTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    return target.isContentEditable || Boolean(target.closest(
        'input, textarea, select, [contenteditable="true"], [contenteditable=""], [role="textbox"]',
    ));
}
/** Modal ownership is checked at action time as well as render time. */
export function hasPaletteBlockingSurface(): boolean {
    return Array.from(document.querySelectorAll<HTMLElement>('[aria-busy="true"], [role="dialog"]:not([data-testid="command-palette-dialog"]), [role="alertdialog"], [data-testid="map-context-menu"]')).some(element => {
        for (let node: HTMLElement | null = element; node; node = node.parentElement) {
            if (node.hidden || node.inert || node.getAttribute('aria-hidden') === 'true')
                return false;
            const style = getComputedStyle(node);
            if (style.display === 'none' || style.visibility === 'hidden')
                return false;
        }
        return true;
    });
}
export function CommandPaletteLauncher({ entries, blocked, campaignKey, onActivate }: {
    entries: readonly CommandEntry[];
    blocked: boolean;
    campaignKey: unknown;
    onActivate: (entry: CommandEntry) => void;
}) {
    useLocale();
    const [open, setOpen] = useState(false);
    const current = useRef({ entries, blocked, campaignKey, onActivate });
    current.current = { entries, blocked, campaignKey, onActivate };
    const openedFor = useRef<unknown>(campaignKey);
    const canOpen = () => !current.current.blocked && !hasPaletteBlockingSurface();
    const show = () => {
        if (canOpen()) {
            openedFor.current = current.current.campaignKey;
            setOpen(true);
        }
    };
    useEffect(() => {
        if (blocked || openedFor.current !== campaignKey) setOpen(false);
    }, [blocked, campaignKey]);
    useEffect(() => {
        const keydown = (event: KeyboardEvent) => {
            if (event.defaultPrevented || event.repeat || event.isComposing || event.altKey ||
                !(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'k' ||
                isPaletteEditingTarget(event.target))
                return;
            if (!canOpen())
                return;
            event.preventDefault();
            event.stopImmediatePropagation();
            show();
        };
        window.addEventListener('keydown', keydown, true);
        return () => window.removeEventListener('keydown', keydown, true);
    }, []);
    useEffect(() => {
        if (!open)
            return;
        const observer = new MutationObserver(() => {
            if (hasPaletteBlockingSurface()) setOpen(false);
        });
        observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-busy', 'role'] });
        return () => observer.disconnect();
    }, [open]);
    const activate = (entry: CommandEntry) => {
            if (!canOpen() || openedFor.current !== current.current.campaignKey) {
                setOpen(false);
                return;
            }
            const fresh = current.current.entries.find(candidate =>
                candidate.id === entry.id && candidate.label === entry.label &&
                candidate.kind === entry.kind && candidate.targetId === entry.targetId);
            setOpen(false);
            if (fresh)
                current.current.onActivate(fresh);
    };

    return (
        <>
            <button
                type="button"
                data-testid="command-palette-opener"
                className="command-palette-opener"
                style={{ zIndex: Z.SHELL_FLOATING }}
                disabled={blocked}
                aria-keyshortcuts="Control+k Meta+k"
                onClick={show}
            >
                {t('commandPalette.open')} <kbd>Ctrl / ⌘ K</kbd>
            </button>
            <CommandPalette
                open={open && !blocked}
                entries={entries}
                onClose={() => setOpen(false)}
                onActivate={activate}
            />
        </>
    );
}
