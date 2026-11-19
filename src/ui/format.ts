/** Shared number formatting so every screen reads the same values. */
import { config } from '@/config';
import type { Locale, MessageVars } from '@/content/messages';

/** Formats a measurement with the configured precision. */
export const formatNumber = (locale: Locale, value: number): string =>
  new Intl.NumberFormat(locale, { maximumFractionDigits: config.math.decimals }).format(value);

/** Named inputs for one unit template. */
export interface UnitFormatInput {
  locale: Locale;
  translate: (key: string, vars?: MessageVars) => string;
  key: string;
  value: number;
}

/** Formats a unit template with a locale-aware value. */
export const formatUnit = ({ locale, translate, key, value }: UnitFormatInput): string =>
  translate(key, { value: formatNumber(locale, value) });
