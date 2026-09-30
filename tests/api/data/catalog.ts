/** The seed catalog from api/server/db.py: same uuids, SKUs and prices, so product art and links match the real app. */
import type { Product } from "../types";

function product(suffix: string, sku: string, name: string, category: string, price: number, stock: number, isActive = true): Product {
  return { uuid: `5a1e0000-0000-4000-8000-000000000${suffix}`, sku, name, category, price, stock, isActive };
}

export const catalog = {
  keyboard: product("001", "KB-001", "Механическая клавиатура", "Периферия", 649000, 15),
  mouse: product("002", "MS-002", "Беспроводная мышь", "Периферия", 189900, 40),
  headphones: product("003", "HS-003", "Наушники с шумоподавлением", "Аудио", 1299000, 8),
  cable: product("004", "CB-004", "Кабель USB-C, 1 м", "Аксессуары", 49900, 120),
  powerbank: product("005", "PB-005", "Пауэрбанк 20000 мАч", "Аксессуары", 349900, 25),
  monitor: product("006", "MN-006", 'Монитор 27" 4K', "Мониторы", 3499000, 5),
  webcam: product("007", "WC-007", "Веб-камера Full HD", "Периферия", 459000, 12),
  stand: product("008", "ST-008", "Подставка для ноутбука", "Аксессуары", 199000, 30),
  speaker: product("009", "SP-009", "Колонка Bluetooth", "Аудио", 33333, 50),
  lamp: product("010", "LM-010", "Лампа для монитора", "Аксессуары", 289000, 1),
  gamepad: product("011", "GP-011", "Геймпад", "Периферия", 529000, 0),
  oldKeyboard: product("012", "OL-012", "Старая модель клавиатуры", "Периферия", 299000, 7, false),
} satisfies Record<string, Product>;
