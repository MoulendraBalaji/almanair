/** Server-only call to the configured OpenAI-compatible chat provider. */
import 'server-only';
import { config } from '@/config';
import { chatResponseSchema, type ChatErrorCode, type ChatRequest, type ChatResponse } from '@/domain/retrieval/chat';
import { buildMessages } from './prompt';

/** Validated server environment; no values ever reach the browser. */
interface ProviderSettings {
  endpoint: string;
  apiKey: string;
  model: string;
}

/** One validated provider result. */
export type ProviderResult = { ok: true; response: ChatResponse } | { ok: false; error: ChatErrorCode };

/** Reads and validates the provider environment without throwing. */
const settingsFromEnv = (): ProviderSettings | undefined => {
  const baseUrl = process.env.LLM_BASE_URL?.trim();
  const apiKey = process.env.LLM_API_KEY?.trim();
  const model = process.env.LLM_MODEL?.trim();
  if (!baseUrl || !apiKey || !model) return undefined;
  try {
    const endpoint = new URL(`${baseUrl.replace(/\/$/, '')}/chat/completions`);
    return { endpoint: endpoint.toString(), apiKey, model };
  } catch {
    return undefined;
  }
};

/** Reads one named field from an unknown object without casting. */
const field = (value: unknown, key: string): unknown => {
  if (typeof value !== 'object' || value === null || !(key in value)) return undefined;
  const result: unknown = Reflect.get(value, key);
  return result;
};

/** Narrows an unknown provider payload to its first message content. */
const contentFrom = (payload: unknown): string | undefined => {
  const choices: unknown = field(payload, 'choices');
  const first: unknown = Array.isArray(choices) ? choices[0] : undefined;
  const message: unknown = field(first, 'message');
  const content: unknown = field(message, 'content');
  return typeof content === 'string' ? content : undefined;
};

/** Requests one strict JSON answer and validates it before returning. */
export const askProvider = async (request: ChatRequest): Promise<ProviderResult> => {
  const settings = settingsFromEnv();
  if (!settings) return { ok: false, error: 'unavailable' };
  const body = JSON.stringify({
    model: settings.model,
    messages: buildMessages(request),
    temperature: config.chat.temperature,
    max_tokens: config.chat.maxOutputTokens,
    response_format: { type: 'json_object' },
  });
  try {
    const response = await fetch(settings.endpoint, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${settings.apiKey}`,
        'content-type': 'application/json',
      },
      body,
      signal: AbortSignal.timeout(config.chat.timeoutMs),
      cache: 'no-store',
    });
    if (response.status === config.rateLimit.statusCode) return { ok: false, error: 'rate-limited' };
    if (!response.ok) return { ok: false, error: 'unavailable' };
    const payload: unknown = await response.json();
    const content = contentFrom(payload);
    if (!content) return { ok: false, error: 'invalid' };
    const parsed: unknown = JSON.parse(content);
    const validated = chatResponseSchema.safeParse(parsed);
    if (!validated.success) return { ok: false, error: 'invalid' };
    const allowed = new Set(request.sourceIds);
    const citations = validated.data.sourceIds;
    if (citations.length === 0 || citations.some((id) => !allowed.has(id))) return { ok: false, error: 'invalid' };
    return { ok: true, response: validated.data };
  } catch {
    return { ok: false, error: 'unavailable' };
  }
};
