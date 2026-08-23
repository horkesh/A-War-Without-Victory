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
        else setView('landing');
    };

    return (
        <main className="main-menu-casefile fixed inset-0 overflow-y-auto px-4 py-5 sm:px-8 sm:py-8" style={{ zIndex: Z.HARD_MODAL }}>
            <div className="main-menu-casefile__vignette" aria-hidden="true" />
            <header className="relative z-10 mx-auto flex w-full max-w-6xl items-start justify-between gap-4">
                <div className="text-xs font-semibold uppercase tracking-[0.34em] text-[#9d8e75]">{t('mainMenu.presents')}</div>
                <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#aa9d88]">
                    <span>{t('settings.language.label')}</span>
                    <select
                        className="rounded-sm border border-[#b99b62]/35 bg-[#17140f]/90 px-2 py-1 text-xs text-[#e0d8ca] outline-none focus-visible:ring-2 focus-visible:ring-[#d0ad62]"
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

            <section className="relative z-10 mx-auto grid min-h-[calc(100vh-7rem)] w-full max-w-6xl items-center gap-8 py-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.75fr)]">
                <div className="max-w-2xl self-center">
                    <div className="mb-4 h-px w-20 bg-[#c4a35a]/70" />
                    <h1 className="font-serif text-[clamp(2.8rem,7vw,6.8rem)] font-bold leading-[0.84] tracking-[-0.045em] text-[#e1c27b] drop-shadow-2xl">{t('mainMenu.title')}</h1>
                    <p className="mt-6 max-w-xl font-serif text-[clamp(1.05rem,2.2vw,1.55rem)] italic leading-relaxed text-[#ded5c6]">{t('mainMenu.thesis')}</p>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.28em] text-[#9d8e75]">{t('mainMenu.theater')}</p>
                </div>

                <div className="main-menu-casefile__paper relative min-h-[430px] w-full overflow-hidden rounded-sm border border-[#c3ab7a]/30 p-5 shadow-2xl sm:p-7">
                    {errorMessage && <div role="alert" className="mb-4 rounded-sm border border-red-900/30 bg-red-950/10 px-3 py-2 text-xs text-red-950">{playerFacingErrorCopy(errorMessage)}</div>}
                    {view === 'landing' && <LandingActions hasSave={hasSave} onNewWar={() => setView('factions')} onContinue={onContinue} onRecords={() => setView('records')} onSettings={onSettings} onCredits={onCredits} onQuit={onQuit} />}
                    {view === 'factions' && <FactionChoices starting={starting} onSelect={(faction) => { setSelectedFaction(faction); setView('dossier'); }} onBack={back} />}
                    {view === 'dossier' && selectedFaction && <FactionDossier faction={selectedFaction} onBack={back} onTakeCommand={() => setView('mode')} primaryActionRef={primaryActionRef} />}
                    {view === 'mode' && selectedFaction && <ModeChoice faction={selectedFaction} mode={decisionMode} starting={starting || submitted} onModeChange={setDecisionMode} onBack={back} onBegin={beginCampaign} primaryActionRef={primaryActionRef} />}
                    {view === 'records' && <FieldRecords hasSave={hasSave} records={records} loading={recordsLoading} loadingFilename={recordLoadingFilename} error={recordsError} onResume={onContinue} onLoadRecord={loadRecord} onImport={onLoadGame} onBack={back} />}
                </div>
            </section>
            <div className="fixed bottom-4 right-5 z-10 text-xs font-semibold uppercase tracking-[0.18em] text-[#8e806b]">{AWWV_APP_VERSION}</div>
        </main>
    );
}

function LandingActions({ hasSave, onNewWar, onContinue, onRecords, onSettings, onCredits, onQuit }: { hasSave: boolean; onNewWar: () => void; onContinue: () => void; onRecords: () => void; onSettings: () => void; onCredits: () => void; onQuit: () => void }) {
    return <div className="flex min-h-[374px] flex-col">
        <CaseHeading eyebrow={t('mainMenu.caseFile')} title={t('mainMenu.enterWarRoom')} />
        <div className="mt-8 space-y-2">
            <MenuButton onClick={onNewWar} primary>{t('mainMenu.newWar')}</MenuButton>
            {hasSave && <MenuButton onClick={onContinue}>{t('mainMenu.continue')}</MenuButton>}
            <MenuButton onClick={onRecords}>{t('mainMenu.fieldRecords')}</MenuButton>
        </div>
        <div className="mt-auto grid grid-cols-3 gap-2 border-t border-[#705f45]/25 pt-5">
            <QuietButton onClick={onSettings}>{t('mainMenu.settings')}</QuietButton><QuietButton onClick={onCredits}>{t('mainMenu.credits')}</QuietButton><QuietButton onClick={onQuit}>{t('mainMenu.quit')}</QuietButton>
        </div>
    </div>;
}

function FactionChoices({ starting, onSelect, onBack }: { starting: boolean; onSelect: (faction: PlayerFaction) => void; onBack: () => void }) {
    return <div>
        <CaseHeading eyebrow={t('mainMenu.newWar')} title={t('sidePicker.chooseFaction')} />
        <p className="mt-3 text-sm leading-relaxed text-[#594f40]">{t('mainMenu.chooseFactionHelp')}</p>
        <div className="mt-5 space-y-2">{FACTIONS.map((faction, index) => <button key={faction} type="button" data-testid={`main-menu-faction-${faction}`} disabled={starting} onClick={() => onSelect(faction)} className="group flex w-full items-center gap-4 border border-[#705f45]/25 bg-[#fffdf5]/35 p-3 text-left transition-colors hover:border-[#8b6b31]/60 hover:bg-[#fffdf5]/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b6b31] disabled:opacity-50" aria-label={`${sidePickerFactionLabel(faction)} — ${t(DOSSIERS[faction].descriptor)}`}>
            <span className="w-5 text-xs font-bold tabular-nums text-[#8b6b31]">0{index + 1}</span>
            {getFactionFlag(faction) && <img src={getFactionFlag(faction)} alt="" className="h-10 w-16 border border-black/10 object-cover shadow-sm" />}
            <span className="min-w-0 flex-1"><span className="block text-[15px] font-bold leading-tight text-[#241f18]">{sidePickerFactionLabel(faction)}</span><span className="mt-1 block text-xs uppercase tracking-[0.12em] text-[#766751]">{getArmyName(faction)}</span></span>
            <span aria-hidden="true" className="text-lg text-[#8b6b31]">→</span>
        </button>)}</div>
        <BackButton onClick={onBack} />
    </div>;
}

function FactionDossier({ faction, onBack, onTakeCommand, primaryActionRef }: { faction: PlayerFaction; onBack: () => void; onTakeCommand: () => void; primaryActionRef: RefObject<HTMLButtonElement> }) {
    const dossier = DOSSIERS[faction];
    const rows = [['mainMenu.dossier.yourWar', dossier.war], ['mainMenu.dossier.youBegin', dossier.begin], ['mainMenu.dossier.constraint', dossier.constraint], ['mainMenu.dossier.arc', dossier.arc]] as const;
    return <article>
        <div className="flex items-start gap-4 border-b border-[#705f45]/25 pb-4">
            {getFactionFlag(faction) && <img src={getFactionFlag(faction)} alt="" className="h-12 w-[76px] border border-black/10 object-cover shadow-sm" />}
            <div><div className="text-xs font-bold uppercase tracking-[0.22em] text-[#8b6b31]">{t('mainMenu.commandBrief')}</div><h2 className="mt-1 font-serif text-2xl font-bold leading-tight text-[#241f18]">{sidePickerFactionLabel(faction)}</h2><p className="mt-1 text-xs italic text-[#655846]">{t(dossier.descriptor)}</p></div>
        </div>
        <div className="mt-4 max-h-[50vh] space-y-4 overflow-y-auto pr-2">{rows.map(([label, body]) => <section key={label}><h3 className="text-xs font-bold uppercase tracking-[0.19em] text-[#8b6b31]">{t(label)}</h3><p className="mt-1 text-xs leading-[1.55] text-[#4d4335]">{t(body)}</p></section>)}</div>
        <div className="mt-5 flex items-center justify-between border-t border-[#705f45]/25 pt-4"><BackButton onClick={onBack} compact /><button ref={primaryActionRef} type="button" onClick={onTakeCommand} className="casefile-primary-button">{t('mainMenu.takeCommand')}</button></div>
    </article>;
}

function ModeChoice({ faction, mode, starting, onModeChange, onBack, onBegin, primaryActionRef }: { faction: PlayerFaction; mode: DecisionMode; starting: boolean; onModeChange: (mode: DecisionMode) => void; onBack: () => void; onBegin: () => void; primaryActionRef: RefObject<HTMLButtonElement> }) {
    return <div>
        <CaseHeading eyebrow={sidePickerFactionLabel(faction)} title={t('mainMenu.mode.heading')} />
        <p className="mt-3 text-sm leading-relaxed text-[#594f40]">{t('mainMenu.mode.help')}</p>
        <div role="radiogroup" aria-label={t('mainMenu.mode.ariaLabel')} className="mt-6 space-y-3">
            <ModeRadio checked={mode === 'emergent'} title={t('mainMenu.mode.emergent')} body={t('mainMenu.mode.emergentHelp')} onClick={() => onModeChange('emergent')} />
            <ModeRadio checked={mode === 'historical'} title={t('mainMenu.mode.historical')} body={t('mainMenu.mode.historicalHelp')} onClick={() => onModeChange('historical')} />
        </div>
        <div className="mt-8 flex items-center justify-between border-t border-[#705f45]/25 pt-4"><BackButton onClick={onBack} compact /><button ref={primaryActionRef} type="button" disabled={starting} onClick={onBegin} className="casefile-primary-button disabled:cursor-wait disabled:opacity-60">{starting ? t('mainMenu.starting') : t('mainMenu.begin')}</button></div>
    </div>;
}

function ModeRadio({ checked, title, body, onClick }: { checked: boolean; title: string; body: string; onClick: () => void }) {
    return <button type="button" role="radio" aria-checked={checked} aria-label={title} onClick={onClick} className={`w-full border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b6b31] ${checked ? 'border-[#8b6b31]/70 bg-[#8b6b31]/10' : 'border-[#705f45]/25 bg-white/20 hover:bg-white/40'}`}><span className="flex items-center gap-3"><span aria-hidden="true" className={`h-3 w-3 rounded-full border ${checked ? 'border-[#8b6b31] bg-[#8b6b31] shadow-[inset_0_0_0_2px_#e7ddc8]' : 'border-[#766751]'}`} /><span className="font-serif text-lg font-bold text-[#2b241b]">{title}</span></span><span className="mt-2 block pl-6 text-xs leading-relaxed text-[#655846]">{body}</span></button>;
}

function FieldRecords({ hasSave, records, loading, loadingFilename, error, onResume, onLoadRecord, onImport, onBack }: { hasSave: boolean; records: SaveRecord[]; loading: boolean; loadingFilename: string | null; error: string | null; onResume: () => void; onLoadRecord: (filename: string) => void; onImport: (json: unknown) => void; onBack: () => void }) {
    const inputRef = useRef<HTMLInputElement>(null);
    return <div>
        <CaseHeading eyebrow={t('mainMenu.archive')} title={t('mainMenu.fieldRecords')} />
        <p className="mt-3 text-sm leading-relaxed text-[#594f40]">{t('mainMenu.recordsHelp')}</p>
        {error && <div role="alert" className="mt-4 border border-red-900/25 bg-red-950/5 px-3 py-2 text-xs text-red-900">{error}</div>}
        <div className="mt-6 min-h-[180px] space-y-2">
            {loading && <div className="border border-dashed border-[#705f45]/35 p-6 text-center text-sm italic text-[#766751]">{t('mainMenu.recordsLoading')}</div>}
            {!loading && records.map((record, index) => {
                const displayName = record.filename.replace(/\.json$/i, '');
                const faction = record.faction ? sidePickerFactionLabel(record.faction) : null;
                return <div key={record.filename} className={`border p-4 ${index === 0 ? 'border-[#8b6b31]/50 bg-[#8b6b31]/10' : 'border-[#705f45]/25 bg-white/25'}`}>
                    {index === 0 && <div className="text-xs font-bold uppercase tracking-[0.18em] text-[#8b6b31]">{t('mainMenu.mostRecent')}</div>}
                    <div className="mt-1 flex items-start justify-between gap-4">
                        <div><div className="font-serif text-lg font-bold text-[#2b241b]">{displayName}</div><div className="mt-1 text-xs text-[#655846]">{t('mainMenu.week')} {Math.max(1, record.turn)} · {turnToDateString(record.turn)}{faction ? ` · ${faction}` : ''}</div></div>
                        <button type="button" disabled={loadingFilename !== null} onClick={() => onLoadRecord(record.filename)} aria-label={`${t('mainMenu.resume')} ${displayName}`} className="casefile-primary-button shrink-0 disabled:cursor-wait disabled:opacity-60">{loadingFilename === record.filename ? t('mainMenu.loadingRecord') : t('mainMenu.resume')}</button>
                    </div>
                </div>;
            })}
            {!loading && records.length === 0 && hasSave && <div className="border border-[#705f45]/30 bg-white/30 p-4"><div className="text-xs font-bold uppercase tracking-[0.18em] text-[#8b6b31]">{t('mainMenu.mostRecent')}</div><div className="mt-2 font-serif text-xl font-bold text-[#2b241b]">{t('mainMenu.currentCampaign')}</div><button type="button" onClick={onResume} className="casefile-primary-button mt-4">{t('mainMenu.resume')}</button></div>}
            {!loading && records.length === 0 && !hasSave && <div className="border border-dashed border-[#705f45]/35 p-6 text-center text-sm italic text-[#766751]">{t('mainMenu.noRecords')}</div>}
        </div>
        <input ref={inputRef} type="file" accept=".json" aria-label={t('sidePicker.loadSaveAria')} className="hidden" onChange={(event) => { const file = event.target.files?.[0]; event.currentTarget.value = ''; if (!file) return; const reader = new FileReader(); reader.onload = (readerEvent) => { try { onImport(JSON.parse(String(readerEvent.target?.result ?? 'null'))); } catch (err) { console.error('Failed to parse save file:', err); } }; reader.readAsText(file); }} />
        <div className="mt-5 flex items-center justify-between border-t border-[#705f45]/25 pt-4"><BackButton onClick={onBack} compact /><QuietButton onClick={() => inputRef.current?.click()}>{t('mainMenu.importFile')}</QuietButton></div>
    </div>;
}

function CaseHeading({ eyebrow, title }: { eyebrow: string; title: string }) { return <div><div className="text-xs font-bold uppercase tracking-[0.24em] text-[#8b6b31]">{eyebrow}</div><h2 className="mt-1 font-serif text-3xl font-bold leading-tight text-[#241f18]">{title}</h2></div>; }
function MenuButton({ children, onClick, primary = false }: { children: ReactNode; onClick: () => void; primary?: boolean }) { return <button type="button" onClick={onClick} className={`w-full border px-4 py-3 text-left text-sm font-bold uppercase tracking-[0.14em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b6b31] ${primary ? 'border-[#8b6b31]/70 bg-[#8b6b31]/10 text-[#5d421b] hover:bg-[#8b6b31]/20' : 'border-[#705f45]/25 bg-white/20 text-[#4d4335] hover:bg-white/45'}`}><span className="flex items-center justify-between"><span>{children}</span><span aria-hidden="true">→</span></span></button>; }
function QuietButton({ children, onClick }: { children: ReactNode; onClick: () => void }) { return <button type="button" onClick={onClick} className="px-2 py-2 text-xs font-bold uppercase tracking-[0.14em] text-[#766751] hover:text-[#5d421b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b6b31]">{children}</button>; }
function BackButton({ onClick, compact = false }: { onClick: () => void; compact?: boolean }) { return <button type="button" onClick={onClick} className={`${compact ? '' : 'mt-5'} px-1 py-2 text-xs font-bold uppercase tracking-[0.15em] text-[#766751] hover:text-[#5d421b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b6b31]`}>← {t('mainMenu.back')}</button>; }
