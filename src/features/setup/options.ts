/** Data-driven option lists derived from the validated profile schema. */
import { guidance, regions, standards } from '@/data';
import {
  flagSchema,
  homeSchema,
  memberSchema,
  mobilitySchema,
  profileSchema,
} from '@/domain/profile';
import type { SelectOption } from '@/ui/Controls';

/** Any catalogue translator that accepts a dot-path. */
type Translator = (key: string) => string;

/** Maps schema enum values to labelled choices. */
const choices = (values: readonly string[], keyPrefix: string, tk: Translator): readonly SelectOption[] =>
  values.map((value) => ({ value, label: tk(`${keyPrefix}.${value}`) }));

/** Named regions plus the explicit custom-coordinate choice. */
export const regionOptions = (tk: Translator): readonly SelectOption[] => [
  ...regions.map((region) => ({ value: region.id, label: tk(region.nameKey) })),
  { value: 'custom', label: tk('setup.custom') },
];

/** Validated AQI scales. */
export const standardOptions = (tk: Translator): readonly SelectOption[] =>
  standards.map((standard) => ({ value: standard.id, label: tk(standard.labelKey) }));

/** Severity labels derived from the published guidance rows. */
export const severityOptions = (tk: Translator): readonly SelectOption[] =>
  guidance.map((entry) => ({ value: String(entry.severity), label: tk(`severity.${String(entry.severity)}`) }));

/** Household age bands. */
export const ageBandOptions = (tk: Translator): readonly SelectOption[] =>
  choices(memberSchema.shape.ageBand.options, 'setup', tk);

/** Vulnerability flags, never names or diagnoses. */
export const flagOptions = (tk: Translator): readonly SelectOption[] =>
  choices(flagSchema.options, 'options', tk);

/** Home and room choices. */
export const homeTypeOptions = (tk: Translator): readonly SelectOption[] =>
  choices(homeSchema.shape.type.options, 'setup', tk);

export const windowOptions = (tk: Translator): readonly SelectOption[] =>
  choices(homeSchema.shape.windowHabit.options, 'options', tk);

export const fuelOptions = (tk: Translator): readonly SelectOption[] =>
  choices(homeSchema.shape.cookingFuel.options, 'options', tk);

export const maskOptions = (tk: Translator): readonly SelectOption[] =>
  choices(homeSchema.shape.maskClass.options, 'options', tk);

export const tenureOptions = (tk: Translator): readonly SelectOption[] =>
  choices(homeSchema.shape.tenure.options, 'setup', tk);

/** Movement and budget choices. */
export const modeOptions = (tk: Translator): readonly SelectOption[] =>
  choices(mobilitySchema.shape.modes.element.options, 'setup', tk);

export const budgetOptions = (tk: Translator): readonly SelectOption[] =>
  choices(profileSchema.shape.budgetTier.options, 'options', tk);
