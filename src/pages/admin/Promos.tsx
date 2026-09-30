import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgePercent, Pencil, Plus } from "lucide-react";
import { promosApi } from "../../api/endpoints";
import type { Promo } from "../../api/types";
import { Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader, Skeleton, Table, Td, Th, Toggle, cn } from "../../components/ui";
import { ErrorState } from "../../components/states";
import { formatDate, isDatePast, pluralize } from "../../lib/dates";
import { errorText } from "../../lib/errors";
import { formatMoney, kopecksToRubles, rublesToKopecks } from "../../lib/money";
import { toast, toastError } from "../../lib/toast";

function promoValue(p: Promo) {
  return p.type === "percent" ? `−${p.value}%` : `−${formatMoney(p.value)}`;
}

function PromoState({ promo }: { promo: Promo }) {
  if (!promo.isActive) return <Badge className="bg-slate-100 text-slate-600 ring-slate-500/20">Выключен</Badge>;
  if (isDatePast(promo.expiresAt)) return <Badge className="bg-rose-50 text-rose-700 ring-rose-600/20">Истёк</Badge>;
  return <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-600/20">Действует</Badge>;
}

function CreatePromo({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ code: "", type: "percent" as "percent" | "fixed", value: "10", minOrderTotal: "0", expiresAt: "", maxUsesPerUser: "1" });
  const [error, setError] = useState<string | null>(null);
  const value = form.type === "percent" ? Number(form.value) : rublesToKopecks(form.value);
  const minTotal = rublesToKopecks(form.minOrderTotal || "0");

  const create = useMutation({
    mutationFn: () =>
      promosApi.create({
        code: form.code.trim(),
        type: form.type,
        value,
        minOrderTotal: minTotal,
        expiresAt: form.expiresAt || null,
        maxUsesPerUser: Number(form.maxUsesPerUser),
      }),
    onSuccess: (p) => {
      queryClient.invalidateQueries({ queryKey: ["promos"] });
      toast.success(`Промокод ${p.code} создан`);
      onClose();
    },
    onError: (e) => setError(errorText(e)),
  });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    create.mutate();
  };
  const codeValid = /^[A-Za-z0-9_-]{3,32}$/.test(form.code.trim());

  return (
    <Modal
      open
      onClose={onClose}
      title="Новый промокод"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button type="submit" form="promo-form" loading={create.isPending} disabled={!codeValid || !(value > 0)}>
            Создать
          </Button>
        </>
      }
    >
      <form id="promo-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Код" hint="3–32 символа: латиница, цифры, _ и -" className="sm:col-span-2">
          <Input
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
            placeholder="SUMMER25"
            className="font-mono tracking-wider"
          />
        </Field>
        <Field label="Тип скидки">
          <div className="grid grid-cols-2 gap-2">
            {(["percent", "fixed"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setForm((f) => ({ ...f, type: t }))}
                className={cn(
                  "h-10 rounded-xl text-sm font-semibold ring-1 transition",
                  form.type === t ? "bg-brand-50 text-brand-700 ring-2 ring-brand-500" : "ring-slate-200 hover:bg-slate-50",
                )}
              >
                {t === "percent" ? "Процент" : "Сумма, ₽"}
              </button>
            ))}
          </div>
        </Field>
        <Field label={form.type === "percent" ? "Скидка, %" : "Скидка, ₽"} hint={form.type === "percent" ? "От 1 до 100" : undefined}>
          <Input value={form.value} onChange={set("value")} inputMode="decimal" />
        </Field>
        <Field label="Минимальная сумма заказа, ₽">
          <Input value={form.minOrderTotal} onChange={set("minOrderTotal")} inputMode="decimal" />
        </Field>
        <Field label="Использований на покупателя">
          <Input type="number" min={1} value={form.maxUsesPerUser} onChange={set("maxUsesPerUser")} />
        </Field>
        <Field label="Действует до (включительно)" hint="Пусто — бессрочно" className="sm:col-span-2">
          <Input type="date" value={form.expiresAt} onChange={set("expiresAt")} />
        </Field>
        {error && <div className="rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-700 sm:col-span-2">{error}</div>}
      </form>
    </Modal>
  );
}

function EditPromo({ promo, onClose }: { promo: Promo; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [expiresAt, setExpiresAt] = useState(promo.expiresAt ?? "");
  const [minTotal, setMinTotal] = useState(kopecksToRubles(promo.minOrderTotal));
  const [error, setError] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: () => {
      const body: { expiresAt?: string; minOrderTotal?: number } = {};
      if (expiresAt && expiresAt !== promo.expiresAt) body.expiresAt = expiresAt;
      const min = rublesToKopecks(minTotal || "0");
      if (min !== promo.minOrderTotal) body.minOrderTotal = min;
      return promosApi.update(promo.code, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promos"] });
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      toast.success(`Промокод ${promo.code} обновлён`);
      onClose();
    },
    onError: (e) => setError(errorText(e)),
  });
  return (
    <Modal
      open
      onClose={onClose}
      title={`Промокод ${promo.code}`}
      description={`${promoValue(promo)} · до ${promo.maxUsesPerUser} использований на покупателя`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button loading={save.isPending} onClick={() => save.mutate()}>
            Сохранить
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Действует до (включительно)">
          <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
        </Field>
        <Field label="Минимальная сумма заказа, ₽">
          <Input value={minTotal} onChange={(e) => setMinTotal(e.target.value)} inputMode="decimal" />
        </Field>
        {error && <div className="rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-700 sm:col-span-2">{error}</div>}
      </div>
    </Modal>
  );
}

function ActiveToggle({ promo }: { promo: Promo }) {
  const queryClient = useQueryClient();
  const m = useMutation({
    mutationFn: (isActive: boolean) => promosApi.update(promo.code, { isActive }),
    onSuccess: (p) => {
      queryClient.invalidateQueries({ queryKey: ["promos"] });
      toast.success(p.isActive ? `${p.code} включён` : `${p.code} выключен`);
    },
    onError: toastError,
  });
  return <Toggle checked={promo.isActive} onChange={(v) => m.mutate(v)} disabled={m.isPending} label="Активен" />;
}

export function AdminPromos() {
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ["promos"], queryFn: promosApi.list });
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Promo | null>(null);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Промокоды"
        subtitle="Скидки, которые покупатели вводят в корзине"
        actions={
          <Button icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
            Новый промокод
          </Button>
        }
      />

      {isError ? (
        <ErrorState error={error} onRetry={refetch} title="Не удалось загрузить промокоды" />
      ) : isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-36 rounded-2xl" />
          ))}
        </div>
      ) : !data?.length ? (
        <Card>
          <EmptyState icon={<BadgePercent />} title="Промокодов нет" text="Создайте первый промокод — покупатели смогут ввести его в корзине." />
        </Card>
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {data.map((p) => {
              const live = p.isActive && !isDatePast(p.expiresAt);
              return (
                <div
                  key={p.code}
                  className={cn(
                    "relative overflow-hidden rounded-2xl p-5 ring-1",
                    live ? "bg-gradient-to-br from-brand-600 to-indigo-500 text-white ring-transparent" : "bg-white text-slate-400 ring-slate-200",
                  )}
                >
                  <div className="absolute top-1/2 -left-3 size-6 -translate-y-1/2 rounded-full bg-slate-50" />
                  <div className="absolute top-1/2 -right-3 size-6 -translate-y-1/2 rounded-full bg-slate-50" />
                  <div className="font-mono text-sm font-bold tracking-widest">{p.code}</div>
                  <div className={cn("mt-2 text-3xl font-extrabold", !live && "text-slate-300")}>{promoValue(p)}</div>
                  <div className={cn("mt-3 border-t border-dashed pt-3 text-xs", live ? "border-white/30 text-white/80" : "border-slate-200")}>
                    {p.minOrderTotal ? `от ${formatMoney(p.minOrderTotal)}` : "без минимальной суммы"}
                  </div>
                </div>
              );
            })}
          </div>

          <Card>
            <Table>
              <thead>
                <tr>
                  <Th>Код</Th>
                  <Th>Скидка</Th>
                  <Th>Мин. сумма</Th>
                  <Th>Действует до</Th>
                  <Th>На покупателя</Th>
                  <Th>Состояние</Th>
                  <Th>Вкл.</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {data.map((p) => (
                  <tr key={p.code} className="hover:bg-slate-50">
                    <Td className="font-mono font-bold tracking-wider">{p.code}</Td>
                    <Td className="font-semibold">{promoValue(p)}</Td>
                    <Td className="tabular">{p.minOrderTotal ? formatMoney(p.minOrderTotal) : "—"}</Td>
                    <Td className={cn(isDatePast(p.expiresAt) && "text-rose-600")}>{p.expiresAt ? formatDate(p.expiresAt) : "Бессрочно"}</Td>
                    <Td>
                      {p.maxUsesPerUser} {pluralize(p.maxUsesPerUser, "раз", "раза", "раз")}
                    </Td>
                    <Td>
                      <PromoState promo={p} />
                    </Td>
                    <Td>
                      <ActiveToggle promo={p} />
                    </Td>
                    <Td className="text-right">
                      <button
                        onClick={() => setEditing(p)}
                        className="inline-flex rounded-lg p-2 text-slate-400 hover:bg-brand-50 hover:text-brand-600"
                        title="Изменить"
                      >
                        <Pencil className="size-4" />
                      </button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        </>
      )}

      {creating && <CreatePromo onClose={() => setCreating(false)} />}
      {editing && <EditPromo promo={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
