import { Link } from 'react-router-dom';
import './ComingSoon.css';

export interface ComingSoonProps {
  appName: string;
}

export function ComingSoon({ appName }: ComingSoonProps): JSX.Element {
  return (
    <section className="coming-soon">
      <Link to="/" className="coming-soon__back">
        ← Back to apps
      </Link>
      <div className="coming-soon__panel">
        <span className="coming-soon__badge">Coming soon</span>
        <h2 className="coming-soon__heading">{appName}</h2>
        <p className="coming-soon__body">
          This app is still in development. Check back soon — or carry on with
          the apps that are live.
        </p>
      </div>
    </section>
  );
}
