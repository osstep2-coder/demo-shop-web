import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowLeft, Ban, CheckCircle2, CreditCard, MapPin, PackageCheck, RotateCcw, Truck, User as UserIcon, XCircle } from "lucide-react";
import { ordersApi, usersApi } from "../api/endpoints";
import type { Order } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { formatDateTime, parseApiDate } from "../lib/dates";
import { errorCode } from "../lib/errors";
import { ErrorState, NotFoundState } from "./states";
import { formatMoney } from "../lib/money";
import { ORDER_STATUS } from "../lib/status";
import { toast, toastError } from "../lib/toast";
import { Countdown, MiniProduct, OrderProgress, OrderStatusBadge, OrderTimeline, SummaryRow } from "./shop";
import { Badge, Button, ButtonLink, Card, Field, Modal, PageLoader, Textarea } from "./ui";

const RETURN_DAYS = 14;

type ReasonAction = "cancel" | "return";

const PAYMENT_ERROR: Record<string, string> = {
  "payment.declined": "отказ банка",
  "payment.insufficient_funds": "недостаточно средств",
};

function Payments({ order }: { order: Order }) {
  if (!order.payments?.length) return <p className="text-sm text-slate-500">Платежей пока нет</p>;
  return (
    <ul className="space-y-3">
      {order.payments.map((p) => {
        const ok = p.status === "success";
        const refund = p.kind === "refund";
        return (
          <li key={p.uuid} className="flex items-center gap-3">
            <span
              className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${!ok ? "bg-rose-50 text-rose-600" : refund ? "bg-sky-50 text-sky-600" : "bg-emerald-50 text-emerald-600"}`}
            >
              {!ok ? <XCircle className="size-4" /> : refund ? <RotateCcw className="size-4" /> : <CheckCircle2 className="size-4" />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">
                {refund ? "Возврат денег" : ok ? "Оплата картой" : `Отклонено: ${PAYMENT_ERROR[p.errorCode ?? ""] ?? p.errorCode}`}
              </div>
              <div className="text-xs text-slate-500">{formatDateTime(p.createdAt)}</div>
            </div>
            <div className={`tabular text-sm font-bold ${!ok ? "text-slate-400 line-through" : refund ? "text-sky-600" : "text-slate-900"}`}>
              {refund ? "+" : ""}
              {formatMoney(p.amount)}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Customer({ uuid }: { uuid: string }) {
  const { isAdmin } = useAuth();
  const { data } = useQuery({ queryKey: ["user", uuid], queryFn: () => usersApi.get(uuid), enabled: isAdmin });
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        <UserIcon className="size-5" />
      </span>
      <div className="min-w-0">
        {data ? (
          <>
            <div className="text-sm font-bold">
              {data.firstName} {data.lastName}
            </div>
            <div className="truncate text-xs text-slate-500">{data.email}</div>
          </>
        ) : (
          <div className="truncate font-mono text-xs text-slate-500">{uuid}</div>
        )}
        <Link to={`/admin/orders?userUuid=${uuid}`} className="text-xs font-semibold text-brand-600 hover:text-brand-700">
          Все заказы покупателя
        </Link>
      </div>
    </div>
  );
}

export function OrderDetails({ uuid, mode }: { uuid: string; mode: "customer" | "staff" }) {
  const queryClient = useQueryClient();
  const [reasonFor, setReasonFor] = useState<ReasonAction | null>(null);
  const [reason, setReason] = useState("");
  // Taken once per page view: good enough for the 14-day return window.
  const [now] = useState(() => Date.now());
  const { data: order, isLoading, error, refetch } = useQuery({ queryKey: ["order", uuid], queryFn: () => ordersApi.get(uuid) });

  const action = useMutation({
    mutationFn: ({ kind, comment }: { kind: "cancel" | "return" | "ship" | "deliver"; comment?: string }) => {
      if (kind === "cancel") return ordersApi.cancel(uuid, comment);
      if (kind === "return") return ordersApi.return(uuid, comment);
      if (kind === "ship") return ordersApi.ship(uuid);
      return ordersApi.deliver(uuid);
    },
    onSuccess: (o) => {
      queryClient.setQueryData(["order", uuid], o);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setReasonFor(null);
      setReason("");
      toast.success(`Заказ №${o.number}: ${ORDER_STATUS[o.status].label.toLowerCase()}`);
    },
    onError: toastError,
  });

  const back = mode === "customer" ? "/account/orders" : "/admin/orders";
  if (isLoading) return <PageLoader />;
  if (!order)
    return errorCode(error) === "orders.not_found" ? (
      <NotFoundState title="Заказ не найден" text="Такого заказа нет или он принадлежит другому покупателю." backTo={back} backLabel="К списку заказов" />
    ) : (
      <ErrorState error={error} onRetry={refetch} title="Не удалось загрузить заказ" />
    );

  const status = ORDER_STATUS[order.status];
  const returnUntil = order.deliveredAt ? new Date(parseApiDate(order.deliveredAt).getTime() + RETURN_DAYS * 86400000) : null;
  const canReturn = mode === "customer" && order.status === "delivered" && returnUntil && returnUntil.getTime() > now;
  const canCancel = order.status === "created" || order.status === "paid";

  return (
    <div className="animate-fade-in">
      <Link to={back} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900">
        <ArrowLeft className="size-4" /> К списку заказов
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Заказ №{order.number}</h1>
            <OrderStatusBadge status={order.status} className="text-sm" />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            от {formatDateTime(order.createdAt)} · {status.description}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {mode === "customer" && order.status === "created" && (
            <ButtonLink to={`/orders/${order.uuid}/pay`} icon={<CreditCard className="size-4" />}>
              Оплатить {formatMoney(order.total)}
            </ButtonLink>
          )}
          {mode === "staff" && order.status === "paid" && (
            <Button icon={<Truck className="size-4" />} loading={action.isPending} onClick={() => action.mutate({ kind: "ship" })}>
              Отгрузить
            </Button>
          )}
          {mode === "staff" && order.status === "shipped" && (
            <Button variant="success" icon={<PackageCheck className="size-4" />} loading={action.isPending} onClick={() => action.mutate({ kind: "deliver" })}>
              Отметить доставленным
            </Button>
          )}
          {canReturn && (
            <Button variant="secondary" icon={<RotateCcw className="size-4" />} onClick={() => setReasonFor("return")}>
              Вернуть заказ
            </Button>
          )}
          {canCancel && (
            <Button variant="secondary" icon={<Ban className="size-4" />} onClick={() => setReasonFor("cancel")}>
              Отменить заказ
            </Button>
          )}
        </div>
      </div>

      {order.status === "created" && order.paymentDeadline && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-amber-50 px-5 py-4 ring-1 ring-amber-200">
          <span className="text-sm font-medium text-amber-900">Заказ ждёт оплаты. Если не оплатить вовремя, он отменится автоматически.</span>
          <Countdown deadline={order.paymentDeadline} />
        </div>
      )}

      <div className="grid-cols-1 [&>*]:min-w-0 grid items-start gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card className="p-6">
            {order.status === "cancelled" || order.status === "returned" ? (
              <div
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold ${order.status === "returned" ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-600"}`}
              >
                {order.status === "returned" ? <RotateCcw className="size-4" /> : <Ban className="size-4" />}
                {order.status === "returned" ? `Возвращён ${formatDateTime(order.returnedAt!)}` : `Отменён ${formatDateTime(order.cancelledAt!)}`}
              </div>
            ) : (
              <OrderProgress status={order.status} />
            )}
          </Card>

          <Card>
            <div className="border-b border-slate-100 px-6 py-4 font-bold">Товары</div>
            <ul className="divide-y divide-slate-100">
              {order.items.map((i) => (
                <li key={i.productUuid} className="flex items-center gap-4 px-6 py-4">
                  <MiniProduct sku={i.sku} />
                  <div className="min-w-0 flex-1">
                    <Link to={`/product/${i.productUuid}`} className="font-semibold hover:text-brand-700">
                      {i.name}
                    </Link>
                    <div className="text-xs text-slate-500">
                      {i.sku} · {i.quantity} × {formatMoney(i.price)}
                    </div>
                  </div>
                  <div className="tabular font-bold">{formatMoney(i.lineTotal)}</div>
                </li>
              ))}
            </ul>
            <div className="space-y-2.5 border-t border-slate-100 px-6 py-5">
              <SummaryRow label="Товары" value={formatMoney(order.itemsTotal)} />
              {order.discount > 0 && <SummaryRow label={`Скидка по ${order.promoCode}`} value={`−${formatMoney(order.discount)}`} accent />}
              <SummaryRow label="Доставка" value={order.deliveryFee ? formatMoney(order.deliveryFee) : "Бесплатно"} />
              <SummaryRow label="Итого" value={formatMoney(order.total)} strong />
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          {mode === "staff" && (
            <Card className="p-6">
              <h2 className="mb-4 font-bold">Покупатель</h2>
              <Customer uuid={order.userUuid} />
            </Card>
          )}
          <Card className="p-6">
            <h2 className="mb-3 flex items-center gap-2 font-bold">
              <MapPin className="size-4 text-brand-600" /> Доставка
            </h2>
            <p className="text-sm text-slate-600">{order.deliveryAddress}</p>
            {order.promoCode && (
              <div className="mt-4">
                <Badge className="bg-emerald-50 font-mono text-emerald-700 ring-emerald-600/20">{order.promoCode}</Badge>
              </div>
            )}
            {mode === "customer" && order.status === "delivered" && returnUntil && (
              <p className="mt-4 text-xs text-slate-500">
                {canReturn ? `Вернуть можно до ${formatDateTime(returnUntil.toISOString())}` : "Срок возврата истёк"}
              </p>
            )}
          </Card>
          <Card className="p-6">
            <h2 className="mb-4 font-bold">Платежи</h2>
            <Payments order={order} />
          </Card>
          <Card className="p-6">
            <h2 className="mb-5 font-bold">История</h2>
            <OrderTimeline history={order.history ?? []} />
          </Card>
        </div>
      </div>

      <Modal
        open={reasonFor !== null}
        onClose={() => setReasonFor(null)}
        title={reasonFor === "return" ? "Вернуть заказ?" : "Отменить заказ?"}
        description={
          reasonFor === "return"
            ? "Товары вернутся на склад, деньги — на карту."
            : order.status === "paid"
              ? "Заказ уже оплачен — деньги вернутся на карту."
              : "Товары вернутся на склад."
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setReasonFor(null)}>
              Не нужно
            </Button>
            <Button variant="danger" loading={action.isPending} onClick={() => reasonFor && action.mutate({ kind: reasonFor, comment: reason.trim() })}>
              {reasonFor === "return" ? "Оформить возврат" : "Отменить заказ"}
            </Button>
          </>
        }
      >
        <Field label="Причина" hint="Необязательно, до 300 символов">
          <Textarea
            rows={3}
            maxLength={300}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={reasonFor === "return" ? "Не подошёл размер" : "Передумал"}
          />
        </Field>
      </Modal>
    </div>
  );
}
