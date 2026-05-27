import {
  app,
  type HttpRequest,
  type HttpResponseInit,
  type InvocationContext,
} from '@azure/functions';
import { dynamicsFetch, odataEscape } from '../../shared/dynamicsClient';
import { withCors } from '../../shared/httpHandler';
import type { DynamicsOpportunity } from '../../shared/types';

// GET /api/jobs/{ref} — look up opportunity by preact_involvereference (SPEC §9.1).
async function getJob(
  req: HttpRequest,
  _ctx: InvocationContext,
): Promise<HttpResponseInit> {
  const ref = req.params.ref;
  if (!ref) {
    return { status: 400, jsonBody: { error: 'Missing job reference' } };
  }

  const params = new URLSearchParams({
    $filter: `preact_involvereference eq '${odataEscape(ref)}'`,
    $select:
      'opportunityid,name,_parentaccountid_value,preact_involvereference,involve_porecieved',
    // Pull the customer name in the same request so the UI can show it
    // without a follow-up /accounts/{id} fetch.
    $expand: 'parentaccountid($select=accountid,name)',
    $top: '1',
  });

  const result = await dynamicsFetch<{ value: DynamicsOpportunity[] }>(
    `opportunities?${params.toString()}`,
  );

  const job = result.value[0];
  if (!job) {
    return { status: 404, jsonBody: { error: 'Job not found' } };
  }

  return { status: 200, jsonBody: job };
}

app.http('getJob', {
  methods: ['GET', 'OPTIONS'],
  route: 'jobs/{ref}',
  authLevel: 'anonymous',
  handler: withCors(getJob),
});
