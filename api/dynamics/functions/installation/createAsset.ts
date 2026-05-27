import {
  app,
  type HttpRequest,
  type HttpResponseInit,
  type InvocationContext,
} from '@azure/functions';
import { dynamicsFetch } from '../../shared/dynamicsClient';
import { withCors } from '../../shared/httpHandler';
import type { DynamicsCustomerAsset } from '../../shared/types';

interface CreateAssetBody {
  productName: string;
  // Optional — write-in opportunity lines have no catalog product to bind to.
  productId?: string;
  accountId: string;
  siteId: string;
  roomId: string;
  // ApplicationRequired in Dynamics — frontend sends "N/A" if engineer picked
  // "None" mode for serial, so this is always present.
  serialNumber: string;
  // ApplicationRequired in Dynamics — sourced from preact_manufacturer on the
  // opp product. If absent, Dynamics will reject with a clear message.
  manufacturer?: string;
  // ApplicationRequired in Dynamics — sourced from preact_model on the opp product.
  model?: string;
  // ApplicationRequired in Dynamics. Defaults to false (asset created but
  // not yet "checked"); explicit check workflow happens elsewhere.
  assetCheck: boolean;
  // YYYY-MM-DD. Optional — defaults to today on the frontend.
  installDate?: string;
  // Links the asset back to the opportunity product that spawned it. Used
  // by getJobLines to surface "already installed" counts when reopening a job.
  opportunityProductId?: string;
  // Item cost, copied from the opportunity line's priceperunit → involve_cost.
  // Money field in Dynamics; plain number in JSON.
  cost?: number;
  // ISO date string (YYYY-MM-DD). Copied from the opportunity's
  // involve_porecieved → involve_purchasedate on the asset. Same date on
  // every asset in a single install session.
  purchaseDate?: string;
  // Free-text notes from the engineer → involve_additional_asset_notes.
  notes?: string;
  // Network details. Engineer only fills these for connected devices.
  ipAddress?: string;
  macAddress?: string;
  softwareVersion?: string;
}

// POST /api/assets — create a Customer Asset (SPEC §9.9).
async function createAsset(
  req: HttpRequest,
  _ctx: InvocationContext,
): Promise<HttpResponseInit> {
  const body = (await req.json()) as Partial<CreateAssetBody>;

  const required: Array<keyof CreateAssetBody> = [
    'productName',
    'accountId',
    'siteId',
    'roomId',
    'serialNumber',
  ];
  for (const key of required) {
    if (!body?.[key]) {
      return { status: 400, jsonBody: { error: `${key} is required` } };
    }
  }

  // @odata.bind names verified against entity metadata:
  //   /EntityDefinitions(LogicalName='msdyn_customerasset')?$expand=ManyToOneRelationships
  // Casing varies per relationship — do not transform.
  const payload: Record<string, unknown> = {
    msdyn_name: body.productName,
    'msdyn_account@odata.bind': `/accounts(${body.accountId})`,
    'new_AssociatedSite@odata.bind': `/involve_accountsites(${body.siteId})`,
    'involve_msdyn_FunctionalLocation@odata.bind': `/msdyn_functionallocations(${body.roomId})`,
    preact_serialnumber: body.serialNumber,
    involve_asset_check: body.assetCheck ?? false,
  };

  if (body.productId) {
    payload['msdyn_product@odata.bind'] = `/products(${body.productId})`;
  }
  if (body.manufacturer) {
    payload.involve_manufacturer = body.manufacturer;
  }
  if (body.model) {
    payload.involve_assetmodelcode = body.model;
  }
  if (body.installDate) {
    payload.involve_installdate = body.installDate;
  }
  if (body.opportunityProductId) {
    payload['involve_OpportunityProduct@odata.bind'] =
      `/opportunityproducts(${body.opportunityProductId})`;
  }
  if (typeof body.cost === 'number') {
    payload.involve_cost = body.cost;
  }
  if (body.purchaseDate) {
    payload.involve_purchasedate = body.purchaseDate;
  }
  if (body.notes) {
    payload.involve_additional_asset_notes = body.notes;
  }
  if (body.ipAddress) {
    payload.involve_ipaddress = body.ipAddress;
  }
  if (body.macAddress) {
    payload.involve_macaddress = body.macAddress;
  }
  if (body.softwareVersion) {
    payload.involve_softwarefirmwareversion = body.softwareVersion;
  }

  const created = await dynamicsFetch<DynamicsCustomerAsset>('msdyn_customerassets', {
    method: 'POST',
    preferRepresentation: true,
    body: payload,
  });

  return { status: 201, jsonBody: created };
}

app.http('createAsset', {
  methods: ['POST', 'OPTIONS'],
  route: 'assets',
  authLevel: 'anonymous',
  handler: withCors(createAsset),
});
