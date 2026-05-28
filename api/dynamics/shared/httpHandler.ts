import type {
  HttpHandler,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from '@azure/functions';
import { isAuthorized } from './auth';
import { buildCorsHeaders } from './cors';
import { DynamicsError } from './dynamicsClient';

export function withCors(handler: HttpHandler): HttpHandler {
  return async (
    req: HttpRequest,
    ctx: InvocationContext,
  ): Promise<HttpResponseInit> => {
    const corsHeaders = buildCorsHeaders(req.headers.get('origin'));

    if (req.method === 'OPTIONS') {
      return { status: 204, headers: corsHeaders };
    }

    // Require a valid Entra token (no-op when auth isn't configured).
    if (!(await isAuthorized(req))) {
      return {
        status: 401,
        headers: corsHeaders,
        jsonBody: { error: 'Unauthorized' },
      };
    }

    try {
      const result = (await handler(req, ctx)) ?? {};
      return {
        ...result,
        headers: { ...corsHeaders, ...(result.headers ?? {}) },
      };
    } catch (err) {
      ctx.error(err);

      if (err instanceof DynamicsError) {
        return {
          status: err.status >= 400 && err.status < 600 ? err.status : 502,
          headers: corsHeaders,
          jsonBody: { error: 'Dynamics request failed', status: err.status },
        };
      }

      return {
        status: 500,
        headers: corsHeaders,
        jsonBody: { error: 'Internal server error' },
      };
    }
  };
}
