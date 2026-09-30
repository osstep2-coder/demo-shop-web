#!/usr/bin/env node
/**
 * Fills the running API with demo data for screenshots:
 * a manager, two customers, and orders in every status (plus a declined payment).
 *
 *   npm run seed            # skips orders if the demo customer already has some
 *   npm run seed -- --force # adds another set of orders anyway
 *
 * Accounts are listed in SCREENS.md. Unpaid "created" orders are auto-cancelled by the API
 * after SHOP_PAYMENT_TTL_MINUTES (15 by default), so run this right before recording.
 */

const API = (process.env.SHOP_API_URL ?? "http://127.0.0.1:8000") + "/api/v1";
const PASSWORD = "Qwerty123";
const ADMIN = { email: process.env.SHOP_ADMIN_EMAIL ?? "admin@shop.test", password: process.env.SHOP_ADMIN_PASSWORD ?? "admin123" };
const MANAGER = { email: "manager@shop.test", firstName: "Олег", lastName: "Менеджеров" };
const ANNA = { email: "anna@shop.test", firstName: "Анна", lastName: "Смирнова" };
const IVAN = { email: "ivan@shop.test", firstName: "Иван", lastName: "Петров" };
const FORCE = process.argv.includes("--force");

const P = (suffix) => `5a1e0000-0000-4000-8000-000000000${suffix}`;
const KB = P("001"),
  MS = P("002"),
  HS = P("003"),
  CB = P("004"),
  PB = P("005"),
  MN = P("006"),
  WC = P("007"),
  ST = P("008"),
  SP = P("009");

async function call(method, path, { token, body, allow = [] } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const json = await res.json().catch(() => null);
  if (!json?.success) {
    const code = json?.error?.code ?? `HTTP ${res.status}`;
    if (allow.includes(code)) return { skipped: code };
    throw new Error(`${method} ${path} → ${code}: ${json?.error?.message ?? ""}`);
  }
  return json.data;
}

const login = async (email, password = PASSWORD) => (await call("POST", "/auth/login", { body: { email, password } })).token;

async function ensureCustomer(u) {
  const r = await call("POST", "/auth/register", { body: { ...u, password: PASSWORD }, allow: ["users.email_taken"] });
  console.log(r.skipped ? `  · ${u.email} уже есть` : `  + покупатель ${u.email}`);
  return login(u.email);
}

async function placeOrder(token, items, { promo, address }) {
  await call("DELETE", "/cart", { token });
  for (const [productUuid, quantity] of items) await call("POST", "/cart/items", { token, body: { productUuid, quantity } });
  if (promo) await call("PUT", "/cart/promo", { token, body: { code: promo } });
  return call("POST", "/orders", { token, body: { deliveryAddress: address } });
}

const pay = (token, order, paymentToken = "tok_success") =>
  call("POST", `/orders/${order.uuid}/pay`, { token, body: { paymentToken }, allow: ["payment.declined", "payment.insufficient_funds"] });

async function main() {
  try {
    await fetch(API.replace("/api/v1", "/health"));
  } catch {
    console.error(`API недоступно по ${API}. Запустите demo-shop-api/run.sh`);
    process.exit(1);
  }

  console.log("Аккаунты:");
  const admin = await login(ADMIN.email, ADMIN.password);
  const m = await call("POST", "/users", { token: admin, body: { role: "manager", ...MANAGER, password: PASSWORD }, allow: ["users.email_taken"] });
  console.log(m.skipped ? `  · ${MANAGER.email} уже есть` : `  + менеджер ${MANAGER.email}`);
  const manager = await login(MANAGER.email);
  const anna = await ensureCustomer(ANNA);
  const ivan = await ensureCustomer(IVAN);

  const existing = await call("GET", "/orders?take=1", { token: anna });
  if (existing.total > 0 && !FORCE) {
    console.log(`\nУ ${ANNA.email} уже ${existing.total} заказ(ов) — пропускаю. Запустите с --force, чтобы добавить ещё.`);
    return;
  }

  const home = "г. Москва, ул. Тверская, д. 7, кв. 12";
  const office = "г. Москва, Пресненская наб., д. 10, офис 305";
  console.log("\nЗаказы:");

  // delivered, with a promo
  let o = await placeOrder(
    anna,
    [
      [KB, 1],
      [CB, 2],
    ],
    { promo: "WELCOME10", address: home },
  );
  await pay(anna, o);
  await call("POST", `/orders/${o.uuid}/ship`, { token: manager });
  await call("POST", `/orders/${o.uuid}/deliver`, { token: manager });
  console.log(`  №${o.number} доставлен (WELCOME10)`);

  // returned
  o = await placeOrder(anna, [[SP, 1]], { address: home });
  await pay(anna, o);
  await call("POST", `/orders/${o.uuid}/ship`, { token: manager });
  await call("POST", `/orders/${o.uuid}/deliver`, { token: manager });
  await call("POST", `/orders/${o.uuid}/return`, { token: anna, body: { reason: "Звук тише, чем ожидала" } });
  console.log(`  №${o.number} возвращён`);

  // shipped
  o = await placeOrder(anna, [[MN, 1]], { address: office });
  await pay(anna, o);
  await call("POST", `/orders/${o.uuid}/ship`, { token: manager });
  console.log(`  №${o.number} в пути`);

  // paid after a declined attempt
  o = await placeOrder(
    anna,
    [
      [MS, 1],
      [ST, 1],
    ],
    { promo: "SALE15", address: office },
  );
  await pay(anna, o, "tok_declined");
  await pay(anna, o);
  console.log(`  №${o.number} оплачен со второй попытки (SALE15)`);

  // cancelled
  o = await placeOrder(anna, [[WC, 1]], { address: home });
  await call("POST", `/orders/${o.uuid}/cancel`, { token: anna, body: { reason: "Передумала" } });
  console.log(`  №${o.number} отменён`);

  // created, waiting for payment
  o = await placeOrder(anna, [[PB, 1]], { address: home });
  console.log(`  №${o.number} ждёт оплаты (автоотмена через 15 мин)`);

  // Ivan: one delivered order
  o = await placeOrder(ivan, [[HS, 1]], { address: "г. Санкт-Петербург, Невский пр., д. 28" });
  await pay(ivan, o);
  await call("POST", `/orders/${o.uuid}/ship`, { token: manager });
  await call("POST", `/orders/${o.uuid}/deliver`, { token: manager });
  console.log(`  №${o.number} доставлен (Иван)`);

  // leave something in Anna's cart for the cart screenshot
  await call("POST", "/cart/items", { token: anna, body: { productUuid: HS, quantity: 1 } });
  await call("POST", "/cart/items", { token: anna, body: { productUuid: CB, quantity: 2 } });
  console.log("\nВ корзине Анны: наушники и 2 кабеля.");
}

main()
  .then(() => {
    console.log(`\nГотово. Вход: ${ANNA.email} / ${PASSWORD}, ${MANAGER.email} / ${PASSWORD}, ${ADMIN.email} / ${ADMIN.password}`);
  })
  .catch((e) => {
    console.error("\nОшибка:", e.message);
    process.exit(1);
  });
