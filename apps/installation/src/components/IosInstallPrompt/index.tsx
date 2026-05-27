import { useEffect, useState } from 'react';
import './IosInstallPrompt.css';

// iOS has no programmatic install API, so we nudge the user to add the app to
// their home screen via the Share sheet (SPEC §13). One-time + dismissable:
// once dismissed (or once installed), it never shows again.
const DISMISS_KEY = 'engineering:ios-install-dismissed';

function isIos(): boolean {
  const ua = navigator.userAgent;
  // iPadOS 13+ reports as "MacIntel" but has touch points — catch that too.
  return (
    /iphone|ipad|ipod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return (
    nav.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches
  );
}

export function IosInstallPrompt(): JSX.Element | null {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isIos()) return; // not iOS — native install handles the rest
    if (isStandalone()) return; // already added to the home screen
    try {
      if (localStorage.getItem(DISMISS_KEY)) return; // dismissed before
    } catch {
      // localStorage blocked (private mode) — just show it this session.
    }
    setShow(true);
  }, []);

  if (!show) return null;

  function dismiss(): void {
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // ignore — worst case it reappears next visit
    }
    setShow(false);
  }

  return (
    <div className="ios-install" role="dialog" aria-label="Install this app">
      <p className="ios-install__text">
        For the best experience, tap the Share button
        <span className="ios-install__icon" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 15V3" />
            <path d="M8 7l4-4 4 4" />
            <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
          </svg>
        </span>
        and choose <strong>Add to Home Screen</strong>.
      </p>
      <button
        type="button"
        className="ios-install__dismiss"
        onClick={dismiss}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
