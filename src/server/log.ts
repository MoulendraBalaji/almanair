/** Server-only warnings: message plus bounded, non-sensitive metadata. */
type LogFields = Readonly<Record<string, string | number>>;

/** Single server-owned warning call site; never pass prompts or response bodies. */
export const logWarn = (message: string, fields?: LogFields): void => {
  const args: [string, ...LogFields[]] = fields === undefined ? [message] : [message, fields];
  console.warn(...args);
};
