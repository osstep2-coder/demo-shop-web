import { useState, type FormEvent } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { PackageCheck, ShoppingBag, Truck, X } from "lucide-react";
import { ordersApi, usersApi } from "../../api/endpoints";
import type { Order, OrderStatus } from "../../api/types";
import { useAuth } from "../../auth/AuthContext";
import { OrderDetails } from "../../components/OrderDetails";
import { OrderStatusBadge } from "../../components/shop";
import { Button, Card, EmptyState, Input, PageHeader, Pagination, Skeleton, Table, Tabs, Td, Th } from "../../components/ui";
import { ErrorState } from "../../components/states";
import { formatDateTime, pluralize } from "../../lib/dates";
import { formatMoney } from "../../lib/money";
import { ORDER_STATUS, ORDER_STATUSES } from "../../lib/status";
import { toast, toastError } from "../../lib/toast";

const PAGE_SIZE = 10;

/** Admins can read users, so show names; managers only see the uuid. */
function useUserNames() {
  const { isAdmin } = useAuth();
  const { data } = useQuery({ queryKey: ["users", "all"], queryFn: () => usersApi.list({ take: 500 }), enabled: isAdmin, staleTime: 30_000 });
  return new Map(data?.items.map((u) => [u.uuid, `${u.firstName} ${u.lastName}`]) ?? []);
}

function QuickAction({ order }: { order: Order }) {
  const queryClient = useQueryClient();
  const m = useMutation({
    mutationFn: () => (order.status === "paid" ? ordersApi.ship(order.uuid) : ordersApi.deliver(order.uuid)),
    onSuccess: (o) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.setQueryData(["order", o.uuid], o);
      toast.success(`Заказ №${o.number}: ${ORDER_STATUS[o.status].label.toLowerCase()}`);
    },
    onError: toastError,
  });
  if (order.status !== "paid" && order.status !== "shipped") return null;
  return (
    <Button
      size="sm"
      variant={order.status === "paid" ? "primary" : "success"}
      loading={m.isPending}
      icon={order.status === "paid" ? <Truck className="size-3.5" /> : <PackageCheck className="size-3.5" />}
      onClick={(e) => {
        e.stopPropagation();
        m.mutate();
      }}
    >
      {order.status === "paid" ? "Отгрузить" : "Доставлен"}
    </Button>
  );
}

export function AdminOrders() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const names = useUserNames();
  const status = (params.get("status") as OrderStatus | null) ?? undefined;
  const userUuid = params.get("userUuid") ?? undefined;
  const skip = Number(params.get("skip") ?? 0);
  const [userInput, setUserInput] = useState(userUuid ?? "");

  const query = { status, userUuid, take: PAGE_SIZE, skip };
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["orders", query],
    queryFn: () => ordersApi.list(query),
    placeholderData: keepPreviousData,
  });

  const update = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (!("skip" in patch)) next.delete("skip");
    setParams(next);
  };

  const submitUser = (e: FormEvent) => {
    e.preventDefault();
    update({ userUuid: userInput.trim() || undefined });
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="Заказы" subtitle={data ? `${data.total} ${pluralize(data.total, "заказ", "заказа", "заказов")}` : " "} />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={status ?? "all"}
          onChange={(v) => update({ status: v === "all" ? undefined : v })}
          items={[{ value: "all", label: "Все" }, ...ORDER_STATUSES.map((s) => ({ value: s, label: ORDER_STATUS[s].label }))]}
        />
        <form onSubmit={submitUser} className="flex w-full gap-2 sm:w-auto">
          <Input value={userInput} onChange={(e) => setUserInput(e.target.value)} placeholder="UUID покупателя" className="font-mono text-xs sm:w-80" />
          {userUuid ? (
            <Button
              type="button"
              variant="secondary"
              icon={<X className="size-4" />}
              onClick={() => {
                setUserInput("");
                update({ userUuid: undefined });
              }}
            >
              Сбросить
            </Button>
          ) : (
            <Button type="submit" variant="secondary">
              Найти
            </Button>
          )}
        </form>
      </div>

      {isError ? (
        <ErrorState error={error} onRetry={refetch} title="Не удалось загрузить заказы" />
      ) : (
        <Card>
          {isLoading ? (
            <div className="space-y-3 p-5" data-state="loading">
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : !data?.items.length ? (
            <EmptyState icon={<ShoppingBag />} title="Заказов не найдено" text="Попробуйте другой фильтр" />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Заказ</Th>
                  <Th>Покупатель</Th>
                  <Th>Создан</Th>
                  <Th>Статус</Th>
                  <Th className="text-right">Сумма</Th>
                  <Th className="text-right">Действие</Th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((o) => (
                  <tr key={o.uuid} className="cursor-pointer transition hover:bg-slate-50" onClick={() => navigate(`/admin/orders/${o.uuid}`)}>
                    <Td>
                      <div className="font-bold">№{o.number}</div>
                      <div className="text-xs text-slate-400">
                        {o.items.reduce((s, i) => s + i.quantity, 0)} шт. {o.promoCode && `· ${o.promoCode}`}
                      </div>
                    </Td>
                    <Td>
                      {names.get(o.userUuid) ? (
                        <span className="font-medium">{names.get(o.userUuid)}</span>
                      ) : (
                        <span className="font-mono text-xs text-slate-500">{o.userUuid.slice(0, 8)}…</span>
                      )}
                    </Td>
                    <Td className="text-slate-500">{formatDateTime(o.createdAt)}</Td>
                    <Td>
                      <OrderStatusBadge status={o.status} />
                    </Td>
                    <Td className="tabular text-right font-bold">{formatMoney(o.total)}</Td>
                    <Td className="text-right">
                      <QuickAction order={o} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      )}
      {data && <Pagination total={data.total} take={PAGE_SIZE} skip={skip} onChange={(s) => update({ skip: s ? String(s) : undefined })} />}
    </div>
  );
}

export function AdminOrder() {
  const { uuid = "" } = useParams();
  return <OrderDetails uuid={uuid} mode="staff" />;
}
