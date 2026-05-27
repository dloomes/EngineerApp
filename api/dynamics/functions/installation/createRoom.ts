import {
  app,
  type HttpRequest,
  type HttpResponseInit,
  type InvocationContext,
} from '@azure/functions';
import { dynamicsFetch } from '../../shared/dynamicsClient';
import { withCors } from '../../shared/httpHandler';
import type { DynamicsFunctionalLocation } from '../../shared/types';

interface CreateRoomBody {
  siteId: string;
  name: string;
  // Account that owns the site — bound onto the room too so the record shows
  // up against the customer, not just the location.
  accountId: string;
}

// POST /api/rooms — create a new Functional Location (SPEC §9.7).
async function createRoom(
  req: HttpRequest,
  _ctx: InvocationContext,
): Promise<HttpResponseInit> {
  const body = (await req.json()) as Partial<CreateRoomBody>;
  if (!body?.siteId || !body?.name || !body?.accountId) {
    return {
      status: 400,
      jsonBody: { error: 'siteId, name and accountId are required' },
    };
  }

  const created = await dynamicsFetch<DynamicsFunctionalLocation>(
    'msdyn_functionallocations',
    {
      method: 'POST',
      preferRepresentation: true,
      body: {
        msdyn_name: body.name,
        'new_AssociatedSite@odata.bind': `/involve_accountsites(${body.siteId})`,
        // Custom Involve Account lookup on Functional Location — NOT the
        // stock FS `msdyn_account` (which doesn't exist on this tenant).
        // Attribute is `involve_account`; nav property is `involve_Account`.
        'involve_Account@odata.bind': `/accounts(${body.accountId})`,
      },
    },
  );

  return { status: 201, jsonBody: created };
}

app.http('createRoom', {
  methods: ['POST', 'OPTIONS'],
  route: 'rooms',
  authLevel: 'anonymous',
  handler: withCors(createRoom),
});
