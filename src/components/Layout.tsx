import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronDown, LayoutDashboard, LogOut, Package, Search, ShieldAlert, ShoppingCart, User as UserIcon } from "lucide-react";
import type { Role } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { cartCount, useCart } from "../hooks/cart";
import { ROLE_LABEL } from "../lib/status";
import { ButtonLink, EmptyState, PageLoader, cn } from "./ui";

const YEAR = new Date().getFullYear();

export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn("flex items-center gap-2.5", className)}>
      <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm">
        <svg viewBox="0 0 32 32" className="size-5" fill="none">
          <path d="M8 11h16l-1.8 10.4a2 2 0 0 1-2 1.6h-8.4a2 2 0 0 1-2-1.6z" fill="currentColor" />
          <path d="M12 11a4 4 0 0 1 8 0" stroke="currentColor" strokeWidth={2.4} />
        </svg>
      </span>
      <span className="text-lg font-extrabold tracking-tight text-slate-900">
        Gadget<span className="text-brand-600">Point</span>
      </span>
    </Link>
  );
}

/** The input restarts from the URL whenever the catalog query changes (e.g. the chip «×» clears it). */
function SearchBox({ className }: { className?: string }) {
  const [params] = useSearchParams();
  const { pathname } = useLocation();
  const q = pathname === "/catalog" ? (params.get("q") ?? "") : "";
  return <SearchForm key={q} initial={q} className={className} />;
}

function SearchForm({ initial, className }: { initial: string; className?: string }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const location = useLocation();
  const [value, setValue] = useState(initial);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next = new URLSearchParams(location.pathname === "/catalog" ? params : undefined);
    if (value.trim()) next.set("q", value.trim());
    else next.delete("q");
    next.delete("skip");
    navigate(`/catalog?${next}`);
  };

  return (
    <form onSubmit={submit} className={cn("relative", className)} role="search">
      <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Поиск по названию или артикулу"
        className="h-10 w-full rounded-full border-0 bg-slate-100 pr-4 pl-10 text-sm placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
      />
    </form>
  );
}

function UserMenu() {
  const { user, logout, isStaff, isCustomer } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <ButtonLink to="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">
          Войти
        </ButtonLink>
        <ButtonLink to="/register" size="sm">
          Регистрация
        </ButtonLink>
      </div>
    );
  }

  const item = "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50";
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 rounded-full py-1 pr-2 pl-1 hover:bg-slate-100">
        <span className="flex size-8 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
          {user.firstName[0]}
          {user.lastName[0]}
        </span>
        <span className="hidden text-sm font-semibold text-slate-700 md:block">{user.firstName}</span>
        <ChevronDown className="size-4 text-slate-400" />
      </button>
      {open && (
        // Closes the menu after a click on any item inside; the items themselves are links and buttons.
        // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
        <div
          className="absolute right-0 z-40 mt-2 w-60 animate-scale-in rounded-2xl bg-white p-1.5 shadow-lift ring-1 ring-slate-900/5"
          onClick={() => setOpen(false)}
        >
          <div className="px-3 pt-2 pb-2.5">
            <div className="truncate text-sm font-bold text-slate-900">
              {user.firstName} {user.lastName}
            </div>
            <div className="truncate text-xs text-slate-500">{user.email}</div>
            <div className="mt-1 text-xs font-semibold text-brand-600">{ROLE_LABEL[user.role]}</div>
          </div>
          <div className="my-1 h-px bg-slate-100" />
          <Link to="/account" className={item}>
            <UserIcon className="size-4 text-slate-400" /> Профиль
          </Link>
          {isCustomer && (
            <Link to="/account/orders" className={item}>
              <Package className="size-4 text-slate-400" /> Мои заказы
            </Link>
          )}
          {isStaff && (
            <Link to="/admin" className={item}>
              <LayoutDashboard className="size-4 text-slate-400" /> Панель управления
            </Link>
          )}
          <div className="my-1 h-px bg-slate-100" />
          <button
            className={cn(item, "text-rose-600 hover:bg-rose-50")}
            onClick={() => {
              logout();
              navigate("/");
            }}
          >
            <LogOut className="size-4" /> Выйти
          </button>
        </div>
      )}
    </div>
  );
}

function CartButton() {
  const { isCustomer, user } = useAuth();
  const { data: cart } = useCart();
  if (user && !isCustomer) return null;
  const count = cartCount(cart);
  return (
    <Link
      to={user ? "/cart" : "/login"}
      className="relative flex size-10 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"
      aria-label="Корзина"
      data-testid="header-cart-link"
    >
      <ShoppingCart className="size-5" />
      {count > 0 && (
        <span className="tabular absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1 text-[11px] font-bold text-white ring-2 ring-white">
          {count}
        </span>
      )}
    </Link>
  );
}

const nav = ({ isActive }: { isActive: boolean }) =>
  cn("rounded-full px-3 py-1.5 text-sm font-semibold transition", isActive ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100");

function Header() {
  const { isStaff } = useAuth();
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 backdrop-blur-md" data-testid="app-header">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-1 lg:flex">
          <NavLink to="/catalog" className={nav}>
            Каталог
          </NavLink>
          {isStaff && (
            <NavLink to="/admin" className={nav}>
              Панель управления
            </NavLink>
          )}
        </nav>
        <SearchBox className="ml-auto hidden max-w-md flex-1 md:block" />
        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <CartButton />
          <UserMenu />
        </div>
      </div>
      <div className="px-4 pb-3 md:hidden">
        <SearchBox />
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-20 border-t border-slate-200 bg-white" data-testid="app-footer">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-3 sm:px-6">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-slate-500">Магазин электроники и аксессуаров для работы, учёбы и отдыха.</p>
        </div>
        <div className="text-sm">
          <div className="font-bold text-slate-900">Покупателям</div>
          <ul className="mt-3 space-y-2 text-slate-500">
            <li>Доставка 299 ₽, бесплатно от 3 000 ₽</li>
            <li>Оплата в течение 15 минут после заказа</li>
            <li>Возврат 14 дней после доставки</li>
          </ul>
        </div>
        <div className="text-sm">
          <div className="font-bold text-slate-900">Контакты</div>
          <ul className="mt-3 space-y-2 text-slate-500">
            <li>8 800 000-00-00, ежедневно с 9 до 21</li>
            <li>support@gadgetpoint.example</li>
            <li>© {YEAR} GadgetPoint</li>
          </ul>
        </div>
      </div>
    </footer>
  );
}

/** Header + content + footer. Also used for 403 on /admin, which has its own layout otherwise. */
export function ShopFrame({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  // Scroll to top on navigation: pathname is the trigger, not a value used inside.
  useEffect(() => {
    window.scrollTo(0, 0);
    // oxlint-disable-next-line react/exhaustive-effect-dependencies
  }, [pathname]);
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">{children}</main>
      <Footer />
    </div>
  );
}

export function ShopLayout() {
  return (
    <ShopFrame>
      <Outlet />
    </ShopFrame>
  );
}

/** Route guard: not logged in → login page; wrong role → 403 screen. */
export function RequireAuth({ roles, children, framed }: { roles?: Role[]; children: ReactNode; framed?: boolean }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (roles && !roles.includes(user.role))
    return framed ? (
      <ShopFrame>
        <Forbidden need={roles} />
      </ShopFrame>
    ) : (
      <Forbidden need={roles} />
    );
  return <>{children}</>;
}

export function Forbidden({ need }: { need: Role[] }) {
  const { isStaff } = useAuth();
  const text = need.includes("customer")
    ? "Корзина и заказы доступны только покупателям. У сотрудников — панель управления."
    : need.length === 1 && need[0] === "admin"
      ? "Этот раздел доступен только администратору."
      : "Этот раздел доступен только сотрудникам магазина.";
  return (
    <div className="py-10">
      <div className="mb-2 text-center text-6xl font-extrabold tracking-tighter text-slate-200">403</div>
      <EmptyState
        icon={<ShieldAlert />}
        title="Нет доступа"
        text={text}
        action={<ButtonLink to={isStaff ? "/admin" : "/"}>{isStaff ? "В панель управления" : "На главную"}</ButtonLink>}
      />
    </div>
  );
}
