/** Global cap, provider fallback and local-answer contract tests for the chat route. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { config } from '@/config';
import { chatResponseSchema } from '@/domain/retrieval/chat';
import { checkGlobalLimit, resetGlobalLimit, resetRateLimit, setGlobalLimitStore } from '@/server/rate-limit';
import { POST } from '@app/api/chat/route';

/** One valid request reused across the route tests. */
const requestPayload = {
  question: 'When should we open the windows?',
  digest: 'Reading: Good. Region: Delhi NCR. No coordinates are included.',
  locale: 'en',
  sourceIds: ['epa-ventilation'],
};

/** Sets a complete provider environment. */
const setProviderEnv = (): void => {
  process.env.LLM_BASE_URL = 'https://llm.example/v1/';
  process.env.LLM_API_KEY = 'test-key';
  process.env.LLM_MODEL = 'test-model';
};

/** Legacy model answer; the provider layer stamps `source: 'model'`. */
const remoteAnswer = { answer: 'Open windows near noon.', sourceIds: ['epa-ventilation'], mode: 'remote' };

/** Builds a same-origin POST with optional header overrides. */
const chatRequest = (headers: Record<string, string> = {}): Request =>
  new Request('https://almanair.test/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://almanair.test', ...headers },
    body: JSON.stringify(requestPayload),
  });

/** Parses a route answer with the same schema the browser uses. */
const parseAnswer = async (response: Response): Promise<ReturnType<typeof chatResponseSchema.parse>> =>
  chatResponseSchema.parse(await response.json());

/** Asserts the shared shape of every local fallback answer. */
const expectLocalAnswer = async (response: Response, fetchSpy?: ReturnType<typeof vi.fn>): Promise<void> => {
  const answer = await parseAnswer(response);
  expect(response.status).toBe(200);
  expect(answer.source).toBe('local');
  expect(answer.answer.length).toBeGreaterThan(0);
  expect(answer.sourceIds).toEqual(['epa-ventilation']);
  if (fetchSpy) expect(fetchSpy).not.toHaveBeenCalled();
};

describe('chat fallback answers', () => {
  beforeEach(() => {
    resetRateLimit();
    resetGlobalLimit();
    setProviderEnv();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    setGlobalLimitStore(undefined);
    resetGlobalLimit();
    delete process.env.LLM_BASE_URL;
    delete process.env.LLM_API_KEY;
    delete process.env.LLM_MODEL;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it('shares one in-memory daily cap across all clients', async () => {
    for (let index = 0; index < config.rateLimit.globalDailyCap; index += 1) {
      expect(await checkGlobalLimit(0)).toBe(true);
    }
    expect(await checkGlobalLimit(0)).toBe(false);
  });

  it('uses Upstash REST for the shared counter when configured', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://upstash.example/';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'rest-token';
    const fetchSpy = vi.fn(() => Promise.resolve(new Response(JSON.stringify([{ result: '1' }]), { status: 200 })));
    vi.stubGlobal('fetch', fetchSpy);
    expect(await checkGlobalLimit()).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('fails open when the global store errors', async () => {
    setGlobalLimitStore({ tryAcquire: () => Promise.reject(new Error('store down')) });
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(
      new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(remoteAnswer) } }] }), { status: 200 }),
    )));
    const response = await POST(chatRequest());
    expect(response.status).toBe(200);
    expect((await parseAnswer(response)).source).toBe('model');
  });

  it('returns a validated local answer when the global cap is exceeded', async () => {
    setGlobalLimitStore({ tryAcquire: vi.fn().mockResolvedValue(false) });
    const fetchSpy = vi.fn(() => Promise.reject(new Error('provider must not be called')));
    vi.stubGlobal('fetch', fetchSpy);
    await expectLocalAnswer(await POST(chatRequest()), fetchSpy);
  });

  it('returns a local answer when no provider key is configured', async () => {
    delete process.env.LLM_API_KEY;
    const fetchSpy = vi.fn(() => Promise.reject(new Error('provider must not be called')));
    vi.stubGlobal('fetch', fetchSpy);
    await expectLocalAnswer(await POST(chatRequest()), fetchSpy);
  });

  it('returns a local answer when the provider is unavailable', async () => {
    const fetchSpy = vi.fn(() => Promise.reject(new Error('offline')));
    vi.stubGlobal('fetch', fetchSpy);
    const response = await POST(chatRequest());
    await expectLocalAnswer(response);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
