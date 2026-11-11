import { mockApi } from "./mock";
import { restApi } from "./rest";
import type { ApplicationsApi } from "./types";

// Set VITE_API_MODE=rest in .env to use the Go backend instead of sample data.
export const isMockMode = import.meta.env.VITE_API_MODE !== "rest";

export const api: ApplicationsApi = isMockMode ? mockApi : restApi;

export { ApiError } from "./types";
