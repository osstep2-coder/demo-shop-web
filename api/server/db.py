"""SQLite storage for the demo shop. One connection per request, schema and seed on startup.

All money is stored and returned as integer kopecks: 199900 means 1 999,00 ₽.
"""

import hashlib
import os
import secrets
import sqlite3
import uuid
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

DB_PATH = Path(os.environ.get("SHOP_DB_PATH", Path(__file__).resolve().parent.parent / ".data" / "shop.db"))

ADMIN_EMAIL = os.environ.get("SHOP_ADMIN_EMAIL", "admin@shop.test")
ADMIN_PASSWORD = os.environ.get("SHOP_ADMIN_PASSWORD", "admin123")

SCHEMA = """
create table if not exists users (
    uuid text primary key,
    role text not null,
    email text not null unique,
    first_name text not null,
    last_name text not null,
    status text not null default 'active',
    password_hash text not null,
    created_at text not null
);
create table if not exists sessions (
    token text primary key,
    user_uuid text not null,
    expires_at real not null
);
create table if not exists products (
    uuid text primary key,
    sku text not null unique,
    name text not null,
    category text not null,
    price integer not null,
    stock integer not null,
    is_active integer not null default 1,
    created_at text not null
);
create table if not exists cart_items (
    user_uuid text not null,
    product_uuid text not null,
    quantity integer not null,
    added_at text not null,
    primary key (user_uuid, product_uuid)
);
create table if not exists carts (
    user_uuid text primary key,
    promo_code text
);
create table if not exists promos (
    code text primary key,
    type text not null,
    value integer not null,
    min_order_total integer not null default 0,
    expires_at text,
    max_uses_per_user integer not null default 1,
    is_active integer not null default 1,
    created_at text not null
);
create table if not exists promo_usages (
    code text not null,
    user_uuid text not null,
    order_uuid text not null,
    used_at text not null
);
create table if not exists orders (
    uuid text primary key,
    number integer not null unique,
    user_uuid text not null,
    status text not null,
    delivery_address text not null,
    items_total integer not null,
    discount integer not null,
    delivery_fee integer not null,
    total integer not null,
    promo_code text,
    created_at text not null,
    paid_at text,
    shipped_at text,
    delivered_at text,
    cancelled_at text,
    returned_at text
);
create table if not exists order_items (
    order_uuid text not null,
    product_uuid text not null,
    sku text not null,
    name text not null,
    price integer not null,
    quantity integer not null
);
create table if not exists order_history (
    id integer primary key autoincrement,
    order_uuid text not null,
    at text not null,
    from_status text,
    to_status text not null,
    actor_uuid text,
    comment text
);
create table if not exists payments (
    uuid text primary key,
    order_uuid text not null,
    kind text not null,
    token text,
    status text not null,
    amount integer not null,
    error_code text,
    created_at text not null
);
"""

# Fixed uuids so the catalog is the same on every machine and in every video.
# (uuid suffix, sku, name, category, price in kopecks, stock, is_active)
PRODUCTS = [
    ("001", "KB-001", "Механическая клавиатура", "Периферия", 649000, 15, 1),
    ("002", "MS-002", "Беспроводная мышь", "Периферия", 189900, 40, 1),
    ("003", "HS-003", "Наушники с шумоподавлением", "Аудио", 1299000, 8, 1),
    ("004", "CB-004", "Кабель USB-C, 1 м", "Аксессуары", 49900, 120, 1),
    ("005", "PB-005", "Пауэрбанк 20000 мАч", "Аксессуары", 349900, 25, 1),
    ("006", "MN-006", "Монитор 27\" 4K", "Мониторы", 3499000, 5, 1),
    ("007", "WC-007", "Веб-камера Full HD", "Периферия", 459000, 12, 1),
    ("008", "ST-008", "Подставка для ноутбука", "Аксессуары", 199000, 30, 1),
    ("009", "SP-009", "Колонка Bluetooth", "Аудио", 33333, 50, 1),
    ("010", "LM-010", "Лампа для монитора", "Аксессуары", 289000, 1, 1),
    ("011", "GP-011", "Геймпад", "Периферия", 529000, 0, 1),
    ("012", "OL-012", "Старая модель клавиатуры", "Периферия", 299000, 7, 0),
]

# (code, type, value, min_order_total, expires_in_days (negative = already expired), max_uses_per_user)
PROMOS = [
    ("WELCOME10", "percent", 10, 100000, 365, 1),
    ("SALE15", "percent", 15, 0, 365, 3),
    ("MINUS500", "fixed", 50000, 300000, 365, 1),
    ("EXPIRED20", "percent", 20, 0, -1, 1),
]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds")


def new_uuid() -> str:
    return str(uuid.uuid4())


def hash_password(password: str, salt: str | None = None) -> str:
    salt = salt or secrets.token_hex(8)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100_000).hex()
    return f"{salt}${digest}"


def check_password(password: str, stored: str) -> bool:
    salt, _ = stored.split("$", 1)
    return secrets.compare_digest(hash_password(password, salt), stored)


def connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, timeout=10, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = connect()
    try:
        conn.execute("pragma journal_mode = wal")
        conn.executescript(SCHEMA)
        created = now_iso()
        for suffix, sku, name, category, price, stock, active in PRODUCTS:
            conn.execute(
                "insert or ignore into products values (?, ?, ?, ?, ?, ?, ?, ?)",
                (f"5a1e0000-0000-4000-8000-000000000{suffix}", sku, name, category, price, stock, active, created),
            )
        for code, kind, value, min_total, days, per_user in PROMOS:
            conn.execute(
                "insert or ignore into promos values (?, ?, ?, ?, ?, ?, 1, ?)",
                (code, kind, value, min_total, (date.today() + timedelta(days=days)).isoformat(), per_user, created),
            )
        if not conn.execute("select 1 from users where email = ?", (ADMIN_EMAIL,)).fetchone():
            conn.execute(
                "insert into users values (?, 'admin', ?, 'Админ', 'Админов', 'active', ?, ?)",
                (new_uuid(), ADMIN_EMAIL, hash_password(ADMIN_PASSWORD), created),
            )
        conn.commit()
    finally:
        conn.close()
