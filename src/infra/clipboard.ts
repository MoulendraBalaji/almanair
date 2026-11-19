/** Best-effort browser clipboard copy with a boolean result for local notices. */
export const copyText = async (text: string): Promise<boolean> => {
  const clipboard = navigator.clipboard;
  if (!clipboard) return false;
  try {
    await clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};
