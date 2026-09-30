import type { MockApi } from "../mock-api";
import type { ApiErrorOf, Order } from "../types";

export class OrdersRoutes {
  constructor(private readonly api: MockApi) {}

  /** After checkout the app opens /orders/:uuid/pay, which reads the order back. */
  checkoutReturns(order: Order) {
    this.api.on("POST /api/v1/orders", { data: order });
    this.returns(order);
  }

  checkoutPending() {
    this.api.on("POST /api/v1/orders", { pending: true });
  }

  checkoutFails(error: ApiErrorOf<"POST /api/v1/orders">) {
    this.api.on("POST /api/v1/orders", { error });
  }

  returns(order: Order) {
    this.api.on("GET /api/v1/orders/{order_uuid}", { data: order });
  }
}
