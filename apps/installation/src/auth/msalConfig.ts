import {
  type Configuration,
  PublicClientApplication,
} from '@azure/msal-browser';

// Microsoft SSO config, driven entirely by build-time env vars so auth can be
// switched on per-environment. When VITE_AAD_CLIENT_ID is absent (e.g. local
// dev / mock mode), auth is DISABLED and the app behaves as before — no login.
const clientId = import.meta.env.VITE_AAD_CLIENT_ID as string | undefined;
const tenantId = import.meta.env.VITE_AAD_TENANT_ID as string | undefined;

export const authEnabled = Boolean(clientId && tenantId);

// Access-token scope for our own API (the proxy validates this audience).
// The Entra app exposes `api://<clientId>/access_as_user`.
export const apiScopes = clientId
  ? [`api://${clientId}/access_as_user`]
  : [];

const msalConfig: Configuration = {
  auth: {
    clientId: clientId ?? '',
    // Single-tenant: only Involve accounts can sign in.
    authority: `https://login.microsoftonline.com/${tenantId ?? 'common'}`,
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    // localStorage so the session survives a PWA relaunch.
    cacheLocation: 'localStorage',
  },
};

// Only construct the client when auth is configured; null otherwise so the
// app runs without MSAL at all in dev/mock.
export const msalInstance = authEnabled
  ? new PublicClientApplication(msalConfig)
  : null;
