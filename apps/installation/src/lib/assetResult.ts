import type {
  DynamicsCustomerAsset,
  DynamicsOpportunityProduct,
} from '@involve/shared';
import type { CreateAssetInput } from '@/api/assets';

// One entry per selected opportunity product. Tracks whether the asset POST
// succeeded and (when it didn't) keeps the input around so the Confirmation
// screen can retry without re-walking the engineer through the whole flow.
export type AssetResult =
  | {
      status: 'created';
      product: DynamicsOpportunityProduct;
      input: CreateAssetInput;
      asset: DynamicsCustomerAsset;
    }
  | {
      status: 'failed';
      product: DynamicsOpportunityProduct;
      input: CreateAssetInput;
      error: string;
    };

// Build the Dynamics web client URL for a Customer Asset record.
// SPEC §7 Screen 5 — "View in Dynamics 365 →".
// The appid targets the specific model-driven app the engineer expects to land
// in; without it the link opens a default app and may not show the right form.
const DYNAMICS_URL = 'https://involveproduction.crm11.dynamics.com';
const APP_ID = 'b55f4427-c566-ea11-a811-00224801bc51';

export function dynamicsAssetUrl(assetId: string): string {
  const params = new URLSearchParams({
    appid: APP_ID,
    forceUCI: '1',
    pagetype: 'entityrecord',
    etn: 'msdyn_customerasset',
    id: assetId,
  });
  return `${DYNAMICS_URL}/main.aspx?${params.toString()}`;
}
