import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowRight, BadgePercent, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { productsApi } from "../api/endpoints";
import { ProductArt, paletteFor } from "../catalog/ProductArt";
import { ProductCard } from "../components/shop";
import { ErrorState } from "../components/states";
import { ButtonLink, Skeleton } from "../components/ui";
import { useCategories } from "../hooks/categories";
import { pluralize } from "../lib/dates";

const CATEGORY_HERO_SKU: Record<string, string> = {
  Периферия: "KB-001",
  Аудио: "HS-003",
  Аксессуары: "PB-005",
  Мониторы: "MN-006",
};

function Hero() {
  return (
    <section className="relative overflow-hidden rounded-[2rem] bg-slate-900 px-6 py-12 text-white sm:px-12 sm:py-16">
      <div className="absolute -top-24 -right-24 size-96 rounded-full bg-brand-600/40 blur-3xl" />
      <div className="absolute -bottom-32 left-1/3 size-80 rounded-full bg-sky-500/20 blur-3xl" />
      <div className="relative grid items-center gap-10 lg:grid-cols-2">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-brand-200 ring-1 ring-white/15">
            <span className="size-1.5 rounded-full bg-emerald-400" /> Новая коллекция для рабочего места
          </span>
          <h1 className="mt-5 text-4xl leading-[1.08] font-extrabold tracking-tight sm:text-5xl">
            Техника, с которой <span className="bg-gradient-to-r from-brand-300 to-sky-300 bg-clip-text text-transparent">приятно работать</span>
          </h1>
          <p className="mt-4 max-w-md text-base text-slate-300">
            Клавиатуры, мониторы, звук и аксессуары. Доставка бесплатно от 3 000 ₽ и возврат в течение 14 дней.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink to="/catalog" size="lg" icon={<ArrowRight className="size-5" />} className="flex-row-reverse">
              Перейти в каталог
            </ButtonLink>
            <ButtonLink to="/catalog?sort=price_asc" size="lg" variant="secondary" className="bg-white/10 text-white ring-white/20 hover:bg-white/15">
              Сначала недорогие
            </ButtonLink>
          </div>
        </div>
        <div className="relative hidden lg:block">
          <div className="grid grid-cols-2 gap-4">
            <div className="translate-y-6 overflow-hidden rounded-3xl shadow-2xl ring-1 ring-white/10">
              <ProductArt sku="HS-003" category="Аудио" />
            </div>
            <div className="overflow-hidden rounded-3xl shadow-2xl ring-1 ring-white/10">
              <ProductArt sku="MN-006" category="Мониторы" />
            </div>
            <div className="translate-y-6 overflow-hidden rounded-3xl shadow-2xl ring-1 ring-white/10">
              <ProductArt sku="MS-002" category="Периферия" />
            </div>
            <div className="overflow-hidden rounded-3xl shadow-2xl ring-1 ring-white/10">
              <ProductArt sku="SP-009" category="Аудио" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Perks() {
  const perks = [
    { icon: Truck, title: "Бесплатная доставка", text: "для заказов от 3 000 ₽" },
    { icon: ShieldCheck, title: "Безопасная оплата", text: "Visa, Mastercard и МИР" },
    { icon: RotateCcw, title: "Возврат 14 дней", text: "деньги вернутся на карту" },
  ];
  return (
    <section className="mt-8 grid gap-4 sm:grid-cols-3">
      {perks.map(({ icon: Icon, title, text }) => (
        <div key={title} className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-card ring-1 ring-slate-900/5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <Icon className="size-5" />
          </span>
          <div>
            <div className="text-sm font-bold text-slate-900">{title}</div>
            <div className="text-sm text-slate-500">{text}</div>
          </div>
        </div>
      ))}
    </section>
  );
}

function Categories() {
  const { data, isLoading, isError, error, refetch } = useCategories();
  return (
    <section className="mt-14">
      <div className="mb-5 flex items-end justify-between">
        <h2 className="text-2xl font-extrabold tracking-tight">Категории</h2>
      </div>
      {isError ? (
        <ErrorState compact error={error} onRetry={refetch} title="Не удалось загрузить категории" />
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {isLoading
            ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="aspect-[4/3] rounded-3xl" />)
            : data?.map((c) => (
                <Link
                  key={c.name}
                  to={`/catalog?category=${encodeURIComponent(c.name)}`}
                  className="group relative overflow-hidden rounded-3xl ring-1 ring-slate-900/5 transition hover:shadow-lift"
                  style={{ background: paletteFor(c.name)[0] }}
                >
                  <div className="aspect-[4/3] transition duration-500 group-hover:scale-105">
                    <ProductArt sku={CATEGORY_HERO_SKU[c.name] ?? ""} category={c.name} />
                  </div>
                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-white/95 via-white/70 to-transparent p-4 pt-10">
                    <div>
                      <div className="font-bold text-slate-900">{c.name}</div>
                      <div className="text-xs text-slate-500">
                        {c.count} {pluralize(c.count, "товар", "товара", "товаров")}
                      </div>
                    </div>
                    <ArrowRight className="size-5 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-brand-600" />
                  </div>
                </Link>
              ))}
        </div>
      )}
    </section>
  );
}

function PromoBanner() {
  return (
    <section className="mt-14 flex flex-col items-start gap-6 overflow-hidden rounded-3xl bg-gradient-to-r from-amber-100 via-orange-50 to-rose-100 p-8 sm:flex-row sm:items-center sm:justify-between sm:p-10">
      <div className="flex items-center gap-5">
        <span className="hidden size-14 shrink-0 items-center justify-center rounded-2xl bg-white text-orange-500 shadow-sm sm:flex">
          <BadgePercent className="size-7" />
        </span>
        <div>
          <h3 className="text-xl font-extrabold text-slate-900">−10% на первый заказ</h3>
          <p className="mt-1 text-sm text-slate-600">Введите промокод в корзине. Действует для заказов от 1 000 ₽.</p>
        </div>
      </div>
      <div className="rounded-2xl border-2 border-dashed border-orange-300 bg-white/70 px-6 py-3 font-mono text-xl font-bold tracking-widest text-orange-600">
        WELCOME10
      </div>
    </section>
  );
}

function NewArrivals() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["products", { sort: "price_desc", take: 4, inStock: true }],
    queryFn: () => productsApi.list({ sort: "price_desc", take: 4, inStock: true }),
  });
  return (
    <section className="mt-14">
      <div className="mb-5 flex items-end justify-between">
        <h2 className="text-2xl font-extrabold tracking-tight">Популярное</h2>
        <Link to="/catalog" className="flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
          Весь каталог <ArrowRight className="size-4" />
        </Link>
      </div>
      {isError ? (
        <ErrorState compact error={error} onRetry={refetch} title="Не удалось загрузить товары" />
      ) : data && data.items.length === 0 ? (
        <div className="rounded-3xl bg-white p-8 text-center text-sm text-slate-500 shadow-card ring-1 ring-slate-900/5">
          Всё раскупили — скоро привезём новые товары.
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading
            ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-96 rounded-3xl" />)
            : data?.items.map((p) => <ProductCard key={p.uuid} product={p} />)}
        </div>
      )}
    </section>
  );
}

export default function Home() {
  return (
    <div className="animate-fade-in">
      <Hero />
      <Perks />
      <Categories />
      <NewArrivals />
      <PromoBanner />
    </div>
  );
}
