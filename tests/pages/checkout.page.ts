import { expect, type Locator, type Page } from "@playwright/test";
import { BasePage } from "./base.page";

export type CheckoutState = "loading" | "error" | "ready";
export type CheckoutFormState = "idle" | "invalid" | "submitting" | "error";

export interface Address {
  city?: string;
  street: string;
  flat?: string;
}

export class CheckoutPage extends BasePage<CheckoutState> {
  readonly path = "/checkout";
  readonly root: Locator;
  readonly form: Locator;
  readonly city: Locator;
  readonly street: Locator;
  readonly flat: Locator;
  readonly addressPreview: Locator;
  readonly items: Locator;
  readonly error: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    super(page);
    this.root = page.getByTestId("checkout-page");
    this.form = page.getByTestId("checkout-form");
    this.city = page.getByTestId("checkout-city");
    this.street = page.getByTestId("checkout-street");
    this.flat = page.getByTestId("checkout-flat");
    this.addressPreview = page.getByTestId("checkout-address-preview");
    this.items = page.getByTestId("checkout-items");
    this.error = page.getByTestId("checkout-error");
    this.submitButton = page.getByTestId("checkout-submit");
  }

  async fillAddress({ city, street, flat }: Address) {
    if (city !== undefined) await this.city.fill(city);
    await this.street.fill(street);
    if (flat !== undefined) await this.flat.fill(flat);
    await this.settle();
  }

  async submit() {
    await this.submitButton.click();
    await this.settle();
  }

  async expectFormState(state: CheckoutFormState) {
    await expect(this.form).toHaveAttribute("data-state", state);
  }
}
