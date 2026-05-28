import { useMsal } from '@azure/msal-react';
import './auth.css';

// Signed-in identity + sign-out. Only mounted when auth is enabled (inside the
// MsalProvider), so useMsal is always safe here.
export function UserMenu(): JSX.Element {
  const { instance, accounts } = useMsal();
  const account = accounts[0];
  const name = account?.name ?? account?.username ?? 'Signed in';

  return (
    <div className="user-menu">
      <span className="user-menu__name" title={account?.username}>
        {name}
      </span>
      <button
        type="button"
        className="user-menu__signout"
        onClick={() => void instance.logoutRedirect()}
      >
        Sign out
      </button>
    </div>
  );
}
