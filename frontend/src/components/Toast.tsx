import { useEffect } from "react";

export interface ToastMessage {
  id: number;
  text: string;
  tone: "info" | "error";
}

interface Props {
  toast: ToastMessage | null;
  onDismiss: () => void;
}

export function Toast({ toast, onDismiss }: Props) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onDismiss, toast.tone === "error" ? 7000 : 3500);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  // The live region stays in the page so screen readers announce new messages.
  return (
    <div className="toast-region" role="status" aria-live="polite">
      {toast && (
        <div key={toast.id} className={`toast toast--${toast.tone}`}>
          <span>{toast.text}</span>
          <button type="button" className="toast__close" onClick={onDismiss}>
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
