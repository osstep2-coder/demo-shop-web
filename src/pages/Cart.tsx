import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowRight, BadgePercent, ShoppingCart, Tag, Trash2, Truck, X } from "lucide-react";
import { cartApi } from "../api/endpoints";
import type { Cart as CartData } from "../api/types";
import { MiniProduct, QuantityStepper, SummaryRow } from "../components/shop";
import { Button, ButtonLink, Card, EmptyState, Input, Modal, PageHeader, PageLoader, cn } from "../components/ui";
import { ErrorState } from "../components/states";
import { cartCount, useCart, useCartMutation } from "../hooks/cart";
import { pluralize } from "../lib/dates";
import { errorText } from "../lib/errors";
import { formatMoney } from "../lib/money";
import { toast, toastError } from "../lib/toast";

export const FREE_DELIVERY_FROM = 300000;

export function CartTotals({ cart }: { cart: CartData }) {
  const afterDiscount = cart.itemsTotal - cart.discount;
  const left = FREE_DELIVERY_FROM - afterDiscount;
  return (
    <div className="space-y-3" data-testid="cart-totals">
      <SummaryRow label={`Товары (${cartCount(cart)})`} value={formatMoney(cart.itemsTotal)} />
      {cart.discount > 0 && <SummaryRow label={`Скидка по ${cart.promo?.code}`} value={`−${formatMoney(cart.discount)}`} accent />}
      <SummaryRow label="Доставка" value={cart.deliveryFee ? formatMoney(cart.deliveryFee) : "Бесплатно"} />
      {cart.items.length > 0 && left > 0 && (
        <div className="rounded-xl bg-sky-50 p-3" data-testid="cart-free-delivery">
          <div className="flex items-center gap-2 text-xs font-semibold text-sky-800">
            <Truck className="size-4" /> До бесплатной доставки {formatMoney(left)}
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sky-100">
            <div className="h-full rounded-full bg-sky-500" style={{ width: `${Math.min(100, (afterDiscount / FREE_DELIVERY_FROM) * 100)}%` }} />
          </div>
        </div>
      )}
      <div className="h-px bg-slate-100" />
      <SummaryRow label="Итого" value={formatMoney(cart.total)} strong />
    </div>
  );
}

function PromoForm({ cart }: { cart: CartData }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const apply = useCartMutation(cartApi.applyPromo);
  const remove = useCartMutation(cartApi.removePromo);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setError(null);
    apply.mutate(code.trim(), {
      onSuccess: (c) => {
        setCode("");
        toast.success(`Промокод ${c.promo?.code} применён`, { description: `Скидка ${formatMoney(c.discount)}` });
      },
      onError: (err) => setError(errorText(err)),
    });
  };

  if (cart.promo) {
    return (
      <div
        data-testid="cart-promo"
        data-state={cart.promo.applied ? "applied" : "not-applicable"}
        className={cn(
          "flex items-center justify-between gap-3 rounded-2xl p-3.5 ring-1",
          cart.promo.applied ? "bg-emerald-50 ring-emerald-200" : "bg-amber-50 ring-amber-200",
        )}
      >
        <div className="flex items-center gap-3">
          <span className={cn("flex size-9 items-center justify-center rounded-xl bg-white", cart.promo.applied ? "text-emerald-600" : "text-amber-600")}>
            <BadgePercent className="size-5" />
          </span>
          <div>
            <div className="font-mono text-sm font-bold tracking-wider text-slate-900">{cart.promo.code}</div>
            <div className={cn("text-xs font-medium", cart.promo.applied ? "text-emerald-700" : "text-amber-700")}>
              {cart.promo.applied ? `Скидка ${formatMoney(cart.discount)}` : "Условия промокода больше не выполняются"}
            </div>
          </div>
        </div>
        <button
          onClick={() => remove.mutate(undefined, { onError: toastError })}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-slate-600"
          aria-label="Убрать промокод"
          data-testid="cart-promo-remove"
        >
          <X className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} data-testid="cart-promo" data-state={apply.isPending ? "pending" : error ? "error" : "form"}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setError(null);
            }}
            placeholder="Промокод"
            className="pl-9 font-mono uppercase tracking-wider"
            invalid={Boolean(error)}
            data-testid="cart-promo-input"
          />
        </div>
        <Button type="submit" variant="secondary" loading={apply.isPending} disabled={!code.trim()} data-testid="cart-promo-apply">
          Применить
        </Button>
      </div>
      {error && (
        <p className="mt-2 text-xs font-medium text-rose-600" data-testid="cart-promo-error">
          {error}
        </p>
      )}
    </form>
  );
}

export default function Cart() {
  const { data: cart, isLoading, error, refetch } = useCart();
  const navigate = useNavigate();
  const [confirmClear, setConfirmClear] = useState(false);
  const setQty = useCartMutation(({ uuid, qty }: { uuid: string; qty: number }) => cartApi.setQuantity(uuid, qty));
  const remove = useCartMutation(cartApi.remove);
  const clear = useCartMutation(cartApi.clear);

  if (isLoading) return <PageLoader data-testid="cart-page" data-state="loading" />;
  if (!cart) return <ErrorState error={error} onRetry={refetch} title="Не удалось загрузить корзину" data-testid="cart-page" data-state="error" />;

  if (cart.items.length === 0) {
    return (
      <Card className="animate-fade-in" data-testid="cart-page" data-state="empty">
        <EmptyState
          icon={<ShoppingCart />}
          title="Корзина пуста"
          text="Загляните в каталог — там много интересного."
          action={<ButtonLink to="/catalog">Перейти в каталог</ButtonLink>}
        />
      </Card>
    );
  }

  const count = cartCount(cart);
  const blocked = cart.items.some((i) => !i.inStock);

  return (
    <div className="animate-fade-in" data-testid="cart-page" data-state="ready">
      <PageHeader
        title="Корзина"
        subtitle={`${count} ${pluralize(count, "товар", "товара", "товаров")}`}
        actions={
          <Button variant="ghost" size="sm" icon={<Trash2 className="size-4" />} onClick={() => setConfirmClear(true)} data-testid="cart-clear-button">
            Очистить корзину
          </Button>
        }
      />

      <div className="grid-cols-1 [&>*]:min-w-0 grid items-start gap-6 lg:grid-cols-[1fr_380px]">
        <Card className="divide-y divide-slate-100">
          {cart.items.map((item) => (
            <div key={item.productUuid} className="flex gap-4 p-4 sm:p-5" data-testid="cart-item" data-state={item.inStock ? "available" : "unavailable"}>
              <Link to={`/product/${item.productUuid}`}>
                <MiniProduct sku={item.sku} className="size-20 sm:size-24" />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <Link to={`/product/${item.productUuid}`} className="font-bold text-slate-900 hover:text-brand-700">
                    {item.name}
                  </Link>
                  <div className="mt-0.5 text-xs text-slate-400">
                    {item.sku} · {formatMoney(item.price)} / шт.
                  </div>
                  {!item.inStock && (
                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                      <AlertTriangle className="size-3.5" /> Недостаточно на складе или снят с продажи
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <QuantityStepper
                    size="sm"
                    value={item.quantity}
                    data-testid="cart-item-quantity"
                    disabled={setQty.isPending}
                    onChange={(qty) => setQty.mutate({ uuid: item.productUuid, qty }, { onError: toastError })}
                  />
                  <div className="tabular w-28 text-right font-extrabold text-slate-900">{formatMoney(item.lineTotal)}</div>
                  <button
                    onClick={() => remove.mutate(item.productUuid, { onError: toastError })}
                    className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    aria-label="Удалить"
                    data-testid="cart-item-remove"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </Card>

        <div className="space-y-4 lg:sticky lg:top-24">
          <Card className="p-5">
            <PromoForm cart={cart} />
          </Card>
          <Card className="p-5">
            <CartTotals cart={cart} />
            <Button
              size="lg"
              className="mt-5 w-full flex-row-reverse"
              disabled={blocked}
              icon={<ArrowRight className="size-5" />}
              onClick={() => navigate("/checkout")}
              data-testid="cart-checkout-button"
              data-state={blocked ? "blocked" : "enabled"}
            >
              Перейти к оформлению
            </Button>
            {blocked && <p className="mt-2 text-center text-xs text-amber-700">Уберите недоступные товары, чтобы оформить заказ</p>}
          </Card>
        </div>
      </div>

      <Modal
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="Очистить корзину?"
        description="Все товары и промокод будут удалены из корзины."
        size="sm"
        data-testid="cart-clear-modal"
        data-state="open"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmClear(false)}>
              Отмена
            </Button>
            <Button
              variant="danger"
              loading={clear.isPending}
              onClick={() => clear.mutate(undefined, { onSuccess: () => setConfirmClear(false), onError: toastError })}
            >
              Очистить
            </Button>
          </>
        }
      />
    </div>
  );
}
