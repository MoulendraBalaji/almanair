'use client';

/** Collects anonymous household counts and vulnerability flags. */
import { flagSchema, memberSchema, type Member } from '@/domain/profile';
import type { ReactElement } from 'react';
import { useApp } from '@/features/app/AppProvider';
import { Button } from '@/ui/Button';
import { CheckboxField, SelectField } from '@/ui/Controls';
import { ageBandOptions, flagOptions } from './options';
import { selected } from '@/ui/select';
import styles from './Setup.module.css';

/** One anonymous household member editor. */
const MemberEditor = ({
  member,
  onUpdate,
  onToggleFlag,
  onRemove,
}: Readonly<{
  member: Member;
  onUpdate: (id: string, patch: Partial<Member>) => void;
  onToggleFlag: (member: Member, flag: Member['flags'][number], checked: boolean) => void;
  onRemove: (id: string) => void;
}>): ReactElement => {
  const { t, tk } = useApp();
  return (
    <li className={styles.item}>
      <SelectField
        id={`age-${member.id}`}
        label={t('setup.ageBand')}
        value={member.ageBand}
        options={ageBandOptions(tk)}
        onChange={(value): void => { selected(memberSchema.shape.ageBand, value, (ageBand): void => { onUpdate(member.id, { ageBand }); }); }}
      />
      <div className={styles.row}>
        {flagOptions(tk).map((option) => (
          <CheckboxField
            key={option.value}
            id={`flag-${member.id}-${option.value}`}
            label={option.label}
            checked={member.flags.some((flag) => flag === option.value)}
            onChange={(checked): void => { selected(flagSchema, option.value, (flag): void => { onToggleFlag(member, flag, checked); }); }}
          />
        ))}
      </div>
      <Button variant="quiet" onClick={(): void => { onRemove(member.id); }}>
        {t('setup.removeMember')}
      </Button>
    </li>
  );
};

/** Member list with its explanatory note and add action. */
const MemberList = ({
  members,
  onUpdate,
  onToggleFlag,
  onRemove,
  onAdd,
}: Readonly<{
  members: readonly Member[];
  onUpdate: (id: string, patch: Partial<Member>) => void;
  onToggleFlag: (member: Member, flag: Member['flags'][number], checked: boolean) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
}>): ReactElement => {
  const { t } = useApp();
  return (
    <>
      <p className={styles.why}>{t('setup.householdWhy')}</p>
      <ul className={styles.list}>
        {members.map((member) => (
          <MemberEditor key={member.id} member={member} onUpdate={onUpdate} onToggleFlag={onToggleFlag} onRemove={onRemove} />
        ))}
      </ul>
      <p className={styles.note}>{t('setup.memberHelp')}</p>
      <Button variant="secondary" onClick={onAdd}>
        {t('setup.addMember')}
      </Button>
    </>
  );
};

/** Household editor with no personal names or diagnoses. */
export const HouseholdStep = (): ReactElement => {
  const { profile, updateProfile } = useApp();
  const addMember = (): void => {
    updateProfile((current) => ({
      ...current,
      household: [...current.household, { id: `member-${String(current.household.length + 1)}`, ageBand: 'adult', flags: [] }],
    }));
  };
  const updateMember = (id: string, patch: Partial<Member>): void => {
    updateProfile((current) => ({
      ...current,
      household: current.household.map((member) => (member.id === id ? { ...member, ...patch } : member)),
    }));
  };
  const toggleFlag = (member: Member, flag: Member['flags'][number], checked: boolean): void => {
    const flags = checked ? [...member.flags, flag] : member.flags.filter((item) => item !== flag);
    updateMember(member.id, { flags });
  };
  const removeMember = (id: string): void => {
    updateProfile((current) =>
      current.household.length > 1
        ? { ...current, household: current.household.filter((member) => member.id !== id) }
        : current,
    );
  };
  return (
    <MemberList
      members={profile.household}
      onUpdate={updateMember}
      onToggleFlag={toggleFlag}
      onRemove={removeMember}
      onAdd={addMember}
    />
  );
};
