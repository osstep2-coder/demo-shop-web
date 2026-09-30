/**
 * Order builder. The status drives the rest: timestamps, history, payments and paymentDeadline
 * are filled the way order_out() in api/server/app.py fills them. Dates count from FIXED_NOW.
 */
import { FIXED_NOW } from "../../fixtures/constants";
import { users } from "../data/users";
import type { Cart, Order, OrderHistoryEntry, Payment } from "../types";

type Status = Order["status"];

const PAYMENT_TTL_MINUTES = 15;
const HOUR = 60 * 60 * 1000;

/** API timestamps: `2026-09-30T09:00:00.000+00:00`. */
const iso = (ms: number) => new Date(ms).toISOString().replace("Z", "+00:00");
/** paymentDeadline comes with seconds precision: `2026-09-30T09:15:00+00:00`. */
const isoSeconds = (ms: number) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, "+00:00");

/** Statuses an order passes through to reach the given one. */
const PATH: Record<Status, Status[]> = {
  created: ["created"],
  paid: ["created", "paid"],
  shipped: ["created", "paid", "shipped"],
  delivered: ["created", "paid", "shipped", "delivered"],
  cancelled: ["created", "cancelled"],
  returned: ["created", "paid", "shipped", "delivered", "returned"],
};

interface State {
  uuid: string;
  number: number;
  userUuid: string;
  status: Status;
  deliveryAddress: string;
  cart: Cart;
  promoCode: string | null;
  overrides: Partial<Order>;
}

export class OrderBuilder {
  private constructor(private readonly state: State) {}

  static create() {
    return new OrderBuilder({
      uuid: "0b000000-0000-4000-8000-000000001042",
      number: 1042,
      userUuid: users.anna.uuid,
      status: "created",
      deliveryAddress: "г. Москва, ул. Тверская, д. 7, кв. 12",
      cart: { items: [], itemsTotal: 0, promo: null, discount: 0, deliveryFee: 0, total: 0 },
      promoCode: null,
      overrides: {},
    });
  }

  /** Items and totals as they were in the cart at checkout. */
  fromCart(cart: Cart) {
    return this.with({ cart, promoCode: cart.promo?.applied ? cart.promo.code : null });
  }

  withStatus(status: Status) {
    return this.with({ status });
  }

  withNumber(number: number) {
    return this.with({ number });
  }

  withAddress(deliveryAddress: string) {
    return this.with({ deliveryAddress });
  }

  override(overrides: Partial<Order>) {
    return this.with({ overrides: { ...this.state.overrides, ...overrides } });
  }

  build(): Order {
    const { cart, status } = this.state;
    const steps = PATH[status];
    // A fresh unpaid order was placed a minute ago; later statuses happened an hour apart, the last one an hour ago.
    const createdMs = status === "created" ? FIXED_NOW.getTime() - 60 * 1000 : FIXED_NOW.getTime() - steps.length * HOUR;
    const at = (step: Status) => (steps.includes(step) ? iso(createdMs + steps.indexOf(step) * HOUR) : null);

    const history: OrderHistoryEntry[] = steps.map((to, i) => ({
      at: iso(createdMs + i * HOUR),
      from: i === 0 ? null : steps[i - 1],
      to,
      actorUuid: to === "shipped" || to === "delivered" ? users.manager.uuid : this.state.userUuid,
      comment: null,
    }));

    const payments: Payment[] = [];
    if (steps.includes("paid")) payments.push(this.payment("charge", at("paid")!, 1));
    if (status === "returned") payments.push(this.payment("refund", at("returned")!, 2));

    return {
      uuid: this.state.uuid,
      number: this.state.number,
      userUuid: this.state.userUuid,
      status,
      deliveryAddress: this.state.deliveryAddress,
      items: cart.items.map(({ productUuid, sku, name, price, quantity, lineTotal }) => ({ productUuid, sku, name, price, quantity, lineTotal })),
      itemsTotal: cart.itemsTotal,
      discount: cart.discount,
      deliveryFee: cart.deliveryFee,
      total: cart.total,
      promoCode: this.state.promoCode,
      createdAt: iso(createdMs),
      paidAt: at("paid"),
      shippedAt: at("shipped"),
      deliveredAt: at("delivered"),
      cancelledAt: at("cancelled"),
      returnedAt: at("returned"),
      ...(status === "created" && { paymentDeadline: isoSeconds(createdMs + PAYMENT_TTL_MINUTES * 60 * 1000) }),
      history,
      payments,
      ...this.state.overrides,
    };
  }

  private payment(kind: Payment["kind"], createdAt: string, n: number): Payment {
    return {
      uuid: `0c000000-0000-4000-8000-00000000000${n}`,
      kind,
      status: "success",
      amount: this.state.cart.total,
      errorCode: null,
      createdAt,
    };
  }

  private with(patch: Partial<State>) {
    return new OrderBuilder({ ...this.state, ...patch });
  }
}

export const anOrder = () => OrderBuilder.create();
