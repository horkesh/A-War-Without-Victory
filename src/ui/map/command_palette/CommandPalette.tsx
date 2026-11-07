import React, { useEffect, useId, useRef, useState } from 'react';
import { Modal } from '../../shared/Modal';
import { t, useLocale } from '../i18n';
import { queryCommands, type CommandEntry } from './search';

interface CommandPaletteProps {
    open: boolean;
    entries: readonly CommandEntry[];
    onActivate: (entry: CommandEntry) => void;
    onClose: () => void;
}

export function CommandPalette({ open, entries, onActivate, onClose }: CommandPaletteProps) {
    useLocale();
    const [query, setQuery] = useState('');
    const [active, setActive] = useState(0);
    const id = useId();
    const listRef = useRef<HTMLUListElement>(null);
    const results = queryCommands(entries, query);
    const selected = Math.min(active, Math.max(0, results.length - 1));

    useEffect(() => {
        if (open) {
            setQuery('');
            setActive(0);
        }
    }, [open]);

    useEffect(() => {
        listRef.current?.children[selected]?.scrollIntoView?.({ block: 'nearest' });
    }, [selected, query]);

    const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.nativeEvent.isComposing) return;
        if (['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter'].includes(event.key)) {
            event.preventDefault();
        }
        if (event.key === 'ArrowDown') setActive((selected + 1) % Math.max(1, results.length));
        if (event.key === 'ArrowUp') {
            setActive((selected - 1 + results.length) % Math.max(1, results.length));
        }
        if (event.key === 'Home') setActive(0);
        if (event.key === 'End') setActive(Math.max(0, results.length - 1));
        if (event.key === 'Enter' && !event.repeat && results[selected]) onActivate(results[selected]);
    };

    return (
        <Modal
            isOpen={open}
            onClose={onClose}
            closeOnEscape={false}
            ariaLabelledBy={`${id}-title`}
            panelClassName="command-palette"
            initialFocusTestId="command-palette-search"
            testIdPanel="command-palette-dialog"
        >
            <div onKeyDown={event => {
                event.stopPropagation();
                if (event.nativeEvent.isComposing) return;
                if (event.key === 'Escape') {
                    event.preventDefault();
                    onClose();
                }
            }}>
                <div className="command-palette__heading">
                    <h2 id={`${id}-title`}>{t('commandPalette.title')}</h2>
                    <button type="button" onClick={onClose} aria-label={t('commandPalette.close')}>×</button>
                </div>
                <input
                    data-testid="command-palette-search"
                    role="combobox"
                    aria-label={t('commandPalette.search')}
                    aria-expanded="true"
                    aria-autocomplete="list"
                    aria-controls={`${id}-results`}
                    aria-activedescendant={results[selected] ? `${id}-option-${selected}` : undefined}
                    value={query}
                    onChange={event => {
                        setQuery(event.target.value);
                        setActive(0);
                    }}
                    placeholder={t('commandPalette.placeholder')}
                    onKeyDown={handleSearchKeyDown}
                />
                <p role="status" aria-live="polite" className="command-palette__status">
                    {results.length ? t('commandPalette.count', { count: results.length }) : t('commandPalette.empty')}
                </p>
                <ul id={`${id}-results`} role="listbox" aria-label={t('commandPalette.results')} ref={listRef}>
                    {results.map((entry, index) => (
                        <li
                            key={entry.id}
                            id={`${id}-option-${index}`}
                            role="option"
                            aria-selected={index === selected}
                            onMouseMove={() => setActive(index)}
                            onMouseDown={event => event.preventDefault()}
                            onClick={() => onActivate(entry)}
                        >
                            <span>{entry.label}</span>
                            <small>{t(`commandPalette.kind.${entry.kind}`)}</small>
                        </li>
                    ))}
                </ul>
                <p className="command-palette__help">{t('commandPalette.help')}</p>
            </div>
        </Modal>
    );
}
