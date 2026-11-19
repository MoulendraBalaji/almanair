/** On-device preferences and data portability for the Settings screen. */
import { config } from '@/config';
import type { MessageKey } from '@/content/messages';
import { localeSchema, parseProfile, preferencesSchema, type Profile } from '@/domain/profile';
import { useState } from 'react';
import { useApp } from '@/features/app/AppProvider';
import { selected } from '@/ui/select';

/** A stable user-facing status message. */
type Notice = MessageKey | null;
/** Any validated string enum accepted by the shared selector helper. */
interface EnumSchema<T extends string> {
  safeParse(value: string): { success: true; data: T } | { success: false };
}
/** One validated preferences patch. */
type PreferencePatch = Partial<Profile['preferences']>;

/** Everything the Settings screen needs to render and act. */
export interface SettingsController {
  notice: Notice;
  setLocale: (value: string) => void;
  setUnits: (value: string) => void;
  setTheme: (value: string) => void;
  setTextSize: (value: string) => void;
  setStandard: (value: string) => void;
  setDiurnal: (value: string) => void;
  setContrast: (value: boolean) => void;
  setReducedMotion: (value: boolean) => void;
  setChatConsent: (value: boolean) => void;
  exportPlan: () => void;
  importPlan: (file: File | undefined) => Promise<void>;
  deleteAll: () => void;
}

/** Merges one validated preference patch into the current profile. */
const patchPreferences = (current: Profile, patch: PreferencePatch): Profile => ({
  ...current,
  preferences: { ...current.preferences, ...patch },
});

/** Preference updates, including the locale that lives outside preferences. */
const usePreferenceChanges = (): {
  change: (patch: PreferencePatch) => void;
  choose: <T extends string>(schema: EnumSchema<T>, patch: (value: T) => PreferencePatch) => (value: string) => void;
  setLocale: (value: string) => void;
} => {
  const { updateProfile } = useApp();
  const change = (patch: PreferencePatch): void => {
    updateProfile((current) => patchPreferences(current, patch));
  };
  const choose = <T extends string>(schema: EnumSchema<T>, patch: (value: T) => PreferencePatch) =>
    (value: string): void => {
      selected(schema, value, (choice) => {
        change(patch(choice));
      });
    };
  const setLocale = (value: string): void => {
    selected(localeSchema, value, (locale) => {
      updateProfile((current) => ({ ...current, locale }));
    });
  };
  return { change, choose, setLocale };
};

/** Downloads one validated profile as a local JSON file. */
const downloadPlan = (profile: Profile): void => {
  const blob = new Blob([JSON.stringify(profile)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `almanair-plan-${String(profile.version)}.json`;
  link.click();
  URL.revokeObjectURL(url);
};

/** Reads a bounded JSON file into a validated profile, or nothing on failure. */
const readImport = async (file: File | undefined): Promise<Profile | null> => {
  if (!file || file.size > config.storage.maxBytes) return null;
  try {
    const value: unknown = JSON.parse(await file.text());
    const parsed = parseProfile(value);
    return parsed.ok ? parsed.value : null;
  } catch {
    return null;
  }
};

/** Validated export, import and deletion of the local profile. */
const usePlanData = (profile: Profile): {
  notice: Notice;
  exportPlan: () => void;
  importPlan: (file: File | undefined) => Promise<void>;
  deleteAll: () => void;
} => {
  const { t, updateProfile, resetProfile } = useApp();
  const [notice, setNotice] = useState<Notice>(null);
  const exportPlan = (): void => {
    downloadPlan(profile);
    setNotice('app.saved');
  };
  const importPlan = async (file: File | undefined): Promise<void> => {
    const imported = await readImport(file);
    if (!imported) {
      setNotice('settings.badImport');
      return;
    }
    updateProfile(() => imported);
    setNotice('settings.imported');
  };
  const deleteAll = (): void => {
    if (!window.confirm(t('settings.deleteConfirm'))) return;
    resetProfile();
    setNotice('app.saved');
  };
  return { notice, exportPlan, importPlan, deleteAll };
};

/** Composes preference and data controllers for the Settings screen. */
export const useSettings = (): SettingsController => {
  const { profile } = useApp();
  const { change, choose, setLocale } = usePreferenceChanges();
  const { notice, exportPlan, importPlan, deleteAll } = usePlanData(profile);
  return {
    notice,
    setLocale,
    setUnits: choose(preferencesSchema.shape.units, (units) => ({ units })),
    setTheme: choose(preferencesSchema.shape.theme, (theme) => ({ theme })),
    setTextSize: choose(preferencesSchema.shape.textSize, (textSize) => ({ textSize })),
    setStandard: (value): void => { change({ standardId: value }); },
    setDiurnal: (value): void => { change({ diurnalProfileId: value }); },
    setContrast: (contrast): void => { change({ contrast }); },
    setReducedMotion: (reducedMotion): void => { change({ reducedMotion }); },
    setChatConsent: (chatConsent): void => { change({ chatConsent }); },
    exportPlan,
    importPlan,
    deleteAll,
  };
};
