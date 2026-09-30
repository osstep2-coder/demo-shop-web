import {
  forwardRef,
  useEffect,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { Link, type LinkProps } from "react-router-dom";
import { ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";

/** Hooks for tests: `data-testid` finds the element, `data-state` tells which state it is in. */
export type TestAttrs = { "data-testid"?: string; "data-state"?: string };

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

/* ---------- buttons ---------- */

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand-600 text-white shadow-sm hover:bg-brand-700 active:bg-brand-800 disabled:bg-brand-300",
  secondary: "bg-white text-slate-800 ring-1 ring-inset ring-slate-200 shadow-sm hover:bg-slate-50 hover:ring-slate-300 disabled:text-slate-400",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:text-slate-300",
  danger: "bg-rose-600 text-white shadow-sm hover:bg-rose-700 disabled:bg-rose-300",
  success: "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 disabled:bg-emerald-300",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-sm gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
  lg: "h-12 px-6 text-base gap-2 rounded-xl",
};

const buttonBase =
  "inline-flex items-center justify-center font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

export function Button({ variant = "primary", size = "md", loading, icon, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button className={cn(buttonBase, VARIANTS[variant], SIZES[size], className)} disabled={disabled || loading} {...rest}>
      {loading ? <Loader2 className="size-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  icon,
  className,
  children,
  ...rest
}: LinkProps & { variant?: Variant; size?: Size; icon?: ReactNode }) {
  return (
    <Link className={cn(buttonBase, VARIANTS[variant], SIZES[size], className)} {...rest}>
      {icon}
      {children}
    </Link>
  );
}

/* ---------- form controls ---------- */

const control =
  "block w-full rounded-xl border-0 bg-white px-3.5 text-sm text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 transition focus:ring-2 focus:ring-brand-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(({ className, invalid, ...rest }, ref) => (
  <input ref={ref} className={cn(control, "h-10", invalid && "ring-rose-400 focus:ring-rose-500", className)} {...rest} />
));

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(control, "py-2.5", className)} {...rest} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(control, "h-10 pr-9 appearance-none bg-no-repeat", className)}
      style={{ backgroundImage: SELECT_ARROW, backgroundPosition: "right 0.75rem center", backgroundSize: "1rem" }}
      {...rest}
    >
      {children}
    </select>
  );
}

const SELECT_ARROW =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%2394a3b8'%3E%3Cpath fill-rule='evenodd' d='M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z'/%3E%3C/svg%3E\")";

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span>
      {children}
      {error ? (
        <span className="mt-1.5 block text-xs font-medium text-rose-600">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-xs text-slate-500">{hint}</span>
      ) : null}
    </label>
  );
}

export function Toggle({
  checked,
  onChange,
  disabled,
  label,
  labelledBy,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label?: string;
  labelledBy?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-labelledby={labelledBy}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50",
        checked ? "bg-brand-600" : "bg-slate-300",
      )}
    >
      <span className={cn("inline-block size-5 rounded-full bg-white shadow transition-transform", checked ? "translate-x-5.5" : "translate-x-0.5")} />
    </button>
  );
}

/* ---------- display ---------- */

export function Badge({ className, children }: { className?: string; children: ReactNode }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset", className)}>{children}</span>;
}

export function Card({ className, children, ...test }: { className?: string; children: ReactNode } & TestAttrs) {
  return (
    <div className={cn("rounded-2xl bg-white shadow-card ring-1 ring-slate-900/5", className)} {...test}>
      {children}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-slate-200/70", className)} />;
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-6 animate-spin text-brand-500", className)} />;
}

export function PageLoader(test: TestAttrs) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center" {...test}>
      <Spinner className="size-8" />
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  text,
  action,
  className,
  ...test
}: {
  icon: ReactNode;
  title: string;
  text?: ReactNode;
  action?: ReactNode;
  className?: string;
} & TestAttrs) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-14 text-center", className)} {...test}>
      <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 [&>svg]:size-8">{icon}</div>
      <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      {text && <p className="mt-1.5 max-w-sm text-sm text-slate-500">{text}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Pagination({ total, take, skip, onChange }: { total: number; take: number; skip: number; onChange: (skip: number) => void }) {
  const pages = Math.ceil(total / take);
  if (pages <= 1) return null;
  const current = Math.floor(skip / take);
  return (
    <nav className="flex items-center justify-center gap-1.5 pt-8" aria-label="Страницы">
      <Button variant="secondary" size="sm" disabled={current === 0} onClick={() => onChange(skip - take)} aria-label="Назад">
        <ChevronLeft className="size-4" />
      </Button>
      {Array.from({ length: pages }, (_, i) => (
        <button
          key={i}
          onClick={() => onChange(i * take)}
          className={cn(
            "h-8 min-w-8 rounded-lg px-2 text-sm font-semibold transition",
            i === current ? "bg-brand-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100",
          )}
        >
          {i + 1}
        </button>
      ))}
      <Button variant="secondary" size="sm" disabled={current >= pages - 1} onClick={() => onChange(skip + take)} aria-label="Вперёд">
        <ChevronRight className="size-4" />
      </Button>
    </nav>
  );
}

/* ---------- modal ---------- */

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  ...test
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
} & TestAttrs) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  const width = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" }[size];
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      {/* Backdrop click is a mouse shortcut; keyboard users close with Escape or the × button. */}
      {/* oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div className="absolute inset-0 animate-fade-in bg-slate-900/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className={cn("relative w-full animate-scale-in rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl", width)} role="dialog" aria-modal {...test}>
        <div className="flex items-start justify-between gap-4 px-6 pt-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
          </div>
          <button onClick={onClose} className="-m-1 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Закрыть">
            <X className="size-5" />
          </button>
        </div>
        {children && <div className="max-h-[70vh] overflow-y-auto px-6 pt-5">{children}</div>}
        <div className="flex flex-wrap justify-end gap-2 px-6 pt-6 pb-6">{footer}</div>
      </div>
    </div>
  );
}

/* ---------- tables ---------- */

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return <th className={cn("border-b border-slate-100 px-4 py-3 text-xs font-semibold tracking-wide text-slate-500 uppercase", className)}>{children}</th>;
}

export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cn("border-b border-slate-100 px-4 py-3.5 align-middle", className)}>{children}</td>;
}

/* ---------- tabs ---------- */

export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: ReactNode }[] }) {
  return (
    <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
      {items.map((item) => (
        <button
          key={item.value}
          onClick={() => onChange(item.value)}
          className={cn(
            "h-9 shrink-0 rounded-full px-4 text-sm font-semibold transition",
            value === item.value ? "bg-slate-900 text-white shadow-sm" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50",
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
