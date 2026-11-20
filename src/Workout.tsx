import { useState, useEffect, useRef } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Flag,
  Plus,
  SkipForward,
  Trash2,
  X,
} from "lucide-react";
import {
  type State,
  type Session,
  type SessionExercise,
  type SetLog,
  finishedExercise,
  ready,
  nextWeight,
  newSet,
  previousReps,
  now,
  displayWeight,
  toKg,
  uid,
} from "./model";
import type { Change } from "./store";
import { Back, ExerciseImage, Stepper, formatDate } from "./ui";
export function Workout({
  session,
  state,
  change,
  busy,
  onBack,
  onDetails,
  onFinish,
  onDiscard,
  tick,
}: {
  session: Session;
  state: State;
  change: Change;
  busy: boolean;
  onBack: () => void;
  onDetails: (id: string) => void;
  onFinish: () => void;
  onDiscard: () => void;
  tick: number;
}) {
  const [opened, setOpened] = useState<string | null>(null);
  const [advanced, setAdvanced] = useState<string | null>(null);
  const [add, setAdd] = useState("");
  const previousFocus = useRef(session.focus);
  useEffect(() => {
    if (previousFocus.current !== session.focus) {
      previousFocus.current = session.focus;
      if (session.focus)
        document
          .getElementById(`exercise-${session.focus}`)
          ?.scrollIntoView({ block: "nearest", behavior: "instant" });
    }
  }, [session.focus]);
  const unit = state.settings.unit;
  const history = !!session.finishedAt;
  const total = session.exercises.reduce((n, e) => n + e.sets.length, 0);
  const completed = session.exercises.reduce(
    (n, e) => n + e.sets.filter((s) => s.done).length,
    0,
  );
  const current =
    opened ??
    session.focus ??
    session.exercises.find((e) => !finishedExercise(e))?.id;
  const edit = (fn: (s: Session) => void) =>
    change((state) => {
      const w = state.sessions.find((s) => s.id === session.id)!;
      fn(w);
      w.updatedAt = now();
    });
  function updateWeight(eid: string, weight: number | null) {
    return change((data) => {
      const w = data.sessions.find((s) => s.id === session.id)!;
      const exercise = w.exercises.find((e) => e.id === eid)!;
      exercise.sets.forEach((set) => {
        set.weight = weight;
      });
      exercise.target.weight = weight;
      w.updatedAt = now();
      if (!history) {
        const definition = data.exercises.find(
          (e) => e.id === exercise.exerciseId,
        )!;
        definition.weight = weight;
        definition.updatedAt = now();
      }
    });
  }

  function updateSet(eid: string, sid: string, fn: (s: SetLog) => void) {
    return edit((w) =>
      fn(
        w.exercises.find((e) => e.id === eid)!.sets.find((s) => s.id === sid)!,
      ),
    );
  }
  async function complete(e: SessionExercise, set: SetLog) {
    const ok = await edit((w) => {
      const ex = w.exercises.find((x) => x.id === e.id)!;
      const target = ex.sets.find((x) => x.id === set.id)!;
      if (!target.done && target.weight === null)
        throw new Error("Set a working weight before completing this set.");
      target.done = !target.done;
      if (!history && target.done) {
        w.restUntil = state.settings.restSeconds
          ? Date.now() + state.settings.restSeconds * 1000
          : null;
        if (finishedExercise(ex))
          w.focus = w.exercises.find((x) => !finishedExercise(x))?.id ?? null;
        else w.focus = ex.id;
      } else w.focus = ex.id;
    });
    if (ok) setOpened(null);
  }
  const rest = Math.max(0, Math.ceil(((session.restUntil ?? 0) - tick) / 1000));
  return (
    <>
      <Back onClick={onBack} label={history ? "History" : "Home"} />
      <header className="workout-header">
        <div>
          <p className="eyebrow">
            {history ? formatDate(session.finishedAt!) : "IN YOUR OWN TIME"}
          </p>
          <h1>{session.name}</h1>
          <p>
            {history
              ? "Your recorded session · tap any set to correct it"
              : `${completed} of ${total} sets logged · ${session.exercises.length} exercises`}
          </p>
        </div>
        <div
          className="progress-ring"
          style={{
            background: `conic-gradient(var(--accent) ${total ? (completed / total) * 100 : 0}%,var(--line) 0)`,
          }}
        >
          <span>
            {Math.round(total ? (completed / total) * 100 : 0)}
            <small>%</small>
          </span>
        </div>
      </header>
      <div className="workout-progress">
        <span style={{ width: `${total ? (completed / total) * 100 : 0}%` }} />
      </div>
      {rest > 0 && !history && (
        <div className="rest-timer">
          <Clock size={17} />
          <span>Take a breath</span>
          <b>
            {Math.floor(rest / 60)}:{String(rest % 60).padStart(2, "0")}
          </b>
          <button
            aria-label="Dismiss rest timer"
            onClick={() =>
              edit((w) => {
                w.restUntil = null;
              })
            }
          >
            <X size={17} />
          </button>
        </div>
      )}
      <div className="exercise-stack">
        {session.exercises.map((se, index) => {
          const e = state.exercises.find((x) => x.id === se.exerciseId)!;
          const open = current === se.id;
          const done = finishedExercise(se);
          const nextSet = se.sets.find((s) => !s.done);
          const previous = state.sessions
            .filter(
              (w) =>
                w.finishedAt &&
                w.id !== session.id &&
                w.startedAt < session.startedAt,
            )
            .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
            .map((w) =>
              w.exercises.find(
                (x) => x.exerciseId === e.id && x.sets.some((s) => s.done),
              ),
            )
            .find(Boolean);
          const suggested = ready(se) && e.weight === se.target.weight;
          const next = nextWeight(e);
          return (
            <article
              id={`exercise-${se.id}`}
              className={`exercise-card ${open ? "is-open" : ""} ${done ? "is-done" : ""}`}
              key={se.id}
            >
              <button
                className="exercise-card-head"
                onClick={() => {
                  const next = open ? null : se.id;
                  setOpened(next ?? "collapsed");
                  if (next && !history)
                    void edit((w) => {
                      w.focus = next;
                    });
                }}
              >
                <span className={`exercise-index ${done ? "done" : ""}`}>
                  {done ? (
                    <Check size={18} />
                  ) : (
                    String(index + 1).padStart(2, "0")
                  )}
                </span>
                <span>
                  <h2>{se.name}</h2>
                  {suggested && (
                    <span className="ready-label">Ready to progress ↗</span>
                  )}
                  <small>
                    {se.skipped
                      ? "Skipped"
                      : `${displayWeight(se.target.weight, unit)} ${unit} · ${se.target.sets} × ${se.target.min}–${se.target.max} ${e.id === "farmer-walk" ? "seconds" : "reps"}`}
                  </small>
                </span>
                <span className="exercise-count">
                  {se.sets.filter((s) => s.done).length}/{se.sets.length}
                </span>
                {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              </button>
              {open && (
                <div className="exercise-body">
                  <div className="exercise-intro">
                    <button
                      className="image-button"
                      onClick={() => onDetails(e.id)}
                      aria-label={`Details for ${e.name}`}
                    >
                      <ExerciseImage src={e.image} name={e.name} />
                    </button>
                    <div>
                      <button
                        className="text-button detail-link"
                        onClick={() => onDetails(e.id)}
                      >
                        Technique & progress <ChevronRight size={14} />
                      </button>
                      {e.cues.slice(0, 2).map((c) => (
                        <p className="cue" key={c}>
                          {c}
                        </p>
                      ))}
                      <p className="previous">
                        <span>
                          {previous ? "PREVIOUS SESSION" : "IMPORTED NOTE"}
                        </span>
                        {previous
                          ? previous.sets
                              .filter((s) => s.done && !s.warmup)
                              .map(
                                (s) =>
                                  `${displayWeight(s.weight, unit)} × ${s.reps}`,
                              )
                              .join(" / ")
                          : e.legacy
                            ? `${e.legacy.summary} · ${displayWeight(e.legacy.weight ?? null, unit)} ${unit} · date unknown`
                            : "No previous training recorded"}
                      </p>
                    </div>
                  </div>
                  {nextSet && (e.increment || e.weights.length > 0) ? (
                    <div className="quick-weight">
                      <span>
                        All sets · {displayWeight(nextSet.weight, unit)} {unit}
                      </span>
                      {[-1, 1].map((direction) => {
                        const weights = [...e.weights].sort((a, b) => a - b);
                        const currentWeight = nextSet.weight ?? 0;
                        const value = weights.length
                          ? direction > 0
                            ? weights.find((w) => w > currentWeight)
                            : weights.filter((w) => w < currentWeight).pop()
                          : Math.round(
                              (currentWeight + direction * (e.increment ?? 0)) *
                                1000,
                            ) / 1000;
                        return (
                          <button
                            key={direction}
                            aria-label={
                              direction > 0
                                ? "Increase exercise weight"
                                : "Decrease exercise weight"
                            }
                            disabled={busy || value === undefined || value < 0}
                            onClick={() => updateWeight(se.id, value!)}
                          >
                            {direction > 0 ? "+" : "−"}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                  <div className="set-list">
                    {se.sets.map((set, i) => {
                      const focused = set.id === nextSet?.id;
                      return (
                        <div
                          className={`set-row-wrap ${set.done ? "logged" : ""} ${focused ? "next-set" : ""}`}
                          key={set.id}
                        >
                          <div className="set-row">
                            <button
                              className="set-number"
                              aria-label={`Options for set ${i + 1}`}
                              onClick={() =>
                                setAdvanced(advanced === set.id ? null : set.id)
                              }
                            >
                              {set.warmup ? "W" : i + 1}
                              {set.issue && <Flag size={10} />}
                            </button>
                            <label className="weight-input">
                              <input
                                aria-label={`Weight for set ${i + 1}`}
                                type="text"
                                inputMode="decimal"
                                onInput={(ev) =>
                                  ev.currentTarget.setCustomValidity("")
                                }
                                key={`${set.id}-${set.weight}-${unit}`}
                                defaultValue={
                                  set.weight === null
                                    ? ""
                                    : displayWeight(set.weight, unit)
                                }
                                placeholder="—"
                                disabled={busy}
                                onBlur={(ev) => {
                                  const value = ev.currentTarget.value
                                    .trim()
                                    .replace(",", ".");
                                  if (
                                    value !== "" &&
                                    (!/^\d+(?:\.\d*)?$/.test(value) ||
                                      Number(value) > 100000)
                                  ) {
                                    ev.currentTarget.setCustomValidity(
                                      "Enter a weight between 0 and 100000, for example 7.5 or 7,5.",
                                    );
                                    ev.currentTarget.reportValidity();
                                    return;
                                  }
                                  const weight =
                                    value === ""
                                      ? null
                                      : toKg(Number(value), unit);
                                  if (
                                    value !==
                                      (set.weight === null
                                        ? ""
                                        : displayWeight(set.weight, unit)) &&
                                    weight !== set.weight
                                  )
                                    void updateWeight(se.id, weight);
                                }}
                              />
                              <span>{unit}</span>
                            </label>
                            <Stepper
                              label={
                                e.id === "farmer-walk" ? "seconds" : "reps"
                              }
                              value={set.reps}
                              disabled={busy}
                              onChange={(v) =>
                                updateSet(se.id, set.id, (s) => {
                                  s.reps = v;
                                })
                              }
                            />
                            <button
                              className={`complete-set ${set.done ? "completed" : ""}`}
                              aria-label={`${set.done ? "Reopen" : "Complete"} set ${i + 1}`}
                              disabled={busy}
                              onClick={() => complete(se, set)}
                            >
                              <Check size={23} />
                            </button>
                          </div>
                          {advanced === set.id && (
                            <div className="set-options">
                              <label>
                                <input
                                  type="checkbox"
                                  checked={set.warmup}
                                  disabled={busy}
                                  onChange={(ev) =>
                                    updateSet(se.id, set.id, (s) => {
                                      s.warmup = ev.target.checked;
                                    })
                                  }
                                />
                                Warm-up
                              </label>
                              <label>
                                <input
                                  type="checkbox"
                                  checked={set.issue}
                                  disabled={busy}
                                  onChange={(ev) =>
                                    updateSet(se.id, set.id, (s) => {
                                      s.issue = ev.target.checked;
                                    })
                                  }
                                />
                                Technique issue
                              </label>
                              <button
                                aria-label={`Remove set ${i + 1}`}
                                disabled={busy}
                                onClick={() => {
                                  if (
                                    !set.done ||
                                    confirm(
                                      "Remove this completed set? You can undo this.",
                                    )
                                  )
                                    void edit((w) => {
                                      const ex = w.exercises.find(
                                        (x) => x.id === se.id,
                                      )!;
                                      ex.sets = ex.sets.filter(
                                        (s) => s.id !== set.id,
                                      );
                                    });
                                }}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="set-actions">
                    <button
                      className="text-button"
                      disabled={busy || se.sets.length >= 50}
                      onClick={() =>
                        edit((w) => {
                          w.exercises
                            .find((x) => x.id === se.id)!
                            .sets.push(
                              newSet({ ...e, weight: se.target.weight }),
                            );
                        })
                      }
                    >
                      <Plus size={16} />
                      Add set
                    </button>
                    <button
                      className="text-button"
                      disabled={busy}
                      onClick={() =>
                        edit((w) => {
                          const ex = w.exercises.find((x) => x.id === se.id)!;
                          ex.skipped = !ex.skipped;
                          w.focus =
                            w.exercises.find((x) => !finishedExercise(x))?.id ??
                            null;
                          setOpened(null);
                        })
                      }
                    >
                      <SkipForward size={15} />
                      {se.skipped ? "Unskip" : "Skip"}
                    </button>
                    <span className="spacer" />
                    <button
                      aria-label={`Move ${se.name} up`}
                      disabled={index === 0 || busy}
                      onClick={() =>
                        edit((w) => {
                          [w.exercises[index - 1], w.exercises[index]] = [
                            w.exercises[index],
                            w.exercises[index - 1],
                          ];
                        })
                      }
                    >
                      <ArrowUp size={17} />
                    </button>
                    <button
                      aria-label={`Move ${se.name} down`}
                      disabled={index === session.exercises.length - 1 || busy}
                      onClick={() =>
                        edit((w) => {
                          [w.exercises[index], w.exercises[index + 1]] = [
                            w.exercises[index + 1],
                            w.exercises[index],
                          ];
                        })
                      }
                    >
                      <ArrowDown size={17} />
                    </button>
                  </div>
                  {suggested ? (
                    <div className="progression-ready">
                      <div>
                        <span className="eyebrow">READY TO PROGRESS</span>
                        <strong>
                          {next !== null
                            ? `${displayWeight(e.weight, unit)} → ${displayWeight(next, unit)} ${unit}`
                            : "All targets reached. Nice work."}
                        </strong>
                      </div>
                      {next !== null ? (
                        <>
                          <button
                            className="primary small"
                            disabled={busy}
                            onClick={() =>
                              change((s) => {
                                const target = s.exercises.find(
                                  (x) => x.id === e.id,
                                )!;
                                target.weight = next;
                                target.updatedAt = now();
                                target.weightHistory.push({
                                  date: now(),
                                  weight: next,
                                });
                              })
                            }
                          >
                            Increase next time
                          </button>
                          <button
                            className="text-button"
                            onClick={() => setOpened("collapsed")}
                          >
                            Keep weight
                          </button>
                        </>
                      ) : (
                        <button onClick={() => onDetails(e.id)}>
                          Set weight increment <ChevronRight size={16} />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="progress-target">
                      <span className="status-dot" />
                      {e.weight !== se.target.weight
                        ? "Your updated weight is saved for next time."
                        : `Build toward ${se.target.sets} × ${se.target.max} with clean technique.`}
                    </div>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
      {!history && (
        <>
          <div className="add-session-exercise">
            <select
              aria-label="Exercise to add to workout"
              value={add}
              onChange={(e) => setAdd(e.target.value)}
            >
              <option value="">Add an exercise from your library…</option>
              {state.exercises
                .filter(
                  (e) => !session.exercises.some((x) => x.exerciseId === e.id),
                )
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
            </select>
            <button
              disabled={!add || busy}
              onClick={async () => {
                const e = state.exercises.find((x) => x.id === add)!;
                if (
                  await edit((w) => {
                    w.exercises.push({
                      id: uid(),
                      exerciseId: e.id,
                      name: e.name,
                      target: {
                        sets: e.sets,
                        min: e.min,
                        max: e.max,
                        weight: e.weight,
                      },
                      sets: Array.from({ length: e.sets }, (_, i) =>
                        newSet(e, previousReps(e.id, state.sessions)[i]),
                      ),
                      skipped: false,
                    });
                  })
                )
                  setAdd("");
              }}
            >
              <Plus size={20} />
            </button>
          </div>
          <div className="workout-end">
            <button className="primary" disabled={busy} onClick={onFinish}>
              <Check size={20} />
              Finish workout
            </button>
            <button
              className="text-button muted"
              disabled={busy}
              onClick={onDiscard}
            >
              Discard workout
            </button>
          </div>
        </>
      )}
      {history && (
        <div className="workout-end">
          <p className="help">
            Corrections save immediately. Undo is available after each change.
          </p>
          <button
            className="text-button muted"
            disabled={busy}
            onClick={onDiscard}
          >
            <Trash2 size={16} />
            Delete workout
          </button>
        </div>
      )}
    </>
  );
}
