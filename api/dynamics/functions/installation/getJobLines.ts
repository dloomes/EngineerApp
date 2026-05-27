import {
  app,
  type HttpRequest,
  type HttpResponseInit,
  type InvocationContext,
} from '@azure/functions';
import { dynamicsFetch, odataEscape } from '../../shared/dynamicsClient';
import { withCors } from '../../shared/httpHandler';
import type {
  DynamicsOpportunityProduct,
  OpportunityLineSummary,
} from '../../shared/types';

// GET /api/jobs/{opportunityId}/lines — opportunity product lines (SPEC §9.2)
// augmented with `installedCount` per line by counting Customer Assets that
// link back via involve_OpportunityProduct.
async function getJobLines(
  req: HttpRequest,
  _ctx: InvocationContext,
): Promise<HttpResponseInit> {
  const opportunityId = req.params.opportunityId;
  if (!opportunityId) {
    return { status: 400, jsonBody: { error: 'Missing opportunity id' } };
  }

  // Only physical equipment lines become Customer Assets — labour, delivery,
  // services etc. are excluded via preact_phase.
  const linesParams = new URLSearchParams({
    $filter: `_opportunityid_value eq '${odataEscape(opportunityId)}' and preact_phase eq 'Equipment'`,
    $select:
      'opportunityproductid,productname,quantity,priceperunit,_productid_value,preact_manufacturer,preact_model,preact_phase,description',
  });

  const linesResult = await dynamicsFetch<{
    value: DynamicsOpportunityProduct[];
  }>(`opportunityproducts?${linesParams.toString()}`);
  const lines = linesResult.value;

  // If no lines, no need to query for installed assets.
  if (lines.length === 0) {
    return { status: 200, jsonBody: [] };
  }

  // Build an OR filter to fetch every asset linked to ANY of these lines.
  // OData supports `value in (a,b,c)` but only via comma-separated lists in
  // newer versions; for compatibility we use the `eq … or eq …` chain.
  const orFilter = lines
    .map(
      (l) =>
        `_involve_opportunityproduct_value eq ${l.opportunityproductid}`,
    )
    .join(' or ');

  const assetsParams = new URLSearchParams({
    $filter: orFilter,
    $select: '_involve_opportunityproduct_value',
  });

  // Fail-soft: if this query fails (e.g. the field doesn't exist yet in
  // Dynamics), still return the lines so the app stays usable — just without
  // install counts.
  let installedCounts = new Map<string, number>();
  try {
    const assetsResult = await dynamicsFetch<{
      value: Array<{ _involve_opportunityproduct_value: string | null }>;
    }>(`msdyn_customerassets?${assetsParams.toString()}`);
    for (const a of assetsResult.value) {
      const oppProductId = a._involve_opportunityproduct_value;
      if (!oppProductId) continue;
      installedCounts.set(oppProductId, (installedCounts.get(oppProductId) ?? 0) + 1);
    }
  } catch (err) {
    // Swallow — install counts default to 0. Surfaces to logs only.
    _ctx.warn(`Install-count query failed; returning lines with count=0. ${String(err)}`);
  }

  const summaries: OpportunityLineSummary[] = lines.map((line) => ({
    ...line,
    installedCount: installedCounts.get(line.opportunityproductid) ?? 0,
  }));

  return { status: 200, jsonBody: summaries };
}

app.http('getJobLines', {
  methods: ['GET', 'OPTIONS'],
  route: 'jobs/{opportunityId}/lines',
  authLevel: 'anonymous',
  handler: withCors(getJobLines),
});
