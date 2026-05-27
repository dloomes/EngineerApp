// CORS is handled by the Azure Functions HOST, not by application code:
//   - Deployed: the Function App's platform CORS "Allowed Origins" list
//     (Portal -> Function App -> API -> CORS).
//   - Local dev: the Host.CORS value in local.settings.json.
//
// The host's CORS layer runs before the function and owns the preflight
// (OPTIONS) response; it cannot be disabled. If the app ALSO emitted CORS
// headers we'd get duplicate Access-Control-Allow-Origin values, which
// browsers reject. So we deliberately emit none here and let the host do it.
export function buildCorsHeaders(_origin: string | null): Record<string, string> {
  return {};
}

export function __resetCorsCacheForTests(): void {
  // No-op: CORS is no longer handled in application code (see above).
}
