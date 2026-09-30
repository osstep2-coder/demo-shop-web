import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { AlertCircle, CheckCircle2, Lock, ShieldCheck, Wifi } from "lucide-react";
import { ordersApi } from "../api/endpoints";
import type { PaymentToken } from "../api/types";
import { Countdown, MiniProduct, OrderStatusBadge, SummaryRow, useCountdown } from "../components/shop";
import { Button, ButtonLink, Card, Field, Input, PageLoader, cn } from "../components/ui";
import { ErrorState, NotFoundState } from "../components/states";
import { cardBrand, digits, formatCardNumber, formatExpiry, tokenForCard, validateCard, type CardBrand, type CardForm } from "../lib/card";
import { errorCode, errorText } from "../lib/errors";
import { formatMoney } from "../lib/money";

function BrandMark({ brand, className }: { brand: CardBrand; className?: string }) {
  if (brand === "visa") return <span className={cn("text-xl font-extrabold tracking-tight italic", className)}>VISA</span>;
  if (brand === "mastercard")
    return (
      <span className={cn("flex", className)} aria-label="Mastercard">
        <span className="size-7 rounded-full bg-rose-500/90" />
        <span className="-ml-3 size-7 rounded-full bg-amber-400/90" />
      </span>
    );
  if (brand === "mir") return <span className={cn("text-xl font-extrabold tracking-tight", className)}>МИР</span>;
  return null;
}

function CardPreview({ form, flipped }: { form: CardForm; flipped: boolean }) {
  const brand = cardBrand(form.number);
  const masked = digits(form.number)
    .padEnd(16, "•")
    .replace(/(.{4})(?=.)/g, "$1 ");
  return (
    <div className="relative aspect-[1.586] w-full max-w-sm overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800 via-slate-700 to-brand-800 p-5 text-white shadow-lift sm:p-6">
      <div className="absolute -top-16 -right-16 size-48 rounded-full bg-white/10" />
      <div className="absolute -bottom-20 -left-10 size-48 rounded-full bg-white/5" />
      {flipped ? (
        <div className="relative flex h-full flex-col justify-center">
          <div className="-mx-6 h-10 bg-slate-950/80" />
          <div className="mt-5 flex items-center justify-end gap-3">
            <span className="text-xs opacity-60">CVC</span>
            <span className="tabular w-16 rounded-md bg-white px-2 py-1 text-right font-mono text-sm text-slate-900">{form.cvc.padEnd(3, "•")}</span>
          </div>
        </div>
      ) : (
        <div className="relative flex h-full flex-col">
          <div className="flex h-7 items-center justify-between">
            <div className="h-7 w-10 rounded-md bg-gradient-to-br from-amber-200 to-amber-400 opacity-90" />
            <Wifi className="size-5 rotate-90 opacity-70" />
          </div>
          <div className="tabular mt-auto font-mono text-lg tracking-wider whitespace-nowrap sm:text-xl">{masked}</div>
          <div className="mt-3 flex items-end justify-between gap-3 text-xs">
            <div className="min-w-0">
              <div className="opacity-60">Держатель</div>
              <div className="truncate font-semibold tracking-wider uppercase">{form.holder.trim() || "IVAN PETROV"}</div>
            </div>
            <div className="shrink-0 text-right">
              <div className="opacity-60">Срок</div>
              <div className="tabular font-semibold">{form.expiry || "ММ/ГГ"}</div>
            </div>
            <BrandMark brand={brand} className="shrink-0" />
          </div>
        </div>
      )}
    </div>
  );
}

export default function Payment() {
  const { uuid = "" } = useParams();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CardForm>({ number: "", expiry: "", cvc: "", holder: "" });
  const [touched, setTouched] = useState(false);
  const [cvcFocused, setCvcFocused] = useState(false);
  const { data: order, isLoading, error, refetch } = useQuery({ queryKey: ["order", uuid], queryFn: () => ordersApi.get(uuid) });
  const left = useCountdown(order?.paymentDeadline);

  const pay = useMutation({
    mutationFn: (token: PaymentToken) => ordersApi.pay(uuid, token),
    onSuccess: (o) => queryClient.setQueryData(["order", uuid], o),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["order", uuid] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });

  if (isLoading) return <PageLoader />;
  if (!order)
    return errorCode(error) === "orders.not_found" ? (
      <NotFoundState title="Заказ не найден" text="Проверьте ссылку или откройте заказ из списка." backTo="/account/orders" backLabel="Мои заказы" />
    ) : (
      <ErrorState error={error} onRetry={refetch} title="Не удалось загрузить заказ" />
    );

  if (order.status === "paid" && pay.isSuccess) {
    return (
      <Card className="mx-auto max-w-lg animate-scale-in p-10 text-center">
        <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="size-11" />
        </div>
        <h1 className="mt-6 text-2xl font-extrabold">Заказ оплачен!</h1>
        <p className="mt-2 text-slate-500">
          Заказ №{order.number} на сумму <b className="text-slate-900">{formatMoney(order.total)}</b> принят. Мы сообщим, когда он отправится в путь.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink to={`/account/orders/${order.uuid}`}>Перейти к заказу</ButtonLink>
          <ButtonLink to="/catalog" variant="secondary">
            Продолжить покупки
          </ButtonLink>
        </div>
      </Card>
    );
  }

  if (order.status !== "created") {
    return (
      <Card className="mx-auto max-w-lg p-10 text-center">
        <h1 className="text-xl font-extrabold">Заказ №{order.number}</h1>
        <div className="mt-3">
          <OrderStatusBadge status={order.status} />
        </div>
        <p className="mt-4 text-slate-500">{order.status === "cancelled" ? "Заказ отменён — оплатить его уже нельзя." : "Этот заказ уже оплачен."}</p>
        <ButtonLink to={`/account/orders/${order.uuid}`} className="mt-6">
          Открыть заказ
        </ButtonLink>
      </Card>
    );
  }

  const expired = Boolean(order.paymentDeadline) && left === 0;
  const errors = validateCard(form);
  const show = (k: keyof CardForm) => (touched ? errors[k] : undefined);
  const set = (k: keyof CardForm, value: string) => {
    setForm((f) => ({ ...f, [k]: value }));
    pay.reset();
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (Object.keys(errors).length) return;
    pay.mutate(tokenForCard(form.number));
  };

  return (
    <div className="mx-auto max-w-6xl animate-fade-in">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Оплата заказа №{order.number}</h1>
          <p className="mt-1 text-sm text-slate-500">Банковской картой Visa, Mastercard или МИР</p>
        </div>
        {order.paymentDeadline && (
          <div className="flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-sm ring-1 ring-amber-200">
            <span className="text-amber-800">Оплатите в течение</span>
            <Countdown deadline={order.paymentDeadline} />
          </div>
        )}
      </div>

      <div className="grid-cols-1 [&>*]:min-w-0 grid items-start gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="p-6 sm:p-8">
          <form onSubmit={submit} noValidate>
            <div className="grid items-center gap-8 md:grid-cols-2">
              <CardPreview form={form} flipped={cvcFocused} />
              <div className="grid grid-cols-2 gap-4">
                <Field label="Номер карты" error={show("number")} className="col-span-2">
                  <Input
                    value={form.number}
                    onChange={(e) => set("number", formatCardNumber(e.target.value))}
                    inputMode="numeric"
                    autoComplete="cc-number"
                    placeholder="0000 0000 0000 0000"
                    className="tabular font-mono tracking-wider"
                    invalid={Boolean(show("number"))}
                  />
                </Field>
                <Field label="Срок действия" error={show("expiry")}>
                  <Input
                    value={form.expiry}
                    onChange={(e) => set("expiry", formatExpiry(e.target.value))}
                    inputMode="numeric"
                    autoComplete="cc-exp"
                    placeholder="ММ/ГГ"
                    className="tabular font-mono"
                    invalid={Boolean(show("expiry"))}
                  />
                </Field>
                <Field label="CVC" error={show("cvc")}>
                  <Input
                    type="password"
                    value={form.cvc}
                    onChange={(e) => set("cvc", digits(e.target.value).slice(0, 3))}
                    onFocus={() => setCvcFocused(true)}
                    onBlur={() => setCvcFocused(false)}
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    placeholder="•••"
                    className="tabular font-mono"
                    invalid={Boolean(show("cvc"))}
                  />
                </Field>
                <Field label="Имя держателя" error={show("holder")} className="col-span-2">
                  <Input
                    value={form.holder}
                    onChange={(e) => set("holder", e.target.value.toUpperCase())}
                    autoComplete="cc-name"
                    placeholder="IVAN PETROV"
                    className="uppercase"
                    invalid={Boolean(show("holder"))}
                  />
                </Field>
              </div>
            </div>

            {pay.error && (
              <div className="mt-6 flex items-start gap-3 rounded-2xl bg-rose-50 p-4 text-rose-800 ring-1 ring-rose-200">
                <AlertCircle className="mt-0.5 size-5 shrink-0" />
                <div>
                  <div className="font-bold">Оплата не прошла</div>
                  <div className="text-sm">{errorText(pay.error)}. Попробуйте другую карту или обратитесь в банк.</div>
                </div>
              </div>
            )}
            {expired && (
              <div className="mt-6 flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-amber-800 ring-1 ring-amber-200">
                <AlertCircle className="mt-0.5 size-5 shrink-0" />
                <div className="text-sm">Время на оплату истекло — заказ будет отменён, а товары вернутся на склад.</div>
              </div>
            )}

            <Button type="submit" size="lg" className="mt-6 w-full" icon={<Lock className="size-4" />} loading={pay.isPending} disabled={expired}>
              Оплатить {formatMoney(order.total)}
            </Button>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-slate-500">
              <ShieldCheck className="size-3.5 text-emerald-600" /> Данные карты передаются по защищённому соединению и не сохраняются
            </p>
          </form>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 font-bold">Заказ №{order.number}</h2>
          <ul className="mb-5 space-y-3">
            {order.items.map((i) => (
              <li key={i.productUuid} className="flex items-center gap-3">
                <MiniProduct sku={i.sku} className="size-12" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{i.name}</div>
                  <div className="text-xs text-slate-500">{i.quantity} шт.</div>
                </div>
                <div className="tabular text-sm font-bold">{formatMoney(i.lineTotal)}</div>
              </li>
            ))}
          </ul>
          <div className="space-y-2.5 border-t border-slate-100 pt-4">
            <SummaryRow label="Товары" value={formatMoney(order.itemsTotal)} />
            {order.discount > 0 && <SummaryRow label={`Скидка ${order.promoCode ?? ""}`} value={`−${formatMoney(order.discount)}`} accent />}
            <SummaryRow label="Доставка" value={order.deliveryFee ? formatMoney(order.deliveryFee) : "Бесплатно"} />
            <SummaryRow label="К оплате" value={formatMoney(order.total)} strong />
          </div>
          <Link to={`/account/orders/${order.uuid}`} className="mt-5 block text-center text-sm font-semibold text-brand-600 hover:text-brand-700">
            Подробнее о заказе
          </Link>
        </Card>
      </div>
    </div>
  );
}
