import type { ReactNode } from 'react';
import { InteractionType } from '@azure/msal-browser';
import { MsalAuthenticationTemplate } from '@azure/msal-react';
import { apiScopes, authEnabled } from './msalConfig';
import './auth.css';

function AuthSplash({ label }: { label: string }): JSX.Element {
  return (
    <div className="auth-splash">
      <p className="auth-splash__text">{label}</p>
    </div>
  );
}

// Gates the whole app behind Microsoft sign-in. When auth is disabled
// (dev/mock — no client id configured) it's a passthrough.
export function RequireAuth({ children }: { children: ReactNode }): JSX.Element {
  if (!authEnabled) return <>{children}</>;

  return (
    <MsalAuthenticationTemplate
      interactionType={InteractionType.Redirect}
      authenticationRequest={{ scopes: apiScopes }}
      loadingComponent={() => <AuthSplash label="Signing you in…" />}
      errorComponent={({ error }) => (
        <AuthSplash
          label={`Sign-in failed: ${error?.message ?? 'unknown error'}`}
        />
      )}
    >
      {children}
    </MsalAuthenticationTemplate>
  );
}
