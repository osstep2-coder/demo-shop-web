import { users } from "../data/users";
import type { User } from "../types";

/** A customer by default; pass fields to change. */
export function aUser(overrides: Partial<User> = {}): User {
  return { ...users.anna, ...overrides };
}
