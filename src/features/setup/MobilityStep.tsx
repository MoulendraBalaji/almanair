'use client';

/** Daily travel summary used by dose and carbon estimates. */
import { mobilitySchema, type Profile } from '@/domain/profile';
import type { ReactElement } from 'react';
import { useApp } from '@/features/app/AppProvider';
import { CheckboxField, NumberField } from '@/ui/Controls';
import { selected } from '@/ui/select';
import { modeOptions } from './options';
import styles from './Setup.module.css';

type Mode = Profile['mobility']['modes'][number];

/** Daily movement editor with no trip-level logs. */
export const MobilityStep = (): ReactElement => {
  const { profile, t, tk, updateProfile } = useApp();
  const mobility = profile.mobility;
  const setMobility = (patch: Partial<Profile['mobility']>): void => {
    updateProfile((current) => ({ ...current, mobility: { ...current.mobility, ...patch } }));
  };
  const toggleMode = (mode: Mode, checked: boolean): void => {
    const modes = checked ? [...mobility.modes, mode] : mobility.modes.filter((item) => item !== mode);
    setMobility({ modes });
  };
  return (
    <div className={styles.grid}>
      <p className={styles.why}>{t('setup.mobilityWhy')}</p>
      <p>{t('setup.modes')}</p>
      <div className={styles.row}>
        {modeOptions(tk).map((option) => (
          <CheckboxField
            key={option.value}
            id={`mode-${option.value}`}
            label={option.label}
            checked={mobility.modes.some((mode) => mode === option.value)}
            onChange={(checked): void => { selected(mobilitySchema.shape.modes.element, option.value, (mode): void => { toggleMode(mode, checked); }); }}
          />
        ))}
      </div>
      <NumberField id="school-run" label={t('setup.schoolRun')} value={mobility.schoolRunKm} min={0} onChange={(value): void => { setMobility({ schoolRunKm: value }); }} />
      <NumberField id="commute" label={t('setup.commute')} value={mobility.commuteKm} min={0} onChange={(value): void => { setMobility({ commuteKm: value }); }} />
    </div>
  );
};
