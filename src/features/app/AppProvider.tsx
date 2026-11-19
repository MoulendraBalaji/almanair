'use client';

/** One client boundary owns the profile, derived plan and device preferences. */
import { config } from '@/config';
import { translate, translateKey, type Locale, type MessageKey, type MessageVars } from '@/content/messages';
import { buildPlan, type Plan } from '@/domain/plan';
import { defaultProfile, type Profile } from '@/domain/profile';
import { clearProfile, loadProfile, saveProfile } from '@/infra/storage';
import { registerServiceWorker } from '@/infra/sw-register';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactElement,
  type ReactNode,
  type SetStateAction,
} from 'react';

/** Boot state; the first render is identical on the server and the client. */
export type AppStatus = 'loading' | 'ready';

/** The single value every screen consumes. */
export interface AppContextValue {
  status: AppStatus;
  profile: Profile;
  plan: Plan | null;
  locale: Locale;
  online: boolean;
  t: (key: MessageKey, vars?: MessageVars) => string;
  tk: (key: string, vars?: MessageVars) => string;
  updateProfile: (updater: (current: Profile) => Profile) => void;
  resetProfile: () => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

/** Applies user preferences as root document attributes for the token CSS. */
const applyPreferences = (profile: Profile): void => {
  const root = document.documentElement;
  root.lang = profile.locale;
  root.dataset.theme = profile.preferences.theme === 'system' ? '' : profile.preferences.theme;
  root.dataset.contrast = profile.preferences.contrast ? 'high' : 'normal';
  root.dataset.textSize = profile.preferences.textSize;
  root.dataset.motion = profile.preferences.reducedMotion ? 'reduced' : 'full';
};

/** Reads the stored profile once and registers the offline shell. */
const useBoot = (setProfile: Dispatch<SetStateAction<Profile>>, setStatus: Dispatch<SetStateAction<AppStatus>>): void => {
  useEffect(() => {
    const stored = loadProfile();
    setProfile(stored.ok ? stored.value : defaultProfile());
    setStatus('ready');
    void registerServiceWorker();
  }, [setProfile, setStatus]);
};

/** Tracks connectivity without making the plan depend on the network. */
const useOnlineStatus = (): boolean => {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const sync = (): void => {
      setOnline(navigator.onLine);
    };
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);
  return online;
};

/** Recomputes and debounces persistence whenever the profile changes. */
const useDerivedPlan = (status: AppStatus, profile: Profile): Plan | null => {
  const [plan, setPlan] = useState<Plan | null>(null);
  useEffect(() => {
    if (status !== 'ready') return undefined;
    setPlan(buildPlan(profile, new Date()));
    const timer = window.setTimeout(() => {
      saveProfile(profile);
    }, config.ui.persistenceDebounceMs);
    return () => {
      window.clearTimeout(timer);
    };
  }, [profile, status]);
  return plan;
};

/** Loads, derives, persists and shares all on-device state. */
export const AppProvider = ({ children }: Readonly<{ children: ReactNode }>): ReactElement => {
  const [status, setStatus] = useState<AppStatus>('loading');
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  useBoot(setProfile, setStatus);
  const plan = useDerivedPlan(status, profile);
  const online = useOnlineStatus();

  useEffect(() => {
    applyPreferences(profile);
  }, [profile]);

  const updateProfile = useCallback((updater: (current: Profile) => Profile): void => {
    setProfile(updater);
  }, []);

  const resetProfile = useCallback((): void => {
    clearProfile();
    setProfile(defaultProfile());
  }, []);

  const locale = profile.locale;
  const t = useCallback((key: MessageKey, vars?: MessageVars): string => translate(locale, key, vars), [locale]);
  const tk = useCallback((key: string, vars?: MessageVars): string => translateKey(locale, key, vars), [locale]);

  const value = useMemo<AppContextValue>(
    () => ({ status, profile, plan, locale, online, t, tk, updateProfile, resetProfile }),
    [status, profile, plan, locale, online, t, tk, updateProfile, resetProfile],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

/** Access the single on-device application state. */
export const useApp = (): AppContextValue => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside AppProvider');
  return context;
};
