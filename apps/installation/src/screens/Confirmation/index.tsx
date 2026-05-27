import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { DynamicsOpportunity } from '@involve/shared';
import { ApiError } from '@/api/client';
import { createAsset } from '@/api/assets';
import { type AssetResult, dynamicsAssetUrl } from '@/lib/assetResult';
import { customerName } from '@/lib/customer';
import './Confirmation.css';

interface LocationState {
  opportunity?: DynamicsOpportunity;
  results?: AssetResult[];
}

export function Confirmation(): JSX.Element {
  const location = useLocation();
  const state = (location.state ?? {}) as LocationState;
  const opportunity = state.opportunity;
  const initialResults = state.results ?? [];

  const [results, setResults] = useState<AssetResult[]>(initialResults);
  // Track which products are mid-retry, keyed by opportunityproductid.
  const [retrying, setRetrying] = useState<Set<string>>(new Set());

  async function handleRetry(targetIndex: number): Promise<void> {
    const current = results[targetIndex];
    if (!current || current.status !== 'failed') return;

    const productKey = current.product.opportunityproductid;
    setRetrying((prev) => new Set(prev).add(productKey));

    try {
      const asset = await createAsset(current.input);
      setResults((prev) =>
        prev.map((r, i) =>
          i === targetIndex
            ? { status: 'created', product: r.product, input: r.input, asset }
            : r,
        ),
      );
    } catch (err) {
      const error =
        err instanceof ApiError
          ? `API error (${err.status}).`
          : 'Save failed.';
      setResults((prev) =>
        prev.map((r, i) =>
          i === targetIndex && r.status === 'failed' ? { ...r, error } : r,
        ),
      );
    } finally {
      setRetrying((prev) => {
        const next = new Set(prev);
        next.delete(productKey);
        return next;
      });
    }
  }

  if (!opportunity || results.length === 0) {
    return (
      <section className="confirmation">
        <h2 className="confirmation__heading confirmation__heading--mixed">
          Nothing to show
        </h2>
        <p className="confirmation__empty">
          No assets were created in this session.{' '}
          <Link to="/installation">Start a new lookup</Link>.
        </p>
      </section>
    );
  }

  const created = results.filter((r) => r.status === 'created').length;
  const failed = results.length - created;

  const tone =
    failed === 0 ? 'success' : created === 0 ? 'failed' : 'mixed';

  const heading =
    failed === 0
      ? `${created} ${created === 1 ? 'asset' : 'assets'} created`
      : created === 0
        ? `${failed} ${failed === 1 ? 'asset' : 'assets'} failed`
        : `${created} created, ${failed} failed`;

  return (
    <section className="confirmation">
      <h2 className={`confirmation__heading confirmation__heading--${tone}`}>
        {heading}
      </h2>
      <p className="confirmation__subheading">
        {customerName(opportunity)} · {opportunity.name}
      </p>

      <ul className="confirmation__list">
        {results.map((result, idx) => {
          const key = result.product.opportunityproductid;
          const isRetrying = retrying.has(key);

          return (
            <li
              key={key}
              className={`confirmation__item${
                result.status === 'failed' ? ' confirmation__item--failed' : ''
              }`}
            >
              <div className="confirmation__item-header">
                <div className="confirmation__item-body">
                  <span className="confirmation__item-name">
                    {result.product.productname}
                  </span>
                  {result.status === 'created' &&
                    result.input.serialNumber &&
                    result.input.serialNumber !== 'N/A' && (
                      <span className="confirmation__item-sub">
                        Serial: {result.input.serialNumber}
                      </span>
                    )}
                </div>
                <span
                  className={`confirmation__badge confirmation__badge--${
                    result.status === 'created' ? 'created' : 'failed'
                  }`}
                >
                  {result.status === 'created' ? 'Created' : 'Failed'}
                </span>
              </div>

              {result.status === 'failed' && (
                <>
                  <p className="confirmation__item-error">{result.error}</p>
                  <div className="confirmation__item-actions">
                    <button
                      type="button"
                      className="confirmation__retry"
                      onClick={() => void handleRetry(idx)}
                      disabled={isRetrying}
                    >
                      {isRetrying ? 'Retrying…' : 'Retry'}
                    </button>
                  </div>
                </>
              )}

              {result.status === 'created' && (
                <div className="confirmation__item-actions">
                  <a
                    href={dynamicsAssetUrl(result.asset.msdyn_customerassetid)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="confirmation__view-link"
                  >
                    View in Dynamics 365 →
                  </a>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <Link to="/installation" className="confirmation__back">
        Back to jobs
      </Link>
    </section>
  );
}
