import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigate, useNavigate } from "react-router-dom";
import { AlertCircle, Clock, Lock, MapPin } from "lucide-react";
import { ordersApi } from "../api/endpoints";
import { useAuth } from "../auth/AuthContext";
import { MiniProduct } from "../components/shop";
import { Button, Card, Field, Input, PageHeader, PageLoader } from "../components/ui";
import { ErrorState } from "../components/states";
import { CART_KEY, useCart } from "../hooks/cart";
import { errorText } from "../lib/errors";
import { formatMoney } from "../lib/money";
import { CartTotals } from "./Cart";

export default function Checkout() {
  const { user } = useAuth();
  const { data: cart, isLoading, error, refetch } = useCart();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [city, setCity] = useState("Москва");
  const [street, setStreet] = useState("");
  const [flat, setFlat] = useState("");
  const [touched, setTouched] = useState(false);

  const checkout = useMutation({
    mutationFn: ordersApi.checkout,
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: CART_KEY });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      navigate(`/orders/${order.uuid}/pay`, { replace: true });
    },
  });

  if (isLoading) return <PageLoader />;
  if (!cart) return <ErrorState error={error} onRetry={refetch} title="Не удалось загрузить корзину" />;
  if (cart.items.length === 0 && !checkout.isSuccess) return <Navigate to="/cart" replace />;

  const address = [city.trim() && `г. ${city.trim()}`, street.trim(), flat.trim() && `кв. ${flat.trim()}`].filter(Boolean).join(", ");
  const streetError = touched && street.trim().length < 3 ? "Укажите улицу и дом" : null;
  const tooLong = address.length > 300;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (street.trim().length < 3 || !city.trim() || tooLong) return;
    checkout.mutate(address);
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="Оформление заказа" subtitle="Проверьте адрес и состав заказа" />
      <form onSubmit={submit} className="grid-cols-1 [&>*]:min-w-0 grid items-start gap-6 lg:grid-cols-[1fr_400px]">
        <div className="space-y-6">
          <Card className="p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <MapPin className="size-5" />
              </span>
              <div>
                <h2 className="font-bold">Адрес доставки</h2>
                <p className="text-sm text-slate-500">Курьер привезёт заказ на этот адрес</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Получатель">
                <Input value={`${user?.firstName} ${user?.lastName}`} disabled />
              </Field>
              <Field label="Город">
                <Input value={city} onChange={(e) => setCity(e.target.value)} invalid={touched && !city.trim()} />
              </Field>
              <Field label="Улица и дом" error={streetError} className="sm:col-span-2">
                <Input value={street} onChange={(e) => setStreet(e.target.value)} placeholder="ул. Тверская, д. 7" invalid={Boolean(streetError)} />
              </Field>
              <Field label="Квартира / офис" hint="Необязательно">
                <Input value={flat} onChange={(e) => setFlat(e.target.value)} placeholder="12" />
              </Field>
            </div>
            {address && (
              <div className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <span className="font-semibold text-slate-900">Адрес в заказе:</span> {address}
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="mb-4 font-bold">Состав заказа</h2>
            <ul className="divide-y divide-slate-100">
              {cart.items.map((item) => (
                <li key={item.productUuid} className="flex items-center gap-4 py-3">
                  <MiniProduct sku={item.sku} className="size-14" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{item.name}</div>
                    <div className="text-xs text-slate-500">
                      {item.quantity} × {formatMoney(item.price)}
                    </div>
                  </div>
                  <div className="tabular text-sm font-bold">{formatMoney(item.lineTotal)}</div>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <Card className="p-6 lg:sticky lg:top-24">
          <h2 className="mb-4 font-bold">Ваш заказ</h2>
          <CartTotals cart={cart} />
          {checkout.error && (
            <div className="mt-4 flex gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              {errorText(checkout.error)}
            </div>
          )}
          <Button type="submit" size="lg" className="mt-5 w-full" loading={checkout.isPending} icon={<Lock className="size-4" />}>
            Оформить и перейти к оплате
          </Button>
          <p className="mt-3 flex items-start gap-2 text-xs text-slate-500">
            <Clock className="mt-0.5 size-3.5 shrink-0" />
            Товары резервируются за вами. Заказ нужно оплатить в течение 15 минут, иначе он отменится автоматически.
          </p>
        </Card>
      </form>
    </div>
  );
}
