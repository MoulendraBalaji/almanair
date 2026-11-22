/** Typed access to the generated trilingual message catalogue. */
import generated from './generated/messages.json';

/** Locales shipped with the app. */
export const locales = ['en', 'es', 'hi'] as const;
/** A supported locale code. */
export type Locale = (typeof locales)[number];
/** Every dot-path used by the UI, derived from the English catalogue. */
export type MessageKey = keyof (typeof generated)['en'];
/** Values interpolated into a message template. */
export type MessageVars = Readonly<Record<string, string | number>>;

type Catalogue = Readonly<Record<string, string>>;

const catalogues: Readonly<Record<string, Catalogue>> = generated;

const interpolate = (template: string, vars?: MessageVars): string => {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_full, name: string) => String(vars[name] ?? ''));
};

/** Looks up a message with a deterministic fallback to English. */
export const translate = (locale: Locale, key: MessageKey, vars?: MessageVars): string =>
  interpolate(catalogues[locale]?.[key] ?? catalogues.en?.[key] ?? key, vars);

/** Looks up a data-driven key that cannot be narrowed to MessageKey at compile time. */
export const translateKey = (locale: Locale, key: string, vars?: MessageVars): string =>
  interpolate(catalogues[locale]?.[key] ?? catalogues.en?.[key] ?? key, vars);

/** Type guard for a locale code read from storage. */
export const isLocale = (value: string): value is Locale => locales.some((locale) => locale === value);
