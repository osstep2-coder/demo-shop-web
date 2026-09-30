import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { BadgePercent, LayoutDashboard, Package, ShoppingBag, Store, Users } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { Logo } from "../../components/Layout";
import { ROLE_LABEL } from "../../lib/status";
import { cn } from "../../components/ui";

const link = ({ isActive }: { isActive: boolean }) =>
  cn(
    "flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
    isActive ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white",
  );

export function AdminLayout() {
  const { user, isAdmin } = useAuth();
  const { pathname } = useLocation();
  // Scroll to top on navigation: pathname is the trigger, not a value used inside.
  useEffect(() => {
    window.scrollTo(0, 0);
    // oxlint-disable-next-line react/exhaustive-effect-dependencies
  }, [pathname]);

  const items = [
    { to: "/admin", label: "Обзор", icon: LayoutDashboard, end: true },
    { to: "/admin/orders", label: "Заказы", icon: ShoppingBag },
    { to: "/admin/products", label: "Товары", icon: Package },
    ...(isAdmin
      ? [
          { to: "/admin/users", label: "Пользователи", icon: Users },
          { to: "/admin/promos", label: "Промокоды", icon: BadgePercent },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="sticky top-0 z-30 bg-slate-900 lg:h-screen">
        <div className="flex h-full flex-col gap-2 p-4 lg:p-5">
          <div className="flex items-center justify-between lg:block">
            <div className="rounded-xl bg-white px-2 py-1.5 lg:mb-6 lg:inline-block">
              <Logo />
            </div>
            <NavLink to="/" className="flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-white lg:hidden">
              <Store className="size-4" /> Магазин
            </NavLink>
          </div>
          <div className="hidden px-3 pb-2 text-xs font-bold tracking-wider text-slate-500 uppercase lg:block">Управление</div>
          <nav className="-mx-1 flex gap-1 overflow-x-auto px-1 lg:mx-0 lg:block lg:space-y-1 lg:px-0">
            {items.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} className={link}>
                <Icon className="size-4.5" /> {label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto hidden space-y-3 lg:block">
            <NavLink to="/" className={link({ isActive: false })}>
              <Store className="size-4.5" /> Открыть магазин
            </NavLink>
            <div className="rounded-2xl bg-white/5 p-3">
              <div className="truncate text-sm font-bold text-white">
                {user?.firstName} {user?.lastName}
              </div>
              <div className="truncate text-xs text-slate-400">{user?.email}</div>
              <div className="mt-1.5 text-xs font-semibold text-brand-300">{user && ROLE_LABEL[user.role]}</div>
            </div>
          </div>
        </div>
      </aside>
      <main className="min-w-0 px-4 py-8 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
