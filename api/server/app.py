"""Demo Shop API: users, catalog, cart, promo codes, orders with statuses and fake payments.

Every response is wrapped in an envelope:
    {"success": true, "data": ..., "meta": {"correlationId": "..."}}
    {"success": false, "error": {"code": "...", "message": "..."}, "meta": {...}}
"""

import os
import re
import secrets
import sqlite3
import time
from collections.abc import Iterator
from contextlib import asynccontextmanager
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Literal

from fastapi import Depends, FastAPI, Header, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field

from server import db
from server.schemas import (
    CartResponse, DeletedUserResponse, ErrorResponse, HealthResponse, LoginResponse, OrderPageResponse, OrderResponse,
    ProductPageResponse, ProductResponse, PromoListResponse, PromoResponse, Role, UserDetailsResponse, UserPageResponse,
    UserResponse, UserStatus,
)

TOKEN_TTL_SECONDS = 12 * 60 * 60
DELIVERY_FEE = 29900
FREE_DELIVERY_FROM = 300000
PAYMENT_TTL_MINUTES = int(os.environ.get("SHOP_PAYMENT_TTL_MINUTES", "15"))
RETURN_PERIOD_DAYS = int(os.environ.get("SHOP_RETURN_PERIOD_DAYS", "14"))
# Intentional bugs for demos, comma separated. "oversell": parallel checkouts can sell the same last item twice.
BUGS = {b.strip() for b in os.environ.get("SHOP_BUGS", "").split(",") if b.strip()}

PAYMENT_TOKENS = {
    "tok_success": None,
    "tok_declined": (402, "payment.declined", "Card was declined"),
    "tok_insufficient_funds": (402, "payment.insufficient_funds", "Not enough money on the card"),
}


class ApiError(Exception):
    def __init__(self, status: int, code: str, message: str):
        self.status, self.code, self.message = status, code, message


@asynccontextmanager
async def lifespan(_: FastAPI):
    db.init_db()
    yield


app = FastAPI(
    title="Demo Shop API",
    version="1.0",
    description="Every response is wrapped in an envelope: `{success, data, meta}` or `{success, error, meta}`. "
    "Errors list their stable `error.code` values per endpoint.",
    lifespan=lifespan,
    responses={500: {"model": ErrorResponse, "description": "`internal`"}},
)


@app.middleware("http")
async def correlation_id(request: Request, call_next):
    request.state.correlation_id = secrets.token_hex(6).upper()
    response = await call_next(request)
    response.headers["X-Correlation-Id"] = request.state.correlation_id
    return response


def ok(request: Request, data=None) -> dict:
    return {"success": True, "data": data, "meta": {"correlationId": request.state.correlation_id}}


def fail(request: Request, status: int, code: str, message: str) -> JSONResponse:
    body = {
        "success": False,
        "error": {"code": code, "message": message},
        "meta": {"correlationId": getattr(request.state, "correlation_id", None)},
    }
    return JSONResponse(body, status_code=status)


@app.exception_handler(ApiError)
async def api_error_handler(request: Request, exc: ApiError):
    return fail(request, exc.status, exc.code, exc.message)


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    details = "; ".join(f"{'.'.join(str(p) for p in e['loc'])}: {e['msg']}" for e in exc.errors())
    return fail(request, 400, "validation.failed", details)


@app.exception_handler(Exception)
async def internal_error_handler(request: Request, exc: Exception):
    return fail(request, 500, "internal", "Something went wrong")


def errors(*codes: str) -> dict:
    """OpenAPI docs for error responses from "404 orders.not_found"-style codes, grouped by HTTP status."""
    by_status: dict[int, list[str]] = {}
    for item in codes:
        status, code = item.split(" ", 1)
        by_status.setdefault(int(status), []).append(f"`{code}`")
    return {status: {"model": ErrorResponse, "description": ", ".join(c)} for status, c in sorted(by_status.items())}


VALIDATION = ("400 validation.failed",)
AUTH = ("401 auth.missing_token", "401 auth.invalid_token")
ADMIN = (*AUTH, "403 auth.admin_required")
STAFF = (*AUTH, "403 auth.staff_required")
CUSTOMER = (*AUTH, "403 auth.customer_required")
PROMO_CHECK = ("404 promo.not_found", "400 promo.inactive", "400 promo.expired", "400 promo.usage_limit",
               "400 promo.min_total_not_reached")
ORDER_ACTION = ("404 orders.not_found", "409 orders.invalid_transition")


# --- dependencies -----------------------------------------------------------


def expire_unpaid_orders(conn: sqlite3.Connection) -> None:
    """Orders not paid within PAYMENT_TTL_MINUTES are cancelled and their stock goes back."""
    cutoff = (datetime.now(timezone.utc) - timedelta(minutes=PAYMENT_TTL_MINUTES)).isoformat(timespec="milliseconds")
    for order in conn.execute("select * from orders where status = 'created' and created_at < ?", (cutoff,)).fetchall():
        restock(conn, order["uuid"])
        set_status(conn, order, "cancelled", None, "Payment timeout")
    conn.commit()


def get_conn() -> Iterator[sqlite3.Connection]:
    conn = db.connect()
    try:
        expire_unpaid_orders(conn)
        yield conn
        conn.commit()
    finally:
        conn.close()


def _user_by_token(conn: sqlite3.Connection, authorization: str | None) -> sqlite3.Row | None:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    return conn.execute(
        "select u.* from sessions s join users u on u.uuid = s.user_uuid where s.token = ? and s.expires_at > ?",
        (authorization.removeprefix("Bearer "), time.time()),
    ).fetchone()


def current_user(
    authorization: str | None = Header(default=None),
    conn: sqlite3.Connection = Depends(get_conn),
) -> sqlite3.Row:
    if not authorization or not authorization.startswith("Bearer "):
        raise ApiError(401, "auth.missing_token", "Authorization: Bearer <token> header is required")
    user = _user_by_token(conn, authorization)
    if not user:
        raise ApiError(401, "auth.invalid_token", "Token is invalid or expired")
    return user


def optional_user(
    authorization: str | None = Header(default=None),
    conn: sqlite3.Connection = Depends(get_conn),
) -> sqlite3.Row | None:
    return _user_by_token(conn, authorization)


def admin_only(user: sqlite3.Row = Depends(current_user)) -> sqlite3.Row:
    if user["role"] != "admin":
        raise ApiError(403, "auth.admin_required", "Only admin can do this")
    return user


def staff_only(user: sqlite3.Row = Depends(current_user)) -> sqlite3.Row:
    if user["role"] not in ("admin", "manager"):
        raise ApiError(403, "auth.staff_required", "Only managers and admins can do this")
    return user


def customer_only(user: sqlite3.Row = Depends(current_user)) -> sqlite3.Row:
    if user["role"] != "customer":
        raise ApiError(403, "auth.customer_required", "Only customers have a cart and can place orders")
    return user


# --- helpers ----------------------------------------------------------------


def user_out(row: sqlite3.Row) -> dict:
    return {
        "uuid": row["uuid"],
        "role": row["role"],
        "email": row["email"],
        "firstName": row["first_name"],
        "lastName": row["last_name"],
        "status": row["status"],
        "createdAt": row["created_at"],
    }


def get_user_or_404(conn: sqlite3.Connection, user_uuid: str) -> sqlite3.Row:
    row = conn.execute("select * from users where uuid = ?", (user_uuid,)).fetchone()
    if not row:
        raise ApiError(404, "users.not_found", f"User '{user_uuid}' not found")
    return row


def insert_user(conn: sqlite3.Connection, role: str, email: str, password: str, first: str, last: str) -> sqlite3.Row:
    email = email.lower()
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        raise ApiError(400, "users.bad_email", f"'{email}' is not an email")
    if conn.execute("select 1 from users where email = ?", (email,)).fetchone():
        raise ApiError(409, "users.email_taken", f"User with email '{email}' already exists")
    user_uuid = db.new_uuid()
    conn.execute(
        "insert into users values (?, ?, ?, ?, ?, 'active', ?, ?)",
        (user_uuid, role, email, first, last, db.hash_password(password), db.now_iso()),
    )
    return get_user_or_404(conn, user_uuid)


def product_out(row: sqlite3.Row) -> dict:
    return {
        "uuid": row["uuid"],
        "sku": row["sku"],
        "name": row["name"],
        "category": row["category"],
        "price": row["price"],
        "stock": row["stock"],
        "isActive": bool(row["is_active"]),
    }


def get_product_or_404(conn: sqlite3.Connection, product_uuid: str) -> sqlite3.Row:
    row = conn.execute("select * from products where uuid = ?", (product_uuid,)).fetchone()
    if not row:
        raise ApiError(404, "products.not_found", f"Product '{product_uuid}' not found")
    return row


def promo_out(row: sqlite3.Row) -> dict:
    return {
        "code": row["code"],
        "type": row["type"],
        "value": row["value"],
        "minOrderTotal": row["min_order_total"],
        "expiresAt": row["expires_at"],
        "maxUsesPerUser": row["max_uses_per_user"],
        "isActive": bool(row["is_active"]),
    }


def check_promo(conn: sqlite3.Connection, code: str, user_uuid: str, items_total: int) -> sqlite3.Row:
    promo = conn.execute("select * from promos where code = ?", (code.upper(),)).fetchone()
    if not promo:
        raise ApiError(404, "promo.not_found", f"Promo code '{code}' not found")
    if not promo["is_active"]:
        raise ApiError(400, "promo.inactive", f"Promo code '{promo['code']}' is disabled")
    if promo["expires_at"] and promo["expires_at"] < date.today().isoformat():
        raise ApiError(400, "promo.expired", f"Promo code '{promo['code']}' expired on {promo['expires_at']}")
    used = conn.execute(
        "select count(*) from promo_usages where code = ? and user_uuid = ?", (promo["code"], user_uuid)
    ).fetchone()[0]
    if used >= promo["max_uses_per_user"]:
        raise ApiError(400, "promo.usage_limit", f"Promo code '{promo['code']}' was already used {used} time(s)")
    if items_total < promo["min_order_total"]:
        raise ApiError(400, "promo.min_total_not_reached",
                       f"Promo code '{promo['code']}' needs order total from {promo['min_order_total']}")
    return promo


def discount_for(promo: sqlite3.Row, items_total: int) -> int:
    if promo["type"] == "percent":
        return items_total * promo["value"] // 100
    return min(promo["value"], items_total)


def delivery_fee_for(amount_after_discount: int) -> int:
    return 0 if amount_after_discount >= FREE_DELIVERY_FROM else DELIVERY_FEE


def cart_lines(conn: sqlite3.Connection, user_uuid: str) -> list[sqlite3.Row]:
    return conn.execute(
        """select p.*, c.quantity from cart_items c join products p on p.uuid = c.product_uuid
           where c.user_uuid = ? order by c.added_at""",
        (user_uuid,),
    ).fetchall()


def cart_out(conn: sqlite3.Connection, user_uuid: str) -> dict:
    lines = cart_lines(conn, user_uuid)
    items_total = sum(line["price"] * line["quantity"] for line in lines)
    cart = conn.execute("select promo_code from carts where user_uuid = ?", (user_uuid,)).fetchone()
    promo_code = cart["promo_code"] if cart else None
    promo, discount = None, 0
    if promo_code:
        try:
            discount = discount_for(check_promo(conn, promo_code, user_uuid, items_total), items_total)
            promo = {"code": promo_code, "applied": True}
        except ApiError:
            promo = {"code": promo_code, "applied": False}
    fee = delivery_fee_for(items_total - discount) if lines else 0
    return {
        "items": [{
            "productUuid": line["uuid"],
            "sku": line["sku"],
            "name": line["name"],
            "price": line["price"],
            "quantity": line["quantity"],
            "lineTotal": line["price"] * line["quantity"],
            "inStock": bool(line["is_active"]) and line["stock"] >= line["quantity"],
        } for line in lines],
        "itemsTotal": items_total,
        "promo": promo,
        "discount": discount,
        "deliveryFee": fee,
        "total": items_total - discount + fee,
    }


def get_order_for(conn: sqlite3.Connection, order_uuid: str, user: sqlite3.Row) -> sqlite3.Row:
    """Customers see only their own orders: someone else's order looks like it does not exist."""
    order = conn.execute("select * from orders where uuid = ?", (order_uuid,)).fetchone()
    if not order or (user["role"] == "customer" and order["user_uuid"] != user["uuid"]):
        raise ApiError(404, "orders.not_found", f"Order '{order_uuid}' not found")
    return order


def order_out(conn: sqlite3.Connection, order: sqlite3.Row, detailed: bool = True) -> dict:
    items = conn.execute("select * from order_items where order_uuid = ?", (order["uuid"],)).fetchall()
    data = {
        "uuid": order["uuid"],
        "number": order["number"],
        "userUuid": order["user_uuid"],
        "status": order["status"],
        "deliveryAddress": order["delivery_address"],
        "items": [{
            "productUuid": i["product_uuid"], "sku": i["sku"], "name": i["name"],
            "price": i["price"], "quantity": i["quantity"], "lineTotal": i["price"] * i["quantity"],
        } for i in items],
        "itemsTotal": order["items_total"],
        "discount": order["discount"],
        "deliveryFee": order["delivery_fee"],
        "total": order["total"],
        "promoCode": order["promo_code"],
        "createdAt": order["created_at"],
        "paidAt": order["paid_at"],
        "shippedAt": order["shipped_at"],
        "deliveredAt": order["delivered_at"],
        "cancelledAt": order["cancelled_at"],
        "returnedAt": order["returned_at"],
    }
    if order["status"] == "created":
        created = datetime.fromisoformat(order["created_at"])
        data["paymentDeadline"] = (created + timedelta(minutes=PAYMENT_TTL_MINUTES)).isoformat(timespec="seconds")
    if detailed:
        data["history"] = [{
            "at": h["at"], "from": h["from_status"], "to": h["to_status"],
            "actorUuid": h["actor_uuid"], "comment": h["comment"],
        } for h in conn.execute("select * from order_history where order_uuid = ? order by id", (order["uuid"],))]
        data["payments"] = [{
            "uuid": p["uuid"], "kind": p["kind"], "status": p["status"], "amount": p["amount"],
            "errorCode": p["error_code"], "createdAt": p["created_at"],
        } for p in conn.execute("select * from payments where order_uuid = ? order by created_at", (order["uuid"],))]
    return data


STATUS_TIMESTAMP = {"paid": "paid_at", "shipped": "shipped_at", "delivered": "delivered_at",
                    "cancelled": "cancelled_at", "returned": "returned_at"}


def set_status(conn: sqlite3.Connection, order: sqlite3.Row, new_status: str, actor_uuid: str | None,
               comment: str | None = None) -> None:
    conn.execute(f"update orders set status = ?, {STATUS_TIMESTAMP[new_status]} = ? where uuid = ?",
                 (new_status, db.now_iso(), order["uuid"]))
    conn.execute(
        "insert into order_history (order_uuid, at, from_status, to_status, actor_uuid, comment) values (?, ?, ?, ?, ?, ?)",
        (order["uuid"], db.now_iso(), order["status"], new_status, actor_uuid, comment),
    )


def require_status(order: sqlite3.Row, allowed: tuple[str, ...], action: str) -> None:
    if order["status"] not in allowed:
        raise ApiError(409, "orders.invalid_transition",
                       f"Cannot {action} order in status '{order['status']}' (allowed from: {', '.join(allowed)})")


def restock(conn: sqlite3.Connection, order_uuid: str) -> None:
    for item in conn.execute("select * from order_items where order_uuid = ?", (order_uuid,)).fetchall():
        conn.execute("update products set stock = stock + ? where uuid = ?", (item["quantity"], item["product_uuid"]))


def refund(conn: sqlite3.Connection, order: sqlite3.Row) -> None:
    conn.execute(
        "insert into payments values (?, ?, 'refund', null, 'success', ?, null, ?)",
        (db.new_uuid(), order["uuid"], order["total"], db.now_iso()),
    )


# --- auth -------------------------------------------------------------------


class LoginIn(BaseModel):
    email: str
    password: str


class RegisterIn(BaseModel):
    email: str
    password: str = Field(min_length=6)
    firstName: str = Field(min_length=1)
    lastName: str = Field(min_length=1)


@app.post(
    "/api/v1/auth/register", tags=["auth"],
    response_model=UserResponse,
    responses=errors(*VALIDATION, "400 users.bad_email", "409 users.email_taken"),
)
def register(body: RegisterIn, request: Request, conn: sqlite3.Connection = Depends(get_conn)):
    """Self sign-up. Always creates a customer."""
    user = insert_user(conn, "customer", body.email, body.password, body.firstName, body.lastName)
    return ok(request, user_out(user))


@app.post(
    "/api/v1/auth/login", tags=["auth"],
    response_model=LoginResponse,
    responses=errors(*VALIDATION, "401 auth.bad_credentials", "403 auth.user_blocked"),
)
def login(body: LoginIn, request: Request, conn: sqlite3.Connection = Depends(get_conn)):
    row = conn.execute("select * from users where email = ?", (body.email.lower(),)).fetchone()
    if not row or not db.check_password(body.password, row["password_hash"]):
        raise ApiError(401, "auth.bad_credentials", "Wrong email or password")
    if row["status"] == "blocked":
        raise ApiError(403, "auth.user_blocked", "User is blocked")
    token = secrets.token_urlsafe(24)
    expires_at = time.time() + TOKEN_TTL_SECONDS
    conn.execute("insert into sessions values (?, ?, ?)", (token, row["uuid"], expires_at))
    return ok(request, {"token": token, "expiresAt": int(expires_at), "user": user_out(row)})


@app.get("/api/v1/auth/me", tags=["auth"], response_model=UserResponse, responses=errors(*AUTH))
def me(request: Request, user: sqlite3.Row = Depends(current_user)):
    return ok(request, user_out(user))


# --- users ------------------------------------------------------------------


class UserIn(BaseModel):
    role: Role
    email: str
    password: str = Field(min_length=6)
    firstName: str = Field(min_length=1)
    lastName: str = Field(min_length=1)


class UserStatusIn(BaseModel):
    status: UserStatus


@app.post(
    "/api/v1/users", tags=["users"],
    response_model=UserResponse,
    responses=errors(*ADMIN, *VALIDATION, "400 users.bad_email", "409 users.email_taken"),
)
def create_user(body: UserIn, request: Request, conn: sqlite3.Connection = Depends(get_conn), _=Depends(admin_only)):
    user = insert_user(conn, body.role, body.email, body.password, body.firstName, body.lastName)
    return ok(request, user_out(user))


@app.get("/api/v1/users", tags=["users"], response_model=UserPageResponse, responses=errors(*ADMIN, *VALIDATION))
def list_users(
    request: Request,
    role: Role | None = None,
    status: UserStatus | None = None,
    email: str | None = None,
    q: str | None = Query(default=None, description="Substring of email or name"),
    take: int = Query(default=50, ge=1, le=500),
    skip: int = Query(default=0, ge=0),
    conn: sqlite3.Connection = Depends(get_conn),
    _=Depends(admin_only),
):
    sql, args = "select * from users where 1 = 1", []
    for column, value in (("role", role), ("status", status), ("email", email.lower() if email else None)):
        if value:
            sql += f" and {column} = ?"
            args.append(value)
    if q:
        sql += " and (email like ? or first_name like ? or last_name like ?)"
        args += [f"%{q}%"] * 3
    total = conn.execute(sql.replace("select *", "select count(*)", 1), args).fetchone()[0]
    rows = conn.execute(sql + " order by created_at desc limit ? offset ?", [*args, take, skip]).fetchall()
    return ok(request, {"items": [user_out(r) for r in rows], "total": total})


@app.get(
    "/api/v1/users/{user_uuid}", tags=["users"],
    response_model=UserDetailsResponse,
    responses=errors(*ADMIN, "404 users.not_found"),
)
def get_user(user_uuid: str, request: Request, conn: sqlite3.Connection = Depends(get_conn), _=Depends(admin_only)):
    data = user_out(get_user_or_404(conn, user_uuid))
    data["ordersCount"] = conn.execute("select count(*) from orders where user_uuid = ?", (user_uuid,)).fetchone()[0]
    return ok(request, data)


@app.put(
    "/api/v1/users/{user_uuid}/status", tags=["users"],
    response_model=UserResponse,
    responses=errors(*ADMIN, *VALIDATION, "404 users.not_found", "400 users.cannot_block_self"),
)
def set_user_status(
    user_uuid: str, body: UserStatusIn, request: Request,
    conn: sqlite3.Connection = Depends(get_conn), admin=Depends(admin_only),
):
    get_user_or_404(conn, user_uuid)
    if user_uuid == admin["uuid"]:
        raise ApiError(400, "users.cannot_block_self", "Admin cannot change their own status")
    conn.execute("update users set status = ? where uuid = ?", (body.status, user_uuid))
    if body.status == "blocked":
        conn.execute("delete from sessions where user_uuid = ?", (user_uuid,))
    return ok(request, user_out(get_user_or_404(conn, user_uuid)))


@app.delete(
    "/api/v1/users/{user_uuid}", tags=["users"],
    response_model=DeletedUserResponse,
    responses=errors(*ADMIN, "404 users.not_found", "400 users.cannot_delete_self", "409 users.has_orders"),
)
def delete_user(user_uuid: str, request: Request, conn: sqlite3.Connection = Depends(get_conn), admin=Depends(admin_only)):
    get_user_or_404(conn, user_uuid)
    if user_uuid == admin["uuid"]:
        raise ApiError(400, "users.cannot_delete_self", "Admin cannot delete themselves")
    if conn.execute("select 1 from orders where user_uuid = ?", (user_uuid,)).fetchone():
        raise ApiError(409, "users.has_orders", "User has orders and cannot be deleted, block them instead")
    for table in ("sessions", "cart_items", "carts", "promo_usages"):
        conn.execute(f"delete from {table} where user_uuid = ?", (user_uuid,))
    conn.execute("delete from users where uuid = ?", (user_uuid,))
    return ok(request, {"uuid": user_uuid, "deleted": True})


# --- products ---------------------------------------------------------------


class ProductIn(BaseModel):
    sku: str = Field(min_length=1, max_length=32)
    name: str = Field(min_length=1, max_length=200)
    category: str = Field(min_length=1, max_length=100)
    price: int = Field(gt=0)
    stock: int = Field(default=0, ge=0)


class ProductPatchIn(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    category: str | None = Field(default=None, min_length=1, max_length=100)
    price: int | None = Field(default=None, gt=0)
    isActive: bool | None = None


class StockIn(BaseModel):
    stock: int = Field(ge=0)


@app.get("/api/v1/products", tags=["products"], response_model=ProductPageResponse, responses=errors(*VALIDATION))
def list_products(
    request: Request,
    category: str | None = None,
    q: str | None = Query(default=None, description="Substring of name or sku"),
    inStock: bool | None = None,
    sort: Literal["newest", "price_asc", "price_desc", "name"] = "name",
    take: int = Query(default=20, ge=1, le=100),
    skip: int = Query(default=0, ge=0),
    conn: sqlite3.Connection = Depends(get_conn),
    user=Depends(optional_user),
):
    """Public catalog. Managers and admins also see disabled products."""
    sql, args = "select * from products where 1 = 1", []
    if not user or user["role"] == "customer":
        sql += " and is_active = 1"
    if category:
        sql += " and category = ?"
        args.append(category)
    if q:
        sql += " and (name like ? or sku like ?)"
        args += [f"%{q}%"] * 2
    if inStock is not None:
        sql += " and stock > 0" if inStock else " and stock = 0"
    order_by = {"newest": "created_at desc", "price_asc": "price", "price_desc": "price desc", "name": "name"}[sort]
    total = conn.execute(sql.replace("select *", "select count(*)", 1), args).fetchone()[0]
    rows = conn.execute(sql + f" order by {order_by}, sku limit ? offset ?", [*args, take, skip]).fetchall()
    return ok(request, {"items": [product_out(r) for r in rows], "total": total})


@app.get(
    "/api/v1/products/{product_uuid}", tags=["products"],
    response_model=ProductResponse,
    responses=errors("404 products.not_found"),
)
def get_product(product_uuid: str, request: Request, conn: sqlite3.Connection = Depends(get_conn), user=Depends(optional_user)):
    product = get_product_or_404(conn, product_uuid)
    if not product["is_active"] and (not user or user["role"] == "customer"):
        raise ApiError(404, "products.not_found", f"Product '{product_uuid}' not found")
    return ok(request, product_out(product))


@app.post(
    "/api/v1/products", tags=["products"],
    response_model=ProductResponse,
    responses=errors(*STAFF, *VALIDATION, "409 products.sku_taken"),
)
def create_product(body: ProductIn, request: Request, conn: sqlite3.Connection = Depends(get_conn), _=Depends(staff_only)):
    if conn.execute("select 1 from products where sku = ?", (body.sku,)).fetchone():
        raise ApiError(409, "products.sku_taken", f"Product with sku '{body.sku}' already exists")
    product_uuid = db.new_uuid()
    conn.execute(
        "insert into products values (?, ?, ?, ?, ?, ?, 1, ?)",
        (product_uuid, body.sku, body.name, body.category, body.price, body.stock, db.now_iso()),
    )
    return ok(request, product_out(get_product_or_404(conn, product_uuid)))


@app.patch(
    "/api/v1/products/{product_uuid}", tags=["products"],
    response_model=ProductResponse,
    responses=errors(*STAFF, *VALIDATION, "404 products.not_found"),
)
def update_product(
    product_uuid: str, body: ProductPatchIn, request: Request,
    conn: sqlite3.Connection = Depends(get_conn), _=Depends(staff_only),
):
    """Price changes apply to carts right away, orders keep the price they were placed with."""
    get_product_or_404(conn, product_uuid)
    for column, value in (("name", body.name), ("category", body.category), ("price", body.price),
                          ("is_active", None if body.isActive is None else int(body.isActive))):
        if value is not None:
            conn.execute(f"update products set {column} = ? where uuid = ?", (value, product_uuid))
    return ok(request, product_out(get_product_or_404(conn, product_uuid)))


@app.put(
    "/api/v1/products/{product_uuid}/stock", tags=["products"],
    response_model=ProductResponse,
    responses=errors(*STAFF, *VALIDATION, "404 products.not_found"),
)
def set_stock(
    product_uuid: str, body: StockIn, request: Request,
    conn: sqlite3.Connection = Depends(get_conn), _=Depends(staff_only),
):
    get_product_or_404(conn, product_uuid)
    conn.execute("update products set stock = ? where uuid = ?", (body.stock, product_uuid))
    return ok(request, product_out(get_product_or_404(conn, product_uuid)))


# --- promo codes ------------------------------------------------------------


class PromoIn(BaseModel):
    code: str = Field(pattern=r"^[A-Za-z0-9_-]{3,32}$")
    type: Literal["percent", "fixed"]
    value: int = Field(gt=0, description="Percent (1-100) or amount")
    minOrderTotal: int = Field(default=0, ge=0)
    expiresAt: str | None = Field(default=None, description="YYYY-MM-DD, last day when the code works")
    maxUsesPerUser: int = Field(default=1, ge=1)


class PromoPatchIn(BaseModel):
    isActive: bool | None = None
    expiresAt: str | None = None
    minOrderTotal: int | None = Field(default=None, ge=0)


@app.post(
    "/api/v1/promos", tags=["promos"],
    response_model=PromoResponse,
    responses=errors(*ADMIN, *VALIDATION, "400 promo.bad_value", "400 promo.bad_expires_at", "409 promo.code_taken"),
)
def create_promo(body: PromoIn, request: Request, conn: sqlite3.Connection = Depends(get_conn), _=Depends(admin_only)):
    code = body.code.upper()
    if body.type == "percent" and body.value > 100:
        raise ApiError(400, "promo.bad_value", "Percent promo value must be from 1 to 100")
    if body.expiresAt:
        try:
            date.fromisoformat(body.expiresAt)
        except ValueError:
            raise ApiError(400, "promo.bad_expires_at", "expiresAt must be YYYY-MM-DD")
    if conn.execute("select 1 from promos where code = ?", (code,)).fetchone():
        raise ApiError(409, "promo.code_taken", f"Promo code '{code}' already exists")
    conn.execute(
        "insert into promos values (?, ?, ?, ?, ?, ?, 1, ?)",
        (code, body.type, body.value, body.minOrderTotal, body.expiresAt, body.maxUsesPerUser, db.now_iso()),
    )
    return ok(request, promo_out(conn.execute("select * from promos where code = ?", (code,)).fetchone()))


@app.get("/api/v1/promos", tags=["promos"], response_model=PromoListResponse, responses=errors(*ADMIN))
def list_promos(request: Request, conn: sqlite3.Connection = Depends(get_conn), _=Depends(admin_only)):
    return ok(request, [promo_out(p) for p in conn.execute("select * from promos order by created_at, code")])


@app.patch(
    "/api/v1/promos/{code}", tags=["promos"],
    response_model=PromoResponse,
    responses=errors(*ADMIN, *VALIDATION, "404 promo.not_found"),
)
def update_promo(code: str, body: PromoPatchIn, request: Request, conn: sqlite3.Connection = Depends(get_conn), _=Depends(admin_only)):
    code = code.upper()
    if not conn.execute("select 1 from promos where code = ?", (code,)).fetchone():
        raise ApiError(404, "promo.not_found", f"Promo code '{code}' not found")
    for column, value in (("is_active", None if body.isActive is None else int(body.isActive)),
                          ("expires_at", body.expiresAt), ("min_order_total", body.minOrderTotal)):
        if value is not None:
            conn.execute(f"update promos set {column} = ? where code = ?", (value, code))
    return ok(request, promo_out(conn.execute("select * from promos where code = ?", (code,)).fetchone()))


# --- cart -------------------------------------------------------------------


class CartItemIn(BaseModel):
    productUuid: str
    quantity: int = Field(default=1, ge=1, le=99)


class CartQuantityIn(BaseModel):
    quantity: int = Field(ge=0, le=99, description="0 removes the item")


class PromoApplyIn(BaseModel):
    code: str


@app.get("/api/v1/cart", tags=["cart"], response_model=CartResponse, responses=errors(*CUSTOMER))
def get_cart(request: Request, conn: sqlite3.Connection = Depends(get_conn), user=Depends(customer_only)):
    return ok(request, cart_out(conn, user["uuid"]))


@app.post(
    "/api/v1/cart/items", tags=["cart"],
    response_model=CartResponse,
    responses=errors(
        *CUSTOMER,
        *VALIDATION,
        "404 products.not_found",
        "409 products.inactive",
        "409 products.out_of_stock",
        "400 cart.quantity_limit",
    ),
)
def add_to_cart(body: CartItemIn, request: Request, conn: sqlite3.Connection = Depends(get_conn), user=Depends(customer_only)):
    """Adds to the quantity if the product is already in the cart. Stock is not reserved here."""
    product = get_product_or_404(conn, body.productUuid)
    if not product["is_active"]:
        raise ApiError(409, "products.inactive", f"Product '{product['sku']}' is not for sale")
    if product["stock"] == 0:
        raise ApiError(409, "products.out_of_stock", f"Product '{product['sku']}' is out of stock")
    existing = conn.execute(
        "select quantity from cart_items where user_uuid = ? and product_uuid = ?", (user["uuid"], product["uuid"])
    ).fetchone()
    quantity = (existing["quantity"] if existing else 0) + body.quantity
    if quantity > 99:
        raise ApiError(400, "cart.quantity_limit", "One product can be in the cart at most 99 times")
    conn.execute(
        "insert into cart_items values (?, ?, ?, ?) on conflict (user_uuid, product_uuid) do update set quantity = excluded.quantity",
        (user["uuid"], product["uuid"], quantity, db.now_iso()),
    )
    return ok(request, cart_out(conn, user["uuid"]))


@app.put(
    "/api/v1/cart/items/{product_uuid}", tags=["cart"],
    response_model=CartResponse,
    responses=errors(*CUSTOMER, *VALIDATION, "404 cart.item_not_found"),
)
def set_cart_quantity(
    product_uuid: str, body: CartQuantityIn, request: Request,
    conn: sqlite3.Connection = Depends(get_conn), user=Depends(customer_only),
):
    if not conn.execute(
        "select 1 from cart_items where user_uuid = ? and product_uuid = ?", (user["uuid"], product_uuid)
    ).fetchone():
        raise ApiError(404, "cart.item_not_found", f"Product '{product_uuid}' is not in the cart")
    if body.quantity == 0:
        conn.execute("delete from cart_items where user_uuid = ? and product_uuid = ?", (user["uuid"], product_uuid))
    else:
        conn.execute("update cart_items set quantity = ? where user_uuid = ? and product_uuid = ?",
                     (body.quantity, user["uuid"], product_uuid))
    return ok(request, cart_out(conn, user["uuid"]))


@app.delete(
    "/api/v1/cart/items/{product_uuid}", tags=["cart"],
    response_model=CartResponse,
    responses=errors(*CUSTOMER),
)
def remove_from_cart(product_uuid: str, request: Request, conn: sqlite3.Connection = Depends(get_conn), user=Depends(customer_only)):
    conn.execute("delete from cart_items where user_uuid = ? and product_uuid = ?", (user["uuid"], product_uuid))
    return ok(request, cart_out(conn, user["uuid"]))


@app.delete("/api/v1/cart", tags=["cart"], response_model=CartResponse, responses=errors(*CUSTOMER))
def clear_cart(request: Request, conn: sqlite3.Connection = Depends(get_conn), user=Depends(customer_only)):
    conn.execute("delete from cart_items where user_uuid = ?", (user["uuid"],))
    conn.execute("delete from carts where user_uuid = ?", (user["uuid"],))
    return ok(request, cart_out(conn, user["uuid"]))


@app.put(
    "/api/v1/cart/promo", tags=["cart"],
    response_model=CartResponse,
    responses=errors(*CUSTOMER, *VALIDATION, *PROMO_CHECK),
)
def apply_promo(body: PromoApplyIn, request: Request, conn: sqlite3.Connection = Depends(get_conn), user=Depends(customer_only)):
    """One promo code per cart, a new one replaces the old one."""
    items_total = cart_out(conn, user["uuid"])["itemsTotal"]
    promo = check_promo(conn, body.code, user["uuid"], items_total)
    conn.execute(
        "insert into carts values (?, ?) on conflict (user_uuid) do update set promo_code = excluded.promo_code",
        (user["uuid"], promo["code"]),
    )
    return ok(request, cart_out(conn, user["uuid"]))


@app.delete("/api/v1/cart/promo", tags=["cart"], response_model=CartResponse, responses=errors(*CUSTOMER))
def remove_promo(request: Request, conn: sqlite3.Connection = Depends(get_conn), user=Depends(customer_only)):
    conn.execute("update carts set promo_code = null where user_uuid = ?", (user["uuid"],))
    return ok(request, cart_out(conn, user["uuid"]))


# --- orders -----------------------------------------------------------------


class CheckoutIn(BaseModel):
    deliveryAddress: str = Field(min_length=5, max_length=300)


class PayIn(BaseModel):
    paymentToken: str = Field(description="Test tokens: tok_success, tok_declined, tok_insufficient_funds")


class CancelIn(BaseModel):
    reason: str | None = Field(default=None, max_length=300)


@app.post(
    "/api/v1/orders", tags=["orders"],
    response_model=OrderResponse,
    responses=errors(
        *CUSTOMER,
        *VALIDATION,
        "400 cart.empty",
        "409 products.inactive",
        "409 orders.out_of_stock",
        *PROMO_CHECK,
    ),
)
def checkout(body: CheckoutIn, request: Request, conn: sqlite3.Connection = Depends(get_conn), user=Depends(customer_only)):
    """Creates an order from the cart and reserves stock. The order must be paid within the payment deadline."""
    lines = cart_lines(conn, user["uuid"])
    if not lines:
        raise ApiError(400, "cart.empty", "Cart is empty")
    inactive = [line["sku"] for line in lines if not line["is_active"]]
    if inactive:
        raise ApiError(409, "products.inactive", f"Products are not for sale: {', '.join(inactive)}")
    missing = [f"{line['sku']} (requested {line['quantity']}, available {line['stock']})"
               for line in lines if line["stock"] < line["quantity"]]
    if missing:
        raise ApiError(409, "orders.out_of_stock", f"Not enough stock: {'; '.join(missing)}")

    items_total = sum(line["price"] * line["quantity"] for line in lines)
    cart = conn.execute("select promo_code from carts where user_uuid = ?", (user["uuid"],)).fetchone()
    promo = check_promo(conn, cart["promo_code"], user["uuid"], items_total) if cart and cart["promo_code"] else None
    discount = discount_for(promo, items_total) if promo else 0
    fee = delivery_fee_for(items_total - discount)

    if "oversell" in BUGS:
        # BUG (intentional): stock checked above is written back without a guard, so parallel checkouts both win.
        time.sleep(0.3)
        for line in lines:
            conn.execute("update products set stock = ? where uuid = ?", (line["stock"] - line["quantity"], line["uuid"]))
    else:
        for line in lines:
            cur = conn.execute("update products set stock = stock - ? where uuid = ? and stock >= ?",
                               (line["quantity"], line["uuid"], line["quantity"]))
            if cur.rowcount == 0:
                raise ApiError(409, "orders.out_of_stock", f"Not enough stock: {line['sku']}")

    order_uuid = db.new_uuid()
    number = conn.execute("select coalesce(max(number), 1000) + 1 from orders").fetchone()[0]
    conn.execute(
        "insert into orders (uuid, number, user_uuid, status, delivery_address, items_total, discount, delivery_fee, "
        "total, promo_code, created_at) values (?, ?, ?, 'created', ?, ?, ?, ?, ?, ?, ?)",
        (order_uuid, number, user["uuid"], body.deliveryAddress, items_total, discount, fee,
         items_total - discount + fee, promo["code"] if promo else None, db.now_iso()),
    )
    for line in lines:
        conn.execute("insert into order_items values (?, ?, ?, ?, ?, ?)",
                     (order_uuid, line["uuid"], line["sku"], line["name"], line["price"], line["quantity"]))
    conn.execute(
        "insert into order_history (order_uuid, at, from_status, to_status, actor_uuid, comment) values (?, ?, null, 'created', ?, null)",
        (order_uuid, db.now_iso(), user["uuid"]),
    )
    if promo:
        conn.execute("insert into promo_usages values (?, ?, ?, ?)", (promo["code"], user["uuid"], order_uuid, db.now_iso()))
    conn.execute("delete from cart_items where user_uuid = ?", (user["uuid"],))
    conn.execute("delete from carts where user_uuid = ?", (user["uuid"],))
    return ok(request, order_out(conn, conn.execute("select * from orders where uuid = ?", (order_uuid,)).fetchone()))


@app.get("/api/v1/orders", tags=["orders"], response_model=OrderPageResponse, responses=errors(*AUTH, *VALIDATION))
def list_orders(
    request: Request,
    status: Literal["created", "paid", "shipped", "delivered", "cancelled", "returned"] | None = None,
    userUuid: str | None = Query(default=None, description="Only for managers and admins"),
    take: int = Query(default=20, ge=1, le=100),
    skip: int = Query(default=0, ge=0),
    conn: sqlite3.Connection = Depends(get_conn),
    user=Depends(current_user),
):
    """Customers see their own orders, managers and admins see all. Newest first."""
    sql, args = "select * from orders where 1 = 1", []
    if user["role"] == "customer":
        sql += " and user_uuid = ?"
        args.append(user["uuid"])
    elif userUuid:
        sql += " and user_uuid = ?"
        args.append(userUuid)
    if status:
        sql += " and status = ?"
        args.append(status)
    total = conn.execute(sql.replace("select *", "select count(*)", 1), args).fetchone()[0]
    rows = conn.execute(sql + " order by number desc limit ? offset ?", [*args, take, skip]).fetchall()
    return ok(request, {"items": [order_out(conn, o, detailed=False) for o in rows], "total": total})


@app.get(
    "/api/v1/orders/{order_uuid}", tags=["orders"],
    response_model=OrderResponse,
    responses=errors(*AUTH, "404 orders.not_found"),
)
def get_order(order_uuid: str, request: Request, conn: sqlite3.Connection = Depends(get_conn), user=Depends(current_user)):
    return ok(request, order_out(conn, get_order_for(conn, order_uuid, user)))


@app.post(
    "/api/v1/orders/{order_uuid}/pay", tags=["orders"],
    response_model=OrderResponse,
    responses=errors(
        *CUSTOMER,
        *VALIDATION,
        *ORDER_ACTION,
        "400 payment.bad_token",
        "402 payment.declined",
        "402 payment.insufficient_funds",
    ),
)
def pay_order(order_uuid: str, body: PayIn, request: Request, conn: sqlite3.Connection = Depends(get_conn), user=Depends(customer_only)):
    order = get_order_for(conn, order_uuid, user)
    require_status(order, ("created",), "pay")
    if body.paymentToken not in PAYMENT_TOKENS:
        raise ApiError(400, "payment.bad_token", f"Unknown payment token. Test tokens: {', '.join(PAYMENT_TOKENS)}")
    error = PAYMENT_TOKENS[body.paymentToken]
    conn.execute(
        "insert into payments values (?, ?, 'charge', ?, ?, ?, ?, ?)",
        (db.new_uuid(), order["uuid"], body.paymentToken, "failed" if error else "success",
         order["total"], error[1] if error else None, db.now_iso()),
    )
    if error:
        conn.commit()  # keep the failed attempt in payments
        raise ApiError(*error)
    set_status(conn, order, "paid", user["uuid"])
    return ok(request, order_out(conn, get_order_for(conn, order_uuid, user)))


@app.post(
    "/api/v1/orders/{order_uuid}/cancel", tags=["orders"],
    response_model=OrderResponse,
    responses=errors(*AUTH, *VALIDATION, *ORDER_ACTION),
)
def cancel_order(order_uuid: str, body: CancelIn, request: Request, conn: sqlite3.Connection = Depends(get_conn), user=Depends(current_user)):
    """Before shipping only. A paid order is refunded. Stock goes back."""
    order = get_order_for(conn, order_uuid, user)
    require_status(order, ("created", "paid"), "cancel")
    restock(conn, order["uuid"])
    if order["status"] == "paid":
        refund(conn, order)
    set_status(conn, order, "cancelled", user["uuid"], body.reason)
    return ok(request, order_out(conn, get_order_for(conn, order_uuid, user)))


@app.post(
    "/api/v1/orders/{order_uuid}/ship", tags=["orders"],
    response_model=OrderResponse,
    responses=errors(*STAFF, *ORDER_ACTION),
)
def ship_order(order_uuid: str, request: Request, conn: sqlite3.Connection = Depends(get_conn), user=Depends(staff_only)):
    order = get_order_for(conn, order_uuid, user)
    require_status(order, ("paid",), "ship")
    set_status(conn, order, "shipped", user["uuid"])
    return ok(request, order_out(conn, get_order_for(conn, order_uuid, user)))


@app.post(
    "/api/v1/orders/{order_uuid}/deliver", tags=["orders"],
    response_model=OrderResponse,
    responses=errors(*STAFF, *ORDER_ACTION),
)
def deliver_order(order_uuid: str, request: Request, conn: sqlite3.Connection = Depends(get_conn), user=Depends(staff_only)):
    order = get_order_for(conn, order_uuid, user)
    require_status(order, ("shipped",), "deliver")
    set_status(conn, order, "delivered", user["uuid"])
    return ok(request, order_out(conn, get_order_for(conn, order_uuid, user)))


@app.post(
    "/api/v1/orders/{order_uuid}/return", tags=["orders"],
    response_model=OrderResponse,
    responses=errors(*CUSTOMER, *VALIDATION, *ORDER_ACTION, "409 orders.return_period_expired"),
)
def return_order(order_uuid: str, body: CancelIn, request: Request, conn: sqlite3.Connection = Depends(get_conn), user=Depends(customer_only)):
    order = get_order_for(conn, order_uuid, user)
    require_status(order, ("delivered",), "return")
    delivered = datetime.fromisoformat(order["delivered_at"])
    if datetime.now(timezone.utc) - delivered > timedelta(days=RETURN_PERIOD_DAYS):
        raise ApiError(409, "orders.return_period_expired", f"Return is possible within {RETURN_PERIOD_DAYS} days after delivery")
    restock(conn, order["uuid"])
    refund(conn, order)
    set_status(conn, order, "returned", user["uuid"], body.reason)
    return ok(request, order_out(conn, get_order_for(conn, order_uuid, user)))


@app.get("/health", tags=["service"], response_model=HealthResponse)
def health(request: Request):
    return ok(request, {"status": "ok"})


def _openapi_without_422() -> dict:
    """FastAPI documents validation errors as 422 HTTPValidationError; this API answers 400 validation.failed."""
    if not app.openapi_schema:
        schema = _default_openapi()
        for operations in schema["paths"].values():
            for operation in operations.values():
                operation["responses"].pop("422", None)
        for name in ("HTTPValidationError", "ValidationError"):
            schema["components"]["schemas"].pop(name, None)
    return app.openapi_schema


_default_openapi = app.openapi
app.openapi = _openapi_without_422


# --- website ----------------------------------------------------------------
# In the monolith the API also serves the built website (npm run build → dist/).
# Registered last so it never shadows API routes; unknown /api paths stay JSON 404s.

WEB_DIST = Path(os.environ.get("SHOP_WEB_DIST", Path(__file__).resolve().parents[2] / "dist")).resolve()

if (WEB_DIST / "index.html").is_file():

    @app.get("/{path:path}", include_in_schema=False)
    def website(path: str, request: Request):
        if path == "api" or path.startswith("api/"):
            return fail(request, 404, "not_found", "Not Found")
        file = (WEB_DIST / path).resolve()
        if path and file.is_relative_to(WEB_DIST) and file.is_file():
            return FileResponse(file)
        # Client-side routes (/catalog, /orders/…) all load the SPA.
        return FileResponse(WEB_DIST / "index.html")
