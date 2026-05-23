import { useState, useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import { useIPC } from '../desktop/useIPC';
import { getPlayerSafeCorpsName } from '../utils/playerSafeText';
import { WarCrimesBadge } from './WarCrimesBadge';
import { Z } from '../../shared/zIndex';
import { t } from '../i18n';

function StatBar({ label, value }: { label: string; value: number }) {
  const pct = (value / 5) * 100;
  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] text-text-secondary w-20 shrink-0 uppercase tracking-wider">{label}</span>
      <div className="flex-1 h-1.5 bg-black/30 rounded-full overflow-hidden">
        <div className="h-full bg-accent-gold/70 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-text-primary tabular-nums w-4 text-right">{value}</span>
    </div>
  );
}

function OfficerCard({ name, competence, aggressiveness, defensiveSkill, warCrimesRecord, highlight }: {
  name: string;
  competence: number;
  aggressiveness: number;
  defensiveSkill: number;
  warCrimesRecord?: import('./WarCrimesBadge').WarCrimesRecord;
  highlight?: boolean;
}) {
  return (
    <div className={`p-3 rounded border ${highlight ? 'border-accent-gold/40 bg-accent-gold/5' : 'border-panel-border bg-panel-card/50'}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold text-[12px] text-text-primary uppercase tracking-wide">{name}</span>
        {highlight && (
          <span className="text-[8px] bg-accent-gold/20 text-accent-gold px-1.5 py-0.5 rounded border border-accent-gold/30 font-bold uppercase tracking-wider">
            {t('officerEvent.recommended')}
          </span>
        )}
      </div>
      <div className="space-y-1">
        <StatBar label={t('officerProfile.competence')} value={competence} />
        <StatBar label={t('officerProfile.aggression')} value={aggressiveness} />
        <StatBar label={t('officerProfile.defense')} value={defensiveSkill} />
      </div>
      {warCrimesRecord && <WarCrimesBadge record={warCrimesRecord} className="mt-2" />}
    </div>
  );
}

type OfficerEvent = NonNullable<NonNullable<ReturnType<typeof useGameStore.getState>['loadedGameState']>['pendingOfficerEvents']>[number];

export function OfficerEventBadge() {
  const loadedGameState = useGameStore((s) => s.loadedGameState);
  const events = loadedGameState?.pendingOfficerEvents;
  const [modalOpen, setModalOpen] = useState(false);

  const unacknowledged = useMemo(
    () => events?.filter(e => !e.acknowledged) ?? [],
    [events],
  );
  if (unacknowledged.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="relative px-2 py-1 rounded border border-accent-gold/30 bg-accent-gold/10 text-accent-gold text-[10px] font-bold uppercase tracking-wider hover:bg-accent-gold/20 transition-colors"
      >
        {t('officerEvent.officers')}
        <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 flex items-center justify-center px-1 rounded-full bg-red-600 text-white text-[9px] font-bold border border-red-400 shadow-lg">
          {unacknowledged.length}
        </span>
      </button>
      {modalOpen && (
        <OfficerEventModal
          events={unacknowledged}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}

function OfficerEventModal({ events, onClose }: {
  events: OfficerEvent[];
  onClose: () => void;
}) {
  const ipc = useIPC();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const remaining = events.filter(e => !dismissed.has(e.event_id));
  if (remaining.length === 0) { onClose(); return null; }
  const event = remaining[Math.min(currentIndex, remaining.length - 1)];
  const corpsLabel = getPlayerSafeCorpsName(event.corps_name ?? null, event.corps_id ?? null, t('officerEvent.thisCorps'));

  const advance = (eventId: string) => {
    setDismissed(prev => new Set(prev).add(eventId));
    if (currentIndex >= remaining.length - 1) {
      onClose();
    }
  };

  const handleDismiss = async () => {
    if (ipc.isAvailable) {
      try { await ipc.acknowledgeOfficerEvent(event.event_id); } catch (err) {
        console.warn('[OfficerEvent] acknowledge error:', err);
      }
    }
    advance(event.event_id);
  };

  const handleAcceptReplacement = async () => {
    if (ipc.isAvailable && event.type === 'replacement_suggested' && event.corps_id) {
      try {
        await ipc.acceptOfficerReplacement({
          eventId: event.event_id,
          corpsId: event.corps_id,
          newOfficerId: event.officer_id,
          currentOfficerId: event.current_commander_id,
        });
      } catch (err) {
        console.warn('[OfficerEvent] replacement error:', err);
      }
    }
    advance(event.event_id);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm" style={{ zIndex: Z.CRITICAL_MODAL }}>
      <div className="w-[480px] max-h-[80vh] bg-panel-bg/95 border border-panel-border rounded-lg shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3 border-b border-panel-border bg-panel-card/50 flex items-center justify-between shrink-0">
          <div>
            <div className="text-[9px] font-mono uppercase tracking-[0.3em] text-accent-gold/70 mb-0.5">{t('officerEvent.personnelDirective')}</div>
            <div className="text-sm font-bold text-text-primary uppercase tracking-wide">
              {event.type === 'replacement_suggested' ? t('officerEvent.replacementAvailable') : t('officerEvent.newOfficerArrived')}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-text-secondary font-mono">{Math.min(currentIndex + 1, remaining.length)}/{remaining.length}</span>
            <button onClick={onClose} className="text-text-secondary hover:text-text-primary text-lg leading-none">✕</button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-5 space-y-4">
          {event.type === 'replacement_suggested' ? (
            <>
              <div className="text-[11px] text-text-secondary leading-relaxed">
                {t('officerEvent.replacementBodyPrefix')} <span className="text-text-primary font-bold">{corpsLabel}</span>.
                {t('officerEvent.replacementBodySuffix')}
              </div>

              {event.current_commander_name && (
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-text-secondary mb-1.5">{t('officerEvent.currentCommander')}</div>
                  <OfficerCard
                    name={event.current_commander_name}
                    competence={event.current_commander_competence ?? 3}
                    aggressiveness={event.current_commander_aggressiveness ?? 3}
                    defensiveSkill={event.current_commander_defensive_skill ?? 3}
                    warCrimesRecord={event.current_commander_war_crimes_record}
                  />
                </div>
              )}

              <div>
                <div className="text-[9px] uppercase tracking-wider text-text-secondary mb-1.5">{t('officerEvent.availableReplacement')}</div>
                <OfficerCard
                  name={event.officer_name}
                  competence={event.officer_competence}
                  aggressiveness={event.officer_aggressiveness}
                  defensiveSkill={event.officer_defensive_skill}
                  warCrimesRecord={event.war_crimes_record}
                  highlight
                />
              </div>
            </>
          ) : (
            <>
              <div className="text-[11px] text-text-secondary leading-relaxed">
                {t('officerEvent.newOfficerBody')}
              </div>
              <OfficerCard
                name={event.officer_name}
                competence={event.officer_competence}
                aggressiveness={event.officer_aggressiveness}
                defensiveSkill={event.officer_defensive_skill}
                warCrimesRecord={event.war_crimes_record}
              />
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-panel-border bg-panel-card/30 flex justify-end gap-2 shrink-0">
          {event.type === 'replacement_suggested' ? (
            <>
              <button
                onClick={handleDismiss}
                className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded border border-panel-border text-text-secondary hover:bg-white/5 transition-colors"
              >
                {t('officerEvent.keepCurrent')}
              </button>
              <button
                onClick={handleAcceptReplacement}
                className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded border border-accent-gold/40 bg-accent-gold/10 text-accent-gold hover:bg-accent-gold/20 transition-colors"
              >
                {t('officerEvent.acceptReplacement')}
              </button>
            </>
          ) : (
            <button
              onClick={handleDismiss}
              className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded border border-accent-gold/40 bg-accent-gold/10 text-accent-gold hover:bg-accent-gold/20 transition-colors"
            >
              {t('event.acknowledged')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
