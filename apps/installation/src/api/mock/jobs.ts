import type {
  DynamicsOpportunity,
  DynamicsOpportunityProduct,
} from '@involve/shared';

export const mockOpportunity: DynamicsOpportunity = {
  opportunityid: 'opp-001',
  name: 'Involve Demo Installation',
  _parentaccountid_value: 'acc-001',
  preact_involvereference: 'INV-2025-001',
  parentaccountid: {
    accountid: 'acc-001',
    name: 'Acme Demo Ltd',
  },
  involve_porecieved: '2025-04-15',
};

// Mock fixtures mirror what Dynamics holds — the proxy filters by
// preact_phase eq 'Equipment', so the labour line below should NOT appear
// in the app. apps/installation/src/api/jobs.ts applies the same filter
// in mock mode so the two modes behave identically.
export const mockOpportunityLines: DynamicsOpportunityProduct[] = [
  {
    opportunityproductid: 'line-001',
    productname: 'Conference Display 75"',
    quantity: 2,
    priceperunit: 2200,
    _productid_value: 'prod-001',
    preact_manufacturer: 'Sony',
    preact_model: 'BRAVIA FW-75BZ40H',
    preact_phase: 'Equipment',
    description: '75" 4K HDR Pro display with built-in tuner. Wall-mounted, landscape.',
  },
  {
    opportunityproductid: 'line-002',
    productname: 'Wall mount bracket',
    quantity: 2,
    priceperunit: 180,
    _productid_value: 'prod-002',
    preact_manufacturer: 'Chief',
    preact_model: 'XSM1U',
    preact_phase: 'Equipment',
    description: 'Fixed wall mount, supports up to 80" displays.',
  },
  {
    opportunityproductid: 'line-003',
    productname: 'HDMI cable 5m',
    quantity: 4,
    priceperunit: 28,
    _productid_value: 'prod-003',
    preact_manufacturer: 'Lindy',
    preact_model: '37993',
    preact_phase: 'Equipment',
    description: '5 metre Premium High Speed HDMI cable, 4K@60Hz.',
  },
  {
    // Labour line — filtered out by the proxy. Kept here so mock mode
    // exercises the same filter behaviour.
    opportunityproductid: 'line-004',
    productname: 'Installation labour',
    quantity: 1,
    priceperunit: 950,
    _productid_value: 'prod-004',
    preact_phase: 'Labour',
  },
];
