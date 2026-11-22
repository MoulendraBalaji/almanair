/** Server contract, prompt grounding, provider validation and admission tests. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { config } from '@/config';
import { chatRequestSchema, chatResponseSchema } from '@/domain/retrieval/chat';
import { buildMessages } from '@/server/prompt';
import { askProvider } from '@/server/provider';
import { checkRateLimit, clientKey, resetRateLimit } from '@/server/rate-limit';
import { POST } from '@app/api/chat/route';

/** One valid request reused across the server tests. */
const requestPayload = {
  question: 'When should we open the windows?',
  digest: 'Reading: Good. Region: Delhi NCR. No coordinates are included.',
  locale: 'en',
  sourceIds: ['epa-ventilation'],
};

/** Parses the shared request contract once. */
const validRequest = (): ReturnType<typeof chatRequestSchema.parse> => chatRequestSchema.parse(requestPayload);

/** Sets a complete provider environment. */
const setProviderEnv = (): void => {
  process.env.LLM_BASE_URL = 'https://llm.example/v1/';
  process.env.LLM_API_KEY = 'test-key';
  process.env.LLM_MODEL = 'test-model';
};

/** Builds a provider response with the given JSON content. */
const providerReply = (content: string): Response =>
  new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });

/** Legacy model answer without `source`; the server must stamp it as `model`. */
const remoteAnswer = { answer: 'Open windows near noon.', sourceIds: ['epa-ventilation'], mode: 'remote' };

/** Builds a same-origin POST, with optional header or body overrides. */
const chatRequest = (options: { headers?: Record<string, string>; body?: string } = {}): Request =>
  new Request('https://almanair.test/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://almanair.test', ...options.headers },
    body: options.body ?? JSON.stringify(requestPayload),
  });

/** Parses a route answer with the same schema the browser uses. */
const parseAnswer = async (response: Response): Promise<ReturnType<typeof chatResponseSchema.parse>> =>
  chatResponseSchema.parse(await response.json());

describe('server chat contract', () => {
  beforeEach(() => {
    resetRateLimit();
    setProviderEnv();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.LLM_BASE_URL;
    delete process.env.LLM_API_KEY;
    delete process.env.LLM_MODEL;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it('grounds the prompt with the question, digest and allowed citations', () => {
    const messages = buildMessages(validRequest());
    expect(messages).toHaveLength(2);
    const user = messages[1]?.content ?? '';
    expect(user).toContain('<question>');
    expect(user).toContain('epa-ventilation');
    expect(user).toContain('Delhi NCR');
  });

  it('reads a bounded client key only from trusted proxy headers', () => {
    const trusted = new Request('https://almanair.test/api/chat', {
      headers: {
        'x-forwarded-for': '203.0.113.9',
        'x-vercel-forwarded-for': '198.51.100.7, 10.0.0.1',
      },
    });
    expect(clientKey(trusted)).toBe('198.51.100.7');
    const spoofed = new Request('https://almanair.test/api/chat', { headers: { 'x-forwarded-for': '203.0.113.9' } });
    expect(clientKey(spoofed)).toBe('local');
    const realIp = new Request('https://almanair.test/api/chat', { headers: { 'x-real-ip': '192.0.2.5' } });
    expect(clientKey(realIp)).toBe('192.0.2.5');
  });

  it('blocks requests after the per-minute allowance and resets in a new window', () => {
    for (let index = 0; index < config.rateLimit.perMinute; index += 1) {
      expect(checkRateLimit('client', 0).allowed).toBe(true);
    }
    const blocked = checkRateLimit('client', 0);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(config.rateLimit.retryAfterSeconds);
    expect(checkRateLimit('client', config.rateLimit.windowMs).allowed).toBe(true);
  });

  it('validates a remote answer before returning it', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(providerReply(JSON.stringify(remoteAnswer)))));
    const outcome = await askProvider(validRequest());
    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.response.answer).toBe(remoteAnswer.answer);
      expect(outcome.response.source).toBe('model');
    }
  });

  it('always stamps provider answers as model-sourced', async () => {
    const claimedLocal = { ...remoteAnswer, source: 'local' };
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(providerReply(JSON.stringify(claimedLocal)))));
    const outcome = await askProvider(validRequest());
    expect(outcome.ok).toBe(true);
    if (outcome.ok) expect(outcome.response.source).toBe('model');
  });

  it('rejects malformed provider JSON', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(providerReply('{}'))));
    await expect(askProvider(validRequest())).resolves.toEqual({ ok: false, error: 'invalid' });
  });

  it('rejects answers with invented or missing citations', async () => {
    const invented = { ...remoteAnswer, sourceIds: ['not-in-the-plan'] };
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(providerReply(JSON.stringify(invented)))));
    await expect(askProvider(validRequest())).resolves.toEqual({ ok: false, error: 'invalid' });

    const uncited = { ...remoteAnswer, sourceIds: [] };
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(providerReply(JSON.stringify(uncited)))));
    await expect(askProvider(validRequest())).resolves.toEqual({ ok: false, error: 'invalid' });
  });

  it('fails closed when the provider is not configured', async () => {
    delete process.env.LLM_API_KEY;
    await expect(askProvider(validRequest())).resolves.toEqual({ ok: false, error: 'unavailable' });
  });

  it('rejects a cross-origin POST before doing any work', async () => {
    const fetchSpy = vi.fn(() => Promise.reject(new Error('provider must not be called')));
    vi.stubGlobal('fetch', fetchSpy);
    const response = await POST(chatRequest({ headers: { origin: 'https://evil.example' } }));
    expect(response.status).toBe(config.chat.forbiddenStatus);
    expect(await response.json()).toEqual({ error: 'forbidden' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('accepts the deployed host carried by x-forwarded-host', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(providerReply(JSON.stringify(remoteAnswer)))));
    const response = await POST(chatRequest({
      headers: { origin: 'https://deployed.example', 'x-forwarded-host': 'deployed.example' },
    }));
    expect(response.status).toBe(200);
    expect((await parseAnswer(response)).source).toBe('model');
  });

  it('rejects an oversized content-length before reading the body', async () => {
    const fetchSpy = vi.fn(() => Promise.reject(new Error('provider must not be called')));
    vi.stubGlobal('fetch', fetchSpy);
    const response = await POST(chatRequest({
      headers: { 'content-length': String(config.chat.maxBodyBytes + 1) },
    }));
    expect(response.status).toBe(config.chat.payloadTooLargeStatus);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('re-checks the exact byte length after reading the body', async () => {
    const body = JSON.stringify({ ...requestPayload, digest: 'x'.repeat(config.chat.maxBodyBytes) });
    const response = await POST(chatRequest({ body, headers: { 'content-length': '1' } }));
    expect(response.status).toBe(config.chat.payloadTooLargeStatus);
  });

  it('returns a model-sourced answer after a successful provider call', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(providerReply(JSON.stringify(remoteAnswer)))));
    const response = await POST(chatRequest());
    const answer = await parseAnswer(response);
    expect(response.status).toBe(200);
    expect(answer.source).toBe('model');
    expect(answer.answer).toBe(remoteAnswer.answer);
  });

  it('preserves an upstream provider rate limit as a retryable status', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response('', { status: config.rateLimit.statusCode }))));
    const response = await POST(chatRequest());
    expect(response.status).toBe(config.rateLimit.statusCode);
    expect(response.headers.get('retry-after')).toBe(String(config.rateLimit.retryAfterSeconds));
  });

  it('returns a retryable status from the route when rate limited', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(providerReply(JSON.stringify(remoteAnswer)))));
    const headers = { 'x-vercel-forwarded-for': '198.51.100.4' };
    for (let index = 0; index < config.rateLimit.perMinute; index += 1) {
      const allowed = await POST(chatRequest({ headers }));
      expect(allowed.status).not.toBe(config.rateLimit.statusCode);
    }
    const blocked = await POST(chatRequest({ headers }));
    expect(blocked.status).toBe(config.rateLimit.statusCode);
    expect(blocked.headers.get('retry-after')).toBe(String(config.rateLimit.retryAfterSeconds));
  });
});
