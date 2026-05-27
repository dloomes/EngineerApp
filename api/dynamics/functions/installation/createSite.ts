import {
  app,
  type HttpRequest,
  type HttpResponseInit,
  type InvocationContext,
} from '@azure/functions';
import { dynamicsFetch } from '../../shared/dynamicsClient';
import { withCors } from '../../shared/httpHandler';
import type { DynamicsAccountSite } from '../../shared/types';

interface CreateSiteBody {
  accountId: string;
  name: string;
}

// POST /api/sites — create a new Account Site (SPEC §9.5).
async function createSite(
  req: HttpRequest,
  _ctx: InvocationContext,
): Promise<HttpResponseInit> {
  const body = (await req.json()) as Partial<CreateSiteBody>;
  if (!body?.accountId || !body?.name) {
    return {
      status: 400,
      jsonBody: { error: 'accountId and name are required' },
    };
  }

  const created = await dynamicsFetch<DynamicsAccountSite>('involve_accountsites', {
    method: 'POST',
    preferRepresentation: true,
    body: {
      involve_name: body.name,
      'involve_AssociatedAccount@odata.bind': `/accounts(${body.accountId})`,
    },
  });

  return { status: 201, jsonBody: created };
}

app.http('createSite', {
  methods: ['POST', 'OPTIONS'],
  route: 'sites',
  authLevel: 'anonymous',
  handler: withCors(createSite),
});
