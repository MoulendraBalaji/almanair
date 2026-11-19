'use client';

/** Community playbooks, local pledges, scaling and a clean-air-room planner. */
import { communityTypeSchema, type CleanAirRoom, type PlaybookStep } from '@/domain/community';
import type { ReactElement } from 'react';
import { useApp } from '@/features/app/AppProvider';
import { Button } from '@/ui/Button';
import { NumberField, SelectField } from '@/ui/Controls';
import { formatNumber, formatUnit } from '@/ui/format';
import { Panel } from '@/ui/Panel';
import { SourceList } from '@/ui/SourceList';
import { useCommunity } from './useCommunity';
import styles from './Community.module.css';

/** Validated type options with catalogue labels. */
const typeOptions = communityTypeSchema.options.map((value) => ({ value }));

/** Community selection and household count. */
const TypeControls = ({ type, households, chooseType, setHouseholds }: Readonly<{
  type: string;
  households: number;
  chooseType: (value: string) => void;
  setHouseholds: (value: number) => void;
}>): ReactElement => {
  const { t, tk } = useApp();
  const options = typeOptions.map((option) => ({ ...option, label: tk(`community.${option.value}`) }));
  return (
    <Panel title={t('community.type')}>
      <div className={styles.controls}>
        <SelectField id="community-type" label={t('community.type')} value={type} options={options} onChange={chooseType} />
        <NumberField id="community-households" label={t('community.headcount')} value={households} min={0} onChange={setHouseholds} />
      </div>
    </Panel>
  );
};

/** Generated checklist with locally counted pledges. */
const Playbook = ({ steps, pledges, addPledge }: Readonly<{
  steps: readonly PlaybookStep[];
  pledges: number;
  addPledge: () => void;
}>): ReactElement => {
  const { locale, t, tk } = useApp();
  const pledgeLabel = `${t('community.pledge')}: ${formatNumber(locale, pledges)}`;
  if (steps.length === 0) return <Panel><p>{t('community.empty')}</p></Panel>;
  return (
    <Panel title={t('community.owners')}>
      <ol className={styles.steps}>
        {steps.map((step) => (
          <li key={step.taskKey}>
            <strong>{tk(step.ownerKey)}</strong>
            <span>{tk(step.taskKey)}</span>
            <span>{tk(`app.${step.effort}`)}</span>
          </li>
        ))}
      </ol>
      <p className={styles.pledge}>{pledgeLabel}</p>
      <Button onClick={addPledge}>{t('community.pledgeAdd')}</Button>
    </Panel>
  );
};

/** Combined estimate that is explicitly labelled as an estimate by the copy. */
const Scale = ({ scaled }: Readonly<{ scaled: number }>): ReactElement => {
  const { locale, t } = useApp();
  return <Panel><p className={styles.scale}>{t('community.scaled', { value: formatNumber(locale, scaled) })}</p></Panel>;
};

/** Clean-air room sizing from the selected room and purifier. */
const CleanRoom = ({ room }: Readonly<{ room: CleanAirRoom }>): ReactElement => {
  const { locale, t, tk } = useApp();
  return (
    <Panel title={t('community.cleanRoom')}>
      <p>{formatUnit({ locale, translate: tk, key: 'units.cubicMetresPerHour', value: room.requiredCadr })}</p>
      <p>{formatUnit({ locale, translate: tk, key: 'units.airChangesPerHour', value: room.targetAch })}</p>
      <p>{t('home.unitsNeeded', { value: formatNumber(locale, room.purifiers) })}</p>
    </Panel>
  );
};

/** Clipboard and print actions; all generated text stays on the device. */
const ShareActions = ({ copyLetter, copyShare, printPoster }: Readonly<{
  copyLetter: () => void;
  copyShare: () => void;
  printPoster: () => void;
}>): ReactElement => {
  const { t } = useApp();
  return (
    <Panel title={t('community.letter')}>
      <div className={styles.buttons}>
        <Button onClick={copyLetter}>{t('community.letterCopy')}</Button>
        <Button variant="secondary" onClick={copyShare}>{t('community.share')}</Button>
        <Button variant="quiet" onClick={printPoster}>{t('community.poster')}</Button>
      </div>
    </Panel>
  );
};

/** Composes the playbook, scaling, room plan and local sharing controls. */
export const CommunityView = (): ReactElement => {
  const { plan, profile, t } = useApp();
  const controller = useCommunity(profile, plan);
  if (!plan) return <p>{t('app.empty')}</p>;
  const { type, households, pledges, steps, scaled, room, source, noticeKey } = controller;
  return (
    <div className={styles.view}>
      <p className={styles.dateline}>{t('community.dateline')}</p>
      <TypeControls type={type} households={households} chooseType={controller.chooseType} setHouseholds={controller.setHouseholds} />
      <Playbook steps={steps} pledges={pledges} addPledge={controller.addPledge} />
      <Scale scaled={scaled} />
      <CleanRoom room={room} />
      <ShareActions copyLetter={controller.copyLetter} copyShare={controller.copyShare} printPoster={controller.printPoster} />
      <p className={styles.notice} aria-live="polite">{noticeKey ? t(noticeKey) : ''}</p>
      <Panel><SourceList sources={source ? [source] : []} title={t('app.source')} /></Panel>
    </div>
  );
};
