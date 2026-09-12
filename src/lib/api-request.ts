/**
 * Make a request, and say so when it fails.
 *
 * Seventy-four places across forty-six screens acted on success and had no
 * branch for failure. The request failed, the dialog closed, and nothing
 * happened. Twenty-one screens contained no error message of any kind; the
 * Inventory screen makes fifty-five network calls and could report none of
 * them.
 *
 * That shape has already cost real time on this project. The delete button in
 * the admin panel looked broken for weeks: the rule refusing the delete was
 * working perfectly and the refusal was simply never shown, so it read as a
 * button that did nothing.
 *
 * The point of a helper rather than seventy-four judgement calls is that the
 * failure is reported the same way every time, and adding a new call site
 * costs nothing to get right.
 */
import { toast } from 'sonner';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * The server's own words where it gave any, and something useful where it did
 * not. A raw status code tells the person at the desk nothing they can act on.
 */
function describe(status: number, body: unknown): string {
  const fromBody =
    body && typeof body === 'object'
      ? ((body as Record<string, unknown>).error ??
         (body as Record<string, unknown>).message)
      : null;
  if (typeof fromBody === 'string' && fromBody.trim()) return fromBody;

  if (status === 401) return 'Your session has expired. Sign in again.';
  if (status === 403) return 'You do not have permission to do that.';
  if (status === 404) return 'That is no longer there.';
  if (status === 409) return 'That conflicts with something already saved.';
  if (status >= 500) return 'The server could not complete that. Try again.';
  return `The request failed (${status}).`;
}

type Options = RequestInit & {
  /** Shown instead of the server's message. For when the screen has context the server lacks. */
  errorMessage?: string;
  /** Suppress the toast and let the caller render the failure itself. */
  silent?: boolean;
};

/**
 * Returns the parsed body on success. Throws ApiError on failure, having
 * already told the user, so a caller may simply not catch it and still behave
 * correctly: the toast is shown, and the code after the call does not run.
 *
 * A caller that needs to do more - close a dialog, roll back a list - catches
 * it as usual.
 */
export async function apiRequest<T = unknown>(
  url: string,
  options: Options = {},
): Promise<T> {
  const { errorMessage, silent, ...init } = options;

  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    // The request never reached the server: offline, DNS, a dropped
    // connection. Distinct from a server that answered with a refusal.
    const message = errorMessage ?? 'Could not reach the server. Check your connection.';
    if (!silent) toast.error(message);
    throw new ApiError(message, 0, null);
  }

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const message = errorMessage ?? describe(res.status, body);
    if (!silent) toast.error(message);
    throw new ApiError(message, res.status, body);
  }

  return body as T;
}

/**
 * For a request whose failure genuinely does not matter to the person using
 * the screen - a background refresh, a count in the corner.
 *
 * It returns the fallback instead of throwing, and still logs, so "we chose to
 * ignore this" stays distinguishable from "nobody thought about it". Reach for
 * `apiRequest` unless you can say why the user should not be told.
 */
export async function apiRequestOrNull<T>(
  url: string,
  options: Options = {},
): Promise<T | null> {
  try {
    return await apiRequest<T>(url, { ...options, silent: true });
  } catch (error) {
    console.error(`[${url}] failed, ignored deliberately:`, error);
    return null;
  }
}
