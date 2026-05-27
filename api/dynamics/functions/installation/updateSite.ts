import {
  app,
  type HttpRequest,
  type HttpResponseInit,
  type InvocationContext,
} from '@azure/functions';
import { dynamicsFetch } from '../../shared/dynamicsClient';
import { withCors } from '../../shared/httpHandler';

interface UpdateSiteBody {
  name: string;
}

// PATCH /api/sites/{siteId} — edit Account Site name (SPEC §9.6).
// PATCH only — never POST. Never creates a duplicate.
async function updateSite(
  req: HttpRequest,
  _ctx: InvocationContext,
): Promise<HttpResponseInit> {
  const siteId = req.params.siteId;
  if (!siteId) {
    return { status: 400, jsonBody: { error: 'Missing site id' } };
  }

  const body = (await req.json()) as Partial<UpdateSiteBody>;
  if (!body?.name) {
    return { status: 400, jsonBody: { error: 'name is required' } };
  }

  await dynamicsFetch(`involve_accountsites(${siteId})`, {
    method: 'PATCH',
    body: { involve_name: body.name },
  });

  return { status: 204 };
}

app.http('updateSite', {
  methods: ['PATCH', 'OPTIONS'],
  route: 'sites/{siteId}',
  authLevel: 'anonymous',
  handler: withCors(updateSite),
});
