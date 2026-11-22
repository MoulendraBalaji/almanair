/** The one optional network call: a validated POST to the local chat route. */
import { config } from '@/config';
import { chatResponseSchema, type ChatErrorCode, type ChatOutcome, type ChatRequest } from '@/domain/retrieval/chat';

/** Chat protocol statuses the browser needs, kept local to the client bundle. */
const TOO_MANY_REQUESTS = 429;
const SERVER_ERROR = 500;

const errorForStatus = (status: number): ChatErrorCode => {
  if (status === TOO_MANY_REQUESTS) return 'rate-limited';
  if (status >= SERVER_ERROR) return 'unavailable';
  return 'invalid';
};

/** Sends a consented question and never accepts an unvalidated response. */
export const askChat = async (request: ChatRequest): Promise<ChatOutcome> => {
  if (typeof window === 'undefined' || !window.navigator.onLine) return { ok: false, error: 'offline' };
  const body = JSON.stringify(request);
  if (new TextEncoder().encode(body).length > config.chat.maxBodyBytes) return { ok: false, error: 'invalid' };
  const controller = new AbortController();
  const timer = window.setTimeout(() => {
    controller.abort();
  }, config.chat.timeoutMs);
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!response.ok) return { ok: false, error: errorForStatus(response.status) };
    const payload: unknown = await response.json();
    const parsed = chatResponseSchema.safeParse(payload);
    return parsed.success ? { ok: true, response: parsed.data } : { ok: false, error: 'invalid' };
  } catch {
    return { ok: false, error: window.navigator.onLine ? 'unavailable' : 'offline' };
  } finally {
    window.clearTimeout(timer);
  }
};
