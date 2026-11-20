import { ExercisePicker } from "./ExercisePicker";
import { useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Dumbbell,
  History,
  House,
  Settings2,
  ShieldCheck,
  Undo2,
  WifiOff,
  X,
} from "lucide-react";
import { useStore } from "./store";
import { type Session, newSession, now } from "./model";
import { PageTitle, formatDate } from "./ui";
import { Workout } from "./Workout";
import { ExerciseDetails } from "./ExerciseDetails";
import { Settings } from "./Settings";
export default function App() {
  const store = useStore();
  const { state, error, setError, busy, change } = store;
  const [chosen, setChosen] = useState<string[] | null>(null);
  const [page, setPage] = useState("home");
  const [showUndo, setShowUndo] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [tick, setTick] = useState(Date.now());
  const {
    needRefresh: [updateAvailable],
    offlineReady: [offlineReady],
    updateServiceWorker,
  } = useRegisterSW();
  useEffect(() => {
    setShowUndo(!!store.undoKey);
    const timer = setTimeout(() => setShowUndo(false), 4500);
    return () => clearTimeout(timer);
  }, [store.undoKey]);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    const timer = setInterval(() => setTick(Date.now()), 1000);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    if (state && !restored) {
      const active = state.sessions.find((s) => !s.finishedAt);
      if (active) setSessionId(active.id);
      setRestored(true);
    }
  }, [state, restored]);
  if (!state)
    return (
      <main className="loading">
        <Dumbbell size={36} />
        <h1>
          RepTrack<span>®</span>
        </h1>
        <p>{error || "Getting your training ready…"}</p>
        {error && <button onClick={() => location.reload()}>Try again</button>}
      </main>
    );
  const active = state.sessions.find((s) => !s.finishedAt);
  const session = state.sessions.find((s) => s.id === sessionId);
  const completed = state.sessions
    .filter((s) => s.finishedAt)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const last = completed[0];
  const exercise = state.exercises.find((e) => e.id === detail);
  async function start(ids: string[]) {
    if (active) {
      setSessionId(active.id);
      return;
    }
    if (!ids.length) return;
    const template = {
      id: "full-body",
      name: "Full body",
      subtitle: "Your exercises, your pace",
      exerciseIds: ids,
      updatedAt: now(),
    };
    const workout = newSession(template, state!.exercises, state!.sessions);
    if (
      await change((s) => {
        if (s.sessions.some((w) => !w.finishedAt))
          throw new Error("A workout is already active. Resume it from Home.");
        s.templates = [template];
        s.sessions.push(workout);
      })
    )
      setSessionId(workout.id);
  }
  async function finish(sesh: Session) {
    const logged = sesh.exercises.reduce(
      (n, e) => n + e.sets.filter((s) => s.done).length,
      0,
    );
    if (!logged) {
      setError(
        "Log at least one set before finishing, or discard this workout.",
      );
      return;
    }
    const incomplete = sesh.exercises.some(
      (e) => !e.skipped && e.sets.some((s) => !s.done),
    );
    if (
      incomplete &&
      !confirm(
        "Finish this workout? Only completed sets will count. Unfinished sets remain uncompleted in history.",
      )
    )
      return;
    const ok = await change((s) => {
      const w = s.sessions.find((x) => x.id === sesh.id)!;
      w.finishedAt = now();
      w.updatedAt = now();
      w.restUntil = null;
    });
    if (ok) {
      setSessionId(null);
      setPage("history");
    }
  }
  return (
    <div className="app-shell">
      <aside className="desktop-sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setSessionId(null);
            setDetail(null);
            setPage("home");
          }}
        >
          <span className="brand-mark">
            <Dumbbell size={22} />
          </span>
          RepTrack<span className="brand-dot">.</span>
        </a>
        <div className="sidebar-label">YOUR TRAINING SPACE</div>
        <nav>
          {[
            ["home", "Overview", House],
            ["history", "History", History],
            ["settings", "Settings", Settings2],
          ].map(([key, label, Icon]) => (
            <button
              key={String(key)}
              className={!session && !detail && page === key ? "selected" : ""}
              onClick={() => {
                setPage(String(key));
                setSessionId(null);
                setDetail(null);
              }}
            >
              {<Icon size={20} />}
              <span>{String(label)}</span>
              {page === key && !session && !detail && (
                <span className="nav-dot" />
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="small-symbol">
            <Dumbbell size={19} />
          </div>
          <p>
            One set at a time.<span>A little stronger, every session.</span>
          </p>
          <div className="local-label">
            <span className="status-dot" />
            Local-first. Always yours.
          </div>
        </div>
      </aside>
      <main className="main-content">
        <div className="topbar">
          <span className="mobile-brand">
            <Dumbbell size={18} />
            RepTrack<span className="brand-dot">.</span>
          </span>
          <span className="desktop-date">
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </span>
          <span className="save-status">
            {busy ? (
              "Saving…"
            ) : error ? (
              "Action failed · see message"
            ) : (
              <>
                <span className="status-dot" />
                {online ? "Saved on this device" : "Offline · saved locally"}
              </>
            )}
          </span>
        </div>
        {error && (
          <div className="notice error" role="alert">
            {error}
            <button aria-label="Dismiss error" onClick={() => setError("")}>
              <X size={17} />
            </button>
          </div>
        )}
        {!online && (
          <div className="offline">
            <WifiOff size={14} /> Offline mode · keep training
          </div>
        )}
        {updateAvailable && !active && (
          <div className="notice">
            An app update is ready.
            <button onClick={() => updateServiceWorker(true)}>
              Update now
            </button>
          </div>
        )}
        {exercise ? (
          <ExerciseDetails
            exercise={exercise}
            state={state}
            change={change}
            busy={busy}
            onBack={() => setDetail(null)}
            onError={setError}
          />
        ) : session ? (
          <Workout
            key={session.id}
            session={session}
            state={state}
            change={change}
            busy={busy}
            onBack={() => {
              setPage(session.finishedAt ? "history" : "home");
              setSessionId(null);
            }}
            onDetails={setDetail}
            onFinish={() => finish(session)}
            onDiscard={async () => {
              if (
                confirm(
                  session.finishedAt
                    ? "Delete this workout from your history? You can undo this action."
                    : "Discard this unfinished workout? You can undo this action.",
                )
              ) {
                if (
                  await change((s) => {
                    s.sessions = s.sessions.filter((x) => x.id !== session.id);
                  })
                ) {
                  setPage(session.finishedAt ? "history" : "home");
                  setSessionId(null);
                }
              }
            }}
            tick={tick}
          />
        ) : page === "home" ? (
          <>
            <PageTitle
              eyebrow="A LITTLE TIME FOR YOU"
              title="Your workout. Your way."
            >
              <p>
                Choose what feels right for today. One full-body session, at
                your pace.
              </p>
            </PageTitle>
            {active && (
              <button
                className="resume-banner"
                onClick={() => setSessionId(active.id)}
              >
                <span className="pulse" />
                <span>
                  <strong>Pick up where you left off</strong>
                  <small>
                    {active.name} ·{" "}
                    {active.exercises.reduce(
                      (n, e) => n + e.sets.filter((s) => s.done).length,
                      0,
                    )}{" "}
                    sets logged
                  </small>
                </span>
                <span className="resume-label">Resume workout</span>
                <ArrowRight size={22} />
              </button>
            )}
            {!active && (
              <ExercisePicker
                state={state}
                busy={busy}
                selected={chosen ?? state.templates[0]?.exerciseIds ?? []}
                onSelect={setChosen}
                onStart={start}
                onDetails={setDetail}
              />
            )}
            <div className="home-lower">
              <section className="panel last-session">
                <div className="section-heading">
                  <h2>Last time you showed up</h2>
                  <History size={17} />
                </div>
                {last ? (
                  <button
                    className="history-preview"
                    onClick={() => setSessionId(last.id)}
                  >
                    <div className="session-badge">
                      <Check size={22} />
                    </div>
                    <div>
                      <strong>{last.name}</strong>
                      <small>
                        {formatDate(last.finishedAt!)} ·{" "}
                        {last.exercises.reduce(
                          (n, e) => n + e.sets.filter((s) => s.done).length,
                          0,
                        )}{" "}
                        sets completed
                      </small>
                    </div>
                    <ChevronRight size={19} />
                  </button>
                ) : (
                  <div className="empty-inline">
                    <span className="session-badge">
                      <Dumbbell size={22} />
                    </span>
                    <div>
                      <strong>A fresh start. A familiar routine.</strong>
                      <p>Your first completed workout will appear here.</p>
                    </div>
                  </div>
                )}
              </section>
            </div>
            <div className="quiet-note">
              <ShieldCheck size={16} />
              <span>
                Your training stays on this device. Export a backup to keep a
                copy safe.
              </span>
              <button onClick={() => setPage("settings")}>
                Manage data <ArrowUpRight size={14} />
              </button>
            </div>
          </>
        ) : page === "history" ? (
          <>
            <PageTitle
              eyebrow="EVERY SESSION COUNTS"
              title="Your training, recorded."
            >
              <p>Small steps add up. Here’s the work you’ve put in.</p>
            </PageTitle>
            <div className="history-summary">
              <span>
                <b>{completed.length}</b> workouts
              </span>
              <span>
                <b>
                  {completed.reduce(
                    (n, w) =>
                      n +
                      w.exercises.reduce(
                        (a, e) => a + e.sets.filter((s) => s.done).length,
                        0,
                      ),
                    0,
                  )}
                </b>{" "}
                sets logged
              </span>
            </div>
            {!completed.length ? (
              <div className="empty-state">
                <History size={36} />
                <h2>Your story starts with one set.</h2>
                <p>
                  Finish a workout to see it here. Imported notes stay in each
                  exercise’s details.
                </p>
                <button className="primary" onClick={() => setPage("home")}>
                  Choose a workout <ArrowRight size={18} />
                </button>
              </div>
            ) : (
              <div className="history-list">
                {completed.map((s) => (
                  <button
                    key={s.id}
                    className="panel history-preview"
                    onClick={() => setSessionId(s.id)}
                  >
                    <span className="session-badge">{s.name[0]}</span>
                    <span>
                      <strong>{s.name}</strong>
                      <small>
                        {formatDate(s.finishedAt!)} ·{" "}
                        {s.exercises.reduce(
                          (n, e) => n + e.sets.filter((x) => x.done).length,
                          0,
                        )}{" "}
                        completed sets
                      </small>
                    </span>
                    <ChevronRight size={20} />
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <Settings
            state={state}
            change={change}
            busy={busy}
            onExercise={setDetail}
            onError={setError}
            offlineReady={offlineReady}
          />
        )}
      </main>
      {store.undo && showUndo && (
        <div className="undo-toast">
          <Check size={15} />
          <span>Change saved</span>
          <button onClick={store.undo} disabled={busy}>
            <Undo2 size={15} />
            Undo
          </button>
        </div>
      )}
      {!session && !detail && (
        <nav className="mobile-nav">
          {[
            ["home", "Home", House],
            ["history", "History", History],
            ["settings", "Settings", Settings2],
          ].map(([key, label, Icon]) => (
            <button
              className={page === key ? "selected" : ""}
              key={String(key)}
              onClick={() => setPage(String(key))}
            >
              {<Icon size={21} />}
              <span>{String(label)}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
