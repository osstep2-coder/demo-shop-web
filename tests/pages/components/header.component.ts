import type { Locator, Page } from "@playwright/test";

export class HeaderComponent {
  readonly root: Locator;
  readonly cartLink: Locator;

  constructor(page: Page) {
    this.root = page.getByTestId("app-header");
    this.cartLink = page.getByTestId("header-cart-link");
  }
}
