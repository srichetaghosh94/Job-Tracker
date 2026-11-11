import { STATUSES, type Application, type Status } from "../types";
import { STATUS_LABEL, isClosed } from "../lib/stages";
import {
  formatDate,
  formatInterview,
  isUpcoming,
  relativeDay,
} from "../lib/dates";
import { StageTrack } from "./StageTrack";

interface Props {
  applications: Application[];
  onEdit: (app: Application) => void;
  onDelete: (app: Application) => void;
  onStatusChange: (app: Application, status: Status) => void;
}

function NotSet() {
  return (
    <>
      <span aria-hidden="true" className="muted">
        –
      </span>
      <span className="sr-only">Not set</span>
    </>
  );
}

function InterviewCell({ app }: { app: Application }) {
  if (!app.interviewDate) return <NotSet />;

  const label = formatInterview(app.interviewDate);
  if (!isClosed(app.status) && isUpcoming(app.interviewDate)) {
    return (
      <>
        <time className="mark" dateTime={app.interviewDate}>
          {label}
        </time>
        <span className="cell-sub">{relativeDay(app.interviewDate)}</span>
      </>
    );
  }
  return (
    <time className="muted" dateTime={app.interviewDate}>
      {label}
    </time>
  );
}

function Row({
  app,
  onEdit,
  onDelete,
  onStatusChange,
}: { app: Application } & Omit<Props, "applications">) {
  const name = `${app.company}, ${app.jobTitle}`;

  return (
    <tr className="table__row">
      <td className="table__cell table__cell--first table__cell--app">
        <div className="app__company">{app.company}</div>
        <div className="app__title">
          {app.jobUrl ? (
            <a className="app__link" href={app.jobUrl} target="_blank" rel="noopener noreferrer">
              {app.jobTitle}
              <span className="sr-only"> (job posting, opens in a new tab)</span>
            </a>
          ) : (
            app.jobTitle
          )}
        </div>
      </td>

      <td className="table__cell table__cell--status">
        <div className="status">
          <StageTrack status={app.status} />
          <select
            className="select select--compact"
            value={app.status}
            aria-label={`Status for ${name}`}
            onChange={(e) => onStatusChange(app, e.target.value as Status)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
      </td>

      <td className="table__cell" data-label="Applied">
        {app.applicationDate ? (
          <time dateTime={app.applicationDate}>{formatDate(app.applicationDate)}</time>
        ) : (
          <NotSet />
        )}
      </td>

      <td className="table__cell" data-label="Interview">
        <InterviewCell app={app} />
      </td>

      <td className="table__cell table__cell--notes" data-label="Notes">
        {app.notes ? (
          <span className="notes" title={app.notes}>
            {app.notes}
          </span>
        ) : (
          <NotSet />
        )}
      </td>

      <td className="table__cell table__cell--actions">
        <div className="row-actions">
          <button
            type="button"
            className="link-button"
            aria-label={`Edit ${name}`}
            onClick={() => onEdit(app)}
          >
            Edit
          </button>
          <button
            type="button"
            className="link-button link-button--danger"
            aria-label={`Delete ${name}`}
            onClick={() => onDelete(app)}
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}

export function ApplicationTable({ applications, ...handlers }: Props) {
  return (
    <table className="table">
      <colgroup>
        <col style={{ width: "24%" }} />
        <col style={{ width: "21%" }} />
        <col style={{ width: "11%" }} />
        <col style={{ width: "16%" }} />
        <col style={{ width: "18%" }} />
        <col style={{ width: "10%" }} />
      </colgroup>
      <thead className="table__head">
        <tr>
          <th scope="col" className="table__head-cell table__cell--first">
            Application
          </th>
          <th scope="col" className="table__head-cell">
            Status
          </th>
          <th scope="col" className="table__head-cell">
            Applied
          </th>
          <th scope="col" className="table__head-cell">
            Interview
          </th>
          <th scope="col" className="table__head-cell">
            Notes
          </th>
          <th scope="col" className="table__head-cell">
            <span className="sr-only">Actions</span>
          </th>
        </tr>
      </thead>
      <tbody className="table__body">
        {applications.map((app) => (
          <Row key={app.id} app={app} {...handlers} />
        ))}
      </tbody>
    </table>
  );
}
