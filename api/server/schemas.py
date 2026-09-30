"""Response models: the API contract published in OpenAPI (/docs, /openapi.json).

Handlers still build plain dicts; FastAPI validates them against these models on the way out,
so a field that drifts from the contract fails loudly instead of reaching the client.
"""

from typing import Generic, Literal, TypeVar

from pydantic import BaseModel, ConfigDict, Field

Role = Literal["admin", "manager", "customer"]
UserStatus = Literal["active", "blocked"]
OrderStatus = Literal["created", "paid", "shipped", "delivered", "cancelled", "returned"]

T = TypeVar("T")


class Meta(BaseModel):
    correlationId: str | None = Field(description="Also sent as the X-Correlation-Id header")


class Envelope(BaseModel, Generic[T]):
    """Successful response. Concrete subclasses below give schemas readable names in OpenAPI."""

    success: Literal[True]
    data: T
    meta: Meta


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int = Field(description="All matching items, not only this page")


class ErrorBody(BaseModel):
    code: str = Field(description="Stable machine-readable code, e.g. orders.not_found")
    message: str = Field(description="Human-readable details, may change")


class ErrorResponse(BaseModel):
    """Every error, including validation errors, comes in this envelope."""

    success: Literal[False]
    error: ErrorBody
    meta: Meta


# --- users ------------------------------------------------------------------


class User(BaseModel):
    uuid: str
    role: Role
    email: str
    firstName: str
    lastName: str
    status: UserStatus
    createdAt: str


class UserDetails(User):
    ordersCount: int


class LoginResult(BaseModel):
    token: str = Field(description="Send as Authorization: Bearer <token>")
    expiresAt: int = Field(description="Unix time, seconds")
    user: User


class DeletedUser(BaseModel):
    uuid: str
    deleted: Literal[True]


# --- catalog ----------------------------------------------------------------


class Product(BaseModel):
    """All money is integer kopecks."""

    uuid: str
    sku: str
    name: str
    category: str
    price: int
    stock: int
    isActive: bool = Field(description="Disabled products are visible only to managers and admins")


class Promo(BaseModel):
    code: str
    type: Literal["percent", "fixed"]
    value: int = Field(description="Percent (1-100) or amount in kopecks")
    minOrderTotal: int
    expiresAt: str | None = Field(description="YYYY-MM-DD, last day when the code works")
    maxUsesPerUser: int
    isActive: bool


# --- cart -------------------------------------------------------------------


class CartItem(BaseModel):
    productUuid: str
    sku: str
    name: str
    price: int
    quantity: int
    lineTotal: int
    inStock: bool = Field(description="False if the product is disabled or stock is below quantity")


class CartPromo(BaseModel):
    code: str
    applied: bool = Field(description="False if the code no longer fits the cart (e.g. total dropped below minimum)")


class Cart(BaseModel):
    items: list[CartItem]
    itemsTotal: int
    promo: CartPromo | None
    discount: int
    deliveryFee: int
    total: int


# --- orders -----------------------------------------------------------------


class OrderItem(BaseModel):
    productUuid: str
    sku: str
    name: str
    price: int = Field(description="Price at the moment of checkout")
    quantity: int
    lineTotal: int


class OrderHistoryEntry(BaseModel):
    model_config = ConfigDict(serialize_by_alias=True)

    at: str
    from_: OrderStatus | None = Field(alias="from")
    to: OrderStatus
    actorUuid: str | None = Field(description="Null when the system changed the status (payment timeout)")
    comment: str | None


class Payment(BaseModel):
    uuid: str
    kind: Literal["charge", "refund"]
    status: Literal["success", "failed"]
    amount: int
    errorCode: str | None = Field(description="payment.declined or payment.insufficient_funds for failed charges")
    createdAt: str


class OrderSummary(BaseModel):
    """Order as returned in lists."""

    uuid: str
    number: int
    userUuid: str
    status: OrderStatus
    deliveryAddress: str
    items: list[OrderItem]
    itemsTotal: int
    discount: int
    deliveryFee: int
    total: int
    promoCode: str | None
    createdAt: str
    paidAt: str | None
    shippedAt: str | None
    deliveredAt: str | None
    cancelledAt: str | None
    returnedAt: str | None
    paymentDeadline: str | None = Field(
        default=None,
        exclude_if=lambda v: v is None,
        description="Present only while status is created: UTC time without a timezone suffix, "
        "after which the order is cancelled",
    )


class Order(OrderSummary):
    """Order with its status history and payments."""

    history: list[OrderHistoryEntry]
    payments: list[Payment]


# --- service ----------------------------------------------------------------


class Health(BaseModel):
    status: Literal["ok"]


# --- response envelopes -----------------------------------------------------


class UserPage(Page[User]):
    pass


class ProductPage(Page[Product]):
    pass


class OrderPage(Page[OrderSummary]):
    pass


class UserResponse(Envelope[User]):
    pass


class UserDetailsResponse(Envelope[UserDetails]):
    pass


class UserPageResponse(Envelope[UserPage]):
    pass


class DeletedUserResponse(Envelope[DeletedUser]):
    pass


class LoginResponse(Envelope[LoginResult]):
    pass


class ProductResponse(Envelope[Product]):
    pass


class ProductPageResponse(Envelope[ProductPage]):
    pass


class PromoResponse(Envelope[Promo]):
    pass


class PromoListResponse(Envelope[list[Promo]]):
    pass


class CartResponse(Envelope[Cart]):
    pass


class OrderResponse(Envelope[Order]):
    pass


class OrderPageResponse(Envelope[OrderPage]):
    pass


class HealthResponse(Envelope[Health]):
    pass
