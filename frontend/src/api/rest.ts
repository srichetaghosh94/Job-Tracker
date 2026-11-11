import type { Application, ApplicationInput } from "../types";
import { ApiError, type ApplicationsApi } from "./types";

const BASE = "/api/applications";

const UNREACHABLE =
  "Couldn't reach the server. Check that the backend is running on port 8080, then try again.";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiError(UNREACHABLE, 0);
  }

  if (!res.ok) {
    // The Go backend always answers errors as { "error": "..." }. Anything else
    // with a 5xx status came from something in between, such as the dev proxy
    // when the backend isn't running.
    let message = `The server returned an error (${res.status}).`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
      else if (res.status >= 500) message = UNREACHABLE;
    } catch {
      if (res.status >= 500) message = UNREACHABLE;
    }
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const restApi: ApplicationsApi = {
  list: () => request<Application[]>(BASE),

  create: (input: ApplicationInput) =>
    request<Application>(BASE, { method: "POST", body: JSON.stringify(input) }),

  update: (id: string, input: ApplicationInput) =>
    request<Application>(`${BASE}/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(input),
    }),

  remove: (id: string) =>
    request<void>(`${BASE}/${encodeURIComponent(id)}`, { method: "DELETE" }),
};
