import { expect, type Locator, type Page } from "@playwright/test";
import { BasePage } from "./base.page";
import { ModalComponent } from "./components/modal.component";

export type CartState = "loading" | "error" | "empty" | "ready";
export type PromoState = "form" | "pending" | "error" | "applied" | "not-applicable";

export class PromoBlock {
  readonly root: Locator;
  readonly input: Locator;
  readonly applyButton: Locator;
  readonly error: Locator;
  readonly removeButton: Locator;

  constructor(page: Page) {
    this.root = page.getByTestId("cart-promo");
    this.input = page.getByTestId("cart-promo-input");
    this.applyButton = page.getByTestId("cart-promo-apply");
    this.error = page.getByTestId("cart-promo-error");
    this.removeButton = page.getByTestId("cart-promo-remove");
  }

  async expectState(state: PromoState) {
    await expect(this.root).toHaveAttribute("data-state", state);
  }
}

export class CartPage extends BasePage<CartState> {
  readonly path = "/cart";
  readonly root: Locator;
  readonly items: Locator;
  readonly promo: PromoBlock;
  readonly totals: Locator;
  readonly checkoutButton: Locator;
  readonly clearButton: Locator;
  readonly clearModal: ModalComponent;

  constructor(page: Page) {
    super(page);
    this.root = page.getByTestId("cart-page");
    this.items = page.getByTestId("cart-item");
    this.promo = new PromoBlock(page);
    this.totals = page.getByTestId("cart-totals");
    this.checkoutButton = page.getByTestId("cart-checkout-button");
    this.clearButton = page.getByTestId("cart-clear-button");
    this.clearModal = new ModalComponent(page.getByTestId("cart-clear-modal"));
  }

  async applyPromo(code: string) {
    await this.promo.input.fill(code);
    await this.promo.applyButton.click();
    await this.settle();
  }

  async openClearDialog() {
    await this.clearButton.click();
    await expect(this.clearModal.root).toHaveAttribute("data-state", "open");
    await this.settle();
  }
}
