import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { PackageSearch, SlidersHorizontal, X } from "lucide-react";
import { productsApi } from "../api/endpoints";
import type { ProductSort } from "../api/types";
import { ProductCard } from "../components/shop";
import { Button, EmptyState, PageHeader, Pagination, Select, Skeleton, Toggle, cn } from "../components/ui";
import { ErrorState } from "../components/states";
import { useCategories } from "../hooks/categories";
import { pluralize } from "../lib/dates";

const PAGE_SIZE = 9;

const SORTS: { value: ProductSort; label: string }[] = [
  { value: "name", label: "По названию" },
  { value: "price_asc", label: "Сначала дешевле" },
  { value: "price_desc", label: "Сначала дороже" },
  { value: "newest", label: "Новинки" },
];

const chip = (active: boolean) =>
  cn(
    "flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold transition",
    active ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100",
  );

export default function Catalog() {
  const [params, setParams] = useSearchParams();
  const category = params.get("category") ?? "";
  const q = params.get("q") ?? "";
  const inStock = params.get("inStock") === "1";
  const sort = (params.get("sort") as ProductSort) || "name";
  const skip = Number(params.get("skip") ?? 0);

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (!("skip" in patch)) next.delete("skip");
    setParams(next);
  };

  const query = { category: category || undefined, q: q || undefined, inStock: inStock || undefined, sort, take: PAGE_SIZE, skip };
  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: ["products", query],
    queryFn: () => productsApi.list(query),
    placeholderData: keepPreviousData,
  });
  const { data: categories } = useCategories();
  const hasFilters = Boolean(category || q || inStock);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={category || (q ? `Поиск: «${q}»` : "Каталог")}
        subtitle={data ? `${data.total} ${pluralize(data.total, "товар", "товара", "товаров")}` : " "}
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="min-w-0 space-y-6">
          <div className="rounded-2xl bg-white p-3 shadow-card ring-1 ring-slate-900/5">
            <div className="mb-2 flex items-center gap-2 px-3 pt-1 text-xs font-bold tracking-wide text-slate-400 uppercase">
              <SlidersHorizontal className="size-3.5" /> Категории
            </div>
            <div className="flex gap-1 overflow-x-auto lg:block lg:space-y-0.5">
              <button className={cn(chip(!category), "shrink-0")} onClick={() => update({ category: null })}>
                Все товары
              </button>
              {categories?.map((c) => (
                <button key={c.name} className={cn(chip(category === c.name), "shrink-0 gap-3")} onClick={() => update({ category: c.name })}>
                  {c.name}
                  <span className="text-xs font-medium text-slate-400">{c.count}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-white px-5 py-4 shadow-card ring-1 ring-slate-900/5">
            <span id="in-stock-label" className="text-sm font-semibold text-slate-700">
              Только в наличии
            </span>
            <Toggle checked={inStock} onChange={(v) => update({ inStock: v ? "1" : null })} labelledBy="in-stock-label" />
          </div>
        </aside>

        <section className="min-w-0">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            {q && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 py-1 pr-1.5 pl-3 text-sm font-semibold text-white">
                «{q}»
                <button onClick={() => update({ q: null })} className="rounded-full p-0.5 hover:bg-white/20" aria-label="Сбросить поиск">
                  <X className="size-3.5" />
                </button>
              </span>
            )}
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={() => setParams({ sort })}>
                Сбросить фильтры
              </Button>
            )}
            <div className="ml-auto flex items-center gap-2">
              <span className="hidden text-sm text-slate-500 sm:inline">Сортировка</span>
              <Select value={sort} onChange={(e) => update({ sort: e.target.value })} className="w-48">
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {isError ? (
            <ErrorState error={error} onRetry={refetch} title="Не удалось загрузить каталог" />
          ) : isLoading ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3" data-state="loading">
              {Array.from({ length: PAGE_SIZE }, (_, i) => (
                <Skeleton key={i} className="h-96 rounded-3xl" />
              ))}
            </div>
          ) : data && data.items.length === 0 ? (
            <EmptyState
              icon={<PackageSearch />}
              title="Ничего не нашлось"
              text="Попробуйте изменить запрос или сбросить фильтры."
              action={<Button onClick={() => setParams({})}>Показать все товары</Button>}
              className="rounded-3xl bg-white shadow-card ring-1 ring-slate-900/5"
            />
          ) : (
            <div className={cn("grid gap-5 transition-opacity sm:grid-cols-2 xl:grid-cols-3", isFetching && "opacity-60")}>
              {data?.items.map((p) => (
                <ProductCard key={p.uuid} product={p} />
              ))}
            </div>
          )}

          {data && <Pagination total={data.total} take={PAGE_SIZE} skip={skip} onChange={(s) => update({ skip: s ? String(s) : null })} />}
        </section>
      </div>
    </div>
  );
}
