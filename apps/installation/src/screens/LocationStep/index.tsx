import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type {
  DynamicsAccountSite,
  DynamicsCustomerAsset,
  DynamicsFunctionalLocation,
  DynamicsOpportunity,
  DynamicsOpportunityProduct,
} from '@involve/shared';
import { RoomLookupField } from '@/components/RoomLookupField';
import { SiteLookupField } from '@/components/SiteLookupField';
import { customerName } from '@/lib/customer';
import './LocationStep.css';

interface LocationStepState {
  opportunity?: DynamicsOpportunity;
  selectedLines?: DynamicsOpportunityProduct[];
  // Pre-filled when returning from the per-product loop via the Change link.
  site?: DynamicsAccountSite | null;
  room?: DynamicsFunctionalLocation | null;
  // Preserved when returning mid-flow so already-saved assets aren't lost.
  createdAssets?: DynamicsCustomerAsset[];
}

// Location/room is picked once for the whole batch of selected products.
// Resume index = createdAssets.length, so an engineer hitting "Change"
// mid-flow continues from where they were.
export function LocationStep(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as LocationStepState;
  const opportunity = state.opportunity;
  const selectedLines = state.selectedLines ?? [];
  const createdAssets = state.createdAssets ?? [];

  const [site, setSite] = useState<DynamicsAccountSite | null>(
    state.site ?? null,
  );
  const [room, setRoom] = useState<DynamicsFunctionalLocation | null>(
    state.room ?? null,
  );

  function handleSiteChange(newSite: DynamicsAccountSite): void {
    setSite(newSite);
    setRoom(null);
  }

  function onContinue(): void {
    if (!opportunity || !site || !room) return;
    const resumeIndex = createdAssets.length;
    if (resumeIndex >= selectedLines.length) {
      // Edge case: everything's already saved. Send straight to confirmation.
      navigate('/installation/confirmation', {
        state: { opportunity, createdAssets },
      });
      return;
    }
    navigate(`/installation/asset/${resumeIndex}`, {
      state: { opportunity, selectedLines, site, room, createdAssets },
    });
  }

  if (!opportunity || selectedLines.length === 0) {
    return (
      <section className="location-step">
        <h2 className="location-step__heading">No job loaded</h2>
        <p className="location-step__missing">
          The job context was lost.{' '}
          <Link to="/installation">Start a new lookup</Link>.
        </p>
      </section>
    );
  }

  return (
    <section className="location-step">
      <div>
        <h2 className="location-step__heading">Where will these be installed?</h2>
        <p className="location-step__subheading">
          {selectedLines.length}{' '}
          {selectedLines.length === 1 ? 'product' : 'products'} will be created
          against the location below.
        </p>
      </div>

      <div className="location-step__customer">
        <span className="location-step__customer-label">Customer</span>
        <span className="location-step__customer-value">
          {customerName(opportunity)}
        </span>
      </div>

      <SiteLookupField
        accountId={opportunity._parentaccountid_value}
        value={site}
        onChange={handleSiteChange}
      />

      <RoomLookupField
        siteId={site?.involve_accountsiteid ?? null}
        accountId={opportunity._parentaccountid_value}
        value={room}
        onChange={setRoom}
      />

      <footer className="location-step__footer">
        <button
          type="button"
          className="location-step__continue"
          onClick={onContinue}
          disabled={!site || !room}
        >
          Continue →
        </button>
      </footer>
    </section>
  );
}
