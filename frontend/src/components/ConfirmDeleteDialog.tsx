import { useEffect, useRef, useState } from "react";
import type { Application } from "../types";
import { errorMessage } from "../hooks/useApplications";

interface Props {
  application: Application;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}

export function ConfirmDeleteDialog({ application, onCancel, onConfirm }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  async function handleConfirm() {
    setDeleting(true);
    setError("");
    try {
      await onConfirm();
    } catch (err) {
      setError(errorMessage(err));
      setDeleting(false);
    }
  }

  return (
    <dialog
      ref={ref}
      className="dialog dialog--narrow"
      aria-labelledby="delete-dialog-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!deleting) onCancel();
      }}
      onClick={(e) => {
        if (e.target === ref.current && !deleting) onCancel();
      }}
    >
      <div className="form">
        <h2 id="delete-dialog-title" className="dialog__title">
          Delete {application.company}?
        </h2>
        <p className="muted">
          This removes your application for {application.jobTitle}, including its notes. You can't
          undo this.
        </p>

        {error && (
          <p className="form__error" role="alert">
            {error}
          </p>
        )}

        <div className="form__actions">
          <button type="button" className="button" onClick={onCancel} disabled={deleting} autoFocus>
            Keep application
          </button>
          <button
            type="button"
            className="button button--danger"
            onClick={handleConfirm}
            disabled={deleting}
          >
            {deleting ? "Deleting…" : "Delete application"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
