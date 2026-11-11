import type { Application } from "../types";
import { isClosed, stageOf, type StageKey } from "./stages";
import { isUpcoming } from "./dates";

export type SortKey = "recent" | "oldest" | "company" | "interview";

export const SORT_LABEL: Record<SortKey, string> = {
  recent: "Newest first",
  oldest: "Oldest first",
  company: "Company A to Z",
  interview: "Next interview",
};

export interface ViewOptions {
  query: string;
  stage: StageKey | null;
  sort: SortKey;
}

function matchesQuery(app: Application, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [app.company, app.jobTitle, app.notes].some((field) =>
    field.toLowerCase().includes(q),
  );
}

// Empty dates sort as the oldest possible date.
const byDate = (a: string, b: string) => a.localeCompare(b);

export function applyView(apps: Application[], opts: ViewOptions): Application[] {
  const now = new Date();
  const visible = apps.filter(
    (app) =>
      (opts.stage === null || stageOf(app.status) === opts.stage) &&
      matchesQuery(app, opts.query),
  );

  const sorted = [...visible];
  switch (opts.sort) {
    case "recent":
      sorted.sort((a, b) => byDate(b.applicationDate, a.applicationDate));
      break;
    case "oldest":
      sorted.sort((a, b) => byDate(a.applicationDate, b.applicationDate));
      break;
    case "company":
      sorted.sort((a, b) => a.company.localeCompare(b.company, undefined, { sensitivity: "base" }));
      break;
    case "interview": {
      // Upcoming interviews first (soonest on top), then everything else.
      const rank = (app: Application) =>
        app.interviewDate && isUpcoming(app.interviewDate, now) ? 0 : 1;
      sorted.sort((a, b) => {
        const r = rank(a) - rank(b);
        if (r !== 0) return r;
        if (rank(a) === 0) return byDate(a.interviewDate, b.interviewDate);
        return byDate(b.applicationDate, a.applicationDate);
      });
      break;
    }
  }
  return sorted;
}

/** The soonest upcoming interview among applications that are still open. */
export function nextInterview(apps: Application[], now: Date = new Date()): Application | null {
  let best: Application | null = null;
  for (const app of apps) {
    if (isClosed(app.status) || !app.interviewDate) continue;
    if (!isUpcoming(app.interviewDate, now)) continue;
    if (best === null || app.interviewDate < best.interviewDate) best = app;
  }
  return best;
}

export function countByStage(apps: Application[]): Record<StageKey, number> {
  const counts: Record<StageKey, number> = {
    wishlist: 0,
    applied: 0,
    interview: 0,
    offer: 0,
    closed: 0,
  };
  for (const app of apps) counts[stageOf(app.status)] += 1;
  return counts;
}
