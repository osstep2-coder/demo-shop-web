import type { Page } from "@playwright/test";
import type { MockApi } from "../mock-api";
import type { User } from "../types";

/** The key the app keeps the token under (src/api/client.ts). */
const TOKEN_KEY = "shop.token";
const TOKEN = "test-token";

export class AuthRoutes {
  constructor(
    private readonly page: Page,
    private readonly api: MockApi,
  ) {}

  /** The app starts with a token in localStorage and /auth/me answers with this user. */
  async signInAs(user: User) {
    await this.page.addInitScript(([key, token]) => localStorage.setItem(key, token), [TOKEN_KEY, TOKEN]);
    this.api.on("GET /api/v1/auth/me", { data: user });
  }
}
