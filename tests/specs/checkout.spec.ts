/** Checkout states. One test = one state = one screenshot. */
import { aCart, catalog, users } from "../api";
import { expect, test } from "../fixtures";

const cart = aCart().withItem(catalog.mouse).withItem(catalog.cable, 2).build();
const address = { street: "ул. Тверская, д. 7", flat: "12" };

test.beforeEach(async ({ auth }) => {
  await auth.signInAs(users.anna);
});

test("loading", async ({ page, cartApi, checkoutPage }) => {
  cartApi.loading();
  await checkoutPage.open("loading");
  await expect(page).toHaveScreenshot("checkout-loading.png", { fullPage: true });
});

test("load error", async ({ page, cartApi, checkoutPage }) => {
  cartApi.fails({ status: 500, code: "internal" });
  await checkoutPage.open("error");
  await expect(page).toHaveScreenshot("checkout-error.png", { fullPage: true });
});

test("default form", async ({ page, cartApi, checkoutPage }) => {
  cartApi.returns(cart);
  await checkoutPage.open("ready");
  await checkoutPage.expectFormState("idle");
  await expect(page).toHaveScreenshot("checkout-default.png", { fullPage: true });
});

test("with discount", async ({ page, cartApi, checkoutPage }) => {
  cartApi.returns(aCart().withItem(catalog.keyboard).withItem(catalog.cable, 2).withPromo("SALE15").build());
  await checkoutPage.open("ready");
  await expect(page).toHaveScreenshot("checkout-with-discount.png", { fullPage: true });
});

test("validation error", async ({ page, cartApi, checkoutPage }) => {
  cartApi.returns(cart);
  await checkoutPage.open("ready");
  await checkoutPage.submit();
  await checkoutPage.expectFormState("invalid");
  await expect(page).toHaveScreenshot("checkout-validation-error.png", { fullPage: true });
});

test("out of stock error", async ({ page, cartApi, ordersApi, checkoutPage }) => {
  cartApi.returns(cart);
  ordersApi.checkoutFails({ status: 409, code: "orders.out_of_stock", message: "Not enough stock: CB-004 (requested 2, available 1)" });
  await checkoutPage.open("ready");
  await checkoutPage.fillAddress(address);
  await checkoutPage.submit();
  await checkoutPage.expectFormState("error");
  await expect(page).toHaveScreenshot("checkout-api-error.png", { fullPage: true });
});

test("submitting", async ({ page, cartApi, ordersApi, checkoutPage }) => {
  cartApi.returns(cart);
  ordersApi.checkoutPending();
  await checkoutPage.open("ready");
  await checkoutPage.fillAddress(address);
  await checkoutPage.submit();
  await checkoutPage.expectFormState("submitting");
  await expect(page).toHaveScreenshot("checkout-submitting.png", { fullPage: true });
});
