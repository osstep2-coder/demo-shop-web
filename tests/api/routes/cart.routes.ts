import type { MockApi } from "../mock-api";
import type { ApiErrorOf, Cart } from "../types";

export class CartRoutes {
  constructor(private readonly api: MockApi) {}

  returns(cart: Cart) {
    this.api.on("GET /api/v1/cart", { data: cart });
  }

  loading() {
    this.api.on("GET /api/v1/cart", { pending: true });
  }

  fails(error: ApiErrorOf<"GET /api/v1/cart">) {
    this.api.on("GET /api/v1/cart", { error });
  }

  promoApplies(cart: Cart) {
    this.api.on("PUT /api/v1/cart/promo", { data: cart });
  }

  promoFails(error: ApiErrorOf<"PUT /api/v1/cart/promo">) {
    this.api.on("PUT /api/v1/cart/promo", { error });
  }
}
