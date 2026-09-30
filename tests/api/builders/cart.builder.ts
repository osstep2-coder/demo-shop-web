/**
 * Cart builder. Totals are computed with the same rules as cart_out() in api/server/app.py,
 * so a mocked cart always looks like one the real API could return.
 */
import { promos, type PromoCode } from "../data/promos";
import type { Cart, CartItem, Product, Promo } from "../types";

export const DELIVERY_FEE = 29900;
export const FREE_DELIVERY_FROM = 300000;

export function discountFor(promo: Promo, itemsTotal: number): number {
  return promo.type === "percent" ? Math.floor((itemsTotal * promo.value) / 100) : Math.min(promo.value, itemsTotal);
}

export function deliveryFeeFor(amountAfterDiscount: number): number {
  return amountAfterDiscount >= FREE_DELIVERY_FROM ? 0 : DELIVERY_FEE;
}

interface State {
  items: CartItem[];
  promo: { promo: Promo; applied: boolean } | null;
  overrides: Partial<Cart>;
}

export class CartBuilder {
  private constructor(private readonly state: State) {}

  static empty() {
    return new CartBuilder({ items: [], promo: null, overrides: {} });
  }

  withItem(product: Product, quantity = 1, { inStock = true } = {}) {
    const item: CartItem = {
      productUuid: product.uuid,
      sku: product.sku,
      name: product.name,
      price: product.price,
      quantity,
      lineTotal: product.price * quantity,
      inStock,
    };
    return this.with({ items: [...this.state.items, item] });
  }

  /** Out of stock or taken off sale: the cart shows a warning and blocks checkout. */
  withUnavailableItem(product: Product, quantity = 1) {
    return this.withItem(product, quantity, { inStock: false });
  }

  withPromo(code: PromoCode) {
    return this.with({ promo: { promo: promos[code], applied: true } });
  }

  /** The code stays in the cart, but no longer fits it (e.g. the total dropped below the minimum). */
  withPromoNotApplicable(code: PromoCode) {
    return this.with({ promo: { promo: promos[code], applied: false } });
  }

  /** Last resort for a state the rules above cannot produce. */
  override(overrides: Partial<Cart>) {
    return this.with({ overrides: { ...this.state.overrides, ...overrides } });
  }

  build(): Cart {
    const { items, promo, overrides } = this.state;
    const itemsTotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
    const discount = promo?.applied ? discountFor(promo.promo, itemsTotal) : 0;
    const deliveryFee = items.length ? deliveryFeeFor(itemsTotal - discount) : 0;
    return {
      items,
      itemsTotal,
      promo: promo && { code: promo.promo.code, applied: promo.applied },
      discount,
      deliveryFee,
      total: itemsTotal - discount + deliveryFee,
      ...overrides,
    };
  }

  private with(patch: Partial<State>) {
    return new CartBuilder({ ...this.state, ...patch });
  }
}

export const aCart = () => CartBuilder.empty();
