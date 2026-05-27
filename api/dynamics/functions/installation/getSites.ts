import {
  app,
  type HttpRequest,
  type HttpResponseInit,
  type InvocationContext,
} from '@azure/functions';
import { dynamicsFetch, odataEscape } from '../../shared/dynamicsClient';
import { withCors } from '../../shared/httpHandler';
import type { DynamicsAccountSite } from '../../shared/types';

// GET /api/accounts/{accountId}/sites — Account Sites for a customer (SPEC §9.3).
async function getSites(
  req: HttpRequest,
  _ctx: InvocationContext,
): Promise<HttpResponseInit> {
  const accountId = req.params.accountId;
  if (!accountId) {
    return { status: 400, jsonBody: { error: 'Missing account id' } };
  }

  const params = new URLSearchParams({
    $filter: `_involve_associatedaccount_value eq '${odataEscape(accountId)}'`,
    $select: 'involve_accountsiteid,involve_name',
    $orderby: 'involve_name asc',
  });

  const result = await dynamicsFetch<{ value: DynamicsAccountSite[] }>(
    `involve_accountsites?${params.toString()}`,
  );

  return { status: 200, jsonBody: result.value };
}

app.http('getSites', {
  methods: ['GET', 'OPTIONS'],
  route: 'accounts/{accountId}/sites',
  authLevel: 'anonymous',
  handler: withCors(getSites),
});
