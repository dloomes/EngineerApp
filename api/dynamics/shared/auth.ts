import type { HttpRequest } from '@azure/functions';
import { type JWTVerifyGetKey, createRemoteJWKSet, jwtVerify } from 'jose';

// Validates the caller's Microsoft Entra access token so the Dynamics proxy
// can't be driven by anyone who finds the URL — only signed-in Involve users.
//
// Enabled only when AAD_CLIENT_ID + TENANT_ID app settings are present, so
// local dev (`func start` without them) keeps working unauthenticated.
const tenantId = process.env.TENANT_ID;
const audience = process.env.AAD_CLIENT_ID; // the SSO app's client id

export const authEnabled = Boolean(tenantId && audience);

// Accept both v1.0 and v2.0 issuers — which one Entra stamps depends on the
// app's accessTokenAcceptedVersion, so we don't force a choice.
const issuers = tenantId
  ? [
      `https://login.microsoftonline.com/${tenantId}/v2.0`,
      `https://sts.windows.net/${tenantId}/`,
    ]
  : [];

// Audience can be the bare client id or the api:// App ID URI form.
const audiences = audience ? [audience, `api://${audience}`] : [];

let jwks: JWTVerifyGetKey | null = null;
function getKeySet(): JWTVerifyGetKey {
  if (!jwks) {
    jwks = createRemoteJWKSet(
      new URL(
        `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`,
      ),
    );
  }
  return jwks;
}

// Returns true if the request carries a valid token (or auth is disabled).
export async function isAuthorized(req: HttpRequest): Promise<boolean> {
  if (!authEnabled) return true;

  const header = req.headers.get('authorization') ?? '';
  if (!header.startsWith('Bearer ')) return false;
  const token = header.slice('Bearer '.length).trim();
  if (!token) return false;

  try {
    await jwtVerify(token, getKeySet(), {
      issuer: issuers,
      audience: audiences,
    });
    return true;
  } catch {
    return false;
  }
}
