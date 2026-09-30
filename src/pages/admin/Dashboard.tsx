import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowRight, Banknote, Package, ShoppingBag, Truck } from "lucide-react";
import { ordersApi, productsApi } from "../../api/endpoints";
import { useAuth } from "../../auth/AuthContext";
import { LOW_STOCK, MiniProduct, OrderStatusBadge } from "../../components/shop";
import { ErrorState } from "../../components/states";
import { Card, PageHeader, Skeleton, Table, Td, Th, cn } from "../../components/ui";
import { formatDateTime } from "../../lib/dates";
import { formatMoney } from "../../lib/money";
import { ORDER_STATUS, ORDER_STATUSES } from "../../lib/status";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const {
    data: counts,
    error: countsError,
    refetch: refetchCounts,
  } = useQuery({
    queryKey: ["dashboard", "counts"],
    queryFn: async () => {
      const results = await Promise.all(ORDER_STATUSES.map((status) => ordersApi.list({ status, take: 1 })));
      return Object.fromEntries(ORDER_STATUSES.map((s, i) => [s, results[i].total])) as Record<string, number>;
    },
  });
  const {
    data: recent,
    error: recentError,
    refetch: refetchRecent,
  } = useQuery({ queryKey: ["orders", { take: 100 }], queryFn: () => ordersApi.list({ take: 100 }) });
  const {
    data: products,
    error: productsError,
    refetch: refetchProducts,
  } = useQuery({ queryKey: ["products", { take: 100, sort: "name" }], queryFn: () => productsApi.list({ take: 100 }) });

  const revenue = recent?.items.filter((o) => ["paid", "shipped", "delivered"].includes(o.status)).reduce((s, o) => s + o.total, 0) ?? 0;
  const lowStock = products?.items.filter((p) => p.isActive && p.stock <= LOW_STOCK).toSorted((a, b) => a.stock - b.stock) ?? [];
  const totalOrders = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : 0;

  const kpis = [
    { label: "Выручка", value: formatMoney(revenue), hint: "оплаченные, в пути и доставленные", icon: Banknote, tone: "bg-emerald-50 text-emerald-600" },
    { label: "Всего заказов", value: String(totalOrders), hint: `${counts?.created ?? 0} ждут оплаты`, icon: ShoppingBag, tone: "bg-brand-50 text-brand-600" },
    { label: "К отгрузке", value: String(counts?.paid ?? 0), hint: "оплачены, ждут отправки", icon: Truck, tone: "bg-sky-50 text-sky-600" },
    { label: "Товаров", value: String(products?.total ?? 0), hint: `${lowStock.length} заканчиваются`, icon: Package, tone: "bg-amber-50 text-amber-600" },
  ];

  const error = countsError ?? recentError ?? productsError;
  if (error)
    return (
      <div className="animate-fade-in">
        <PageHeader title={`Добрый день, ${user?.firstName}`} subtitle="Что происходит в магазине" />
        <ErrorState
          error={error}
          title="Не удалось загрузить обзор"
          onRetry={() => {
            refetchCounts();
            refetchRecent();
            refetchProducts();
          }}
        />
      </div>
    );

  return (
    <div className="animate-fade-in">
      <PageHeader title={`Добрый день, ${user?.firstName}`} subtitle="Что происходит в магазине" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(({ label, value, hint, icon: Icon, tone }) => (
          <Card key={label} className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-500">{label}</span>
              <span className={cn("flex size-9 items-center justify-center rounded-xl", tone)}>
                <Icon className="size-4.5" />
              </span>
            </div>
            <div className="tabular mt-3 text-2xl font-extrabold">{counts && products ? value : <Skeleton className="h-8 w-24" />}</div>
            <div className="mt-1 text-xs text-slate-400">{hint}</div>
          </Card>
        ))}
      </div>

      <Card className="mt-6 p-5">
        <div className="mb-4 font-bold">Заказы по статусам</div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {ORDER_STATUSES.map((s) => (
            <Link key={s} to={`/admin/orders?status=${s}`} className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-100 transition hover:ring-brand-200">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <span className={cn("size-2 rounded-full", ORDER_STATUS[s].dot)} /> {ORDER_STATUS[s].label}
              </div>
              <div className="tabular mt-2 text-2xl font-extrabold">{counts ? counts[s] : "—"}</div>
            </Link>
          ))}
        </div>
        {counts && totalOrders > 0 && (
          <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-slate-100">
            {ORDER_STATUSES.map((s) => (
              <div key={s} className={ORDER_STATUS[s].dot} style={{ width: `${(counts[s] / totalOrders) * 100}%` }} title={ORDER_STATUS[s].label} />
            ))}
          </div>
        )}
      </Card>

      <div className="grid-cols-1 [&>*]:min-w-0 mt-6 grid gap-6 xl:grid-cols-[1fr_360px]">
        <Card>
          <div className="flex items-center justify-between px-5 pt-5 pb-2">
            <div className="font-bold">Последние заказы</div>
            <Link to="/admin/orders" className="flex items-center gap-1 text-sm font-semibold text-brand-600">
              Все <ArrowRight className="size-4" />
            </Link>
          </div>
          <Table>
            <thead>
              <tr>
                <Th>Заказ</Th>
                <Th>Дата</Th>
                <Th>Статус</Th>
                <Th className="text-right">Сумма</Th>
              </tr>
            </thead>
            <tbody>
              {recent?.items.slice(0, 6).map((o) => (
                <tr key={o.uuid} className="cursor-pointer hover:bg-slate-50" onClick={() => navigate(`/admin/orders/${o.uuid}`)}>
                  <Td className="font-bold">№{o.number}</Td>
                  <Td className="text-slate-500">{formatDateTime(o.createdAt)}</Td>
                  <Td>
                    <OrderStatusBadge status={o.status} />
                  </Td>
                  <Td className="tabular text-right font-bold">{formatMoney(o.total)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
          {recent && !recent.items.length && (
            <p className="px-5 pb-6 text-sm text-slate-500" data-state="empty">
              Заказов пока нет — они появятся, когда покупатели что-нибудь закажут.
            </p>
          )}
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2 font-bold">
            <AlertTriangle className="size-4 text-amber-500" /> Заканчиваются
          </div>
          {lowStock.length === 0 ? (
            <p className="text-sm text-slate-500">Все товары в достатке</p>
          ) : (
            <ul className="space-y-3">
              {lowStock.map((p) => (
                <li key={p.uuid}>
                  <Link to={`/admin/products?edit=${p.uuid}`} className="flex items-center gap-3 rounded-xl p-1 hover:bg-slate-50">
                    <MiniProduct sku={p.sku} className="size-11" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{p.name}</div>
                      <div className="text-xs text-slate-400">{p.sku}</div>
                    </div>
                    <span
                      className={cn(
                        "tabular rounded-lg px-2 py-1 text-xs font-bold",
                        p.stock === 0 ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-700",
                      )}
                    >
                      {p.stock} шт.
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
