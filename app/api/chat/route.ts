import { config } from '@/config';
import { localChatAnswer, chatRequestSchema, type ChatErrorCode, type ChatRequest } from '@/domain/retrieval/chat';
import { checkGlobalLimit, checkRateLimit, clientKey } from '@/server/rate-limit';
import { askProvider } from '@/server/provider';
import {
  HTTP_BAD_REQUEST,
  HTTP_FORBIDDEN,
  HTTP_OK,
  HTTP_PAYLOAD_TOO_LARGE,
  HTTP_TOO_MANY_REQUESTS,
} from '@/server/http-status';

/** The chat route always runs per request; no response is ever cached. */
export const runtime = 'nodejs';

/** Stable JSON reply with no-store and an optional retry hint. */
const reply = (payload: object, status: number, retryAfter?: number): Response => {
  const headers = new Headers({ 'content-type': 'application/json', 'cache-control': 'no-store' });
  if (retryAfter !== undefined) headers.set('retry-after', String(retryAfter));
  return new Response(JSON.stringify(payload), { status, headers });
};

/** Compares the browser Origin with the deployed host from trusted headers. */
const sameOrigin = (request: Request): boolean => {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }
  const forwarded = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const host = request.headers.get('host') ?? new URL(request.url).host;
  const deployedHost = (forwarded ?? host).trim().toLowerCase();
  return deployedHost !== '' && originHost.toLowerCase() === deployedHost;
};

/** Result of reading one bounded, parseable request body. */
type BodyResult = { ok: true; value: unknown } | { ok: false; status: number };

/** Enforces the exact byte cap after reading, then parses exactly once. */
const readBody = async (request: Request): Promise<BodyResult> => {
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > config.chat.maxBodyBytes) {
    return { ok: false, status: HTTP_PAYLOAD_TOO_LARGE };
  }
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch {
    return { ok: false, status: HTTP_BAD_REQUEST };
  }
};

/** Upstream rate limits stay retryable; every other failure becomes a local answer. */
const failureReply = (error: ChatErrorCode, request: ChatRequest): Response => {
  if (error === 'rate-limited') {
    return reply({ error }, HTTP_TOO_MANY_REQUESTS, config.rateLimit.retryAfterSeconds);
  }
  return reply(localChatAnswer(request), HTTP_OK);
};

/** Validates, rate-limits and forwards one consented question. */
export async function POST(request: Request): Promise<Response> {
  if (!sameOrigin(request)) return reply({ error: 'forbidden' }, HTTP_FORBIDDEN);
  const declaredBytes = Number(request.headers.get('content-length') ?? '');
  if (Number.isFinite(declaredBytes) && declaredBytes > config.chat.maxBodyBytes) {
    return reply({ error: 'invalid' }, HTTP_PAYLOAD_TOO_LARGE);
  }
  const limit = checkRateLimit(clientKey(request));
  if (!limit.allowed) {
    return reply({ error: 'rate_limited' }, HTTP_TOO_MANY_REQUESTS, limit.retryAfterSeconds);
  }
  const body = await readBody(request);
  if (!body.ok) return reply({ error: 'invalid' }, body.status);
  const parsed = chatRequestSchema.safeParse(body.value);
  if (!parsed.success) return reply({ error: 'invalid' }, HTTP_BAD_REQUEST);
  if (!(await checkGlobalLimit())) return reply(localChatAnswer(parsed.data), HTTP_OK);
  const outcome = await askProvider(parsed.data);
  return outcome.ok ? reply(outcome.response, HTTP_OK) : failureReply(outcome.error, parsed.data);
}
