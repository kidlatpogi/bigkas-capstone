const EXACT_APP_ROUTES = new Set([
  '/',
  '/login',
  '/admin-login',
  '/register',
  '/verify-email',
  '/forgot-password',
  '/nickname',
  '/dashboard',
  '/practice',
  '/training',
  '/frameworks',
  '/progress',
  '/achievements',
  '/activity',
  '/profile',
  '/settings',
]);

const APP_ROUTE_PREFIXES = [
  '/admin-login/',
  '/auth/',
  '/onboarding/',
  '/training/',
  '/settings/',
  '/session/',
  '/admin/',
];

/* ── Security headers (OWASP best-practice) ───────────────────────── */
const SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(self), microphone=(self), geolocation=(), payment=()',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob: https:",
    "connect-src 'self' https: wss: ws:",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "worker-src 'self' blob:",
  ].join('; '),
};

/**
 * Clone a Response with security headers injected.
 * Existing headers on the response are preserved; security headers are added
 * only when not already present so _headers rules are never overwritten.
 */
function withSecurityHeaders(response) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    if (!headers.has(key)) {
      headers.set(key, value);
    }
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function hasFileExtension(pathname) {
  return /\/[^/]+\.[^/]+$/.test(pathname);
}

function isAppRoute(pathname) {
  if (EXACT_APP_ROUTES.has(pathname)) return true;
  return APP_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function assetRequestFor(request, pathname) {
  const url = new URL(request.url);
  url.pathname = pathname;
  url.search = '';
  return new Request(url, request);
}

async function serveAppShell({ request, env }) {
  const response = await env.ASSETS.fetch(assetRequestFor(request, '/'));
  return withSecurityHeaders(response);
}

async function serveFavicon({ request, env }) {
  const icon = await env.ASSETS.fetch(assetRequestFor(request, '/images/bigkas-logo-72.webp'));
  if (!icon.ok) return withSecurityHeaders(icon);

  const headers = new Headers(icon.headers);
  headers.set('Content-Type', 'image/webp');
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');

  return withSecurityHeaders(new Response(icon.body, {
    status: icon.status,
    statusText: icon.statusText,
    headers,
  }));
}

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const pathname = url.pathname.replace(/\/+$/, '') || '/';
  const method = request.method.toUpperCase();

  if (method !== 'GET' && method !== 'HEAD') {
    const response = await context.next();
    return withSecurityHeaders(response);
  }

  if (pathname === '/favicon.ico') {
    return serveFavicon(context);
  }

  if (isAppRoute(pathname) && !hasFileExtension(pathname)) {
    return serveAppShell(context);
  }

  const response = await context.next();
  return withSecurityHeaders(response);
}
