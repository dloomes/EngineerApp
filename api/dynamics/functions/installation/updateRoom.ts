import {
  app,
  type HttpRequest,
  type HttpResponseInit,
  type InvocationContext,
} from '@azure/functions';
import { dynamicsFetch } from '../../shared/dynamicsClient';
import { withCors } from '../../shared/httpHandler';

interface UpdateRoomBody {
  name: string;
}

// PATCH /api/rooms/{roomId} — edit Functional Location name (SPEC §9.8).
// PATCH only — never POST.
async function updateRoom(
  req: HttpRequest,
  _ctx: InvocationContext,
): Promise<HttpResponseInit> {
  const roomId = req.params.roomId;
  if (!roomId) {
    return { status: 400, jsonBody: { error: 'Missing room id' } };
  }

  const body = (await req.json()) as Partial<UpdateRoomBody>;
  if (!body?.name) {
    return { status: 400, jsonBody: { error: 'name is required' } };
  }

  await dynamicsFetch(`msdyn_functionallocations(${roomId})`, {
    method: 'PATCH',
    body: { msdyn_name: body.name },
  });

  return { status: 204 };
}

app.http('updateRoom', {
  methods: ['PATCH', 'OPTIONS'],
  route: 'rooms/{roomId}',
  authLevel: 'anonymous',
  handler: withCors(updateRoom),
});
