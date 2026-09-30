/** Response envelopes of the API: every response is wrapped in {success, data | error, meta}. */
import type { ErrorResponse } from "../types";

/** Shown in the UI next to errors (`500 · internal · TEST00000001`), so it must be fixed. */
export const CORRELATION_ID = "TEST00000001";

export function ok<T>(data: T) {
  return { success: true as const, data, meta: { correlationId: CORRELATION_ID } };
}

export function fail(code: string, message = `Mocked error: ${code}`): ErrorResponse {
  return { success: false, error: { code, message }, meta: { correlationId: CORRELATION_ID } };
}
