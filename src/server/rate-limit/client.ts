/** Bounded client identity derived only from trusted proxy headers. */
import { config } from '@/config';

/** Picks the first non-empty trusted header value, else a shared local key. */
const firstNonEmpty = (...values: readonly (string | undefined)[]): string =>
  values.find((value) => value !== undefined && value !== '') ?? 'local';

/** Extracts a bounded client identifier from trusted proxy headers only. */
export const clientKey = (request: Request): string => {
  const forwarded = request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim();
  const realIp = request.headers.get('x-real-ip')?.trim();
  return firstNonEmpty(forwarded, realIp).slice(0, config.rateLimit.clientKeyMaxChars);
};
