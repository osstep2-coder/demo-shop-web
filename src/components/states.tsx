/** Shared page states: API errors, 404, render crashes. Every page uses these, so states look the same everywhere. */
import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertOctagon, Compass, FileQuestion, Lock, RefreshCw, ServerCrash, WifiOff } from "lucide-react";
import { ApiError } from "../api/client";
import { errorText } from "../lib/errors";
import { Button, ButtonLink, EmptyState, cn } from "./ui";

function describe(error: unknown): { icon: ReactNode; title: string; text: string } {
  if (error instanceof ApiError) {
    if (error.status === 0) return { icon: <WifiOff />, title: "Нет связи с сервером", text: errorText(error) };
    if (error.status === 404) return { icon: <FileQuestion />, title: "Не найдено", text: errorText(error) };
    if (error.status === 401 || error.status === 403) return { icon: <Lock />, title: "Нет доступа", text: errorText(error) };
    if (error.status >= 500)
      return { icon: <ServerCrash />, title: "Ошибка сервера", text: "Сервер не смог обработать запрос. Попробуйте ещё раз чуть позже." };
  }
  return { icon: <AlertOctagon />, title: "Не удалось загрузить данные", text: errorText(error) };
}

/** Error block for a failed query. `compact` is for a section inside a page. */
export function ErrorState({
  error,
  onRetry,
  title,
  compact,
  className,
}: {
  error: unknown;
  onRetry?: () => void;
  title?: string;
  compact?: boolean;
  className?: string;
}) {
  const d = describe(error);
  const meta =
    error instanceof ApiError && error.status > 0 ? `${error.status} · ${error.code}${error.correlationId ? ` · ${error.correlationId}` : ""}` : null;
  return (
    <div data-state="error" className={cn("rounded-3xl bg-white shadow-card ring-1 ring-slate-900/5", className)}>
      <EmptyState
        state={null}
        className={compact ? "py-8" : undefined}
        icon={<span className="text-rose-600">{d.icon}</span>}
        title={title ?? d.title}
        text={
          <>
            {d.text}
            {meta && <span className="mt-2 block font-mono text-xs text-slate-400">{meta}</span>}
          </>
        }
        action={
          onRetry && (
            <Button variant="secondary" icon={<RefreshCw className="size-4" />} onClick={onRetry}>
              Повторить
            </Button>
          )
        }
      />
    </div>
  );
}

export function NotFoundState({
  title = "Страница не найдена",
  text,
  backTo = "/",
  backLabel = "На главную",
}: {
  title?: string;
  text?: string;
  backTo?: string;
  backLabel?: string;
}) {
  return (
    <div data-state="not-found" className="flex flex-col items-center py-16 text-center">
      <div className="bg-gradient-to-br from-brand-500 to-sky-400 bg-clip-text text-8xl font-extrabold tracking-tighter text-transparent sm:text-9xl">404</div>
      <EmptyState
        state={null}
        className="pt-4"
        icon={<Compass />}
        title={title}
        text={text ?? "Возможно, ссылка устарела или в адресе опечатка."}
        action={<ButtonLink to={backTo}>{backLabel}</ButtonLink>}
      />
    </div>
  );
}

/** Catches render crashes so the user sees a screen instead of a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div data-state="crash" className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md rounded-3xl bg-white p-2 shadow-card ring-1 ring-slate-900/5">
          <EmptyState
            state={null}
            icon={
              <span className="text-rose-600">
                <AlertOctagon />
              </span>
            }
            title="Что-то сломалось"
            text={
              <>
                Страница не смогла отобразиться. Обновите её или вернитесь на главную.
                <span className="mt-2 block font-mono text-xs break-all text-slate-400">{this.state.error.message}</span>
              </>
            }
            action={
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => window.location.reload()}>
                  Обновить
                </Button>
                <Button onClick={() => (window.location.href = "/")}>На главную</Button>
              </div>
            }
          />
        </div>
      </div>
    );
  }
}
