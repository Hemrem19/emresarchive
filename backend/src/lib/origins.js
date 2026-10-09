/**
 * Origins allowed to call the API with credentials.
 */
const EXACT_ORIGINS = new Set([
  'https://citavers.com',
  'https://www.citavers.com',
  'https://emresarchive.pages.dev',
  // Capacitor native shells
  'capacitor://localhost',
  'ionic://localhost',
]);

// Cloudflare Pages preview deployments: https://<hash-or-branch>.emresarchive.pages.dev
const PAGES_PREVIEW = /^https:\/\/[a-z0-9-]+\.emresarchive\.pages\.dev$/;

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

export function isAllowedOrigin(origin) {
  if (!origin) return false;
  if (EXACT_ORIGINS.has(origin) || PAGES_PREVIEW.test(origin)) return true;
  try {
    const url = new URL(origin);
    // Local dev servers and Capacitor's http(s)://localhost, any port
    return (url.protocol === 'http:' || url.protocol === 'https:') && LOCAL_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}
