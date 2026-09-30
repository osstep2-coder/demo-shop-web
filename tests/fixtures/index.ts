/**
 * Specs import `test` and `expect` from here only. Every test gets:
 *  - a browser clock frozen at FIXED_NOW;
 *  - MockApi installed before the first navigation (auto), which fails the test on any unmocked request;
 *  - domain mocks (auth, cartApi, ordersApi) and page objects.
 */
import { test as base, expect } from "@playwright/test";
import { MockApi } from "../api/mock-api";
import { AuthRoutes } from "../api/routes/auth.routes";
import { CartRoutes } from "../api/routes/cart.routes";
import { OrdersRoutes } from "../api/routes/orders.routes";
import { CartPage } from "../pages/cart.page";
import { CheckoutPage } from "../pages/checkout.page";
import { FIXED_NOW } from "./constants";

interface Fixtures {
  mockApi: MockApi;
  auth: AuthRoutes;
  cartApi: CartRoutes;
  ordersApi: OrdersRoutes;
  cartPage: CartPage;
  checkoutPage: CheckoutPage;
}

export const test = base.extend<Fixtures>({
  page: async ({ page }, use) => {
    await page.clock.setFixedTime(FIXED_NOW);
    await use(page);
  },

  mockApi: [
    async ({ page }, use) => {
      const api = new MockApi(page);
      await api.install();
      await use(api);
      await api.dispose();
      await page.unrouteAll({ behavior: "ignoreErrors" });
      expect(api.unhandled, "Requests that reached no mock (add them with mockApi.on)").toEqual([]);
    },
    { auto: true },
  ],

  auth: async ({ page, mockApi }, use) => use(new AuthRoutes(page, mockApi)),
  cartApi: async ({ mockApi }, use) => use(new CartRoutes(mockApi)),
  ordersApi: async ({ mockApi }, use) => use(new OrdersRoutes(mockApi)),

  cartPage: async ({ page }, use) => use(new CartPage(page)),
  checkoutPage: async ({ page }, use) => use(new CheckoutPage(page)),
});

export { expect };
