import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  Download,
  Plus,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import { type State, type Exercise, uid, now, displayWeight } from "./model";
import type { Change } from "./store";
import { PageTitle, formatDate } from "./ui";
import { makeBackup, parseBackup, mergeBackup } from "./backup";
import { db } from "./db";
export function Settings({
  state,
  change,
  busy,
  onExercise,
  onError,
  offlineReady,
}: {
  state: State;
  change: Change;
  busy: boolean;
  onExercise: (id: string) => void;
  onError: (s: string) => void;
  offlineReady: boolean;
}) {
  const [imported, setImported] = useState<State | null>(null);
  const [status, setStatus] = useState("");
  const unit = state.settings.unit;
  async function exportData() {
    try {
      const current = await db.read();
      const blob = new Blob([makeBackup(current)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reptrack-mom-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      await change((s) => {
        s.settings.lastExport = now();
      }, false);
      setStatus(
        "Backup download requested. Save the file to Files or another location outside this browser.",
      );
    } catch (e) {
      onError(`Could not export your data: ${String(e)}`);
    }
  }
  async function readImport(file?: File) {
    if (!file) return;
    try {
      if (file.size > 30_000_000) throw new Error("File exceeds 30 MB");
      setImported(parseBackup(await file.text()));
      setStatus("");
    } catch (e) {
      onError(
        `Backup rejected. No data was changed. ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }
  async function applyImport(mode: "merge" | "restore") {
    if (!imported) return;
    if (
      !confirm(
        mode === "restore"
          ? "Replace ALL current app data with this backup? Export your current data first."
          : "Merge this backup? Existing records with the same ID stay unchanged; only new records will be added.",
      )
    )
      return;
    const incoming = imported;
    const ok = await change(
      (s) =>
        Object.assign(
          s,
          mode === "restore" ? incoming : mergeBackup(s, incoming),
        ),
      false,
    );
    if (ok) {
      setImported(null);
      setStatus(
        `${mode === "restore" ? "Restored" : "Merged"} successfully. All data was validated before applying.`,
      );
    }
  }
  async function createExercise(form: HTMLFormElement) {
    const data = new FormData(form);
    const id = uid();
    const e: Exercise = {
      id,
      name: String(data.get("name")).trim(),
      equipment: "Custom exercise",
      image: "/exercises/custom.svg",
      weight: null,
      sets: 3,
      min: 8,
      max: 12,
      increment: null,
      weights: [],
      convention: "unconfirmed",
      cues: [],
      mistakes: [],
      legacy: null,
      weightHistory: [],
      updatedAt: now(),
    };
    if (
      await change((s) => {
        s.exercises.push(e);
      })
    )
      onExercise(id);
  }
  return (
    <>
      <PageTitle eyebrow="MAKE IT YOURS" title="A routine that fits you.">
        <p>Fine-tune your training. Keep your data in your hands.</p>
      </PageTitle>
      <div className="settings-columns">
        <div>
          <section className="panel">
            <h2>Training preferences</h2>
            <label className="setting-row">
              <span>
                <strong>Weight unit</strong>
                <small>Converts display values; history is preserved.</small>
              </span>
              <select
                aria-label="Weight unit"
                value={unit}
                disabled={busy}
                onChange={(e) =>
                  change((s) => {
                    s.settings.unit = e.target.value as "kg" | "lb";
                  })
                }
              >
                <option value="kg">kg</option>
                <option value="lb">lb</option>
              </select>
            </label>
            <label className="setting-row">
              <span>
                <strong>Rest timer</strong>
                <small>Starts quietly after completing a set.</small>
              </span>
              <select
                aria-label="Rest timer"
                value={state.settings.restSeconds}
                disabled={busy}
                onChange={(e) =>
                  change((s) => {
                    s.settings.restSeconds = Number(e.target.value);
                  })
                }
              >
                {[
                  0,
                  30,
                  60,
                  90,
                  120,
                  180,
                  300,
                  ...(![0, 30, 60, 90, 120, 180, 300].includes(
                    state.settings.restSeconds,
                  )
                    ? [state.settings.restSeconds]
                    : []),
                ].map((n) => (
                  <option key={n} value={n}>
                    {n ? `${n}s` : "Off"}
                  </option>
                ))}
              </select>
            </label>
          </section>
        </div>
        <div>
          <section className="panel backup-panel">
            <span className="backup-icon">
              <ShieldCheck size={25} />
            </span>
            <h2>Your progress is worth keeping.</h2>
            <p>
              Training is saved on this device. Browser storage can be cleared,
              so keep a backup somewhere safe.
            </p>
            <div className="backup-status">
              <span className="status-dot" />
              <span>
                {state.settings.lastExport
                  ? `Last export requested ${formatDate(state.settings.lastExport)}`
                  : "No backup exported yet"}
              </span>
            </div>
            <button className="primary" onClick={exportData} disabled={busy}>
              <Download size={18} />
              Export all data
            </button>
            <label className="upload-button">
              <Upload size={17} />
              Import a backup
              <input
                type="file"
                accept=".json,application/json"
                onChange={(e) => {
                  void readImport(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
            {imported && (
              <div className="import-review">
                <h3>Backup ready for review</h3>
                <p>
                  {imported.exercises.length} exercises ·{" "}
                  {imported.templates.length} templates ·{" "}
                  {imported.sessions.length} sessions
                </p>
                <p>
                  Merge adds only new IDs and preserves existing records.
                  Restore replaces everything.
                </p>
                <button disabled={busy} onClick={() => applyImport("merge")}>
                  Merge new records
                </button>
                <button
                  className="danger"
                  disabled={busy}
                  onClick={() => applyImport("restore")}
                >
                  Restore and replace all
                </button>
                <button onClick={() => setImported(null)}>Cancel</button>
              </div>
            )}
            {status && (
              <p className="success" role="status">
                {status}
              </p>
            )}
            <p className="help">
              Cloud backup is not connected. An export request does not verify
              that a file was saved externally.
            </p>
          </section>
          <section className="panel install-panel">
            <p className="eyebrow">MADE FOR YOUR IPHONE</p>
            <h2>Your gym companion.</h2>
            <p>
              Open RepTrack Mom in Safari. Tap Share, then{" "}
              <strong>Add to Home Screen</strong>.
            </p>
            <div className="backup-status">
              <span className="status-dot" />
              {offlineReady || navigator.serviceWorker?.controller
                ? "App shell ready for offline use"
                : "Offline installation becomes ready after the first production load"}
            </div>
            <p className="help">
              Keep using the same web address so your local workout data stays
              in the same place.
            </p>
            <button
              className="text-button"
              onClick={async () => {
                const granted = await navigator.storage?.persist?.();
                setStatus(
                  granted
                    ? "Persistent storage granted. Still keep external backups."
                    : "Persistent storage was not granted by this browser. Keep external backups.",
                );
              }}
            >
              Request persistent storage
            </button>
          </section>
        </div>
      </div>
      <section className="panel library">
        <div className="section-heading">
          <h2>Exercise library</h2>
          <span>{state.exercises.length} EXERCISES</span>
        </div>
        <div className="library-grid">
          {state.exercises.map((e) => (
            <button
              className="library-item"
              key={e.id}
              onClick={() => onExercise(e.id)}
            >
              <span>
                <strong>{e.name}</strong>
                <small>
                  {displayWeight(e.weight, unit)} {unit} · {e.sets} × {e.min}–
                  {e.max}
                </small>
              </span>
              <ChevronRight size={17} />
            </button>
          ))}
        </div>
        <form
          className="inline-form"
          onSubmit={(e) => {
            e.preventDefault();
            void createExercise(e.currentTarget);
          }}
        >
          <input
            name="name"
            aria-label="New exercise name"
            placeholder="Create a new exercise"
            maxLength={150}
            required
          />
          <button disabled={busy}>
            <Plus size={18} />
            Add
          </button>
        </form>
      </section>
      <p className="app-version">REPTRACK MOM 1.0 · BUILT FOR THE LONG RUN</p>
    </>
  );
}
