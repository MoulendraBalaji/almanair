'use client';

/** Budget and time preferences used to rank free options first. */
import { profileSchema } from '@/domain/profile';
import type { ReactElement } from 'react';
import { useApp } from '@/features/app/AppProvider';
import { NumberField, SelectField } from '@/ui/Controls';
import { budgetOptions } from './options';
import styles from './Setup.module.css';

/** Final setup step. */
export const BudgetStep = (): ReactElement => {
  const { profile, t, tk, updateProfile } = useApp();
  return (
    <div className={styles.grid}>
      <p className={styles.why}>{t('setup.budgetWhy')}</p>
      <SelectField
        id="budget-tier"
        label={t('setup.budget')}
        value={profile.budgetTier}
        options={budgetOptions(tk)}
        onChange={(value): void => {
          const parsed = profileSchema.shape.budgetTier.safeParse(value);
          if (parsed.success) updateProfile((current) => ({ ...current, budgetTier: parsed.data }));
        }}
      />
      <NumberField
        id="minutes-per-day"
        label={`${t('setup.time')} ${t('setup.minutes')}`}
        value={profile.minutesPerDay}
        min={0}
        onChange={(value): void => { updateProfile((current) => ({ ...current, minutesPerDay: value })); }}
      />
      <p className={styles.note}>{t('setup.complete')}</p>
    </div>
  );
};
