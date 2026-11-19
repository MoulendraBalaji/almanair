import { config } from '@/config';
import { chatRequestSchema } from '@/domain/retrieval/chat';
import { checkRateLimit, clientKey } from '@/server/rate-limit';
import { askProvider } from '@/server/provider';

/** The chat route always runs per request; no response is ever cached. */
export const runtime = 'nodejs';

/** Stable JSON reply with no-store and an optional retry hint. */
const reply = (payload: object, status: number, retryAfter?: number): Response => {
  const headers = new Headers({ 'content-type': 'application/json', 'cache-control': 'no-store' });
  if (retryAfter !== undefined) headers.set('retry-after', String(retryAfter));
  return new Response(JSON.stringify(payload), { status, headers });
};

/** Validates, rate-limits and forwards one consented question. */
export async function POST(request: Request): Promise<Response> {
  const limit = checkRateLimit(clientKey(request));
  if (!limit.allowed) {
    return reply({ error: 'rate_limited' }, config.rateLimit.statusCode, limit.retryAfterSeconds);
  }
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > config.chat.maxBodyBytes) {
    return reply({ error: 'invalid' }, config.chat.payloadTooLargeStatus);
  }
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return reply({ error: 'invalid' }, config.chat.badRequestStatus);
  }
  const parsed = chatRequestSchema.safeParse(payload);
  if (!parsed.success) return reply({ error: 'invalid' }, config.chat.badRequestStatus);
  const outcome = await askProvider(parsed.data);
  if (!outcome.ok) {
    const status = outcome.error === 'rate-limited' ? config.rateLimit.statusCode : config.chat.serverErrorStatus;
    const retryAfter = outcome.error === 'rate-limited' ? config.rateLimit.retryAfterSeconds : undefined;
    return reply({ error: outcome.error }, status, retryAfter);
  }
  return reply(outcome.response, 200);
}
