import type { Status } from "../types";
import { PROGRESS_STEPS, isClosed, progressIndex } from "../lib/stages";

/**
 * Four small bars showing how far an application has got. Purely visual:
 * the status select next to it carries the meaning for assistive tech.
 */
export function StageTrack({ status }: { status: Status }) {
  const reached = progressIndex(status);
  return (
    <span className="track" data-closed={isClosed(status)} aria-hidden="true">
      {PROGRESS_STEPS.map((step, i) => (
        <span key={step} className="track__pip" data-stage={step} data-on={i <= reached} />
      ))}
    </span>
  );
}
