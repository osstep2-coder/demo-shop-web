/** One function per API endpoint, grouped like the swagger tags. */
import { api } from "./client";
import type { Cart, LoginResult, Order, OrderStatus, Paged, PaymentToken, Product, ProductSort, Promo, Role, User, UserDetails, UserStatus } from "./types";

export const authApi = {
  register: (body: { email: string; password: string; firstName: string; lastName: string }) => api.post<User>("/auth/register", body),
  login: (body: { email: string; password: string }) => api.post<LoginResult>("/auth/login", body),
  me: () => api.get<User>("/auth/me"),
};

export interface ProductQuery {
  category?: string;
  q?: string;
  inStock?: boolean;
  sort?: ProductSort;
  take?: number;
  skip?: number;
}

export const productsApi = {
  list: (query: ProductQuery = {}) => api.get<Paged<Product>>("/products", { ...query }),
  get: (uuid: string) => api.get<Product>(`/products/${uuid}`),
  create: (body: { sku: string; name: string; category: string; price: number; stock: number }) => api.post<Product>("/products", body),
  update: (uuid: string, body: { name?: string; category?: string; price?: number; isActive?: boolean }) => api.patch<Product>(`/products/${uuid}`, body),
  setStock: (uuid: string, stock: number) => api.put<Product>(`/products/${uuid}/stock`, { stock }),
};

export const cartApi = {
  get: () => api.get<Cart>("/cart"),
  add: (productUuid: string, quantity = 1) => api.post<Cart>("/cart/items", { productUuid, quantity }),
  setQuantity: (productUuid: string, quantity: number) => api.put<Cart>(`/cart/items/${productUuid}`, { quantity }),
  remove: (productUuid: string) => api.delete<Cart>(`/cart/items/${productUuid}`),
  clear: () => api.delete<Cart>("/cart"),
  applyPromo: (code: string) => api.put<Cart>("/cart/promo", { code }),
  removePromo: () => api.delete<Cart>("/cart/promo"),
};

export interface OrderQuery {
  status?: OrderStatus;
  userUuid?: string;
  take?: number;
  skip?: number;
}

export const ordersApi = {
  checkout: (deliveryAddress: string) => api.post<Order>("/orders", { deliveryAddress }),
  list: (query: OrderQuery = {}) => api.get<Paged<Order>>("/orders", { ...query }),
  get: (uuid: string) => api.get<Order>(`/orders/${uuid}`),
  pay: (uuid: string, paymentToken: PaymentToken) => api.post<Order>(`/orders/${uuid}/pay`, { paymentToken }),
  cancel: (uuid: string, reason?: string) => api.post<Order>(`/orders/${uuid}/cancel`, { reason: reason || null }),
  ship: (uuid: string) => api.post<Order>(`/orders/${uuid}/ship`),
  deliver: (uuid: string) => api.post<Order>(`/orders/${uuid}/deliver`),
  return: (uuid: string, reason?: string) => api.post<Order>(`/orders/${uuid}/return`, { reason: reason || null }),
};

export interface UserQuery {
  role?: Role;
  status?: UserStatus;
  email?: string;
  q?: string;
  take?: number;
  skip?: number;
}

export const usersApi = {
  list: (query: UserQuery = {}) => api.get<Paged<User>>("/users", { ...query }),
  get: (uuid: string) => api.get<UserDetails>(`/users/${uuid}`),
  create: (body: { role: Role; email: string; password: string; firstName: string; lastName: string }) => api.post<User>("/users", body),
  setStatus: (uuid: string, status: UserStatus) => api.put<User>(`/users/${uuid}/status`, { status }),
  delete: (uuid: string) => api.delete<{ uuid: string; deleted: boolean }>(`/users/${uuid}`),
};

export const promosApi = {
  list: () => api.get<Promo[]>("/promos"),
  create: (body: { code: string; type: "percent" | "fixed"; value: number; minOrderTotal: number; expiresAt: string | null; maxUsesPerUser: number }) =>
    api.post<Promo>("/promos", body),
  update: (code: string, body: { isActive?: boolean; expiresAt?: string; minOrderTotal?: number }) => api.patch<Promo>(`/promos/${code}`, body),
};
