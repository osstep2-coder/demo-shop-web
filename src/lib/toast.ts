import { toast } from "sonner";
import { ApiError } from "../api/client";
import { errorText } from "./errors";

/** Error toast with the API code and correlationId underneath — handy to match with server logs. */
export function toastError(error: unknown) {
  const description =
    error instanceof ApiError && error.status > 0 ? `${error.status} · ${error.code}${error.correlationId ? ` · ${error.correlationId}` : ""}` : undefined;
  toast.error(errorText(error), { description });
}

export { toast };
