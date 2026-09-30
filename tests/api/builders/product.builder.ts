import { catalog } from "../data/catalog";
import type { Product } from "../types";

/** A catalog product by default; pass fields to change (e.g. `{ stock: 0 }`). */
export function aProduct(overrides: Partial<Product> = {}): Product {
  return { ...catalog.keyboard, ...overrides };
}
