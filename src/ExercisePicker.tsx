import { useState } from "react";
import type { State } from "./model";
import { ExerciseImage } from "./ui";
export function ExercisePicker({
  state,
  busy,
  onStart,
  onDetails,
  selected,
  onSelect,
}: {
  selected: string[];
  onSelect: (ids: string[]) => void;
  state: State;
  busy: boolean;
  onStart: (ids: string[]) => void;
  onDetails: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const visible = state.exercises.filter((e) =>
    e.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
  );
  return (
    <section className="exercise-picker">
      <div className="section-heading">
        <h2>What’s on today?</h2>
        <span>{state.exercises.length} exercises to choose from</span>
      </div>
      <p className="help">
        Tap to choose exercises. Your last selection is ready next time. Sets
        and weights are always adjustable.
      </p>
      <label className="exercise-search">
        Find an exercise
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your exercises…"
        />
      </label>
      <div className="picker-grid">
        {visible.map((e) => (
          <div
            className={`picker-card ${selected.includes(e.id) ? "chosen" : ""}`}
            key={e.id}
          >
            <button
              type="button"
              className="pick-exercise"
              aria-pressed={selected.includes(e.id)}
              onClick={() =>
                onSelect(
                  selected.includes(e.id)
                    ? selected.filter((id) => id !== e.id)
                    : [...selected, e.id],
                )
              }
            >
              <ExerciseImage src={e.image} name={e.name} />
              <span className="picker-name">
                {e.name}
                <small>{e.equipment}</small>
              </span>
              <span className="pick-check" aria-hidden="true">
                {selected.includes(e.id) ? "✓" : "+"}
              </span>
            </button>
            <button
              className="picker-details"
              onClick={() => onDetails(e.id)}
              aria-label={`Details for ${e.name}`}
            >
              View exercise
            </button>
          </div>
        ))}
      </div>
      {!visible.length && <p>No exercises match your search.</p>}
      <div className="selection-bar">
        <span>
          <strong>{selected.length}</strong> selected
        </span>
        <button
          className="text-button"
          disabled={!selected.length || busy}
          onClick={() => onSelect([])}
        >
          Clear
        </button>
        <button
          className="primary"
          disabled={!selected.length || busy}
          onClick={() => onStart(selected)}
        >
          Start workout
        </button>
      </div>
    </section>
  );
}
