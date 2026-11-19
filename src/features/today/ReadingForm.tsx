'use client';

/** User-entered air reading; no network fetch and no stored history. */
import type { MessageKey } from '@/content/messages';
import { readingSchema, type Profile } from '@/domain/profile';
import type { ReactElement } from 'react';
import { useState } from 'react';
import { useApp } from '@/features/app/AppProvider';
import { severityOptions, standardOptions } from '@/features/setup/options';
import { Button } from '@/ui/Button';
import { NumberField, SelectField, type SelectOption } from '@/ui/Controls';
import { selected } from '@/ui/select';
import styles from './Today.module.css';

type Reading = NonNullable<Profile['reading']>;
type Kind = Reading['kind'];
type Severity = NonNullable<Reading['category']>;

/** Stable labels for the three accepted reading kinds. */
const kindKeys: Readonly<Record<Kind, MessageKey>> = {
  aqi: 'today.aqiLabel',
  pm25: 'today.pmLabel',
  category: 'today.categoryLabel',
};

/** Select options derived from the validated reading schema. */
const kindOptions = (t: (key: MessageKey) => string): readonly SelectOption[] =>
  readingSchema.shape.kind.options.map((kind) => ({ value: kind, label: t(kindKeys[kind]) }));

/** Saves one validated reading into the local profile. */
export const ReadingForm = (): ReactElement => {
  const { profile, t, tk, updateProfile } = useApp();
  const initial = profile.reading;
  const [kind, setKind] = useState<Kind>(initial?.kind ?? 'category');
  const [value, setValue] = useState(initial?.value ?? 0);
  const [category, setCategory] = useState<Severity>(initial?.category ?? 0);
  const [standardId, setStandardId] = useState(initial?.standardId ?? profile.preferences.standardId);
  const save = (): void => {
    const detail = kind === 'category' ? { category } : { value };
    updateProfile((current) => ({
      ...current,
      reading: { kind, standardId, recordedAt: new Date().toISOString(), ...detail },
    }));
  };
  return (
    <div className={styles.readingForm}>
      <SelectField id="reading-kind" label={t('today.readingLabel')} value={kind} options={kindOptions(t)} onChange={(next): void => { selected(readingSchema.shape.kind, next, setKind); }} />
      {kind === 'category' ? (
        <SelectField id="reading-category" label={t('today.categoryLabel')} value={String(category)} options={severityOptions(tk)} onChange={(next): void => {
          const parsed = readingSchema.shape.category.safeParse(Number(next));
          if (parsed.success && parsed.data !== undefined) setCategory(parsed.data);
        }} />
      ) : (
        <NumberField id="reading-value" label={t(kindKeys[kind])} value={value} min={0} onChange={setValue} />
      )}
      <SelectField id="reading-standard" label={t('settings.standard')} value={standardId} options={standardOptions(tk)} onChange={setStandardId} />
      <Button onClick={save}>{t('app.save')}</Button>
    </div>
  );
};
