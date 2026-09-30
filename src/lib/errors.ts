import { ApiError } from "../api/client";

/** Russian texts for API error codes. The API message is English and may carry details. */
const MESSAGES: Record<string, string> = {
  network: "Не удаётся связаться с сервером. Проверьте подключение к интернету и попробуйте ещё раз.",
  internal: "На сервере что-то пошло не так",
  "validation.failed": "Проверьте правильность заполнения полей",
  "auth.missing_token": "Нужно войти в аккаунт",
  "auth.invalid_token": "Сессия истекла, войдите снова",
  "auth.bad_credentials": "Неверный email или пароль",
  "auth.user_blocked": "Аккаунт заблокирован",
  "auth.admin_required": "Доступно только администратору",
  "auth.staff_required": "Доступно только менеджерам и администраторам",
  "auth.customer_required": "Корзина и заказы доступны только покупателям",
  "users.bad_email": "Некорректный email",
  "users.email_taken": "Пользователь с таким email уже зарегистрирован",
  "users.not_found": "Пользователь не найден",
  "users.cannot_block_self": "Нельзя изменить статус самому себе",
  "users.cannot_delete_self": "Нельзя удалить самого себя",
  "users.has_orders": "У пользователя есть заказы — удалить нельзя, можно только заблокировать",
  "products.not_found": "Товар не найден",
  "products.sku_taken": "Товар с таким артикулом уже существует",
  "products.inactive": "Товар снят с продажи",
  "products.out_of_stock": "Товара нет в наличии",
  "promo.not_found": "Такого промокода нет",
  "promo.inactive": "Промокод отключён",
  "promo.expired": "Срок действия промокода истёк",
  "promo.usage_limit": "Вы уже использовали этот промокод максимальное число раз",
  "promo.min_total_not_reached": "Сумма заказа меньше минимальной для этого промокода",
  "promo.bad_value": "Скидка в процентах должна быть от 1 до 100",
  "promo.bad_expires_at": "Дата должна быть в формате ГГГГ-ММ-ДД",
  "promo.code_taken": "Такой промокод уже существует",
  "cart.quantity_limit": "Одного товара можно положить не больше 99 штук",
  "cart.item_not_found": "Этого товара нет в корзине",
  "cart.empty": "Корзина пуста",
  "orders.not_found": "Заказ не найден",
  "orders.out_of_stock": "Не хватает товара на складе",
  "orders.invalid_transition": "Это действие недоступно для заказа в текущем статусе",
  "orders.return_period_expired": "Срок возврата истёк",
  "payment.declined": "Банк отклонил платёж",
  "payment.insufficient_funds": "Недостаточно средств на карте",
  "payment.bad_token": "Карта не поддерживается",
};

/** Codes whose English API message has useful specifics (which SKU, what minimum). */
const WITH_DETAILS = new Set(["orders.out_of_stock", "products.inactive", "validation.failed", "promo.min_total_not_reached"]);

export function errorText(error: unknown): string {
  if (error instanceof ApiError) {
    const text = MESSAGES[error.code] ?? error.message;
    return WITH_DETAILS.has(error.code) ? `${text}. ${error.message}` : text;
  }
  return error instanceof Error ? error.message : "Неизвестная ошибка";
}

export function errorCode(error: unknown): string | null {
  return error instanceof ApiError ? error.code : null;
}
