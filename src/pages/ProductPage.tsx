import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ChevronRight, Pencil, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { productsApi } from "../api/endpoints";
import { useAuth } from "../auth/AuthContext";
import { ProductArt } from "../catalog/ProductArt";
import { productMeta } from "../catalog/meta";
import { AddToCartButton, ProductCard, QuantityStepper, StockBadge } from "../components/shop";
import { ErrorState, NotFoundState } from "../components/states";
import { ButtonLink, PageLoader } from "../components/ui";
import { errorCode } from "../lib/errors";
import { formatMoney } from "../lib/money";

function Related({ category, exclude }: { category: string; exclude: string }) {
  const { data } = useQuery({
    queryKey: ["products", { category, take: 5 }],
    queryFn: () => productsApi.list({ category, take: 5 }),
  });
  const items = data?.items.filter((p) => p.uuid !== exclude).slice(0, 4) ?? [];
  if (!items.length) return null;
  return (
    <section className="mt-16">
      <h2 className="mb-5 text-2xl font-extrabold tracking-tight">Ещё в категории «{category}»</h2>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((p) => (
          <ProductCard key={p.uuid} product={p} />
        ))}
      </div>
    </section>
  );
}

export default function ProductPage() {
  const { uuid = "" } = useParams();
  const { isStaff, isCustomer, user } = useAuth();
  const [qty, setQty] = useState(1);
  const { data: product, isLoading, error, refetch } = useQuery({ queryKey: ["product", uuid], queryFn: () => productsApi.get(uuid) });

  if (isLoading) return <PageLoader />;
  if (!product)
    return errorCode(error) === "products.not_found" ? (
      <NotFoundState title="Товар не найден" text="Возможно, он снят с продажи или ссылка устарела." backTo="/catalog" backLabel="В каталог" />
    ) : (
      <ErrorState error={error} onRetry={refetch} title="Не удалось загрузить товар" />
    );

  const meta = productMeta(product.sku, product.category);
  const unavailable = product.stock === 0 || !product.isActive;
  const maxQty = Math.min(99, Math.max(1, product.stock));

  return (
    <div className="animate-fade-in">
      <nav className="mb-6 flex items-center gap-1.5 text-sm text-slate-500">
        <Link to="/catalog" className="hover:text-brand-600">
          Каталог
        </Link>
        <ChevronRight className="size-4 text-slate-300" />
        <Link to={`/catalog?category=${encodeURIComponent(product.category)}`} className="hover:text-brand-600">
          {product.category}
        </Link>
        <ChevronRight className="size-4 text-slate-300" />
        <span className="truncate font-medium text-slate-700">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <div className="relative overflow-hidden rounded-[2rem] shadow-card ring-1 ring-slate-900/5">
          <div className="aspect-[4/3]">
            <ProductArt sku={product.sku} category={product.category} muted={unavailable} />
          </div>
          <div className="absolute top-5 left-5">
            <StockBadge product={product} />
          </div>
        </div>

        <div className="flex flex-col">
          <div className="text-sm font-semibold text-brand-600">{product.category}</div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{product.name}</h1>
          <p className="mt-2 text-lg text-slate-500">{meta.tagline}</p>
          <div className="mt-2 text-xs text-slate-400">Артикул: {product.sku}</div>

          <div className="mt-8 rounded-3xl bg-white p-6 shadow-card ring-1 ring-slate-900/5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="tabular text-4xl font-extrabold text-slate-900">{formatMoney(product.price)}</div>
                <div className="mt-1 text-sm text-slate-500">{product.stock > 0 ? `На складе: ${product.stock} шт.` : "Сейчас нет на складе"}</div>
              </div>
              {isStaff && (
                <ButtonLink to={`/admin/products?edit=${product.uuid}`} variant="secondary" icon={<Pencil className="size-4" />}>
                  Редактировать
                </ButtonLink>
              )}
            </div>
            {(!user || isCustomer) && (
              <div className="mt-6 flex flex-wrap gap-3">
                {!unavailable && <QuantityStepper value={qty} onChange={setQty} max={maxQty} />}
                <AddToCartButton product={product} quantity={qty} size="lg" className="flex-1" full />
              </div>
            )}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              { icon: Truck, text: product.price >= 300000 ? "Бесплатная доставка" : "Доставка 299 ₽" },
              { icon: ShieldCheck, text: "Гарантия 1 год" },
              { icon: RotateCcw, text: "Возврат 14 дней" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2 rounded-2xl bg-slate-100/70 px-4 py-3 text-sm font-medium text-slate-600">
                <Icon className="size-4 text-brand-600" /> {text}
              </div>
            ))}
          </div>

          <div className="mt-8">
            <h2 className="text-lg font-bold">Описание</h2>
            <p className="mt-2 leading-relaxed text-slate-600">{meta.description}</p>
            <dl className="mt-5 divide-y divide-slate-100 rounded-2xl bg-white ring-1 ring-slate-900/5">
              {meta.specs.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 px-5 py-3 text-sm">
                  <dt className="text-slate-500">{k}</dt>
                  <dd className="text-right font-semibold text-slate-900">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      <Related category={product.category} exclude={product.uuid} />
    </div>
  );
}
