// ─── Dynamics 365 entities — Installation App ────────────────────────────────

// Slim projection of the Account entity — only what the app needs.
export interface DynamicsAccount {
  accountid: string;
  name: string;
}

export interface DynamicsOpportunity {
  opportunityid: string;
  name: string;
  _parentaccountid_value: string;
  preact_involvereference: string;
  // Populated by the proxy via $expand=parentaccountid — gives us the
  // human-readable customer name without a second round trip.
  parentaccountid?: DynamicsAccount;
  // ISO date string. Applied uniformly to every asset in the batch as
  // involve_purchasedate on the Customer Asset record. (Field name retains
  // the Involve-schema spelling "porecieved".)
  involve_porecieved?: string;
}

export interface DynamicsOpportunityProduct {
  opportunityproductid: string;
  productname: string;
  quantity: number;
  priceperunit: number;
  // Null for write-in lines (free-text products not linked to the catalog).
  _productid_value?: string;
  // Optional — non-physical lines (e.g. labour, delivery) won't have these.
  preact_manufacturer?: string;
  preact_model?: string;
  // Classification used to filter out non-equipment lines at the proxy
  // (Customer Assets are only created for physical equipment).
  preact_phase?: string;
  // Free-text description from the opp line — shown below manufacturer/model
  // on AssetDetails so the engineer has the salesperson's notes in hand.
  description?: string;
}

export interface DynamicsAccountSite {
  involve_accountsiteid: string;
  involve_name: string;
  _involve_associatedaccount_value: string;
}

export interface DynamicsFunctionalLocation {
  msdyn_functionallocationid: string;
  msdyn_name: string;
  _new_associatedsite_value: string;
}

export interface DynamicsCustomerAsset {
  msdyn_customerassetid: string;
  msdyn_name: string;
  preact_serialnumber?: string;
  // ISO date string (YYYY-MM-DD) for the engineer's installation date.
  involve_installdate?: string;
  // Lookup back to the opportunity product this asset was created from.
  // Lets the app tell which lines are already installed when re-opening a job.
  _involve_opportunityproduct_value?: string;
}

// Wraps DynamicsOpportunityProduct with installation context computed by the
// proxy — number of Customer Assets already linked back to this line via
// involve_OpportunityProduct. Drives the "already installed" badge on Screen 2
// and the per-line slot expansion in the AssetDetails loop.
export interface OpportunityLineSummary extends DynamicsOpportunityProduct {
  installedCount: number;
}
