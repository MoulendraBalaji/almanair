import type { ReactElement } from 'react';
import { Field } from './Field';
import styles from './Controls.module.css';

/** One labelled choice for a native select. */
export interface SelectOption {
  value: string;
  label: string;
}

/** Native select bound to a typed string value. */
export const SelectField = ({
  id,
  label,
  value,
  options,
  onChange,
}: Readonly<{
  id: string;
  label: string;
  value: string;
  options: readonly SelectOption[];
  onChange: (value: string) => void;
}>): ReactElement => (
  <Field id={id} label={label}>
    <select
      id={id}
      value={value}
      onChange={(event): void => {
        onChange(event.target.value);
      }}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </Field>
);

/** Native numeric input with an optional named lower bound. */
export const NumberField = ({
  id,
  label,
  value,
  min,
  onChange,
}: Readonly<{
  id: string;
  label: string;
  value: number;
  min?: number;
  onChange: (value: number) => void;
}>): ReactElement => (
  <Field id={id} label={label}>
    <input
      id={id}
      type="number"
      inputMode="decimal"
      min={min}
      step="any"
      value={value}
      onChange={(event): void => {
        onChange(Number(event.target.value));
      }}
    />
  </Field>
);

/** Native text input for short non-numeric values. */
export const TextField = ({
  id,
  label,
  value,
  onChange,
}: Readonly<{ id: string; label: string; value: string; onChange: (value: string) => void }>): ReactElement => (
  <Field id={id} label={label}>
    <input
      id={id}
      type="text"
      value={value}
      onChange={(event): void => {
        onChange(event.target.value);
      }}
    />
  </Field>
);

/** Native checkbox with a translated label. */
export const CheckboxField = ({
  id,
  label,
  checked,
  onChange,
}: Readonly<{ id: string; label: string; checked: boolean; onChange: (checked: boolean) => void }>): ReactElement => (
  <div className={styles.check}>
    <input
      id={id}
      type="checkbox"
      checked={checked}
      onChange={(event): void => {
        onChange(event.target.checked);
      }}
    />
    <label htmlFor={id}>{label}</label>
  </div>
);
