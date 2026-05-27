import type { ReactNode } from 'react';
import './Layout.css';

export interface LayoutProps {
  children: ReactNode;
  // Defaults to "Installation App". Future apps in the suite override.
  appName?: string;
}

export function Layout({ children, appName = 'Installation App' }: LayoutProps): JSX.Element {
  return (
    <div className="involve-layout">
      <header className="involve-layout__header">
        <h1 className="involve-layout__title">{appName}</h1>
      </header>
      <main className="involve-layout__main">
        <div className="involve-layout__main-inner">{children}</div>
      </main>
    </div>
  );
}
