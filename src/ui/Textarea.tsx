import type { ReactElement } from 'react';
import { Field } from './Field';
import styles from './Textarea.module.css';

/** Native multi-line input for short questions. */
export const Textarea = ({
  id,
  label,
  value,
  placeholder,
  maxLength,
  onChange,
}: Readonly<{
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  maxLength?: number;
  onChange: (value: string) => void;
}>): ReactElement => (
  <Field id={id} label={label}>
    <textarea
      className={styles.textarea}
      id={id}
      value={value}
      placeholder={placeholder}
      maxLength={maxLength}
      onChange={(event): void => {
        onChange(event.target.value);
      }}
    />
  </Field>
);
