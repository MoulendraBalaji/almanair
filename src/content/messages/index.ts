import generated from '@/data/generated/messages.json';

/** Locales shipped with the app. */
export const locales = ['en', 'es'] as const;
/** A supported locale code. */
export type Locale = (typeof locales)[number];
/** Every dot-path used by the UI, derived from the English catalogue. */
export type MessageKey = keyof (typeof generated)['en'];
/** Values interpolated into a message template. */
export type MessageVars = Readonly<Record<string, string | number>>;

/** Looks up a message with a deterministic fallback to English. */
export const translate = (locale: Locale, key: MessageKey, vars?: MessageVars): string => {
  const template = generated[locale][key] ?? generated.en[key] ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_full, name: string) => String(vars[name] ?? ''));
};

/** Type guard for a locale code read from storage. */
export const isLocale = (value: string): value is Locale => locales.some((locale) => locale === value);
