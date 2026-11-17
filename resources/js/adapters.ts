/**
 * The one place the kit's React files touch your app. Edit this file to plug in your own translation function,
 * toast and HTTP client; nothing else in resources/js/lir-kit needs to change.
 */

/** Base path of the kit's settings routes (config 'lir-kit.routes.api_prefix'). */
export const KIT_API = '/lir-kit';

/** Texts are written in Indonesian; replace with your i18n. Placeholders look like {name}. */
export function t(
  text: string,
  vars?: Record<string, string | number | null | undefined>,
): string {
  if (!vars) {
    return text;
  }

  return text.replace(/\{(\w+)\}/g, (_, name: string) =>
    vars[name] === undefined || vars[name] === null ? '' : String(vars[name]),
  );
}

/** Replace with your toast, e.g. sonner's toast.error / toast.success. */
export function notify(message: string, isError = false): void {
  if (isError) {
    console.error(message);
    window.alert(message);
  } else {
    console.info(message);
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public errors?: Record<string, string[]>,
  ) {
    super(message);
  }
}

function xsrfToken(): string {
  const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/);

  return match ? decodeURIComponent(match[1]) : '';
}

/** Calls the kit's settings routes (JSON in, JSON out). Throws ApiError with the server's message. */
export async function api<T = unknown>(
  url: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const response = await fetch(`${KIT_API}${url}`, {
    method: options.method ?? (options.body ? 'POST' : 'GET'),
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      'X-XSRF-TOKEN': xsrfToken(),
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = (await response.json().catch(() => ({}))) as {
    message?: string;
    errors?: Record<string, string[]>;
  };

  if (!response.ok) {
    throw new ApiError(
      data.message ?? `HTTP ${response.status}`,
      response.status,
      data.errors,
    );
  }

  return data as T;
}
