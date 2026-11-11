import type { Application, ApplicationInput } from "../types";

/**
 * The contract between the UI and whatever stores the data.
 *
 * REST mapping used by the Go backend (step 2):
 *   list    GET    /api/applications        -> 200 Application[]
 *   create  POST   /api/applications        -> 201 Application
 *   update  PUT    /api/applications/{id}   -> 200 Application
 *   remove  DELETE /api/applications/{id}   -> 204
 * Errors are returned as { "error": "message" } with a 4xx or 5xx status.
 */
export interface ApplicationsApi {
  list(): Promise<Application[]>;
  create(input: ApplicationInput): Promise<Application>;
  update(id: string, input: ApplicationInput): Promise<Application>;
  remove(id: string): Promise<void>;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}
