import type { DynamicsAccountSite } from '@involve/shared';

// Mutable so mock create/update operations persist for the session — lets the
// full lookup flow be exercised without a Dynamics connection.
export const mockSites: DynamicsAccountSite[] = [
  {
    involve_accountsiteid: 'site-001',
    involve_name: 'London HQ',
    _involve_associatedaccount_value: 'acc-001',
  },
  {
    involve_accountsiteid: 'site-002',
    involve_name: 'Manchester Office',
    _involve_associatedaccount_value: 'acc-001',
  },
  {
    involve_accountsiteid: 'site-003',
    involve_name: 'Bristol Branch',
    _involve_associatedaccount_value: 'acc-001',
  },
];
