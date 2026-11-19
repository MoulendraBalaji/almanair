/** Applies a validated enum choice without casting the parsed value. */
export const selected = <T extends string>(
  schema: { safeParse(value: string): { success: true; data: T } | { success: false } },
  value: string,
  apply: (choice: T) => void,
): void => {
  const parsed = schema.safeParse(value);
  if (parsed.success) apply(parsed.data);
};
