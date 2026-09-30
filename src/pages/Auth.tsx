import { useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { authApi } from "../api/endpoints";
import { useAuth } from "../auth/AuthContext";
import { ProductArt } from "../catalog/ProductArt";
import { categoryForSku } from "../catalog/meta";
import { Logo } from "../components/Layout";
import { Button, Field, Input } from "../components/ui";
import { errorText } from "../lib/errors";
import { toast } from "../lib/toast";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function AuthShell({ title, subtitle, children }: { title: string; subtitle: ReactNode; children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Logo />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
      <div className="relative hidden overflow-hidden bg-slate-900 lg:block">
        <div className="absolute -top-32 -left-20 size-[30rem] rounded-full bg-brand-600/40 blur-3xl" />
        <div className="absolute right-0 bottom-0 size-96 rounded-full bg-sky-500/20 blur-3xl" />
        <div className="relative flex h-full flex-col justify-center px-16">
          <div className="grid max-w-md grid-cols-2 gap-4">
            {["KB-001", "HS-003", "WC-007", "PB-005"].map((sku, i) => (
              <div key={sku} className={`overflow-hidden rounded-3xl shadow-2xl ring-1 ring-white/10 ${i % 2 ? "translate-y-8" : ""}`}>
                <ProductArt sku={sku} category={categoryForSku(sku)} />
              </div>
            ))}
          </div>
          <p className="mt-16 max-w-md text-2xl leading-snug font-bold text-white">«Собрал рабочее место мечты за один заказ — и доставка была бесплатной»</p>
          <p className="mt-3 text-sm text-slate-400">Отзыв покупателя</p>
        </div>
      </div>
    </div>
  );
}

function PasswordInput({ value, onChange, invalid, autoComplete }: { value: string; onChange: (v: string) => void; invalid?: boolean; autoComplete: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        invalid={invalid}
        autoComplete={autoComplete}
        className="pr-10"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        aria-label="Показать пароль"
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

function ErrorBox({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-700 ring-1 ring-rose-200">
      <AlertCircle className="mt-0.5 size-4 shrink-0" /> {text}
    </div>
  );
}

export function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string; email?: string } | null)?.from;
  const [email, setEmail] = useState((location.state as { email?: string } | null)?.email ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (user && !loading) return <Navigate to={from ?? "/"} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const u = await login(email.trim(), password);
      toast.success(`Здравствуйте, ${u.firstName}!`);
      navigate(from ?? (u.role === "customer" ? "/" : "/admin"), { replace: true });
    } catch (err) {
      setError(errorText(err));
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Вход"
      subtitle={
        <>
          Нет аккаунта?{" "}
          <Link to="/register" state={{ from }} className="font-semibold text-brand-600 hover:text-brand-700">
            Зарегистрируйтесь
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" placeholder="you@example.com" required />
        </Field>
        <Field label="Пароль">
          <PasswordInput value={password} onChange={setPassword} autoComplete="current-password" />
        </Field>
        {error && <ErrorBox text={error} />}
        <Button type="submit" size="lg" className="w-full" loading={loading} disabled={!email || !password}>
          Войти
        </Button>
      </form>
    </AuthShell>
  );
}

export function Register() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "" });
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (user && !loading) return <Navigate to="/" replace />;

  const errors = {
    firstName: !form.firstName.trim() ? "Введите имя" : null,
    lastName: !form.lastName.trim() ? "Введите фамилию" : null,
    email: !EMAIL_RE.test(form.email.trim()) ? "Некорректный email" : null,
    password: form.password.length < 6 ? "Минимум 6 символов" : null,
  };
  const show = (k: keyof typeof errors) => (touched ? errors[k] : null);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (Object.values(errors).some(Boolean)) return;
    setError(null);
    setLoading(true);
    try {
      await authApi.register({ ...form, email: form.email.trim(), firstName: form.firstName.trim(), lastName: form.lastName.trim() });
      await login(form.email.trim(), form.password);
      toast.success("Аккаунт создан", { description: "Добро пожаловать в GadgetPoint!" });
      navigate(from ?? "/", { replace: true });
    } catch (err) {
      setError(errorText(err));
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Регистрация"
      subtitle={
        <>
          Уже есть аккаунт?{" "}
          <Link to="/login" state={{ from }} className="font-semibold text-brand-600 hover:text-brand-700">
            Войдите
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Имя" error={show("firstName")}>
            <Input value={form.firstName} onChange={set("firstName")} invalid={Boolean(show("firstName"))} autoComplete="given-name" />
          </Field>
          <Field label="Фамилия" error={show("lastName")}>
            <Input value={form.lastName} onChange={set("lastName")} invalid={Boolean(show("lastName"))} autoComplete="family-name" />
          </Field>
        </div>
        <Field label="Email" error={show("email")}>
          <Input type="email" value={form.email} onChange={set("email")} invalid={Boolean(show("email"))} autoComplete="email" placeholder="you@example.com" />
        </Field>
        <Field label="Пароль" error={show("password")} hint="Минимум 6 символов">
          <PasswordInput
            value={form.password}
            onChange={(v) => setForm((f) => ({ ...f, password: v }))}
            invalid={Boolean(show("password"))}
            autoComplete="new-password"
          />
        </Field>
        {error && <ErrorBox text={error} />}
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Создать аккаунт
        </Button>
        <p className="text-center text-xs text-slate-400">Регистрация создаёт аккаунт покупателя</p>
      </form>
    </AuthShell>
  );
}
