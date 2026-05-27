import type {
  DynamicsOpportunity,
  OpportunityLineSummary,
} from '@involve/shared';
import { ApiError, USE_MOCK, apiFetch } from './client';
import { mockOpportunity, mockOpportunityLines } from './mock/jobs';

export async function getJob(ref: string): Promise<DynamicsOpportunity | null> {
  if (USE_MOCK) {
    return ref === mockOpportunity.preact_involvereference ? mockOpportunity : null;
  }
  try {
    return await apiFetch<DynamicsOpportunity>(`/jobs/${encodeURIComponent(ref)}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export async function getJobLines(
  opportunityId: string,
): Promise<OpportunityLineSummary[]> {
  if (USE_MOCK) {
    // Mirror the proxy's preact_phase filter so mock and live behave the same.
    // installedCount defaults to 0 in mock mode — exercise reinstall flows
    // by manually tweaking the fixture if needed.
    return opportunityId === mockOpportunity.opportunityid
      ? mockOpportunityLines
          .filter((l) => l.preact_phase === 'Equipment')
          .map((l) => ({ ...l, installedCount: 0 }))
      : [];
  }
  return apiFetch<OpportunityLineSummary[]>(
    `/jobs/${encodeURIComponent(opportunityId)}/lines`,
  );
}
