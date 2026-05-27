import {
  app,
  type HttpRequest,
  type HttpResponseInit,
  type InvocationContext,
} from '@azure/functions';
import { dynamicsFetch, odataEscape } from '../../shared/dynamicsClient';
import { withCors } from '../../shared/httpHandler';
import type { DynamicsFunctionalLocation } from '../../shared/types';

// GET /api/sites/{siteId}/rooms — Functional Locations for a site (SPEC §9.4).
// Rooms are ALWAYS filtered by new_AssociatedSite — never show rooms from other sites.
async function getRooms(
  req: HttpRequest,
  _ctx: InvocationContext,
): Promise<HttpResponseInit> {
  const siteId = req.params.siteId;
  if (!siteId) {
    return { status: 400, jsonBody: { error: 'Missing site id' } };
  }

  const params = new URLSearchParams({
    $filter: `_new_associatedsite_value eq '${odataEscape(siteId)}'`,
    $select: 'msdyn_functionallocationid,msdyn_name',
    $orderby: 'msdyn_name asc',
  });

  const result = await dynamicsFetch<{ value: DynamicsFunctionalLocation[] }>(
    `msdyn_functionallocations?${params.toString()}`,
  );

  return { status: 200, jsonBody: result.value };
}

app.http('getRooms', {
  methods: ['GET', 'OPTIONS'],
  route: 'sites/{siteId}/rooms',
  authLevel: 'anonymous',
  handler: withCors(getRooms),
});
