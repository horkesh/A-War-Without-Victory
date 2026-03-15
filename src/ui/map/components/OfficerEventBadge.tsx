import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { useIPC } from '../desktop/useIPC';

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

function WarCrimesBadge({ record }: { record: { court: string; verdict: string; sentence?: string; summary: string } }) {
  const verdictColor = record.verdict === 'convicted' ? 'text-red-400 border-red-500/30 bg-red-900/20'
    : record.verdict === 'acquitted' ? 'text-green-400 border-green-500/30 bg-green-900/20'
    : record.verdict === 'indicted' ? 'text-amber-400 border-amber-500/30 bg-amber-900/20'
    : 'text-text-secondary border-panel-border bg-black/20';
  return (
    <div className={`mt-2 px-2 py-1.5 rounded border text-[9px] ${verdictColor}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <span className="font-bold uppercase tracking-wider">
          {record.court} — {record.verdict.replace(/_/g, ' ')}
        </span>
        {record.sentence && <span className="text-text-secondary">({record.sentence})</span>}
      </div>
      <div className="text-text-secondary leading-tight">{record.summary}</div>
    </div>
  );
}

function OfficerCard({ name, competence, aggressiveness, defensiveSkill, warCrimesRecord, highlight }: {
  name: string;
  competence: number;
  aggressiveness: number;
  defensiveSkill: number;
  warCrimesRecord?: { court: string; verdict: string; sentence?: string; summary: string };
  highlight?: boolean;
}) {
  return (
    <div className={`p-3 rounded border ${highlight ? 'border-accent-gold/40 bg-accent-gold/5' : 'border-panel-border bg-panel-card/50'}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold text-[12px] text-text-primary uppercase tracking-wide">{name}</span>
        {highlight && (
          <span className="text-[8px] bg-accent-gold/20 text-accent-gold px-1.5 py-0.5 rounded border border-accent-gold/30 font-bold uppercase tracking-wider">
            Recommended
          </span>
        )}
      </div>
      <div className="space-y-1">
        <StatBar label="Competence" value={competence} />
        <StatBar label="Aggression" value={aggressiveness} />
        <StatBar label="Defense" value={defensiveSkill} />
      </div>
      {warCrimesRecord && <WarCrimesBadge record={warCrimesRecord} />}
    </div>
  );
}

type OfficerEvent = NonNullable<NonNullable<ReturnType<typeof useGameStore.getState>['loadedGameState']>['pendingOfficerEvents']>[number];

export function OfficerEventBadge() {
  const loadedGameState = useGameStore((s) => s.loadedGameState);
  const events = loadedGameState?.pendingOfficerEvents;
  const [modalOpen, setModalOpen] = useState(false);

  const unacknowledgedCount = events?.filter(e => !e.acknowledged).length ?? 0;
  if (unacknowledgedCount === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="relative px-2 py-1 rounded border border-accent-gold/30 bg-accent-gold/10 text-accent-gold text-[10px] font-bold uppercase tracking-wider hover:bg-accent-gold/20 transition-colors"
      >
        OFFICERS
        <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 flex items-center justify-center px-1 rounded-full bg-red-600 text-white text-[9px] font-bold border border-red-400 shadow-lg">
          {unacknowledgedCount}
        </span>
      </button>
      {modalOpen && (
        <OfficerEventModal
          events={events!.filter(e => !e.acknowledged)}
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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[480px] max-h-[80vh] bg-panel-bg/95 border border-panel-border rounded-lg shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3 border-b border-panel-border bg-panel-card/50 flex items-center justify-between shrink-0">
          <div>
            <div className="text-[9px] font-mono uppercase tracking-[0.3em] text-accent-gold/70 mb-0.5">Personnel Directive</div>
            <div className="text-sm font-bold text-text-primary uppercase tracking-wide">
              {event.type === 'replacement_suggested' ? 'Commander Replacement Available' : 'New Officer Arrived'}
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
                A replacement commander is available for <span className="text-text-primary font-bold">{event.corps_name ?? event.corps_id}</span>.
                You may accept the replacement or keep the current commander.
              </div>

              {event.current_commander_name && (
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-text-secondary mb-1.5">Current Commander</div>
                  <OfficerCard
                    name={event.current_commander_name}
                    competence={3}
                    aggressiveness={3}
                    defensiveSkill={3}
                  />
                </div>
              )}

              <div>
                <div className="text-[9px] uppercase tracking-wider text-text-secondary mb-1.5">Available Replacement</div>
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
                A new officer has arrived in theater and is available for command assignments.
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
                Keep Current
              </button>
              <button
                onClick={handleAcceptReplacement}
                className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded border border-accent-gold/40 bg-accent-gold/10 text-accent-gold hover:bg-accent-gold/20 transition-colors"
              >
                Accept Replacement
              </button>
            </>
          ) : (
            <button
              onClick={handleDismiss}
              className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded border border-accent-gold/40 bg-accent-gold/10 text-accent-gold hover:bg-accent-gold/20 transition-colors"
            >
              Acknowledged
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
