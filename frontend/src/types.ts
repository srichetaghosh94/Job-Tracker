export const STATUSES = [
  "wishlist",
  "applied",
  "interview",
  "offer",
  "rejected",
  "withdrawn",
] as const;

export type Status = (typeof STATUSES)[number];

/**
 * One job application. This is also the JSON shape the Go backend stores
 * and returns, so field names here are the API contract.
 *
 * - applicationDate: "YYYY-MM-DD". May be "" while status is "wishlist".
 * - interviewDate:   "YYYY-MM-DDTHH:mm" in local time, or "" when none.
 * - jobUrl:          http(s) URL, or "" when none.
 */
export interface Application {
  id: string;
  company: string;
  jobTitle: string;
  applicationDate: string;
  status: Status;
  jobUrl: string;
  interviewDate: string;
  notes: string;
}

/** What the form sends when creating or updating (the server owns the id). */
export type ApplicationInput = Omit<Application, "id">;
