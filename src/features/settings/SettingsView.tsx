'use client';

/** Local preferences, data portability and a clear statement of privacy. */
import { diurnalProfiles } from '@/data';
import { localeSchema, preferencesSchema } from '@/domain/profile';
import type { ReactElement } from 'react';
import { useRef } from 'react';
import { useApp } from '@/features/app/AppProvider';
import { standardOptions } from '@/features/setup/options';
import { Button } from '@/ui/Button';
import { CheckboxField, SelectField, type SelectOption } from '@/ui/Controls';
import { Panel } from '@/ui/Panel';
import { useSettings, type SettingsController } from './useSettings';
import styles from './Settings.module.css';

/** Any catalogue translator that accepts a dot-path. */
type Translator = (key: string) => string;

/** Maps a validated enum to labelled select options. */
const choices = (values: readonly string[], prefix: string, tk: Translator): readonly SelectOption[] =>
  values.map((value) => ({ value, label: tk(`${prefix}.${value}`) }));

/** Daily shape labels come from the validated catalogue. */
const diurnalOptions = (tk: Translator): readonly SelectOption[] =>
  diurnalProfiles.map((profile) => ({ value: profile.id, label: tk(profile.labelKey) }));

/** Named display and portability choices. */
const PreferenceSelects = ({ controller }: Readonly<{ controller: SettingsController }>): ReactElement => {
  const { profile, tk, t } = useApp();
  const { preferences } = profile;
  return (
    <div className={styles.grid}>
      <SelectField id="settings-locale" label={t('settings.language')} value={profile.locale} options={choices(localeSchema.options, 'options', tk)} onChange={controller.setLocale} />
      <SelectField id="settings-units" label={t('settings.units')} value={preferences.units} options={choices(preferencesSchema.shape.units.options, 'options', tk)} onChange={controller.setUnits} />
      <SelectField id="settings-standard" label={t('settings.standard')} value={preferences.standardId} options={standardOptions(tk)} onChange={controller.setStandard} />
      <SelectField id="settings-diurnal" label={t('settings.diurnal')} value={preferences.diurnalProfileId} options={diurnalOptions(tk)} onChange={controller.setDiurnal} />
      <SelectField id="settings-theme" label={t('settings.theme')} value={preferences.theme} options={choices(preferencesSchema.shape.theme.options, 'options', tk)} onChange={controller.setTheme} />
      <SelectField id="settings-text-size" label={t('settings.textSize')} value={preferences.textSize} options={choices(preferencesSchema.shape.textSize.options, 'options', tk)} onChange={controller.setTextSize} />
    </div>
  );
};

/** Boolean display and consent choices. */
const PreferenceChecks = ({ controller }: Readonly<{ controller: SettingsController }>): ReactElement => {
  const { preferences } = useApp().profile;
  const { t } = useApp();
  return (
    <div className={styles.checks}>
      <CheckboxField id="settings-contrast" label={t('settings.contrast')} checked={preferences.contrast} onChange={controller.setContrast} />
      <CheckboxField id="settings-motion" label={t('settings.motion')} checked={preferences.reducedMotion} onChange={controller.setReducedMotion} />
      <CheckboxField id="settings-chat" label={t('settings.chatConsent')} checked={preferences.chatConsent} onChange={controller.setChatConsent} />
    </div>
  );
};

/** File controls stay on the device; imports are validated before use. */
const DataControls = ({ controller }: Readonly<{ controller: SettingsController }>): ReactElement => {
  const { t } = useApp();
  const input = useRef<HTMLInputElement>(null);
  return (
    <Panel title={t('settings.data')}>
      <div className={styles.buttons}>
        <Button onClick={controller.exportPlan}>{t('settings.export')}</Button>
        <Button variant="secondary" onClick={(): void => { input.current?.click(); }}>{t('settings.import')}</Button>
        <input
          ref={input}
          className={styles.hidden}
          type="file"
          aria-label={t('settings.import')}
          accept="application/json"
          onChange={(event): void => {
            void controller.importPlan(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
        <Button variant="quiet" onClick={controller.deleteAll}>{t('settings.delete')}</Button>
      </div>
    </Panel>
  );
};

/** Composes preferences, data controls, privacy copy and status feedback. */
export const SettingsView = (): ReactElement => {
  const controller = useSettings();
  const { t } = useApp();
  return (
    <div className={styles.view}>
      <p className={styles.dateline}>{t('settings.dateline')}</p>
      <Panel title={t('settings.title')}>
        <PreferenceSelects controller={controller} />
        <PreferenceChecks controller={controller} />
      </Panel>
      <DataControls controller={controller} />
      <Panel title={t('settings.privacy')}><p>{t('settings.privacyBody')}</p></Panel>
      <p className={styles.notice} aria-live="polite">{controller.notice ? t(controller.notice) : ''}</p>
    </div>
  );
};
