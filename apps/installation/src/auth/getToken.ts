import { InteractionRequiredAuthError } from '@azure/msal-browser';
import { apiScopes, authEnabled, msalInstance } from './msalConfig';

// Acquires an access token for the proxy API. Silent when possible; falls back
// to an interactive redirect if the session needs re-consent/refresh. Returns
// null when auth is disabled (dev/mock) so callers send no Authorization header.
export async function getAccessToken(): Promise<string | null> {
  if (!authEnabled || !msalInstance) return null;

  const account =
    msalInstance.getActiveAccount() ?? msalInstance.getAllAccounts()[0];
  if (!account) return null;

  try {
    const result = await msalInstance.acquireTokenSilent({
      scopes: apiScopes,
      account,
    });
    return result.accessToken;
  } catch (err) {
    if (err instanceof InteractionRequiredAuthError) {
      // Can't refresh silently — bounce through a redirect to re-auth.
      await msalInstance.acquireTokenRedirect({ scopes: apiScopes, account });
    }
    return null;
  }
}
