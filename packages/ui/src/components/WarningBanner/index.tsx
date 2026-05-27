import type { ReactNode } from 'react';
import './WarningBanner.css';

export interface WarningBannerProps {
  children: ReactNode;
}

export function WarningBanner({ children }: WarningBannerProps): JSX.Element {
  return (
    <div className="involve-warning-banner" role="note" aria-live="polite">
      <span className="involve-warning-banner__icon" aria-hidden="true">
        !
      </span>
      <div className="involve-warning-banner__body">{children}</div>
    </div>
  );
}
