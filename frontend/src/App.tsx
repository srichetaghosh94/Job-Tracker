import { useCallback, useMemo, useState } from "react";
import { isMockMode } from "./api";
import { errorMessage, useApplications } from "./hooks/useApplications";
import { applyView, countByStage, type SortKey } from "./lib/filter";
import { todayString } from "./lib/dates";
import type { StageKey } from "./lib/stages";
import type { Application, ApplicationInput, Status } from "./types";
import { ApplicationDialog } from "./components/ApplicationDialog";
import { ApplicationTable } from "./components/ApplicationTable";
import { ConfirmDeleteDialog } from "./components/ConfirmDeleteDialog";
import { EmptyState } from "./components/EmptyState";
import { Hero } from "./components/Hero";
import { StageRail } from "./components/StageRail";
import { Toast, type ToastMessage } from "./components/Toast";
import { Toolbar } from "./components/Toolbar";

type Editing = Application | "new" | null;

export default function App() {
  const { applications, state, error, reload, create, update, remove } = useApplications();

  const [query, setQuery] = useState("");
  const [stage, setStage] = useState<StageKey | null>(null);
  const [sort, setSort] = useState<SortKey>("recent");

  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<Application | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const notify = useCallback((text: string, tone: ToastMessage["tone"] = "info") => {
    setToast({ id: Date.now(), text, tone });
  }, []);
  const dismissToast = useCallback(() => setToast(null), []);

  const counts = useMemo(() => countByStage(applications), [applications]);
  const visible = useMemo(
    () => applyView(applications, { query, stage, sort }),
    [applications, query, stage, sort],
  );

  const clearFilters = () => {
    setQuery("");
    setStage(null);
  };

  async function handleSave(input: ApplicationInput) {
    if (editing === "new") {
      await create(input);
      notify("Application added");
    } else if (editing) {
      await update(editing.id, input);
      notify("Changes saved");
    }
    setEditing(null);
  }

  async function handleStatusChange(app: Application, status: Status) {
    const { id: _id, ...rest } = app;
    // Moving off the wishlist needs a date, so default it to today.
    const applicationDate =
      app.applicationDate || (status === "wishlist" ? "" : todayString());
    try {
      await update(app.id, { ...rest, status, applicationDate });
      notify("Status updated");
    } catch (err) {
      notify(errorMessage(err), "error");
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    await remove(deleting.id);
    setDeleting(null);
    notify("Application deleted");
  }

  return (
    <div className="page">
      <header className="topbar">
        <span className="wordmark">Job tracker</span>
        <button type="button" className="button button--primary" onClick={() => setEditing("new")}>
          Add application
        </button>
      </header>

      <main>
        {state === "loading" && (
          <p className="status-note" aria-busy="true">
            Loading applications…
          </p>
        )}

        {state === "error" && (
          <EmptyState
            title="Couldn't load your applications"
            text={error}
            actionLabel="Try again"
            onAction={reload}
          />
        )}

        {state === "ready" && (
          <>
            <Hero applications={applications} />

            {applications.length === 0 ? (
              <EmptyState
                title="No applications yet"
                text="Add the jobs you've applied to, or save ones you want to apply to later."
                actionLabel="Add application"
                onAction={() => setEditing("new")}
                primary
              />
            ) : (
              <>
                <StageRail counts={counts} selected={stage} onSelect={setStage} />
                <Toolbar
                  query={query}
                  onQuery={setQuery}
                  sort={sort}
                  onSort={setSort}
                  shown={visible.length}
                  total={applications.length}
                />
                {visible.length > 0 ? (
                  <ApplicationTable
                    applications={visible}
                    onEdit={setEditing}
                    onDelete={setDeleting}
                    onStatusChange={handleStatusChange}
                  />
                ) : (
                  <EmptyState
                    title="No applications match"
                    text="Try a different search, or clear the stage filter."
                    actionLabel="Clear search and filter"
                    onAction={clearFilters}
                  />
                )}
              </>
            )}
          </>
        )}
      </main>

      {isMockMode && (
        <footer className="footnote">Sample data, saved in this browser only.</footer>
      )}

      {editing !== null && (
        <ApplicationDialog
          application={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
      )}

      {deleting && (
        <ConfirmDeleteDialog
          application={deleting}
          onCancel={() => setDeleting(null)}
          onConfirm={handleDelete}
        />
      )}

      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  );
}
