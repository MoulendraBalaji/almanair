# Lighthouse verification

**Date:** 2026-11-19
**Build:** local `npm run build`, served with `npm start -- --port 3100`
**Runner:** `npx lighthouse@12.8.2`, desktop/mobile defaults, Chrome headless

| Route | Performance | Accessibility | Best practices | SEO |
|---|---:|---:|---:|---:|
| `/today` | 89 | 100 | 96 | 100 |
| `/learn` | 87 | 100 | 96 | 100 |

Best practices is 96 on the local HTTP origin because Chrome reports a generic CSP inspector issue. The strict nonce CSP is working: Next.js emits nonces matching the response header, and there are no console errors from blocked inline scripts. Routes using the nonce are dynamically rendered because a per-request nonce cannot be injected into build-time static HTML.

Reproduce locally:

```bash
npm run build
npm start -- --port 3100
$env:CHROME_PATH='C:\Program Files\Google\Chrome\Application\chrome.exe'
npx lighthouse@12.8.2 http://localhost:3100/today \
  --only-categories=performance,accessibility,best-practices,seo \
  --output=json --output-path=lighthouse-today.json \
  --chrome-flags='--headless=new --no-sandbox --disable-gpu'
```

The same checks should be repeated against the HTTPS production deployment after each release.
