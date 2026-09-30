import { useState, type FormEvent } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { Ban, CheckCircle2, Package, Plus, Search, Trash2, UserPlus, Users as UsersIcon } from "lucide-react";
import { usersApi } from "../../api/endpoints";
import type { Role, User, UserStatus } from "../../api/types";
import { useAuth } from "../../auth/AuthContext";
import { Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader, Pagination, Select, Skeleton, Table, Td, Th, cn } from "../../components/ui";
import { ErrorState } from "../../components/states";
import { formatDate, pluralize } from "../../lib/dates";
import { errorText } from "../../lib/errors";
import { ROLE_BADGE, ROLE_LABEL } from "../../lib/status";
import { toast, toastError } from "../../lib/toast";

const PAGE_SIZE = 10;
const ROLES: Role[] = ["customer", "manager", "admin"];

function CreateUser({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ role: "manager" as Role, firstName: "", lastName: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const create = useMutation({
    mutationFn: () => usersApi.create({ ...form, email: form.email.trim(), firstName: form.firstName.trim(), lastName: form.lastName.trim() }),
    onSuccess: (u) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(`${ROLE_LABEL[u.role]} ${u.firstName} ${u.lastName} создан`);
      onClose();
    },
    onError: (e) => setError(errorText(e)),
  });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const valid = form.firstName.trim() && form.lastName.trim() && form.email.includes("@") && form.password.length >= 6;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    create.mutate();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Новый пользователь"
      description="Администратор может создать сотрудника или покупателя"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button type="submit" form="user-form" loading={create.isPending} disabled={!valid} icon={<UserPlus className="size-4" />}>
            Создать
          </Button>
        </>
      }
    >
      <form id="user-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Роль" className="sm:col-span-2">
          <div className="grid grid-cols-3 gap-2">
            {ROLES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setForm((f) => ({ ...f, role: r }))}
                className={cn(
                  "rounded-xl px-3 py-2.5 text-sm font-semibold ring-1 transition",
                  form.role === r ? "bg-brand-50 text-brand-700 ring-2 ring-brand-500" : "ring-slate-200 hover:bg-slate-50",
                )}
              >
                {ROLE_LABEL[r]}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Имя">
          <Input value={form.firstName} onChange={set("firstName")} />
        </Field>
        <Field label="Фамилия">
          <Input value={form.lastName} onChange={set("lastName")} />
        </Field>
        <Field label="Email" className="sm:col-span-2">
          <Input type="email" value={form.email} onChange={set("email")} placeholder="name@shop.test" />
        </Field>
        <Field label="Пароль" hint="Минимум 6 символов" className="sm:col-span-2">
          <Input value={form.password} onChange={set("password")} />
        </Field>
        {error && <div className="rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-700 sm:col-span-2">{error}</div>}
      </form>
    </Modal>
  );
}

function UserCard({ user, onClose }: { user: User; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { user: me } = useAuth();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { data: details } = useQuery({ queryKey: ["user", user.uuid], queryFn: () => usersApi.get(user.uuid) });
  const current = details ?? user;
  const isSelf = me?.uuid === user.uuid;

  const setStatus = useMutation({
    mutationFn: (status: UserStatus) => usersApi.setStatus(user.uuid, status),
    onSuccess: (u) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["user", user.uuid] });
      toast.success(u.status === "blocked" ? `${u.firstName} заблокирован, сессии завершены` : `${u.firstName} разблокирован`);
    },
    onError: toastError,
  });
  const remove = useMutation({
    mutationFn: () => usersApi.delete(user.uuid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Пользователь удалён");
      onClose();
    },
    onError: (e) => {
      setConfirmDelete(false);
      toastError(e);
    },
  });

  if (confirmDelete) {
    return (
      <Modal
        open
        size="sm"
        onClose={() => setConfirmDelete(false)}
        title="Удалить пользователя?"
        description={`${current.firstName} ${current.lastName} (${current.email}) будет удалён без возможности восстановления.`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
              Отмена
            </Button>
            <Button variant="danger" loading={remove.isPending} onClick={() => remove.mutate()}>
              Удалить
            </Button>
          </>
        }
      />
    );
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`${current.firstName} ${current.lastName}`}
      description={current.email}
      footer={
        <>
          <Button
            variant="ghost"
            className="mr-auto text-rose-600 hover:bg-rose-50 hover:text-rose-700"
            icon={<Trash2 className="size-4" />}
            disabled={isSelf}
            onClick={() => setConfirmDelete(true)}
          >
            Удалить
          </Button>
          {current.status === "active" ? (
            <Button
              variant="danger"
              icon={<Ban className="size-4" />}
              loading={setStatus.isPending}
              disabled={isSelf}
              onClick={() => setStatus.mutate("blocked")}
            >
              Заблокировать
            </Button>
          ) : (
            <Button variant="success" icon={<CheckCircle2 className="size-4" />} loading={setStatus.isPending} onClick={() => setStatus.mutate("active")}>
              Разблокировать
            </Button>
          )}
        </>
      }
    >
      <dl className="grid grid-cols-2 gap-5">
        <div>
          <dt className="text-xs font-semibold text-slate-400 uppercase">Роль</dt>
          <dd className="mt-1">
            <Badge className={ROLE_BADGE[current.role]}>{ROLE_LABEL[current.role]}</Badge>
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-slate-400 uppercase">Статус</dt>
          <dd className="mt-1">
            <StatusBadge status={current.status} />
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-slate-400 uppercase">Регистрация</dt>
          <dd className="mt-1 text-sm font-semibold">{formatDate(current.createdAt)}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-slate-400 uppercase">Заказов</dt>
          <dd className="mt-1 text-sm font-semibold">
            {details ? (
              details.ordersCount > 0 ? (
                <Link
                  to={`/admin/orders?userUuid=${user.uuid}`}
                  className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-700"
                  onClick={onClose}
                >
                  <Package className="size-4" /> {details.ordersCount}
                </Link>
              ) : (
                "0"
              )
            ) : (
              "…"
            )}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs font-semibold text-slate-400 uppercase">UUID</dt>
          <dd className="mt-1 font-mono text-xs break-all text-slate-600">{current.uuid}</dd>
        </div>
      </dl>
      {isSelf && <p className="mt-5 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">Это ваш аккаунт: себя нельзя заблокировать или удалить.</p>}
      {details && details.ordersCount > 0 && !isSelf && (
        <p className="mt-5 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">У пользователя есть заказы — API не даст его удалить, только заблокировать.</p>
      )}
    </Modal>
  );
}

function StatusBadge({ status }: { status: UserStatus }) {
  return status === "active" ? (
    <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-600/20">Активен</Badge>
  ) : (
    <Badge className="bg-rose-50 text-rose-700 ring-rose-600/20">Заблокирован</Badge>
  );
}

export function AdminUsers() {
  const [params, setParams] = useSearchParams();
  const role = (params.get("role") as Role | null) ?? undefined;
  const status = (params.get("status") as UserStatus | null) ?? undefined;
  const skip = Number(params.get("skip") ?? 0);
  const [q, setQ] = useState(params.get("q") ?? "");
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<User | null>(null);

  const query = { role, status, q: params.get("q") || undefined, take: PAGE_SIZE, skip };
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["users", query],
    queryFn: () => usersApi.list(query),
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

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Пользователи"
        subtitle={data ? `${data.total} ${pluralize(data.total, "пользователь", "пользователя", "пользователей")}` : " "}
        actions={
          <Button icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
            Создать пользователя
          </Button>
        }
      />
      <div className="mb-5 flex flex-wrap gap-3">
        <form
          className="relative min-w-60 flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            update({ q: q.trim() || undefined });
          }}
        >
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onBlur={() => update({ q: q.trim() || undefined })}
            placeholder="Имя или email, Enter для поиска"
            className="pl-9"
          />
        </form>
        <Select value={role ?? ""} onChange={(e) => update({ role: e.target.value || undefined })} className="w-44">
          <option value="">Все роли</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r]}
            </option>
          ))}
        </Select>
        <Select value={status ?? ""} onChange={(e) => update({ status: e.target.value || undefined })} className="w-44">
          <option value="">Любой статус</option>
          <option value="active">Активные</option>
          <option value="blocked">Заблокированные</option>
        </Select>
      </div>

      {isError ? (
        <ErrorState error={error} onRetry={refetch} title="Не удалось загрузить пользователей" />
      ) : (
        <Card>
          {isLoading ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : !data?.items.length ? (
            <EmptyState icon={<UsersIcon />} title="Никого не нашли" />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Пользователь</Th>
                  <Th>Роль</Th>
                  <Th>Статус</Th>
                  <Th>Регистрация</Th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((u) => (
                  <tr key={u.uuid} className="cursor-pointer transition hover:bg-slate-50" onClick={() => setSelected(u)}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                            u.status === "blocked" ? "bg-rose-50 text-rose-500" : "bg-brand-50 text-brand-700",
                          )}
                        >
                          {u.firstName[0]}
                          {u.lastName[0]}
                        </span>
                        <div className="min-w-0">
                          <div className="font-semibold">
                            {u.firstName} {u.lastName}
                          </div>
                          <div className="truncate text-xs text-slate-500">{u.email}</div>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <Badge className={ROLE_BADGE[u.role]}>{ROLE_LABEL[u.role]}</Badge>
                    </Td>
                    <Td>
                      <StatusBadge status={u.status} />
                    </Td>
                    <Td className="text-slate-500">{formatDate(u.createdAt)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      )}
      {data && <Pagination total={data.total} take={PAGE_SIZE} skip={skip} onChange={(s) => update({ skip: s ? String(s) : undefined })} />}

      {creating && <CreateUser onClose={() => setCreating(false)} />}
      {selected && <UserCard user={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
