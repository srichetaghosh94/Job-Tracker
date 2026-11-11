import type { Status } from "../types";

export const STATUS_LABEL: Record<Status, string> = {
  wishlist: "Wishlist",
  applied: "Applied",
  interview: "Interviewing",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

/** The pipeline rail groups rejected and withdrawn into one closed stage. */
export type StageKey = "wishlist" | "applied" | "interview" | "offer" | "closed";

export const STAGES: { key: StageKey; label: string }[] = [
  { key: "wishlist", label: "Wishlist" },
  { key: "applied", label: "Applied" },
  { key: "interview", label: "Interviewing" },
  { key: "offer", label: "Offer" },
  { key: "closed", label: "Closed" },
];

export function stageOf(status: Status): StageKey {
  return status === "rejected" || status === "withdrawn" ? "closed" : status;
}

export function isClosed(status: Status): boolean {
  return stageOf(status) === "closed";
}

/** The four steps of an application that is still alive. */
export const PROGRESS_STEPS: Status[] = ["wishlist", "applied", "interview", "offer"];

/** How far along an application is, 0 to 3, or -1 once it is closed. */
export function progressIndex(status: Status): number {
  return PROGRESS_STEPS.indexOf(status);
}
