import type { Application } from "../types";
import { nextInterview } from "../lib/filter";
import { formatInterviewLong, relativeDay } from "../lib/dates";

const IN_PROGRESS = new Set(["applied", "interview", "offer"]);

export function Hero({ applications }: { applications: Application[] }) {
  const next = nextInterview(applications);
  const inProgress = applications.filter((a) => IN_PROGRESS.has(a.status)).length;

  let title: string;
  let text: string;

  if (applications.length === 0) {
    title = "Track your first application";
    text =
      "Add jobs you've applied to or want to apply to. Each one keeps its status, dates and notes.";
  } else if (next) {
    title = `Interview with ${next.company} ${relativeDay(next.interviewDate)}`;
    text = `${formatInterviewLong(next.interviewDate)}, for the ${next.jobTitle} role.`;
  } else if (inProgress > 0) {
    title = `${inProgress} ${inProgress === 1 ? "application" : "applications"} in progress`;
    text = "No interviews are scheduled. Add the date to an application when you get one.";
  } else {
    title = "Nothing in progress";
    text = "Move an application to Applied once you've sent it.";
  }

  return (
    <section className="hero">
      <h1 className="hero__title">{title}</h1>
      <p className="hero__text">{text}</p>
    </section>
  );
}
