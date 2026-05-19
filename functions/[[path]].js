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
  return env.ASSETS.fetch(assetRequestFor(request, '/'));
}

async function serveFavicon({ request, env }) {
  const icon = await env.ASSETS.fetch(assetRequestFor(request, '/images/bigkas-logo-72.webp'));
  if (!icon.ok) return icon;

  const headers = new Headers(icon.headers);
  headers.set('Content-Type', 'image/webp');
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');

  return new Response(icon.body, {
    status: icon.status,
    statusText: icon.statusText,
    headers,
  });
}

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const pathname = url.pathname.replace(/\/+$/, '') || '/';
  const method = request.method.toUpperCase();

  if (method !== 'GET' && method !== 'HEAD') {
    return context.next();
  }

  if (pathname === '/favicon.ico') {
    return serveFavicon(context);
  }

  if (isAppRoute(pathname) && !hasFileExtension(pathname)) {
    return serveAppShell(context);
  }

  return context.next();
}
