import { useEffect, useRef, useState, type FormEvent } from "react";
import { STATUSES, type Application, type ApplicationInput, type Status } from "../types";
import { STATUS_LABEL } from "../lib/stages";
import { todayString } from "../lib/dates";
import { errorMessage } from "../hooks/useApplications";

interface Props {
  /** The application being edited, or null to add a new one. */
  application: Application | null;
  onClose: () => void;
  onSave: (input: ApplicationInput) => Promise<void>;
}

type FieldName = "company" | "jobTitle" | "applicationDate" | "jobUrl";
type Errors = Partial<Record<FieldName, string>>;

function normaliseUrl(raw: string): string {
  const value = raw.trim();
  if (!value) return "";
  // Let people paste "example.com/job" without typing the scheme.
  return /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function ApplicationDialog({ application, onClose, onSave }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const isEdit = application !== null;

  const [company, setCompany] = useState(application?.company ?? "");
  const [jobTitle, setJobTitle] = useState(application?.jobTitle ?? "");
  const [status, setStatus] = useState<Status>(application?.status ?? "applied");
  const [applicationDate, setApplicationDate] = useState(
    application ? application.applicationDate : todayString(),
  );
  const [interviewDate, setInterviewDate] = useState(application?.interviewDate ?? "");
  const [jobUrl, setJobUrl] = useState(application?.jobUrl ?? "");
  const [notes, setNotes] = useState(application?.notes ?? "");

  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  function validate(url: string): Errors {
    const next: Errors = {};
    if (!company.trim()) next.company = "Enter the company name.";
    if (!jobTitle.trim()) next.jobTitle = "Enter the job title.";
    if (!applicationDate && status !== "wishlist") {
      next.applicationDate = "Enter the date you applied.";
    }
    if (url && !isHttpUrl(url)) {
      next.jobUrl = "Enter a web address that starts with http:// or https://.";
    }
    return next;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const url = normaliseUrl(jobUrl);
    const found = validate(url);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    setSubmitError("");
    try {
      await onSave({
        company: company.trim(),
        jobTitle: jobTitle.trim(),
        status,
        applicationDate,
        interviewDate,
        jobUrl: url,
        notes: notes.trim(),
      });
    } catch (err) {
      setSubmitError(errorMessage(err));
      setSaving(false);
    }
  }

  const describe = (name: FieldName) => (errors[name] ? `${name}-error` : undefined);

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby="application-dialog-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!saving) onClose();
      }}
      onClick={(e) => {
        // The form fills the dialog, so a click on the dialog itself is a click on the backdrop.
        if (e.target === ref.current && !saving) onClose();
      }}
    >
      <form className="form" onSubmit={handleSubmit} noValidate>
        <h2 id="application-dialog-title" className="dialog__title">
          {isEdit ? "Edit application" : "Add application"}
        </h2>

        <div className="form__grid">
          <div className="field">
            <label className="field__label" htmlFor="company">
              Company
            </label>
            <input
              id="company"
              className="input"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              aria-invalid={Boolean(errors.company)}
              aria-describedby={describe("company")}
              autoComplete="organization"
              autoFocus
            />
            {errors.company && (
              <p id="company-error" className="field__error">
                {errors.company}
              </p>
            )}
          </div>

          <div className="field">
            <label className="field__label" htmlFor="jobTitle">
              Job title
            </label>
            <input
              id="jobTitle"
              className="input"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              aria-invalid={Boolean(errors.jobTitle)}
              aria-describedby={describe("jobTitle")}
              autoComplete="off"
            />
            {errors.jobTitle && (
              <p id="jobTitle-error" className="field__error">
                {errors.jobTitle}
              </p>
            )}
          </div>

          <div className="field">
            <label className="field__label" htmlFor="status">
              Status
            </label>
            <select
              id="status"
              className="select"
              value={status}
              onChange={(e) => setStatus(e.target.value as Status)}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="field__label" htmlFor="applicationDate">
              Application date
            </label>
            <input
              id="applicationDate"
              className="input"
              type="date"
              value={applicationDate}
              onChange={(e) => setApplicationDate(e.target.value)}
              aria-invalid={Boolean(errors.applicationDate)}
              aria-describedby={describe("applicationDate")}
            />
            {errors.applicationDate ? (
              <p id="applicationDate-error" className="field__error">
                {errors.applicationDate}
              </p>
            ) : (
              status === "wishlist" && (
                <p className="field__hint">Optional while the job is on your wishlist.</p>
              )
            )}
          </div>

          <div className="field">
            <label className="field__label" htmlFor="interviewDate">
              Interview date and time
            </label>
            <input
              id="interviewDate"
              className="input"
              type="datetime-local"
              value={interviewDate}
              onChange={(e) => setInterviewDate(e.target.value)}
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="jobUrl">
              Job posting link
            </label>
            <input
              id="jobUrl"
              className="input"
              type="text"
              inputMode="url"
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
              aria-invalid={Boolean(errors.jobUrl)}
              aria-describedby={describe("jobUrl")}
              autoComplete="off"
              placeholder="https://"
            />
            {errors.jobUrl && (
              <p id="jobUrl-error" className="field__error">
                {errors.jobUrl}
              </p>
            )}
          </div>

          <div className="field field--wide">
            <label className="field__label" htmlFor="notes">
              Notes
            </label>
            <textarea
              id="notes"
              className="input input--area"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        {submitError && (
          <p className="form__error" role="alert">
            {submitError}
          </p>
        )}

        <div className="form__actions">
          <button type="button" className="button" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="button button--primary" disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save changes" : "Add application"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
