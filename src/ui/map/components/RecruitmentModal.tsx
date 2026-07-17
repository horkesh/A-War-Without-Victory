import { useEffect, useMemo, useState } from 'react';
import type { RecruitmentCatalogBrigade, RecruitmentEligibilityReason } from '../desktop/types';
import { Z } from '../../shared/zIndex';
import { Modal } from '../../shared/Modal';
import { t, type MessageKey } from '../i18n';
import { getPlayerSafeDisplayLabel, getPlayerSafePoliticalFactionName } from '../utils/playerSafeText';

interface RecruitmentModalProps {
  isOpen: boolean;
  loading: boolean;
  applying: boolean;
  playerFaction?: string | null;
  brigades: RecruitmentCatalogBrigade[];
  onClose: () => void;
  onRefresh: () => void;
  onApply: (brigadeId: string, equipmentClass: string) => void;
}

const EQUIPMENT_CLASS_LABEL_KEYS: Record<string, MessageKey> = {
  garrison: 'recruitment.equipment.garrison',
  light: 'recruitment.equipment.light',
  light_infantry: 'recruitment.equipment.lightInfantry',
  mechanized: 'recruitment.equipment.mechanized',
  motorized: 'recruitment.equipment.motorized',
  mountain: 'recruitment.equipment.mountain',
  police: 'recruitment.equipment.police',
  special: 'recruitment.equipment.special',
};

function getEquipmentClassLabel(equipmentClass: string): string {
  const labelKey = EQUIPMENT_CLASS_LABEL_KEYS[equipmentClass.trim()];
  return labelKey ? t(labelKey) : getPlayerSafeDisplayLabel(equipmentClass, t('recruitment.equipment.unknown'));
}

const REASON_LABEL_KEYS: Record<RecruitmentEligibilityReason, MessageKey> = {
  wrong_faction: 'recruitment.reason.wrongFaction',
  not_yet_available: 'recruitment.reason.notYetAvailable',
  already_recruited: 'recruitment.reason.alreadyRecruited',
  no_control: 'recruitment.reason.noControl',
  no_manpower: 'recruitment.reason.noManpower',
  no_capital: 'recruitment.reason.noCapital',
  no_equipment: 'recruitment.reason.noEquipment',
};

function getReasonLabel(brigade: RecruitmentCatalogBrigade, reason: RecruitmentEligibilityReason): string {
  return reason === 'not_yet_available'
    ? t(REASON_LABEL_KEYS[reason], { week: brigade.available_from })
    : t(REASON_LABEL_KEYS[reason]);
}

export function RecruitmentModal({
  isOpen,
  loading,
  applying,
  playerFaction,
  brigades,
  onClose,
  onRefresh,
  onApply,
}: RecruitmentModalProps) {
  const playerBrigades = useMemo(
    () => brigades.filter((b) => !playerFaction || b.faction === playerFaction),
    [brigades, playerFaction]
  );
  const eligible = useMemo(() => playerBrigades.filter((b) => b.eligible !== false), [playerBrigades]);
  const unavailable = useMemo(() => playerBrigades.filter((b) => b.eligible === false), [playerBrigades]);

  const [selectedBrigadeId, setSelectedBrigadeId] = useState('');
  const [equipmentClass, setEquipmentClass] = useState('');
  const equipmentClassLabel = getEquipmentClassLabel(equipmentClass);

  useEffect(() => {
    if (!isOpen) return;
    const first = eligible[0];
    setSelectedBrigadeId(first?.id ?? '');
    setEquipmentClass(first?.default_equipment_class ?? 'light');
  }, [isOpen, eligible]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      zIndex={Z.OVERLAY_LIGHT}
      ariaLabelledBy="recruitment-title"
      backdropClassName="bg-black/60"
      panelClassName="w-full max-w-2xl max-h-[min(760px,calc(100vh-2rem))] mx-4 bg-panel-card border border-panel-border rounded-lg shadow-xl overflow-hidden flex flex-col"
    >
      <>
        <div className="px-4 py-3 border-b border-panel-border bg-panel-bg flex items-center justify-between">
          <h2 id="recruitment-title" className="font-sans text-sm text-accent-gold uppercase tracking-wide font-semibold">
            {t('recruitment.title')}
          </h2>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading || applying}
            className="px-2 py-1 text-xs font-mono uppercase tracking-wide bg-panel-bg hover:bg-panel-hover text-text-primary border border-panel-border rounded disabled:opacity-50"
          >
            {t('recruitment.refresh')}
          </button>
        </div>
        <div className="p-4 space-y-5 overflow-y-auto">
          {loading ? (
            <div className="space-y-4">
              <div className="h-10 w-full bg-panel-card border border-panel-border rounded panel-shimmer" />
              <div className="h-10 w-full bg-panel-card border border-panel-border rounded panel-shimmer" />
            </div>
          ) : playerBrigades.length === 0 ? (
            <p className="text-xs text-text-secondary">{t('recruitment.noBrigades')}</p>
          ) : (
            <>
              <section aria-labelledby="recruitment-eligible-title" className="space-y-3">
              <h3 id="recruitment-eligible-title" className="text-xs font-semibold uppercase text-text-primary">{t('recruitment.eligibleNow')}</h3>
              {eligible.length === 0 ? <p className="text-sm text-text-secondary">{t('recruitment.noneEligible')}</p> : <>
              <label className="block text-sm text-text-secondary">
                {t('recruitment.brigade')}
                <select
                  aria-label={t('recruitment.brigadeAria')}
                  value={selectedBrigadeId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedBrigadeId(id);
                    const selected = eligible.find((b) => b.id === id);
                    setEquipmentClass(selected?.default_equipment_class ?? 'light');
                  }}
                  className="mt-1 w-full min-h-10 px-3 py-2 bg-panel-bg border border-panel-border rounded text-sm text-text-primary"
                >
                  {eligible.map((b) => (
                    <option key={b.id} value={b.id}>
                      {t('recruitment.optionLabel', {
                        name: b.name,
                        faction: getPlayerSafePoliticalFactionName(b.faction),
                        capital: b.capital_cost,
                        manpower: b.manpower_cost,
                        equipment: getEquipmentClassLabel(b.default_equipment_class),
                      })}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm text-text-secondary">
                {t('recruitment.equipmentClass')}
                <input
                  aria-label={t('recruitment.equipmentClassAria')}
                  value={equipmentClassLabel}
                  readOnly
                  className="mt-1 w-full min-h-10 px-3 py-2 bg-panel-bg border border-panel-border rounded text-sm text-text-primary"
                />
              </label>
              </>}
              </section>
              {unavailable.length > 0 && (
                <section aria-labelledby="recruitment-unavailable-title" className="space-y-2 border-t border-panel-border pt-4">
                  <h3 id="recruitment-unavailable-title" className="text-xs font-semibold uppercase text-text-primary">{t('recruitment.unavailable')}</h3>
                  <ul className="space-y-2">
                    {unavailable.map((brigade) => (
                      <li key={brigade.id} className="border border-panel-border rounded p-3 bg-panel-bg">
                        <div className="text-sm font-medium text-text-primary">{brigade.name}</div>
                        <div className="mt-1 text-xs leading-relaxed text-text-secondary">
                          {(brigade.reason_codes ?? []).map((reason) => getReasonLabel(brigade, reason)).join(' | ')}
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>
        <div className="px-4 py-3 border-t border-panel-border bg-panel-bg flex justify-end gap-2">
          <button
            type="button"
            data-testid="recruitment-close"
            onClick={onClose}
            className="min-h-10 px-3 py-2 text-sm font-sans text-text-secondary hover:text-interactive hover:bg-panel-hover rounded border border-panel-border"
          >
            {t('common.close')}
          </button>
          <button
            type="button"
            data-testid="recruitment-apply"
            disabled={loading || applying || !selectedBrigadeId || !equipmentClass.trim()}
            onClick={() => onApply(selectedBrigadeId, equipmentClass.trim())}
            className="min-h-10 px-4 py-2 text-sm font-sans bg-interactive text-neutral-950 hover:bg-panel-hover rounded border border-panel-border disabled:opacity-50"
          >
            {applying ? t('recruitment.recruiting') : t('recruitment.recruit')}
          </button>
        </div>
      </>
    </Modal>
  );
}
