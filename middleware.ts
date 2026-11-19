import { config as appConfig } from '@/config';
import { NextResponse, type NextRequest } from 'next/server';

/** Builds a per-response CSP; Next reads x-nonce for its own scripts. */
const contentSecurityPolicy = (nonce: string): string => {
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    'object-src none',
    'base-uri self',
    'form-action self',
    'frame-ancestors none',
  ];
  if (process.env.NODE_ENV === 'production') directives.push('upgrade-insecure-requests');
  return directives.join('; ');
};

/** Adds a nonce, disables third-party loads and applies privacy headers. */
export function middleware(_request: NextRequest): NextResponse {
  const nonce = btoa(crypto.randomUUID());
  const requestHeaders = new Headers(_request.headers);
  requestHeaders.set('x-nonce', nonce);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('content-security-policy', contentSecurityPolicy(nonce));
  response.headers.set('referrer-policy', 'no-referrer');
  response.headers.set('x-content-type-options', 'nosniff');
  response.headers.set('x-frame-options', 'DENY');
  response.headers.set('x-dns-prefetch-control', 'off');
  response.headers.set('cross-origin-opener-policy', 'same-origin');
  response.headers.set('cross-origin-resource-policy', 'same-origin');
  response.headers.set('permissions-policy', 'geolocation=(self), camera=(), microphone=(), payment=()');
  response.headers.set('strict-transport-security', `max-age=${String(appConfig.security.hstsMaxAgeSeconds)}; includeSubDomains; preload`);
  return response;
}

/** Static assets do not need document headers. */
export const config = {
  matcher: ['/((?!_next/static|_next/image|icon.svg|manifest.webmanifest).*)'],
};
