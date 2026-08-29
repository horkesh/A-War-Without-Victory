import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { Z } from '../../shared/zIndex';
import { SUPPORTED_LOCALES, t, useLocale, type Locale, type MessageKey } from '../i18n';
import { useIPC } from '../desktop/useIPC';
import type { SaveRecord, StartNewCampaignPayload } from '../desktop/types';
import { getArmyName, getFactionFlag } from '../utils/factionAssets';
import { AWWV_APP_VERSION } from '../utils/appVersion';
import { playerFacingErrorCopy } from '../utils/errorCopy';
import { turnToDateString } from '../utils/formatters';
import { sidePickerFactionLabel } from '../utils/sidePickerLabels';
import { OpeningCinematicLayer } from './opening/OpeningCinematicLayer';
import { OpeningSplash } from './opening/OpeningSplash';
import openingMonitoringRoomNeutral from '../assets/opening/opening_monitoring_room_neutral.webp';

interface MainMenuProps {
    hasSave: boolean;
    starting?: boolean;
    errorMessage?: string | null;
    onNewGame: (payload: StartNewCampaignPayload) => void;
    onContinue: () => void;
    onLoadGame: (json: unknown) => void;
    onSettings: () => void;
    onCredits: () => void;
    onQuit: () => void;
}

type MenuView = 'landing' | 'factions' | 'dossier' | 'mode' | 'records';
type PlayerFaction = StartNewCampaignPayload['playerFaction'];
type DecisionMode = StartNewCampaignPayload['decisionMode'];

const FACTIONS: PlayerFaction[] = ['RBiH', 'RS', 'HRHB'];

// Approved owner art (opening_monitoring_room_neutral_master, 2752x1536). Closes the neutral-room art gate.
// The CSS-built monitoring room in globals.css stays underneath as recovery-only fallback.
export const OPENING_MONITORING_ROOM_ASSET = openingMonitoringRoomNeutral;

const DOSSIERS: Record<PlayerFaction, {
    descriptor: MessageKey;
    war: MessageKey;
    begin: MessageKey;
    constraint: MessageKey;
    arc: MessageKey;
}> = {
    RBiH: {
        descriptor: 'mainMenu.dossier.RBiH.descriptor',
        war: 'intro.forceBriefing.RBiH.body',
        begin: 'intro.identity.RBiH.situation',
        constraint: 'intro.identity.RBiH.escape',
        arc: 'intro.identity.RBiH.identity',
    },
    RS: {
        descriptor: 'mainMenu.dossier.RS.descriptor',
        war: 'intro.forceBriefing.RS.body',
        begin: 'intro.identity.RS.situation',
        constraint: 'intro.identity.RS.escape',
        arc: 'intro.identity.RS.identity',
    },
    HRHB: {
        descriptor: 'mainMenu.dossier.HRHB.descriptor',
        war: 'intro.forceBriefing.HRHB.body',
        begin: 'intro.identity.HRHB.situation',
        constraint: 'intro.identity.HRHB.escape',
        arc: 'intro.identity.HRHB.identity',
    },
};

export function MainMenu({ hasSave, starting = false, errorMessage, onNewGame, onContinue, onLoadGame, onSettings, onCredits, onQuit }: MainMenuProps) {
    const [locale, setLocale] = useLocale();
    const [splashVisible, setSplashVisible] = useState(true);
    const [view, setView] = useState<MenuView>('landing');
    const [selectedFaction, setSelectedFaction] = useState<PlayerFaction | null>(null);
    const [decisionMode, setDecisionMode] = useState<DecisionMode>('emergent');
    const [submitted, setSubmitted] = useState(false);
    const [records, setRecords] = useState<SaveRecord[]>([]);
    const [recordsLoading, setRecordsLoading] = useState(false);
    const [recordLoadingFilename, setRecordLoadingFilename] = useState<string | null>(null);
    const [recordsError, setRecordsError] = useState<string | null>(null);
    const primaryActionRef = useRef<HTMLButtonElement>(null);
    const ipc = useIPC();

    useEffect(() => {
        if (view === 'dossier' || view === 'mode') primaryActionRef.current?.focus();
    }, [view]);

    useEffect(() => {
        if (!starting && errorMessage) setSubmitted(false);
    }, [errorMessage, starting]);

    useEffect(() => {
        if (view !== 'records' || !ipc.isAvailable) return;
        let active = true;
        setRecordsLoading(true);
        setRecordsError(null);
        void ipc.listSaveRecords().then((result) => {
            if (!active) return;
            if (result.ok) setRecords(result.records ?? []);
            else setRecordsError(t('mainMenu.recordsUnavailable'));
        }).catch(() => {
            if (active) setRecordsError(t('mainMenu.recordsUnavailable'));
        }).finally(() => {
            if (active) setRecordsLoading(false);
        });
        return () => { active = false; };
    }, [ipc, view]);

    const beginCampaign = () => {
        if (!selectedFaction || submitted || starting) return;
        setSubmitted(true);
        onNewGame({ playerFaction: selectedFaction, decisionMode });
    };

    const loadRecord = async (filename: string) => {
        if (recordLoadingFilename) return;
        setRecordLoadingFilename(filename);
        setRecordsError(null);
        try {
            const result = await ipc.loadSaveRecord(filename);
            if (!result.ok || !result.stateJson) {
                setRecordsError(t('mainMenu.recordsUnavailable'));
                return;
            }
            onLoadGame(result.stateJson);
        } catch {
            setRecordsError(t('mainMenu.recordsUnavailable'));
        } finally {
            setRecordLoadingFilename(null);
        }
    };

    const back = () => {
        if (view === 'mode') setView('dossier');
        else if (view === 'dossier') setView('factions');
        else {
            setSelectedFaction(null);
            setView('landing');
        }
    };

    if (splashVisible) {
        return (
            <OpeningSplash
                title={t('mainMenu.title')}
                version={AWWV_APP_VERSION}
                actionLabel={t('mainMenu.enterWarRoom')}
                onDismiss={() => setSplashVisible(false)}
            />
        );
    }

    const previewScene = selectedFaction ?? 'neutral';
    const campaignView = view === 'factions' || view === 'dossier' || view === 'mode';
    const selectFaction = (faction: PlayerFaction) => {
        setSelectedFaction(faction);
        setView('dossier');
    };

    return (
        <main className="main-menu-opening" style={{ zIndex: Z.HARD_MODAL }} data-opening-scene={previewScene}>
            <div className="main-menu-opening__monitor" aria-hidden="true">
                <div className="main-menu-opening__monitor-bank" />
                <div className="main-menu-opening__map-table" />
            </div>
            <OpeningCinematicLayer scene={previewScene} neutralSrc={OPENING_MONITORING_ROOM_ASSET} className="main-menu-opening__scene" />
            <div className="main-menu-opening__scrim" aria-hidden="true" />

            <header className="main-menu-opening__header">
                <div className="main-menu-opening__identity">
                    <div className="main-menu-opening__presents">{t('mainMenu.presents')}</div>
                    <h1>{t('mainMenu.title')}</h1>
                    <p>{t('mainMenu.theater')}</p>
                </div>
                <label className="main-menu-opening__locale">
                    <span>{t('settings.language.label')}</span>
                    <select
                        aria-label={t('settings.language.ariaLabel')}
                        value={locale}
                        onChange={(event) => setLocale(event.target.value as Locale)}
                    >
                        {SUPPORTED_LOCALES.map((option) => (
                            <option key={option} value={option}>{option === 'en' ? t('settings.language.option.en') : t('settings.language.option.bcs')}</option>
                        ))}
                    </select>
                </label>
            </header>

            <section className={`main-menu-opening__workspace${campaignView ? ' main-menu-opening__workspace--campaign' : ''}`}>
                {campaignView && (
                    <aside className="main-menu-opening__faction-rail" aria-label={t('sidePicker.chooseFaction')}>
                        <FactionChoices starting={starting} selectedFaction={selectedFaction} showBack={view === 'factions'} onSelect={selectFaction} onBack={back} />
                    </aside>
                )}
                <div className="main-menu-opening__console">
                    {errorMessage && <div role="alert" className="command-error">{playerFacingErrorCopy(errorMessage)}</div>}
                    {view === 'landing' && <LandingActions hasSave={hasSave} onNewWar={() => setView('factions')} onContinue={onContinue} onRecords={() => setView('records')} onSettings={onSettings} onCredits={onCredits} onQuit={onQuit} />}
                    {view === 'factions' && <FactionStandby />}
                    {view === 'dossier' && selectedFaction && <FactionDossier faction={selectedFaction} onBack={back} onTakeCommand={() => setView('mode')} primaryActionRef={primaryActionRef} />}
                    {view === 'mode' && selectedFaction && <ModeChoice faction={selectedFaction} mode={decisionMode} starting={starting || submitted} onModeChange={setDecisionMode} onBack={back} onBegin={beginCampaign} primaryActionRef={primaryActionRef} />}
                    {view === 'records' && <FieldRecords hasSave={hasSave} records={records} loading={recordsLoading} loadingFilename={recordLoadingFilename} error={recordsError} onResume={onContinue} onLoadRecord={loadRecord} onImport={onLoadGame} onBack={back} />}
                </div>
            </section>
            <div className="main-menu-opening__version">{AWWV_APP_VERSION}</div>
        </main>
    );
}

function LandingActions({ hasSave, onNewWar, onContinue, onRecords, onSettings, onCredits, onQuit }: { hasSave: boolean; onNewWar: () => void; onContinue: () => void; onRecords: () => void; onSettings: () => void; onCredits: () => void; onQuit: () => void }) {
    return <div className="command-console-stack">
        <CommandHeading eyebrow={t('mainMenu.caseFile')} title={t('mainMenu.enterWarRoom')} />
        <p className="command-console-thesis">{t('mainMenu.thesis')}</p>
        <div className="command-action-list">
            <MenuButton onClick={onNewWar} primary>{t('mainMenu.newWar')}</MenuButton>
            {hasSave && <MenuButton onClick={onContinue}>{t('mainMenu.continue')}</MenuButton>}
            <MenuButton onClick={onRecords}>{t('mainMenu.fieldRecords')}</MenuButton>
        </div>
        <div className="command-utility-row">
            <QuietButton onClick={onSettings}>{t('mainMenu.settings')}</QuietButton><QuietButton onClick={onCredits}>{t('mainMenu.credits')}</QuietButton><QuietButton onClick={onQuit}>{t('mainMenu.quit')}</QuietButton>
        </div>
    </div>;
}

function FactionChoices({ starting, selectedFaction, showBack, onSelect, onBack }: { starting: boolean; selectedFaction: PlayerFaction | null; showBack: boolean; onSelect: (faction: PlayerFaction) => void; onBack: () => void }) {
    return <div className="faction-rail">
        <CommandHeading eyebrow={t('mainMenu.newWar')} title={t('sidePicker.chooseFaction')} />
        <p className="faction-rail__help">{t('mainMenu.chooseFactionHelp')}</p>
        <div className="faction-rail__choices">{FACTIONS.map((faction, index) => <button key={faction} type="button" data-testid={`main-menu-faction-${faction}`} disabled={starting} aria-pressed={selectedFaction === faction} onClick={() => onSelect(faction)} className="faction-rail__choice" aria-label={`${sidePickerFactionLabel(faction)} — ${t(DOSSIERS[faction].descriptor)}`}>
            <span className="faction-rail__index">0{index + 1}</span>
            {getFactionFlag(faction) && <img src={getFactionFlag(faction)} alt="" className="faction-rail__flag" />}
            <span className="faction-rail__label"><strong>{sidePickerFactionLabel(faction)}</strong><small>{getArmyName(faction)}</small></span>
            <span aria-hidden="true" className="faction-rail__marker">{selectedFaction === faction ? '●' : '○'}</span>
        </button>)}</div>
        {showBack && <BackButton onClick={onBack} />}
    </div>;
}

function FactionStandby() {
    return <div className="command-console-stack command-console-stack--standby">
        <CommandHeading eyebrow={t('mainMenu.commandBrief')} title={t('sidePicker.chooseFaction')} />
        <p className="command-console-copy">{t('mainMenu.chooseFactionHelp')}</p>
        <div className="command-console-signal" aria-hidden="true"><span /><span /><span /></div>
    </div>;
}

function FactionDossier({ faction, onBack, onTakeCommand, primaryActionRef }: { faction: PlayerFaction; onBack: () => void; onTakeCommand: () => void; primaryActionRef: RefObject<HTMLButtonElement> }) {
    const dossier = DOSSIERS[faction];
    const rows = [['mainMenu.dossier.yourWar', dossier.war], ['mainMenu.dossier.youBegin', dossier.begin], ['mainMenu.dossier.constraint', dossier.constraint], ['mainMenu.dossier.arc', dossier.arc]] as const;
    return <article className="command-dossier">
        <div className="command-dossier__header">
            {getFactionFlag(faction) && <img src={getFactionFlag(faction)} alt="" className="command-dossier__flag" />}
            <div><div className="command-eyebrow">{t('mainMenu.commandBrief')}</div><h2>{sidePickerFactionLabel(faction)}</h2><p>{t(dossier.descriptor)}</p></div>
        </div>
        <div className="command-dossier__rows">{rows.map(([label, body]) => <section key={label}><h3>{t(label)}</h3><p>{t(body)}</p></section>)}</div>
        <div className="command-console-footer"><BackButton onClick={onBack} compact /><button ref={primaryActionRef} type="button" onClick={onTakeCommand} className="command-primary-button">{t('mainMenu.takeCommand')}</button></div>
    </article>;
}

function ModeChoice({ faction, mode, starting, onModeChange, onBack, onBegin, primaryActionRef }: { faction: PlayerFaction; mode: DecisionMode; starting: boolean; onModeChange: (mode: DecisionMode) => void; onBack: () => void; onBegin: () => void; primaryActionRef: RefObject<HTMLButtonElement> }) {
    return <div className="command-console-stack">
        <CommandHeading eyebrow={sidePickerFactionLabel(faction)} title={t('mainMenu.mode.heading')} />
        <p className="command-console-copy">{t('mainMenu.mode.help')}</p>
        <div role="radiogroup" aria-label={t('mainMenu.mode.ariaLabel')} className="command-mode-list">
            <ModeRadio checked={mode === 'emergent'} title={t('mainMenu.mode.emergent')} body={t('mainMenu.mode.emergentHelp')} onClick={() => onModeChange('emergent')} />
            <ModeRadio checked={mode === 'historical'} title={t('mainMenu.mode.historical')} body={t('mainMenu.mode.historicalHelp')} onClick={() => onModeChange('historical')} />
        </div>
        <div className="command-console-footer"><BackButton onClick={onBack} compact /><button ref={primaryActionRef} type="button" disabled={starting} onClick={onBegin} className="command-primary-button disabled:cursor-wait disabled:opacity-60">{starting ? t('mainMenu.starting') : t('mainMenu.begin')}</button></div>
    </div>;
}

function ModeRadio({ checked, title, body, onClick }: { checked: boolean; title: string; body: string; onClick: () => void }) {
    return <button type="button" role="radio" aria-checked={checked} aria-label={title} onClick={onClick} className="command-mode"><span className="command-mode__title"><span aria-hidden="true" className="command-mode__indicator">{checked ? '●' : '○'}</span><strong>{title}</strong></span><span className="command-mode__body">{body}</span></button>;
}

function FieldRecords({ hasSave, records, loading, loadingFilename, error, onResume, onLoadRecord, onImport, onBack }: { hasSave: boolean; records: SaveRecord[]; loading: boolean; loadingFilename: string | null; error: string | null; onResume: () => void; onLoadRecord: (filename: string) => void; onImport: (json: unknown) => void; onBack: () => void }) {
    const inputRef = useRef<HTMLInputElement>(null);
    return <div className="command-console-stack">
        <CommandHeading eyebrow={t('mainMenu.archive')} title={t('mainMenu.fieldRecords')} />
        <p className="command-console-copy">{t('mainMenu.recordsHelp')}</p>
        {error && <div role="alert" className="command-error">{error}</div>}
        <div className="record-list">
            {loading && <div className="record-list__empty">{t('mainMenu.recordsLoading')}</div>}
            {!loading && records.map((record, index) => {
                const displayName = record.filename.replace(/\.json$/i, '');
                const faction = record.faction ? sidePickerFactionLabel(record.faction) : null;
                return <div key={record.filename} className={`record-list__entry${index === 0 ? ' record-list__entry--recent' : ''}`}>
                    {index === 0 && <div className="command-eyebrow">{t('mainMenu.mostRecent')}</div>}
                    <div className="record-list__row">
                        <div><div className="record-list__name">{displayName}</div><div className="record-list__meta">{t('mainMenu.week')} {Math.max(1, record.turn)} · {turnToDateString(record.turn)}{faction ? ` · ${faction}` : ''}</div></div>
                        <button type="button" disabled={loadingFilename !== null} onClick={() => onLoadRecord(record.filename)} aria-label={`${t('mainMenu.resume')} ${displayName}`} className="command-primary-button shrink-0 disabled:cursor-wait disabled:opacity-60">{loadingFilename === record.filename ? t('mainMenu.loadingRecord') : t('mainMenu.resume')}</button>
                    </div>
                </div>;
            })}
            {!loading && records.length === 0 && hasSave && <div className="record-list__entry record-list__entry--recent"><div className="command-eyebrow">{t('mainMenu.mostRecent')}</div><div className="record-list__name">{t('mainMenu.currentCampaign')}</div><button type="button" onClick={onResume} className="command-primary-button mt-4">{t('mainMenu.resume')}</button></div>}
            {!loading && records.length === 0 && !hasSave && <div className="record-list__empty">{t('mainMenu.noRecords')}</div>}
        </div>
        <input ref={inputRef} type="file" accept=".json" aria-label={t('sidePicker.loadSaveAria')} className="hidden" onChange={(event) => { const file = event.target.files?.[0]; event.currentTarget.value = ''; if (!file) return; const reader = new FileReader(); reader.onload = (readerEvent) => { try { onImport(JSON.parse(String(readerEvent.target?.result ?? 'null'))); } catch (err) { console.error('Failed to parse save file:', err); } }; reader.readAsText(file); }} />
        <div className="command-console-footer"><BackButton onClick={onBack} compact /><QuietButton onClick={() => inputRef.current?.click()}>{t('mainMenu.importFile')}</QuietButton></div>
    </div>;
}

function CommandHeading({ eyebrow, title }: { eyebrow: string; title: string }) { return <div className="command-heading"><div className="command-eyebrow">{eyebrow}</div><h2>{title}</h2></div>; }
function MenuButton({ children, onClick, primary = false }: { children: ReactNode; onClick: () => void; primary?: boolean }) { return <button type="button" onClick={onClick} className={`command-menu-button${primary ? ' command-menu-button--primary' : ''}`}><span>{children}</span><span aria-hidden="true">→</span></button>; }
function QuietButton({ children, onClick }: { children: ReactNode; onClick: () => void }) { return <button type="button" onClick={onClick} className="command-quiet-button">{children}</button>; }
function BackButton({ onClick, compact = false }: { onClick: () => void; compact?: boolean }) { return <button type="button" onClick={onClick} className={`command-back-button${compact ? '' : ' command-back-button--spaced'}`}>← {t('mainMenu.back')}</button>; }
