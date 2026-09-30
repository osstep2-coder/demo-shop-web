/** Accounts from TEST_DATA.md, with fixed uuids. */
import type { User } from "../types";

export const users = {
  anna: {
    uuid: "0a000000-0000-4000-8000-000000000001",
    role: "customer",
    email: "anna@shop.test",
    firstName: "Анна",
    lastName: "Смирнова",
    status: "active",
    createdAt: "2026-09-01T10:00:00.000+00:00",
  },
  manager: {
    uuid: "0a000000-0000-4000-8000-000000000002",
    role: "manager",
    email: "manager@shop.test",
    firstName: "Олег",
    lastName: "Менеджеров",
    status: "active",
    createdAt: "2026-09-01T10:00:00.000+00:00",
  },
  admin: {
    uuid: "0a000000-0000-4000-8000-000000000003",
    role: "admin",
    email: "admin@shop.test",
    firstName: "Админ",
    lastName: "Админов",
    status: "active",
    createdAt: "2026-09-01T10:00:00.000+00:00",
  },
} satisfies Record<string, User>;
