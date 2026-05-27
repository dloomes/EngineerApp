import type { DynamicsCustomerAsset } from '@involve/shared';
import { USE_MOCK, apiFetch } from './client';

export interface CreateAssetInput {
  productName: string;
  // Optional — write-in opportunity lines have no catalog product link.
  productId?: string;
  accountId: string;
  siteId: string;
  roomId: string;
  // Always present — when serial mode is "None" the caller substitutes "N/A".
  serialNumber: string;
  // Required by Dynamics; sourced from the opp product.
  manufacturer?: string;
  model?: string;
  // Required Boolean on Customer Asset; defaults to false for new installations.
  assetCheck: boolean;
  // YYYY-MM-DD — date the engineer marks the unit as installed.
  installDate?: string;
  // Opportunity product this asset came from — lets us count "already
  // installed" per line on revisits.
  opportunityProductId?: string;
  // Item cost from the opp line's priceperunit → involve_cost on the asset.
  cost?: number;
  // PO Received date from the opportunity → involve_purchasedate on the asset.
  // Same value across every asset created in one install session.
  purchaseDate?: string;
  // Free-text notes from the engineer → involve_additional_asset_notes.
  notes?: string;
  // Network details — only relevant for connected devices (displays, AV
  // switches, control systems). Engineer reveals them via a single toggle
  // on the form; cables/brackets leave them blank.
  ipAddress?: string;
  macAddress?: string;
  softwareVersion?: string;
}

export async function createAsset(
  input: CreateAssetInput,
): Promise<DynamicsCustomerAsset> {
  if (USE_MOCK) {
    return {
      msdyn_customerassetid: crypto.randomUUID(),
      msdyn_name: input.productName,
      preact_serialnumber: input.serialNumber,
    };
  }

  const body: Record<string, unknown> = {
    productName: input.productName,
    accountId: input.accountId,
    siteId: input.siteId,
    roomId: input.roomId,
    serialNumber: input.serialNumber,
    assetCheck: input.assetCheck,
  };
  if (input.productId) body.productId = input.productId;
  if (input.manufacturer) body.manufacturer = input.manufacturer;
  if (input.model) body.model = input.model;
  if (input.installDate) body.installDate = input.installDate;
  if (input.opportunityProductId) body.opportunityProductId = input.opportunityProductId;
  if (typeof input.cost === 'number') body.cost = input.cost;
  if (input.purchaseDate) body.purchaseDate = input.purchaseDate;
  if (input.notes) body.notes = input.notes;
  if (input.ipAddress) body.ipAddress = input.ipAddress;
  if (input.macAddress) body.macAddress = input.macAddress;
  if (input.softwareVersion) body.softwareVersion = input.softwareVersion;

  return apiFetch<DynamicsCustomerAsset>('/assets', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
