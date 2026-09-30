/** Cart states. One test = one state = one screenshot. */
import { aCart, catalog, users } from "../api";
import { expect, test } from "../fixtures";

test.beforeEach(async ({ auth }) => {
  await auth.signInAs(users.anna);
});

test("loading", async ({ page, cartApi, cartPage }) => {
  cartApi.loading();
  await cartPage.open("loading");
  await expect(page).toHaveScreenshot("cart-loading.png", { fullPage: true });
});

test("load error", async ({ page, cartApi, cartPage }) => {
  cartApi.fails({ status: 500, code: "internal" });
  await cartPage.open("error");
  await expect(page).toHaveScreenshot("cart-error.png", { fullPage: true });
});

test("empty", async ({ page, cartApi, cartPage }) => {
  cartApi.returns(aCart().build());
  await cartPage.open("empty");
  await expect(page).toHaveScreenshot("cart-empty.png", { fullPage: true });
});

test("with items, paid delivery", async ({ page, cartApi, cartPage }) => {
  cartApi.returns(aCart().withItem(catalog.mouse).withItem(catalog.cable, 2).build());
  await cartPage.open("ready");
  await expect(page).toHaveScreenshot("cart-with-items.png", { fullPage: true });
});

test("free delivery", async ({ page, cartApi, cartPage }) => {
  cartApi.returns(aCart().withItem(catalog.keyboard).withItem(catalog.cable, 2).build());
  await cartPage.open("ready");
  await expect(page).toHaveScreenshot("cart-free-delivery.png", { fullPage: true });
});

test("promo applied", async ({ page, cartApi, cartPage }) => {
  cartApi.returns(aCart().withItem(catalog.keyboard).withItem(catalog.cable, 2).withPromo("SALE15").build());
  await cartPage.open("ready");
  await cartPage.promo.expectState("applied");
  await expect(page).toHaveScreenshot("cart-promo-applied.png", { fullPage: true });
});

test("promo no longer applies", async ({ page, cartApi, cartPage }) => {
  cartApi.returns(aCart().withItem(catalog.mouse).withPromoNotApplicable("MINUS500").build());
  await cartPage.open("ready");
  await cartPage.promo.expectState("not-applicable");
  await expect(page).toHaveScreenshot("cart-promo-not-applicable.png", { fullPage: true });
});

test("unavailable item blocks checkout", async ({ page, cartApi, cartPage }) => {
  cartApi.returns(aCart().withItem(catalog.mouse).withUnavailableItem(catalog.gamepad).build());
  await cartPage.open("ready");
  await expect(cartPage.checkoutButton).toHaveAttribute("data-state", "blocked");
  await expect(page).toHaveScreenshot("cart-item-unavailable.png", { fullPage: true });
});

test("promo error", async ({ page, cartApi, cartPage }) => {
  cartApi.returns(aCart().withItem(catalog.mouse).withItem(catalog.cable, 2).build());
  cartApi.promoFails({ status: 400, code: "promo.expired" });
  await cartPage.open("ready");
  await cartPage.applyPromo("EXPIRED20");
  await cartPage.promo.expectState("error");
  await expect(page).toHaveScreenshot("cart-promo-error.png", { fullPage: true });
});

test("clear cart confirmation", async ({ page, cartApi, cartPage }) => {
  cartApi.returns(aCart().withItem(catalog.mouse).withItem(catalog.cable, 2).build());
  await cartPage.open("ready");
  await cartPage.openClearDialog();
  // A modal is fixed to the viewport and locks page scroll, so the shot is the viewport, not the full page.
  await expect(page).toHaveScreenshot("cart-clear-confirm.png");
});
