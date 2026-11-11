import { SORT_LABEL, type SortKey } from "../lib/filter";

interface Props {
  query: string;
  onQuery: (value: string) => void;
  sort: SortKey;
  onSort: (value: SortKey) => void;
  shown: number;
  total: number;
}

export function Toolbar({ query, onQuery, sort, onSort, shown, total }: Props) {
  return (
    <div className="toolbar">
      <input
        className="input toolbar__search"
        type="search"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        placeholder="Search company, title or notes"
        aria-label="Search applications"
      />
      <p className="toolbar__summary" aria-live="polite">
        {shown === total
          ? `${total} ${total === 1 ? "application" : "applications"}`
          : `Showing ${shown} of ${total}`}
      </p>
      <label className="toolbar__sort">
        <span className="toolbar__sort-label">Sort by</span>
        <select
          className="select select--compact"
          value={sort}
          onChange={(e) => onSort(e.target.value as SortKey)}
        >
          {(Object.keys(SORT_LABEL) as SortKey[]).map((key) => (
            <option key={key} value={key}>
              {SORT_LABEL[key]}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
