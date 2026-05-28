import { Link } from 'react-router-dom';
import { authEnabled } from '@/auth/msalConfig';
import { UserMenu } from '@/auth/UserMenu';
import './AppLauncher.css';

interface AppEntry {
  path: string;
  title: string;
  description: string;
  status: 'live' | 'coming-soon';
}

const APPS: AppEntry[] = [
  {
    path: '/installation',
    title: 'Installation',
    description: 'Install equipment and create Customer Assets against a job.',
    status: 'live',
  },
  {
    path: '/health-check',
    title: 'Health Check',
    description: 'Audit equipment condition on existing customer sites.',
    status: 'coming-soon',
  },
  {
    path: '/fsr',
    title: 'FSR',
    description: 'Field Service Reports for completed visits.',
    status: 'coming-soon',
  },
];

export function AppLauncher(): JSX.Element {
  return (
    <section className="launcher">
      <div className="launcher__brand">
        <img
          className="launcher__logo"
          src="/involve-logo.png"
          alt="Involve"
          width={200}
          height={50}
        />
      </div>

      {authEnabled && <UserMenu />}

      <h2 className="launcher__heading">What task are you completing?</h2>
      <p className="launcher__subheading">Pick the app for the job you're on.</p>

      <ul className="launcher__list">
        {APPS.map((app) => (
          <li key={app.path}>
            <Link to={app.path} className="launcher__card">
              <div className="launcher__card-body">
                <div className="launcher__card-top">
                  <span className="launcher__card-title">{app.title}</span>
                  {app.status === 'coming-soon' && (
                    <span className="launcher__badge">Coming soon</span>
                  )}
                </div>
                <span className="launcher__card-desc">{app.description}</span>
              </div>
              <span className="launcher__chevron" aria-hidden="true">
                ›
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
