import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type {
  DynamicsOpportunity,
  DynamicsOpportunityProduct,
  OpportunityLineSummary,
} from '@involve/shared';
import { ApiError } from '@/api/client';
import { getJobLines } from '@/api/jobs';
import { customerName } from '@/lib/customer';
import './OpportunityLines.css';

interface LocationState {
  opportunity?: DynamicsOpportunity;
}

function remaining(line: OpportunityLineSummary): number {
  // Treat missing/null quantity as 1. installedCount can exceed quantity if
  // someone over-installed manually — clamp to >= 0.
  const qty = Math.max(1, Math.floor(line.quantity ?? 1));
  return Math.max(0, qty - line.installedCount);
}

export function OpportunityLines(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const { opportunity } = (location.state ?? {}) as LocationState;

  const [lines, setLines] = useState<OpportunityLineSummary[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!opportunity) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getJobLines(opportunity.opportunityid)
      .then((data) => {
        if (cancelled) return;
        setLines(data);
        // Default-select every line that still has units left to install.
        setSelected(
          new Set(
            data
              .filter((l) => remaining(l) > 0)
              .map((l) => l.opportunityproductid),
          ),
        );
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const detail =
          err instanceof ApiError
            ? `API error (${err.status}).`
            : 'Network error.';
        setError(`${detail} Please try again.`);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [opportunity]);

  // Selected lines expanded to one entry per remaining unit. A line with
  // quantity 5 and installedCount 2 contributes 3 slots; AssetDetails iterates
  // over the slots and engineer captures serial per unit.
  const expandedSlots = useMemo<DynamicsOpportunityProduct[]>(() => {
    if (!lines) return [];
    return lines
      .filter((l) => selected.has(l.opportunityproductid))
      .flatMap((line) =>
        Array.from({ length: remaining(line) }, () => line as DynamicsOpportunityProduct),
      );
  }, [lines, selected]);

  function toggle(id: string): void {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function onContinue(): void {
    if (!opportunity || expandedSlots.length === 0) return;
    navigate('/installation/location', {
      state: { opportunity, selectedLines: expandedSlots },
    });
  }

  if (!opportunity) {
    return (
      <section className="lines">
        <h2 className="lines__heading">No job loaded</h2>
        <p className="lines__empty">
          The job context was lost.{' '}
          <Link to="/installation">Start a new lookup</Link>.
        </p>
      </section>
    );
  }

  return (
    <section className="lines">
      <Link to="/installation" className="lines__back-link">
        ← Back to jobs
      </Link>

      <div>
        <h2 className="lines__heading">{customerName(opportunity)}</h2>
        <p className="lines__subheading">
          {opportunity.name} · {opportunity.preact_involvereference}
        </p>
      </div>

      {loading && <div className="lines__loading">Loading product lines…</div>}

      {error && (
        <div className="lines__error" role="alert">
          {error}
        </div>
      )}

      {lines && lines.length === 0 && (
        <div className="lines__empty">
          This opportunity has no equipment lines.
        </div>
      )}

      {lines && lines.length > 0 && (
        <ul className="lines__list">
          {lines.map((line) => {
            const left = remaining(line);
            const qty = Math.max(1, Math.floor(line.quantity ?? 1));
            const isFullyInstalled = left === 0;
            const isSelected = selected.has(line.opportunityproductid);
            return (
              <li key={line.opportunityproductid}>
                <label
                  className={`lines__row${
                    isSelected ? ' lines__row--selected' : ''
                  }${isFullyInstalled ? ' lines__row--done' : ''}`}
                >
                  <input
                    type="checkbox"
                    className="lines__checkbox"
                    checked={isSelected}
                    onChange={() => toggle(line.opportunityproductid)}
                    disabled={isFullyInstalled}
                  />
                  <div className="lines__row-body">
                    <span className="lines__row-name">{line.productname}</span>
                    <span className="lines__row-meta">
                      Qty {qty}
                      {line.preact_manufacturer
                        ? ` · ${line.preact_manufacturer}`
                        : ''}
                    </span>
                    {line.installedCount > 0 && (
                      <span
                        className={`lines__row-status${
                          isFullyInstalled ? ' lines__row-status--done' : ''
                        }`}
                      >
                        {isFullyInstalled
                          ? `All ${qty} installed`
                          : `${line.installedCount} of ${qty} installed · ${left} remaining`}
                      </span>
                    )}
                  </div>
                </label>
              </li>
            );
          })}
        </ul>
      )}

      {lines && lines.length > 0 && (() => {
        const allInstalled = lines.every((l) => remaining(l) === 0);
        return (
          <footer className="lines__footer">
            {allInstalled ? (
              <>
                <p className="lines__all-installed">
                  All equipment lines on this job have already been installed.
                </p>
                <Link to="/installation" className="lines__back">
                  ← Back to jobs
                </Link>
              </>
            ) : (
              <button
                type="button"
                className="lines__continue"
                onClick={onContinue}
                disabled={expandedSlots.length === 0}
              >
                Continue with {expandedSlots.length}{' '}
                {expandedSlots.length === 1 ? 'asset' : 'assets'} →
              </button>
            )}
          </footer>
        );
      })()}
    </section>
  );
}
