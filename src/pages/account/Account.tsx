import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Link, NavLink, Outlet, useParams, useSearchParams } from "react-router-dom";
import { ChevronRight, Package, User as UserIcon } from "lucide-react";
import { authApi, ordersApi } from "../../api/endpoints";
import type { OrderStatus } from "../../api/types";
import { useAuth } from "../../auth/AuthContext";
import { OrderDetails } from "../../components/OrderDetails";
import { ErrorState } from "../../components/states";
import { MiniProduct, OrderStatusBadge } from "../../components/shop";
import { Badge, ButtonLink, Card, EmptyState, PageHeader, Pagination, Skeleton, Tabs, cn } from "../../components/ui";
import { formatDate, formatDateTime, pluralize } from "../../lib/dates";
import { formatMoney } from "../../lib/money";
import { ORDER_STATUS, ORDER_STATUSES, ROLE_BADGE, ROLE_LABEL } from "../../lib/status";

const link = ({ isActive }: { isActive: boolean }) =>
  cn(
    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
    isActive ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100",
  );

export function AccountLayout() {
  const { user, isCustomer } = useAuth();
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[240px_1fr]">
      <aside className="min-w-0">
        <Card className="p-3">
          <div className="flex items-center gap-3 px-3 pt-2 pb-4">
            <span className="flex size-11 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-700">
              {user?.firstName[0]}
              {user?.lastName[0]}
            </span>
            <div className="min-w-0">
              <div className="truncate font-bold">
                {user?.firstName} {user?.lastName}
              </div>
              <div className="truncate text-xs text-slate-500">{user?.email}</div>
            </div>
          </div>
          <nav className="flex gap-1 lg:block lg:space-y-0.5">
            <NavLink to="/account" end className={link}>
              <UserIcon className="size-4" /> Профиль
            </NavLink>
            {isCustomer && (
              <NavLink to="/account/orders" className={link}>
                <Package className="size-4" /> Мои заказы
              </NavLink>
            )}
          </nav>
        </Card>
      </aside>
      <div className="min-w-0">
        <Outlet />
      </div>
    </div>
  );
}

export function Profile() {
  const { data: me, isLoading, isError, error, refetch } = useQuery({ queryKey: ["me"], queryFn: authApi.me });
  const { isCustomer } = useAuth();
  const { data: orders } = useQuery({ queryKey: ["orders", { take: 1 }], queryFn: () => ordersApi.list({ take: 1 }), enabled: isCustomer });

  return (
    <div className="animate-fade-in">
      <PageHeader title="Профиль" subtitle="Данные аккаунта" />
      {isError ? (
        <ErrorState error={error} onRetry={refetch} title="Не удалось загрузить профиль" />
      ) : (
        <Card className="p-6">
          {isLoading || !me ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-72" />
            </div>
          ) : (
            <dl className="grid gap-6 sm:grid-cols-2">
              {[
                ["Имя", me.firstName],
                ["Фамилия", me.lastName],
                ["Email", me.email],
                ["Дата регистрации", formatDate(me.createdAt)],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs font-semibold tracking-wide text-slate-400 uppercase">{k}</dt>
                  <dd className="mt-1 font-semibold text-slate-900">{v}</dd>
                </div>
              ))}
              <div>
                <dt className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Роль</dt>
                <dd className="mt-1">
                  <Badge className={ROLE_BADGE[me.role]}>{ROLE_LABEL[me.role]}</Badge>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Статус</dt>
                <dd className="mt-1">
                  <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-600/20">Активен</Badge>
                </dd>
              </div>
            </dl>
          )}
        </Card>
      )}
      {isCustomer && orders && (
        <Link
          to="/account/orders"
          className="mt-4 flex items-center justify-between rounded-2xl bg-white p-5 shadow-card ring-1 ring-slate-900/5 transition hover:ring-brand-200"
        >
          <div className="flex items-center gap-4">
            <span className="flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Package className="size-5" />
            </span>
            <div>
              <div className="font-bold">Мои заказы</div>
              <div className="text-sm text-slate-500">
                {orders.total} {pluralize(orders.total, "заказ", "заказа", "заказов")}
              </div>
            </div>
          </div>
          <ChevronRight className="size-5 text-slate-400" />
        </Link>
      )}
    </div>
  );
}

const PAGE_SIZE = 5;

export function MyOrders() {
  const [params, setParams] = useSearchParams();
  const status = (params.get("status") as OrderStatus | null) ?? undefined;
  const skip = Number(params.get("skip") ?? 0);
  const query = { status, take: PAGE_SIZE, skip };
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["orders", query],
    queryFn: () => ordersApi.list(query),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="animate-fade-in">
      <PageHeader title="Мои заказы" subtitle={data ? `${data.total} ${pluralize(data.total, "заказ", "заказа", "заказов")}` : " "} />
      <div className="mb-5">
        <Tabs
          value={status ?? "all"}
          onChange={(v) => setParams(v === "all" ? {} : { status: v })}
          items={[{ value: "all", label: "Все" }, ...ORDER_STATUSES.map((s) => ({ value: s, label: ORDER_STATUS[s].label }))]}
        />
      </div>

      {isError ? (
        <ErrorState error={error} onRetry={refetch} title="Не удалось загрузить заказы" />
      ) : isLoading ? (
        <div className="space-y-4" data-state="loading">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : !data?.items.length ? (
        <Card>
          <EmptyState
            icon={<Package />}
            title={status ? "Нет заказов с таким статусом" : "Заказов пока нет"}
            text={status ? undefined : "Самое время выбрать что-нибудь в каталоге."}
            action={!status && <ButtonLink to="/catalog">В каталог</ButtonLink>}
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {data.items.map((o) => (
            <Link
              key={o.uuid}
              to={`/account/orders/${o.uuid}`}
              className="block rounded-2xl bg-white p-5 shadow-card ring-1 ring-slate-900/5 transition hover:ring-brand-200"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-extrabold">№{o.number}</span>
                  <OrderStatusBadge status={o.status} />
                </div>
                <span className="text-sm text-slate-500">{formatDateTime(o.createdAt)}</span>
              </div>
              <div className="mt-4 flex items-center justify-between gap-4">
                <div className="flex -space-x-3">
                  {o.items.slice(0, 4).map((i) => (
                    <MiniProduct key={i.productUuid} sku={i.sku} className="size-14 ring-2 ring-white" />
                  ))}
                  {o.items.length > 4 && (
                    <span className="flex size-14 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-500 ring-2 ring-white">
                      +{o.items.length - 4}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <div className="tabular text-lg font-extrabold">{formatMoney(o.total)}</div>
                  <div className="text-xs text-slate-500">
                    {o.items.reduce((s, i) => s + i.quantity, 0)}{" "}
                    {pluralize(
                      o.items.reduce((s, i) => s + i.quantity, 0),
                      "товар",
                      "товара",
                      "товаров",
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
      {data && (
        <Pagination
          total={data.total}
          take={PAGE_SIZE}
          skip={skip}
          onChange={(s) => setParams({ ...(status ? { status } : {}), ...(s ? { skip: String(s) } : {}) })}
        />
      )}
    </div>
  );
}

export function MyOrder() {
  const { uuid = "" } = useParams();
  return <OrderDetails uuid={uuid} mode="customer" />;
}
