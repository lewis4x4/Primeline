export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function errorResponse(message: string, status = 500): Response {
  return jsonResponse({ success: false, error: message }, status);
}

export function successResponse(
  data: unknown,
  _debug?: Record<string, unknown>,
): Response {
  const body: Record<string, unknown> = { success: true, data };
  if (_debug) body._debug = _debug;
  return jsonResponse(body, 200);
}
