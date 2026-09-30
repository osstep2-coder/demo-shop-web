import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Check, Clock, EyeOff, Minus, Plus, ShoppingBag } from "lucide-react";
import { cartApi } from "../api/endpoints";
import type { OrderHistoryEntry, OrderStatus, Product } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { ProductArt } from "../catalog/ProductArt";
import { categoryForSku, productMeta } from "../catalog/meta";
import { useCart, useCartMutation } from "../hooks/cart";
import { formatDateTime, parseApiDate } from "../lib/dates";
import { formatMoney } from "../lib/money";
import { ORDER_STATUS } from "../lib/status";
import { toast, toastError } from "../lib/toast";
import { Badge, Button, cn } from "./ui";

export const LOW_STOCK = 3;

export function StockBadge({ product }: { product: Product }) {
  if (!product.isActive)
    return (
      <Badge className="bg-slate-900/80 text-white ring-transparent">
        <EyeOff className="size-3" /> Скрыт
      </Badge>
    );
  if (product.stock === 0) return <Badge className="bg-slate-100 text-slate-600 ring-slate-500/20">Нет в наличии</Badge>;
  if (product.stock <= LOW_STOCK) return <Badge className="bg-amber-50 text-amber-700 ring-amber-600/20">Осталось {product.stock} шт.</Badge>;
  return <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-600/20">В наличии</Badge>;
}

/** Adds to cart for customers, sends guests to login, is hidden for staff (they have no cart). */
export function AddToCartButton({
  product,
  quantity = 1,
  size = "md",
  className,
  full,
}: {
  product: Product;
  quantity?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
  full?: boolean;
}) {
  const { user, isCustomer } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: cart } = useCart();
  const add = useCartMutation((q: number) => cartApi.add(product.uuid, q));
  const inCart = cart?.items.find((i) => i.productUuid === product.uuid);
  const soldOut = product.stock === 0 || !product.isActive;

  if (user && !isCustomer) return null;

  const onClick = () => {
    if (!user) {
      navigate("/login", { state: { from: location.pathname } });
      return;
    }
    add.mutate(quantity, {
      onSuccess: () =>
        toast.success(`${product.name} в корзине`, {
          action: { label: "Открыть", onClick: () => navigate("/cart") },
        }),
      onError: toastError,
    });
  };

  return (
    <Button
      size={size}
      className={cn(full && "w-full", className)}
      disabled={soldOut}
      loading={add.isPending}
      variant={inCart && !full ? "secondary" : "primary"}
      icon={inCart && !full ? <Check className="size-4 text-emerald-600" /> : <ShoppingBag className="size-4" />}
      onClick={onClick}
    >
      {soldOut ? "Нет в наличии" : inCart && !full ? `В корзине · ${inCart.quantity}` : "В корзину"}
    </Button>
  );
}

export function ProductCard({ product }: { product: Product }) {
  const meta = productMeta(product.sku, product.category);
  const unavailable = product.stock === 0 || !product.isActive;
  return (
    <div className="group flex flex-col overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-slate-900/5 transition hover:-translate-y-0.5 hover:shadow-lift">
      <Link to={`/product/${product.uuid}`} className="relative block aspect-[4/3] overflow-hidden">
        <div className="h-full w-full transition duration-500 group-hover:scale-[1.04]">
          <ProductArt sku={product.sku} category={product.category} muted={unavailable} />
        </div>
        <div className="absolute top-3 left-3">
          <StockBadge product={product} />
        </div>
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <div className="text-xs font-semibold tracking-wide text-slate-400 uppercase">{product.category}</div>
        <Link to={`/product/${product.uuid}`} className="mt-1 line-clamp-2 text-base leading-snug font-bold text-slate-900 hover:text-brand-700">
          {product.name}
        </Link>
        <p className="mt-1 line-clamp-1 text-sm text-slate-500">{meta.tagline}</p>
        <div className="mt-auto flex items-center justify-between gap-3 pt-4">
          <div className="tabular text-xl font-extrabold text-slate-900">{formatMoney(product.price)}</div>
          <AddToCartButton product={product} size="sm" />
        </div>
      </div>
    </div>
  );
}

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  disabled,
  size = "md",
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  size?: "sm" | "md";
}) {
  const h = size === "sm" ? "h-9" : "h-11";
  return (
    <div className={cn("inline-flex items-center rounded-xl bg-white ring-1 ring-slate-200", h)}>
      <button
        type="button"
        className="flex h-full w-9 items-center justify-center rounded-l-xl text-slate-500 hover:bg-slate-50 disabled:opacity-40"
        onClick={() => onChange(value - 1)}
        disabled={disabled || value <= min}
        aria-label="Меньше"
      >
        <Minus className="size-4" />
      </button>
      <span className="tabular w-9 text-center text-sm font-bold">{value}</span>
      <button
        type="button"
        className="flex h-full w-9 items-center justify-center rounded-r-xl text-slate-500 hover:bg-slate-50 disabled:opacity-40"
        onClick={() => onChange(value + 1)}
        disabled={disabled || value >= max}
        aria-label="Больше"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}

export function OrderStatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  const s = ORDER_STATUS[status];
  return (
    <Badge className={cn(s.badge, className)}>
      <span className={cn("size-1.5 rounded-full", s.dot)} />
      {s.label}
    </Badge>
  );
}

const HAPPY_PATH: OrderStatus[] = ["created", "paid", "shipped", "delivered"];

/** Progress bar for the normal flow plus the full history log. */
export function OrderProgress({ status }: { status: OrderStatus }) {
  const off = status === "cancelled" || status === "returned";
  const reached = off ? -1 : HAPPY_PATH.indexOf(status);
  return (
    <ol className="grid grid-cols-4 gap-2">
      {HAPPY_PATH.map((step, i) => {
        const done = i <= reached;
        return (
          <li key={step} className="flex flex-col gap-2">
            <div className={cn("h-1.5 rounded-full", done ? "bg-brand-600" : "bg-slate-200")} />
            <span className={cn("text-xs font-semibold", done ? "text-slate-900" : "text-slate-400")}>{ORDER_STATUS[step].label}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function OrderTimeline({ history }: { history: OrderHistoryEntry[] }) {
  return (
    <ol className="relative space-y-5">
      {history.toReversed().map((h, i) => (
        <li key={`${h.at}-${i}`} className="relative flex gap-3">
          <div className="flex flex-col items-center">
            <span className={cn("mt-1 size-3 rounded-full ring-4 ring-white", ORDER_STATUS[h.to].dot)} />
            {i < history.length - 1 && <span className="mt-1 w-px flex-1 bg-slate-200" />}
          </div>
          <div className="pb-1">
            <div className="text-sm font-bold text-slate-900">{ORDER_STATUS[h.to].label}</div>
            <div className="text-xs text-slate-500">{formatDateTime(h.at)}</div>
            {h.comment && <div className="mt-1 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600">«{h.comment}»</div>}
            {!h.actorUuid && <div className="mt-1 text-xs text-slate-400">автоматически</div>}
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Milliseconds left until the deadline, updated every second. */
export function useCountdown(deadline: string | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!deadline) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [deadline]);
  return deadline ? Math.max(0, parseApiDate(deadline).getTime() - now) : 0;
}

export function Countdown({ deadline, className }: { deadline: string; className?: string }) {
  const ms = useCountdown(deadline);
  const min = Math.floor(ms / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  return (
    <span className={cn("tabular inline-flex items-center gap-1.5 font-bold", ms < 120000 ? "text-rose-600" : "text-amber-700", className)}>
      <Clock className="size-4" />
      {ms === 0 ? "время вышло" : `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`}
    </span>
  );
}

export function SummaryRow({ label, value, strong, accent }: { label: string; value: string; strong?: boolean; accent?: boolean }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-4", strong ? "text-lg font-extrabold text-slate-900" : "text-sm text-slate-600")}>
      <span>{label}</span>
      <span className={cn("tabular", accent && "font-semibold text-emerald-600", !strong && !accent && "font-semibold text-slate-900")}>{value}</span>
    </div>
  );
}

export function MiniProduct({ sku, className }: { sku: string; className?: string }) {
  return (
    <div className={cn("shrink-0 overflow-hidden rounded-xl ring-1 ring-slate-900/5", className ?? "size-16")}>
      <ProductArt sku={sku} category={categoryForSku(sku)} />
    </div>
  );
}
