export type Role = "admin" | "manager" | "customer";
export type UserStatus = "active" | "blocked";
export type OrderStatus = "created" | "paid" | "shipped" | "delivered" | "cancelled" | "returned";
export type ProductSort = "newest" | "price_asc" | "price_desc" | "name";
export type PaymentToken = "tok_success" | "tok_declined" | "tok_insufficient_funds";

export interface Paged<T> {
  items: T[];
  total: number;
}

export interface User {
  uuid: string;
  role: Role;
  email: string;
  firstName: string;
  lastName: string;
  status: UserStatus;
  createdAt: string;
}

export interface UserDetails extends User {
  ordersCount: number;
}

export interface LoginResult {
  token: string;
  expiresAt: number;
  user: User;
}

/** All money is integer kopecks. */
export interface Product {
  uuid: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  isActive: boolean;
}

export interface CartItem {
  productUuid: string;
  sku: string;
  name: string;
  price: number;
  quantity: number;
  lineTotal: number;
  inStock: boolean;
}

export interface Cart {
  items: CartItem[];
  itemsTotal: number;
  promo: { code: string; applied: boolean } | null;
  discount: number;
  deliveryFee: number;
  total: number;
}

export interface OrderItem {
  productUuid: string;
  sku: string;
  name: string;
  price: number;
  quantity: number;
  lineTotal: number;
}

export interface OrderHistoryEntry {
  at: string;
  from: OrderStatus | null;
  to: OrderStatus;
  actorUuid: string | null;
  comment: string | null;
}

export interface Payment {
  uuid: string;
  kind: "charge" | "refund";
  status: "success" | "failed";
  amount: number;
  errorCode: string | null;
  createdAt: string;
}

export interface Order {
  uuid: string;
  number: number;
  userUuid: string;
  status: OrderStatus;
  deliveryAddress: string;
  items: OrderItem[];
  itemsTotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  promoCode: string | null;
  createdAt: string;
  paidAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  returnedAt: string | null;
  paymentDeadline?: string;
  history?: OrderHistoryEntry[];
  payments?: Payment[];
}

export interface Promo {
  code: string;
  type: "percent" | "fixed";
  value: number;
  minOrderTotal: number;
  expiresAt: string | null;
  maxUsesPerUser: number;
  isActive: boolean;
}
