import type { Locator } from "@playwright/test";

export class ModalComponent {
  readonly closeButton: Locator;

  constructor(readonly root: Locator) {
    this.closeButton = root.getByRole("button", { name: "Закрыть" });
  }

  button(name: string) {
    return this.root.getByRole("button", { name, exact: true });
  }
}
