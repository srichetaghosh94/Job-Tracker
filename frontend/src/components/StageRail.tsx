import { STAGES, type StageKey } from "../lib/stages";

interface Props {
  counts: Record<StageKey, number>;
  selected: StageKey | null;
  onSelect: (stage: StageKey | null) => void;
}

/**
 * The pipeline as one strip. Segment width follows how many applications sit
 * in that stage, and each segment filters the list below it.
 */
export function StageRail({ counts, selected, onSelect }: Props) {
  return (
    <div
      className="rail"
      role="group"
      aria-label="Filter by stage"
      data-filtered={selected !== null}
    >
      {STAGES.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          className={`rail__segment rail__segment--${key}`}
          style={{ flexGrow: Math.max(counts[key], 0.6) }}
          aria-pressed={selected === key}
          onClick={() => onSelect(selected === key ? null : key)}
        >
          <span className="rail__count">{counts[key]}</span>
          <span className="rail__label">{label}</span>
        </button>
      ))}
    </div>
  );
}
