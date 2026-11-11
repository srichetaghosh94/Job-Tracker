interface Props {
  title: string;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
  primary?: boolean;
}

export function EmptyState({ title, text, actionLabel, onAction, primary }: Props) {
  return (
    <div className="empty">
      <h2 className="empty__title">{title}</h2>
      <p className="empty__text">{text}</p>
      {actionLabel && onAction && (
        <div className="empty__action">
          <button
            type="button"
            className={primary ? "button button--primary" : "button"}
            onClick={onAction}
          >
            {actionLabel}
          </button>
        </div>
      )}
    </div>
  );
}
