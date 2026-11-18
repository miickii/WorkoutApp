import { useState } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  ImagePlus,
  Settings2,
} from "lucide-react";
import {
  type Exercise,
  type State,
  displayWeight,
  toKg,
  now,
  nextWeight,
  ready,
} from "./model";
import type { Change } from "./store";
import { Back, ExerciseImage, formatDate } from "./ui";
export function ExerciseDetails({
  exercise: e,
  state,
  change,
  busy,
  onBack,
  onError,
}: {
  exercise: Exercise;
  state: State;
  change: Change;
  busy: boolean;
  onBack: () => void;
  onError: (s: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const unit = state.settings.unit;
  const history = state.sessions
    .filter(
      (s) =>
        s.finishedAt &&
        s.exercises.some(
          (x) => x.exerciseId === e.id && x.sets.some((s) => s.done),
        ),
    )
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const sessions = history.map((s) => ({
    date: s.finishedAt!,
    exercise: s.exercises.find((x) => x.exerciseId === e.id)!,
  }));
  const best = sessions.flatMap((s) =>
    s.exercise.sets.filter((x) => x.done && !x.warmup && x.weight !== null),
  );
  const pr = best.length ? Math.max(...best.map((s) => s.weight!)) : null;
  const canProgress =
    sessions[0] &&
    ready(sessions[0].exercise) &&
    sessions[0].exercise.target.weight === e.weight;
  const next = nextWeight(e);
  const points = [...sessions]
    .reverse()
    .slice(-12)
    .map((s) => ({
      date: s.date,
      weight: s.exercise.sets.find((x) => x.done && !x.warmup)?.weight ?? 0,
    }));
  const max = Math.max(...points.map((x) => x.weight), 1);
  const min = Math.min(...points.map((x) => x.weight), 0);
  async function save(form: HTMLFormElement) {
    const data = new FormData(form);
    const weight = String(data.get("weight"));
    const inc = String(data.get("increment"));
    const weightsText = String(data.get("weights"));
    const values =
      weightsText === e.weights.map((w) => displayWeight(w, unit)).join(", ")
        ? e.weights
        : weightsText
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
            .map((x) => toKg(Number(x), unit));
    const ok = await change((s) => {
      const item = s.exercises.find((x) => x.id === e.id)!;
      const w =
        weight === (e.weight === null ? "" : displayWeight(e.weight, unit))
          ? e.weight
          : weight === ""
            ? null
            : toKg(Number(weight), unit);
      if (item.weight !== w)
        item.weightHistory.push({ date: now(), weight: w });
      Object.assign(item, {
        name: String(data.get("name")).trim(),
        equipment: String(data.get("equipment")),
        weight: w,
        sets: Number(data.get("sets")),
        min: Number(data.get("min")),
        max: Number(data.get("max")),
        increment:
          inc === (e.increment === null ? "" : displayWeight(e.increment, unit))
            ? e.increment
            : inc === ""
              ? null
              : toKg(Number(inc), unit),
        weights: values,
        convention: String(data.get("convention")),
        cues: String(data.get("cues")).split("\n").filter(Boolean),
        mistakes: String(data.get("mistakes")).split("\n").filter(Boolean),
        updatedAt: now(),
      });
    });
    if (ok) setEditing(false);
  }
  async function imageFile(file?: File) {
    if (!file) return;
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 2_500_000
    ) {
      onError("Choose a PNG, JPEG, or WebP smaller than 2.5 MB.");
      return;
    }
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      await change((s) => {
        const x = s.exercises.find((x) => x.id === e.id)!;
        x.image = data;
        x.updatedAt = now();
      });
    } catch {
      onError("Could not read that image.");
    }
  }
  return (
    <div className="detail-page">
      <Back onClick={onBack} />
      <header className="detail-header">
        <div>
          <p className="eyebrow">{e.equipment}</p>
          <h1>{e.name}</h1>
        </div>
        <button
          className="icon-button"
          aria-label="Edit exercise settings"
          onClick={() => setEditing(!editing)}
        >
          <Settings2 size={21} />
        </button>
      </header>
      <ExerciseImage src={e.image} name={e.name} large />
      <div className="detail-stats">
        <div>
          <span>WORKING WEIGHT</span>
          <b>
            {displayWeight(e.weight, unit)} <small>{unit}</small>
          </b>
        </div>
        <div>
          <span>YOUR TARGET</span>
          <b>
            {e.sets}{" "}
            <small>
              × {e.min}–{e.max}
            </small>
          </b>
        </div>
        <div>
          <span>BEST LOGGED</span>
          <b>
            {displayWeight(pr, unit)} <small>{unit}</small>
          </b>
        </div>
      </div>
      {e.convention === "unconfirmed" && (
        <p className="help">
          Weight convention unconfirmed. Original numbers are preserved; set
          total, per dumbbell, or plates per side below.
        </p>
      )}
      {canProgress && (
        <div className="progression-ready">
          <div>
            <p className="eyebrow">READY TO PROGRESS</p>
            <strong>
              {next === null
                ? "Configure your next weight below."
                : `${displayWeight(e.weight, unit)} → ${displayWeight(next, unit)} ${unit}`}
            </strong>
          </div>
          {next !== null ? (
            <button
              className="primary small"
              disabled={busy}
              onClick={() =>
                change((s) => {
                  const ex = s.exercises.find((x) => x.id === e.id)!;
                  ex.weight = next;
                  ex.updatedAt = now();
                  ex.weightHistory.push({ date: now(), weight: next });
                })
              }
            >
              Increase next time <ArrowUpRight size={16} />
            </button>
          ) : (
            <button onClick={() => setEditing(true)}>
              Configure increment
            </button>
          )}
        </div>
      )}
      <div className="detail-columns">
        <section className="panel">
          <p className="eyebrow">MAKE EVERY REP COUNT</p>
          <h2>Technique notes</h2>
          <ul className="cue-list">
            {e.cues.map((c, i) => (
              <li key={i}>
                <Check size={16} />
                {c}
              </li>
            ))}
          </ul>
          <details>
            <summary>
              Common mistakes <ChevronDown size={16} />
            </summary>
            <ul>
              {e.mistakes.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          </details>
        </section>
        <section className="panel">
          <p className="eyebrow">DOUBLE PROGRESSION</p>
          <h2>Reps first. Then weight.</h2>
          <p>
            Work toward {e.sets} clean sets of {e.max} at{" "}
            {displayWeight(e.weight, unit)} {unit}. Warm-ups and sets with
            technique issues never qualify.
          </p>
          <p className="help">
            {next === null
              ? "Set your available weights or increment to get an exact increase suggestion."
              : `Next configured weight: ${displayWeight(next, unit)} ${unit}. You always confirm the increase.`}
          </p>
        </section>
      </div>
      <section className="panel progress-chart">
        <div className="section-heading">
          <h2>Working weight</h2>
          <span>
            LAST {points.length} SESSIONS · {unit.toUpperCase()}
          </span>
        </div>
        {points.length > 1 ? (
          <>
            <svg
              viewBox="0 0 600 140"
              role="img"
              aria-label="Working weight by completed session"
            >
              <line x1="15" y1="120" x2="585" y2="120" stroke="var(--line)" />
              <polyline
                fill="none"
                stroke="var(--accent)"
                strokeWidth="3"
                points={points
                  .map(
                    (p, i) =>
                      `${15 + (i / (points.length - 1)) * 570},${120 - ((p.weight - min) / (max - min || 1)) * 100}`,
                  )
                  .join(" ")}
              />
              {points.map((p, i) => (
                <circle
                  key={i}
                  cx={15 + (i / (points.length - 1)) * 570}
                  cy={120 - ((p.weight - min) / (max - min || 1)) * 100}
                  r="4"
                  fill="var(--accent)"
                >
                  <title>
                    {formatDate(p.date)}: {displayWeight(p.weight, unit)} {unit}
                  </title>
                </circle>
              ))}
            </svg>
            <div className="chart-labels">
              <span>{formatDate(points[0].date)}</span>
              <span>{formatDate(points[points.length - 1].date)}</span>
            </div>
          </>
        ) : (
          <p className="help">
            Your weight trend appears after two recorded sessions.
          </p>
        )}
      </section>
      <section className="panel">
        <div className="section-heading">
          <h2>Previous performance</h2>
          <span>{sessions.length} RECORDED SESSIONS</span>
        </div>
        {sessions.map((s, i) => (
          <div className="performance-row" key={i}>
            <span>{formatDate(s.date)}</span>
            <strong>
              {s.exercise.sets
                .filter((x) => x.done)
                .map(
                  (x) =>
                    `${displayWeight(x.weight, unit)} × ${x.reps}${x.warmup ? " W" : ""}${x.issue ? " ⚑" : ""}`,
                )
                .join(" / ")}
            </strong>
          </div>
        ))}
        {e.legacy && (
          <div className="legacy-note">
            <span className="tag">IMPORTED SUMMARY · DATE UNKNOWN</span>
            <p>
              {e.legacy.summary} ·{" "}
              {displayWeight(e.legacy.weight ?? null, unit)} {unit}
            </p>
            <small>
              From your original training notes. Not verified individual set
              records.
            </small>
          </div>
        )}
      </section>
      <section className="panel exercise-settings">
        <button
          className="settings-disclosure"
          onClick={() => setEditing(!editing)}
        >
          <span>
            <Settings2 size={19} />
            Exercise settings
          </span>
          <ChevronDown size={18} />
        </button>
        {editing && (
          <form
            key={e.updatedAt}
            onSubmit={(ev) => {
              ev.preventDefault();
              void save(ev.currentTarget);
            }}
          >
            <div className="form-grid">
              <label className="full">
                Exercise name
                <input
                  name="name"
                  defaultValue={e.name}
                  required
                  maxLength={150}
                />
              </label>
              <label className="full">
                Equipment
                <input
                  name="equipment"
                  defaultValue={e.equipment}
                  maxLength={100}
                />
              </label>
              <label>
                Working weight ({unit})
                <input
                  name="weight"
                  type="number"
                  step="any"
                  min="0"
                  defaultValue={
                    e.weight === null ? "" : displayWeight(e.weight, unit)
                  }
                />
              </label>
              <label>
                Weight convention
                <select name="convention" defaultValue={e.convention}>
                  <option value="unconfirmed">Unconfirmed</option>
                  <option value="total">Total weight</option>
                  <option value="per dumbbell">Per dumbbell</option>
                  <option value="plates per side">Plates per side</option>
                </select>
              </label>
              <label>
                Target sets
                <input
                  name="sets"
                  type="number"
                  min="1"
                  max="20"
                  defaultValue={e.sets}
                  required
                />
              </label>
              <label>
                Minimum {e.id === "farmer-walk" ? "seconds" : "reps"}
                <input
                  name="min"
                  type="number"
                  min="1"
                  max="100"
                  defaultValue={e.min}
                  required
                />
              </label>
              <label>
                Maximum {e.id === "farmer-walk" ? "seconds" : "reps"}
                <input
                  name="max"
                  type="number"
                  min="1"
                  max="100"
                  defaultValue={e.max}
                  required
                />
              </label>
              <label>
                Weight increment ({unit})
                <input
                  name="increment"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Not configured"
                  defaultValue={
                    e.increment === null ? "" : displayWeight(e.increment, unit)
                  }
                />
              </label>
              <label className="full">
                Available weights ({unit}, separated by commas)
                <input
                  name="weights"
                  defaultValue={e.weights
                    .map((w) => displayWeight(w, unit))
                    .join(", ")}
                  placeholder="e.g. 39, 41.3, 43.6"
                />
                <small>This list takes priority over the increment.</small>
              </label>
              <label className="full">
                Technique cues (one per line)
                <textarea
                  name="cues"
                  rows={3}
                  defaultValue={e.cues.join("\n")}
                />
              </label>
              <label className="full">
                Mistakes to avoid (one per line)
                <textarea
                  name="mistakes"
                  rows={2}
                  defaultValue={e.mistakes.join("\n")}
                />
              </label>
            </div>
            <button className="primary" disabled={busy}>
              Save exercise settings
            </button>
            <p className="help">
              Changes apply to future workouts. Existing sessions keep their
              recorded targets.
            </p>
          </form>
        )}
        <div className="image-settings">
          <label className="upload-button">
            <ImagePlus size={17} />
            Replace exercise picture
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(ev) => imageFile(ev.target.files?.[0])}
            />
          </label>
          <p className="help">
            PNG, JPEG, or WebP · up to 2.5 MB · stored offline
          </p>
          <label>
            Or choose a bundled illustration
            <select
              value={e.image.startsWith("/exercises/") ? e.image : ""}
              onChange={(ev) => {
                if (ev.target.value)
                  void change((s) => {
                    const x = s.exercises.find((x) => x.id === e.id)!;
                    x.image = ev.target.value;
                    x.updatedAt = now();
                  });
              }}
            >
              <option value="">Custom image</option>
              {[
                "incline",
                "bench",
                "chest",
                "shoulder",
                "lateral",
                "triceps",
                "extension",
                "pulldown",
                "row",
                "rear",
                "curl",
                "hammer",
                "seated-curl",
                "calf",
                "leg-press",
                "leg-extension",
                "adduction",
                "prone-curl",
                "crunch",
              ].map((id) => (
                <option key={id} value={`/exercises/${id}.svg`}>
                  {id.replaceAll("-", " ")}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>
    </div>
  );
}
