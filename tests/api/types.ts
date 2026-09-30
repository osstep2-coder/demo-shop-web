/** Type helpers over the generated contract, so mocks can only return what the API documents. */
import type { ApiEndpoints } from "./generated/api";

export type * from "./generated/api";

/** "METHOD /path" exactly as in Swagger, e.g. "GET /api/v1/cart" or "GET /api/v1/orders/{order_uuid}". */
export type Endpoint = keyof ApiEndpoints;
export type RequestOf<E extends Endpoint> = ApiEndpoints[E]["request"];
export type ResponseOf<E extends Endpoint> = ApiEndpoints[E]["response"];
export type ErrorStatusOf<E extends Endpoint> = keyof ApiEndpoints[E]["errors"] & number;
export type ErrorCodeOf<E extends Endpoint, S extends ErrorStatusOf<E>> = ApiEndpoints[E]["errors"][S];

/** A documented error of an endpoint: the status and code must go together as in OpenAPI. */
export type ApiErrorOf<E extends Endpoint> = {
  [S in ErrorStatusOf<E>]: { status: S; code: ErrorCodeOf<E, S>; message?: string };
}[ErrorStatusOf<E>];
