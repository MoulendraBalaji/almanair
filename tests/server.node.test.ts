/** Server contract, prompt grounding, provider validation and admission tests. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { config } from '@/config';
import { chatRequestSchema } from '@/domain/retrieval/chat';
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

/** Valid remote answer used by the success cases. */
const remoteAnswer = { answer: 'Open windows near noon.', sourceIds: ['epa-ventilation'], mode: 'remote' };

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
  });

  it('grounds the prompt with the question, digest and allowed citations', () => {
    const messages = buildMessages(validRequest());
    expect(messages).toHaveLength(2);
    const user = messages[1]?.content ?? '';
    expect(user).toContain('<question>');
    expect(user).toContain('epa-ventilation');
    expect(user).toContain('Delhi NCR');
  });

  it('reads a bounded client key from proxy headers', () => {
    const request = new Request('https://almanair.test/api/chat', {
      headers: { 'x-forwarded-for': '203.0.113.9, 10.0.0.1' },
    });
    expect(clientKey(request)).toBe('203.0.113.9');
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
    if (outcome.ok) expect(outcome.response.answer).toBe(remoteAnswer.answer);
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

  it('preserves an upstream provider rate limit as a retryable status', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response('', { status: config.rateLimit.statusCode }))));
    const response = await POST(new Request('https://almanair.test/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(requestPayload),
    }));
    expect(response.status).toBe(config.rateLimit.statusCode);
    expect(response.headers.get('retry-after')).toBe(String(config.rateLimit.retryAfterSeconds));
  });

  it('returns a retryable status from the route when rate limited', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(providerReply(JSON.stringify(remoteAnswer)))));
    for (let index = 0; index < config.rateLimit.perMinute; index += 1) {
      const allowed = await POST(new Request('https://almanair.test/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': '198.51.100.4' },
        body: JSON.stringify(requestPayload),
      }));
      expect(allowed.status).not.toBe(config.rateLimit.statusCode);
    }
    const blocked = await POST(new Request('https://almanair.test/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '198.51.100.4' },
      body: JSON.stringify(requestPayload),
    }));
    expect(blocked.status).toBe(config.rateLimit.statusCode);
    expect(blocked.headers.get('retry-after')).toBe(String(config.rateLimit.retryAfterSeconds));
  });
});
