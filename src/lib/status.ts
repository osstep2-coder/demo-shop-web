import type { OrderStatus, Role } from "../api/types";

export const ORDER_STATUSES: OrderStatus[] = ["created", "paid", "shipped", "delivered", "cancelled", "returned"];

export const ORDER_STATUS: Record<OrderStatus, { label: string; badge: string; dot: string; description: string }> = {
  created: {
    label: "Ожидает оплаты",
    badge: "bg-amber-50 text-amber-700 ring-amber-600/20",
    dot: "bg-amber-500",
    description: "Заказ создан, товары зарезервированы",
  },
  paid: {
    label: "Оплачен",
    badge: "bg-sky-50 text-sky-700 ring-sky-600/20",
    dot: "bg-sky-500",
    description: "Оплата прошла, готовим к отправке",
  },
  shipped: {
    label: "В пути",
    badge: "bg-violet-50 text-violet-700 ring-violet-600/20",
    dot: "bg-violet-500",
    description: "Передан в службу доставки",
  },
  delivered: {
    label: "Доставлен",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    dot: "bg-emerald-500",
    description: "Заказ получен",
  },
  cancelled: {
    label: "Отменён",
    badge: "bg-slate-100 text-slate-600 ring-slate-500/20",
    dot: "bg-slate-400",
    description: "Заказ отменён",
  },
  returned: {
    label: "Возвращён",
    badge: "bg-rose-50 text-rose-700 ring-rose-600/20",
    dot: "bg-rose-500",
    description: "Товары возвращены, деньги отправлены обратно",
  },
};

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Администратор",
  manager: "Менеджер",
  customer: "Покупатель",
};

export const ROLE_BADGE: Record<Role, string> = {
  admin: "bg-brand-50 text-brand-700 ring-brand-600/20",
  manager: "bg-teal-50 text-teal-700 ring-teal-600/20",
  customer: "bg-slate-100 text-slate-700 ring-slate-500/20",
};
