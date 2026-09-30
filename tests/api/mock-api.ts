/**
 * The only place that talks to page.route. Tests describe the backend as a list of mocked endpoints;
 * every request to /api or /health must hit one of them, otherwise it is answered with 501
 * and recorded in `unhandled` (the fixture fails the test on that).
 */
import type { Page, Request, Route } from "@playwright/test";
import { fail, ok } from "./builders/envelope";
import type { ApiErrorOf, Endpoint, RequestOf, ResponseOf } from "./types";

export type Reply<E extends Endpoint> =
  | { data: ResponseOf<E> }
  | { error: ApiErrorOf<E> }
  /** Never answers: keeps the page in its loading state. */
  | { pending: true }
  /** Builds the answer from the request, e.g. echoes the sent quantity. */
  | { handler: (ctx: HandlerContext<E>) => { data: ResponseOf<E> } | { error: ApiErrorOf<E> } };

export interface HandlerContext<E extends Endpoint> {
  request: Request;
  params: Record<string, string>;
  body: RequestOf<E>;
}

export interface ApiCall {
  endpoint: Endpoint;
  params: Record<string, string>;
  query: Record<string, string>;
  body: unknown;
}

interface Mock {
  endpoint: Endpoint;
  method: string;
  pattern: RegExp;
  reply: Reply<Endpoint>;
}

/** "/api/v1/orders/{order_uuid}" -> /^\/api\/v1\/orders\/(?<order_uuid>[^/]+)$/ */
function toPattern(path: string): RegExp {
  const source = path.replace(/[.*+?^$()|[\]\\]/g, "\\$&").replace(/\{(\w+)\}/g, "(?<$1>[^/]+)");
  return new RegExp(`^${source}$`);
}

export class MockApi {
  private readonly mocks: Mock[] = [];
  private readonly pending: Route[] = [];
  /** Requests nothing was mocked for: "GET /api/v1/products?take=100". */
  readonly unhandled: string[] = [];
  /** Every mocked request, in order. For the rare check of what the UI sent. */
  readonly calls: ApiCall[] = [];

  constructor(private readonly page: Page) {}

  async install() {
    await this.page.route(
      (url) => url.pathname.startsWith("/api/") || url.pathname === "/health",
      (route) => this.handle(route),
    );
  }

  /** Mocks an endpoint. A later mock of the same endpoint wins, so a test can override defaults. */
  on<E extends Endpoint>(endpoint: E, reply: Reply<E>): this {
    const [method, path] = endpoint.split(" ");
    this.mocks.push({ endpoint, method, pattern: toPattern(path), reply: reply as Reply<Endpoint> });
    return this;
  }

  /** Aborts requests held by `pending` mocks, so they never go on to the network. */
  async dispose() {
    await Promise.all(this.pending.splice(0).map((route) => route.abort().catch(() => {})));
  }

  private async handle(route: Route) {
    const request = route.request();
    const url = new URL(request.url());

    for (let i = this.mocks.length - 1; i >= 0; i--) {
      const mock = this.mocks[i];
      const match = mock.method === request.method() ? mock.pattern.exec(url.pathname) : null;
      if (!match) continue;

      const params = { ...match.groups };
      const body: unknown = request.postDataJSON();
      this.calls.push({ endpoint: mock.endpoint, params, query: Object.fromEntries(url.searchParams), body });

      let reply = mock.reply;
      if ("pending" in reply) {
        this.pending.push(route); // stays open until dispose()
        return;
      }
      if ("handler" in reply) reply = reply.handler({ request, params, body: body as never });
      return "data" in reply
        ? route.fulfill({ status: 200, json: ok(reply.data) })
        : route.fulfill({ status: reply.error.status, json: fail(reply.error.code, reply.error.message) });
    }

    this.unhandled.push(`${request.method()} ${url.pathname}${url.search}`);
    return route.fulfill({ status: 501, json: fail("test.not_mocked", `No mock for ${request.method()} ${url.pathname}`) });
  }
}
