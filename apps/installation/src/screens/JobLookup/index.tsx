import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError } from '@/api/client';
import { getJob } from '@/api/jobs';
import { customerName } from '@/lib/customer';
import {
  getRecentJobs,
  recordRecentJob,
  type RecentJob,
} from '@/lib/recentJobs';
import './JobLookup.css';

export function JobLookup(): JSX.Element {
  const navigate = useNavigate();
  const [ref, setRef] = useState('');
  const [recent, setRecent] = useState<RecentJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRecent(getRecentJobs());
  }, []);

  async function lookup(reference: string): Promise<void> {
    setError(null);
    setLoading(true);
    try {
      const job = await getJob(reference);
      if (!job) {
        // SPEC §17: no manual fallback — all valid jobs exist in Dynamics.
        setError(`No job found with reference "${reference}".`);
        return;
      }
      // Recent-jobs label shows the customer name (matches the SPEC intent).
      setRecent(recordRecentJob(job.preact_involvereference, customerName(job)));
      navigate('/installation/lines', { state: { opportunity: job } });
    } catch (err) {
      const detail =
        err instanceof ApiError
          ? `API error (${err.status}).`
          : 'Network error.';
      setError(`${detail} Please try again.`);
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    const trimmed = ref.trim();
    if (!trimmed) return;
    void lookup(trimmed);
  }

  return (
    <section className="joblookup">
      <Link to="/" className="joblookup__back-link">
        ← All apps
      </Link>
      <h2 className="joblookup__heading">Find a job</h2>

      <form className="joblookup__form" onSubmit={onSubmit}>
        <label className="joblookup__label" htmlFor="ref-input">
          Job reference
        </label>
        <input
          id="ref-input"
          className="joblookup__input"
          value={ref}
          onChange={(e) => setRef(e.target.value)}
          placeholder="e.g. INV-2025-001"
          autoFocus
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          inputMode="text"
          disabled={loading}
        />
        <button
          type="submit"
          className="joblookup__submit"
          disabled={loading || ref.trim().length === 0}
        >
          {loading ? 'Looking up…' : 'Continue →'}
        </button>
      </form>

      {error && (
        <p className="joblookup__error" role="alert">
          {error}
        </p>
      )}

      {recent.length > 0 && (
        <div>
          <h3 className="joblookup__recent-heading">Recent jobs</h3>
          <ul className="joblookup__recent-list">
            {recent.map((job) => (
              <li key={job.reference}>
                <button
                  type="button"
                  className="joblookup__recent-button"
                  onClick={() => void lookup(job.reference)}
                  disabled={loading}
                >
                  <span className="joblookup__recent-ref">{job.reference}</span>
                  <span className="joblookup__recent-name">{job.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
