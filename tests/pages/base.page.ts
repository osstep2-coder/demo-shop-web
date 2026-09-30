import { expect, type Locator, type Page } from "@playwright/test";
import { HeaderComponent } from "./components/header.component";

/** A page is a URL plus a root element whose data-state says what the page is showing. */
export abstract class BasePage<State extends string> {
  abstract readonly path: string;
  abstract readonly root: Locator;
  readonly header: HeaderComponent;

  constructor(readonly page: Page) {
    this.header = new HeaderComponent(page);
  }

  /** Opens the page and waits until it settles in the given state. */
  async open(state: State) {
    await this.page.goto(this.path);
    await this.expectState(state);
  }

  async expectState(state: State) {
    await expect(this.root).toHaveAttribute("data-state", state);
  }

  /**
   * Every action ends here, so the screenshot does not depend on where Playwright scrolled to reach
   * an element (sticky blocks move with scroll) or where the mouse stopped (hover styles).
   */
  protected async settle() {
    await this.page.mouse.move(0, 0);
    await this.page.evaluate(() => window.scrollTo(0, 0));
  }
}
