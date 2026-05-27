import type { DynamicsOpportunity } from '@involve/shared';

// Reads the customer (account) name from the expanded parentaccountid that the
// proxy fetches alongside the opportunity. Falls back to the opportunity name
// for robustness — if the $expand ever fails or returns nothing, the UI shows
// the job title rather than blank.
export function customerName(opportunity: DynamicsOpportunity): string {
  return opportunity.parentaccountid?.name ?? opportunity.name;
}
