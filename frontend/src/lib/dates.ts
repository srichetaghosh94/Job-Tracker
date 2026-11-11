// Dates are stored as plain local strings ("YYYY-MM-DD" and
// "YYYY-MM-DDTHH:mm"), so nothing here converts between time zones.

const LOCALE = "en-GB";

const dateFmt = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "short",
  year: "numeric",
});
const shortDayFmt = new Intl.DateTimeFormat(LOCALE, {
  weekday: "short",
  day: "numeric",
  month: "short",
});
const longDayFmt = new Intl.DateTimeFormat(LOCALE, {
  weekday: "long",
  day: "numeric",
  month: "long",
});
const timeFmt = new Intl.DateTimeFormat(LOCALE, {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATETIME_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

export function parseDate(value: string): Date | null {
  const m = DATE_RE.exec(value);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function parseDateTime(value: string): Date | null {
  const m = DATETIME_RE.exec(value);
  if (!m) return null;
  return new Date(
    Number(m[1]),
    Number(m[2]) - 1,
    Number(m[3]),
    Number(m[4]),
    Number(m[5]),
  );
}

const pad = (n: number) => String(n).padStart(2, "0");

export function toDateString(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayString(): string {
  return toDateString(new Date());
}

/** Local date string for `days` from today (negative for the past). */
export function dateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toDateString(d);
}

/** Local date-time string for `days` from today at "HH:mm". */
export function dateTimeOffset(days: number, time: string): string {
  return `${dateOffset(days)}T${time}`;
}

export function formatDate(value: string): string {
  const d = parseDate(value);
  return d ? dateFmt.format(d) : "";
}

/** "Thu 14 Nov, 10:00" */
export function formatInterview(value: string): string {
  const d = parseDateTime(value);
  return d ? `${shortDayFmt.format(d)}, ${timeFmt.format(d)}` : "";
}

/** "Thursday 14 November at 10:00" */
export function formatInterviewLong(value: string): string {
  const d = parseDateTime(value);
  return d ? `${longDayFmt.format(d)} at ${timeFmt.format(d)}` : "";
}

export function isUpcoming(value: string, now: Date = new Date()): boolean {
  const d = parseDateTime(value);
  return d !== null && d.getTime() >= now.getTime();
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Whole calendar days from today to the given date-time (0 means today). */
export function daysUntil(value: string, now: Date = new Date()): number | null {
  const d = parseDateTime(value);
  if (!d) return null;
  return Math.round((startOfDay(d) - startOfDay(now)) / 86_400_000);
}

/** "today", "tomorrow", "in 3 days" */
export function relativeDay(value: string, now: Date = new Date()): string {
  const days = daysUntil(value, now);
  if (days === null) return "";
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days > 1) return `in ${days} days`;
  if (days === -1) return "yesterday";
  return `${Math.abs(days)} days ago`;
}
