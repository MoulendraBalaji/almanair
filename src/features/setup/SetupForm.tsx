'use client';

/** Five-step autosaving interview; all state lives in the client provider. */
import type { ComponentType, ReactElement } from 'react';
import { useApp } from '@/features/app/AppProvider';
import { Button, LinkButton } from '@/ui/Button';
import { Panel } from '@/ui/Panel';
import { BudgetStep } from './BudgetStep';
import { HouseholdStep } from './HouseholdStep';
import { HomeStep } from './HomeStep';
import { MobilityStep } from './MobilityStep';
import { RegionStep } from './RegionStep';
import styles from './Setup.module.css';

/** Ordered steps are named, not indexed magic numbers. */
const steps: readonly ComponentType[] = [RegionStep, HouseholdStep, HomeStep, MobilityStep, BudgetStep];

/** Progress, one step at a time, with explicit back and finish controls. */
export const SetupForm = (): ReactElement => {
  const { profile, t, updateProfile, resetProfile } = useApp();
  const step = Math.max(0, Math.min(profile.step, steps.length - 1));
  const Step = steps[step] ?? RegionStep;
  const go = (next: number): void => {
    updateProfile((current) => ({ ...current, step: Math.max(0, Math.min(next, steps.length)) }));
  };
  return (
    <Panel title={t('setup.title')}>
      <p>{t('setup.subtitle')}</p>
      {profile.step > 0 ? <p className={styles.note}>{t('setup.resume')}</p> : null}
      <div className={styles.row}>
        <span>{t('setup.step')}</span>
        <span>{step + 1}</span>
        <span>{t('setup.of')}</span>
        <span>{steps.length}</span>
      </div>
      <Step />
      <div className={styles.actions}>
        <Button variant="quiet" onClick={resetProfile}>
          {t('setup.startOver')}
        </Button>
        <div className={styles.buttons}>
          {step > 0 ? (
            <Button variant="secondary" onClick={(): void => { go(step - 1); }}>
              {t('setup.back')}
            </Button>
          ) : null}
          {step < steps.length - 1 ? (
            <Button onClick={(): void => { go(step + 1); }}>{t('setup.next')}</Button>
          ) : (
            <LinkButton href="/today">{t('setup.finish')}</LinkButton>
          )}
        </div>
      </div>
    </Panel>
  );
};
