import { useLayoutEffect, useRef, useState } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import { t } from '../i18n';
import { DaytonRoomBackdrop, roomObjects, type DaytonRoomObject } from './DaytonRoomBackdrop';
import arrival from './dayton-arrival-ultrawide.webp';
import './live.css';

interface DaytonConferenceRoomProps {
    date?: string;
    error?: string;
    forced: boolean;
    previewReady: boolean;
    panels: Record<DaytonRoomObject, ReactNode>;
}

export function DaytonConferenceRoom({ date, error, forced, previewReady, panels }: DaytonConferenceRoomProps) {
    const [arrived, setArrived] = useState(false);
    const [panel, setPanel] = useState<DaytonRoomObject | null>(null);
    const opener = useRef<HTMLButtonElement | null>(null);
    const room = useRef<HTMLDivElement>(null);
    const roomHeading = useRef<HTMLHeadingElement>(null);
    const panelHeading = useRef<HTMLHeadingElement>(null);
    const labels = {
        folder: t('dayton.conference.folder'),
        draft: t('dayton.conference.draft'),
        map: t('dayton.conference.map'),
        binder: t('dayton.conference.binder'),
    };

    useLayoutEffect(() => {
        if (!arrived || !room.current) return;
        room.current.toggleAttribute('inert', panel !== null);
        if (panel) panelHeading.current?.focus();
        else if (opener.current?.isConnected) opener.current.focus();
        else roomHeading.current?.focus();
    }, [arrived, panel]);

    function open(id: DaytonRoomObject, event: MouseEvent<HTMLButtonElement>) {
        opener.current = event.currentTarget;
        setPanel(id);
    }

    const alert = error && <p className="dayton-live-error" role="alert">{error}</p>;

    return (
        <div data-dayton-conference className="dayton-live" onKeyDown={event => {
            // Keep campaign hotkeys outside the required decision. Modal's Tab
            // trap runs in capture, and native button activation uses the default.
            event.stopPropagation();
            if (event.key === 'Escape' && panel) {
                event.preventDefault();
                setPanel(null);
            }
        }}>
            {!arrived ? (
                <div className="dayton-live-arrival" style={{ backgroundImage: `url("${arrival}")` }}>
                    <div className="dayton-live-intro">
                        <p className="dayton-live-kicker">{t('dayton.title')}{date && ' · ' + date}</p>
                        <h2>{t('dayton.conference.arrivalTitle')}</h2>
                        <p>{t('dayton.conference.arrivalText')}</p>
                        <div className="dayton-live-actions">
                            <button type="button" className="dayton-live-button dayton-live-primary" onClick={() => setArrived(true)}>
                                {t('dayton.conference.enter')}
                            </button>
                            <button type="button" className="dayton-live-button" onClick={() => setArrived(true)}>
                                {t('dayton.conference.skip')}
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    <div ref={room} className="dayton-live-room">
                        <header className="dayton-live-heading">
                            <p className="dayton-live-kicker">{t('dayton.location')}</p>
                            <h2 tabIndex={-1} ref={roomHeading}>{t('dayton.conference.room')}</h2>
                            <p role="status">{t(forced ? 'dayton.forcedTitle' : 'dayton.conference.action')}</p>
                            {previewReady && !panel && <p>{t('dayton.conference.previewReady')}</p>}
                            {!panel && alert}
                        </header>
                        <DaytonRoomBackdrop labels={labels} onOpen={open} />
                        <nav className="dayton-live-nav dayton-live-actions" aria-label={t('dayton.conference.objects')}>
                            {roomObjects.map(id => (
                                <button type="button" key={id} className="dayton-live-button" onClick={event => open(id, event)}>
                                    {labels[id]}
                                </button>
                            ))}
                        </nav>
                    </div>
                    {panel && (
                        <section data-dayton-panel={panel} className="dayton-live-panel" aria-labelledby="dayton-conference-panel-title">
                            <header className="dayton-live-panel-heading">
                                <div>
                                    <p className="dayton-live-kicker">{t('dayton.conference.room')}</p>
                                    <h2 ref={panelHeading} tabIndex={-1} id="dayton-conference-panel-title">{labels[panel]}</h2>
                                </div>
                                <button type="button" className="dayton-live-button" onClick={() => setPanel(null)}>
                                    {t('dayton.conference.back')}
                                </button>
                            </header>
                            {alert}
                            <div className="dayton-live-panel-body">
                                {panels[panel]}
                            </div>
                        </section>
                    )}
                </>
            )}
        </div>
    );
}
