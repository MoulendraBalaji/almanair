/** Registers the hand-written offline shell only when the browser supports it. */
export const registerServiceWorker = async (): Promise<boolean> => {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return false;
  try {
    await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    return true;
  } catch {
    return false;
  }
};
