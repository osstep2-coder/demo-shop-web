import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { ExternalLink, Package, Pencil, Plus, Search } from "lucide-react";
import { productsApi } from "../../api/endpoints";
import type { Product } from "../../api/types";
import { LOW_STOCK, MiniProduct } from "../../components/shop";
import { Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader, Select, Skeleton, Table, Td, Th, Toggle, cn } from "../../components/ui";
import { ErrorState } from "../../components/states";
import { useCategories } from "../../hooks/categories";
import { errorText } from "../../lib/errors";
import { formatMoney, kopecksToRubles, rublesToKopecks } from "../../lib/money";
import { toast, toastError } from "../../lib/toast";

function invalidateProducts(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["products"] });
  queryClient.invalidateQueries({ queryKey: ["product"] });
  queryClient.invalidateQueries({ queryKey: ["categories"] });
  queryClient.invalidateQueries({ queryKey: ["cart"] });
}

function ProductForm({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data: categories } = useCategories();
  const [form, setForm] = useState({
    sku: product?.sku ?? "",
    name: product?.name ?? "",
    category: product?.category ?? "",
    price: product ? kopecksToRubles(product.price) : "",
    stock: String(product?.stock ?? 0),
  });
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const price = rublesToKopecks(form.price);
  const stock = Number(form.stock);
  const errors = {
    sku: !product && !/^.{1,32}$/.test(form.sku.trim()) ? "От 1 до 32 символов" : null,
    name: !form.name.trim() ? "Введите название" : null,
    category: !form.category.trim() ? "Укажите категорию" : null,
    price: !(price > 0) ? "Цена должна быть больше нуля" : null,
    stock: !Number.isInteger(stock) || stock < 0 ? "Целое число от 0" : null,
  };
  const show = (k: keyof typeof errors) => (touched ? errors[k] : null);

  const save = useMutation({
    mutationFn: async () => {
      if (!product) {
        return productsApi.create({ sku: form.sku.trim(), name: form.name.trim(), category: form.category.trim(), price, stock });
      }
      const patch: { name?: string; category?: string; price?: number } = {};
      if (form.name.trim() !== product.name) patch.name = form.name.trim();
      if (form.category.trim() !== product.category) patch.category = form.category.trim();
      if (price !== product.price) patch.price = price;
      let result = product;
      if (Object.keys(patch).length) result = await productsApi.update(product.uuid, patch);
      if (stock !== product.stock) result = await productsApi.setStock(product.uuid, stock);
      return result;
    },
    onSuccess: (p) => {
      invalidateProducts(queryClient);
      toast.success(product ? `«${p.name}» сохранён` : `Товар «${p.name}» создан`);
      onClose();
    },
    onError: (e) => setError(errorText(e)),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (Object.values(errors).some(Boolean)) return;
    setError(null);
    save.mutate();
  };

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <Modal
      open
      onClose={onClose}
      title={product ? "Редактирование товара" : "Новый товар"}
      description={
        product ? `Артикул ${product.sku}. Новая цена сразу применится к корзинам, в оформленных заказах цена не изменится.` : "Товар сразу появится в каталоге"
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button type="submit" form="product-form" loading={save.isPending}>
            {product ? "Сохранить" : "Создать товар"}
          </Button>
        </>
      }
    >
      <form id="product-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        {product && (
          <div className="flex items-center gap-4 sm:col-span-2">
            <MiniProduct sku={product.sku} className="size-16" />
            <div className="text-sm text-slate-500">Картинка и описание берутся по артикулу на стороне сайта</div>
          </div>
        )}
        {!product && (
          <Field label="Артикул (SKU)" error={show("sku")}>
            <Input value={form.sku} onChange={set("sku")} placeholder="MS-013" className="font-mono" invalid={Boolean(show("sku"))} maxLength={32} />
          </Field>
        )}
        <Field label="Категория" error={show("category")}>
          <Input value={form.category} onChange={set("category")} list="categories" invalid={Boolean(show("category"))} maxLength={100} />
          <datalist id="categories">
            {categories?.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </datalist>
        </Field>
        <Field label="Название" error={show("name")} className="sm:col-span-2">
          <Input value={form.name} onChange={set("name")} invalid={Boolean(show("name"))} maxLength={200} />
        </Field>
        <Field label="Цена, ₽" error={show("price")} hint={price > 0 ? `В API уйдёт ${price} (копейки)` : undefined}>
          <Input value={form.price} onChange={set("price")} inputMode="decimal" placeholder="1 990" invalid={Boolean(show("price"))} />
        </Field>
        <Field label="Остаток на складе, шт." error={show("stock")}>
          <Input type="number" min={0} value={form.stock} onChange={set("stock")} invalid={Boolean(show("stock"))} />
        </Field>
        {error && <div className="rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-700 sm:col-span-2">{error}</div>}
      </form>
    </Modal>
  );
}

function ActiveToggle({ product }: { product: Product }) {
  const queryClient = useQueryClient();
  const m = useMutation({
    mutationFn: (isActive: boolean) => productsApi.update(product.uuid, { isActive }),
    onSuccess: (p) => {
      invalidateProducts(queryClient);
      toast.success(p.isActive ? `«${p.name}» снова в продаже` : `«${p.name}» скрыт из каталога`);
    },
    onError: toastError,
  });
  return <Toggle checked={product.isActive} onChange={(v) => m.mutate(v)} disabled={m.isPending} label="В продаже" />;
}

export function AdminProducts() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [creating, setCreating] = useState(false);
  const { data: categories } = useCategories();
  const query = { q: q || undefined, category: category || undefined, take: 100 };
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ["products", query], queryFn: () => productsApi.list(query) });

  const editUuid = params.get("edit");
  const { data: editing } = useQuery({ queryKey: ["product", editUuid], queryFn: () => productsApi.get(editUuid!), enabled: Boolean(editUuid) });
  const closeEdit = () => {
    const next = new URLSearchParams(params);
    next.delete("edit");
    setParams(next, { replace: true });
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Товары"
        subtitle={data ? `${data.total} в базе, включая скрытые` : " "}
        actions={
          <Button icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
            Добавить товар
          </Button>
        }
      />

      <div className="mb-5 flex flex-wrap gap-3">
        <div className="relative min-w-60 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Название или артикул" className="pl-9" />
        </div>
        <Select value={category} onChange={(e) => setCategory(e.target.value)} className="w-56">
          <option value="">Все категории</option>
          {categories?.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>

      {isError ? (
        <ErrorState error={error} onRetry={refetch} title="Не удалось загрузить товары" />
      ) : (
        <Card>
          {isLoading ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : !data?.items.length ? (
            <EmptyState icon={<Package />} title="Товары не найдены" />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Товар</Th>
                  <Th>Категория</Th>
                  <Th className="text-right">Цена</Th>
                  <Th className="text-right">Остаток</Th>
                  <Th>В продаже</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {data.items.map((p) => (
                  <tr key={p.uuid} className={cn("transition hover:bg-slate-50", !p.isActive && "bg-slate-50/60")}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <MiniProduct sku={p.sku} className={cn("size-11", !p.isActive && "opacity-50 grayscale")} />
                        <div className="min-w-0">
                          <div className={cn("font-semibold", !p.isActive && "text-slate-400")}>{p.name}</div>
                          <div className="font-mono text-xs text-slate-400">{p.sku}</div>
                        </div>
                      </div>
                    </Td>
                    <Td className="text-slate-600">{p.category}</Td>
                    <Td className="tabular text-right font-bold">{formatMoney(p.price)}</Td>
                    <Td className="text-right">
                      <Badge
                        className={cn(
                          "tabular",
                          p.stock === 0
                            ? "bg-rose-50 text-rose-700 ring-rose-600/20"
                            : p.stock <= LOW_STOCK
                              ? "bg-amber-50 text-amber-700 ring-amber-600/20"
                              : "bg-slate-100 text-slate-700 ring-slate-500/20",
                        )}
                      >
                        {p.stock} шт.
                      </Badge>
                    </Td>
                    <Td>
                      <ActiveToggle product={p} />
                    </Td>
                    <Td className="text-right whitespace-nowrap">
                      <Link
                        to={`/product/${p.uuid}`}
                        className="mr-1 inline-flex rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        title="Открыть на сайте"
                      >
                        <ExternalLink className="size-4" />
                      </Link>
                      <button
                        onClick={() => setParams({ edit: p.uuid })}
                        className="inline-flex rounded-lg p-2 text-slate-400 hover:bg-brand-50 hover:text-brand-600"
                        title="Редактировать"
                      >
                        <Pencil className="size-4" />
                      </button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      )}

      {creating && <ProductForm product={null} onClose={() => setCreating(false)} />}
      {editUuid && editing && <ProductForm key={editing.uuid} product={editing} onClose={closeEdit} />}
    </div>
  );
}
