import { useEffect, useMemo } from 'react';

const NATIVE_AUTH_REDIRECT_URL = 'org.nationalu.bigkas://auth/callback';

function collectCallbackParams(url) {
  const parsed = new URL(url);
  const params = new URLSearchParams(parsed.search);
  const hash = parsed.hash.startsWith('#') ? parsed.hash.slice(1) : parsed.hash;
  const hashParams = new URLSearchParams(hash);

  hashParams.forEach((value, key) => {
    if (!params.has(key)) params.set(key, value);
  });

  return params;
}

function buildNativeCallbackUrl(url) {
  const params = collectCallbackParams(url);
  const query = params.toString();
  return query ? `${NATIVE_AUTH_REDIRECT_URL}?${query}` : NATIVE_AUTH_REDIRECT_URL;
}

function NativeAuthCallbackPage() {
  const targetUrl = useMemo(() => {
    if (typeof window === 'undefined') return NATIVE_AUTH_REDIRECT_URL;
    return buildNativeCallbackUrl(window.location.href);
  }, []);

  useEffect(() => {
    window.location.replace(targetUrl);
  }, [targetUrl]);

  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        padding: '24px',
        background: '#ffffff',
        color: '#102033',
        fontFamily: 'Nunito, system-ui, sans-serif',
        textAlign: 'center',
      }}
    >
      <div>
        <h1 style={{ margin: '0 0 8px', fontSize: '1.2rem' }}>Returning to TalkTics</h1>
        <p style={{ margin: 0, color: '#64748b' }}>You can close this tab if the app does not open automatically.</p>
      </div>
    </main>
  );
}

export default NativeAuthCallbackPage;
