import { useEffect, useRef, useState } from "react";
import { liveQuery } from "dexie";
import { db } from "./db";
import { type State } from "./model";
export function useStore() {
  const [state, setState] = useState<State | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [undo, setUndo] = useState<{ before: State; after: string } | null>(
    null,
  );
  const lock = useRef(false);
  useEffect(() => {
    let dead = false;
    let sub: { unsubscribe: () => void } | undefined;
    db.initialize()
      .then(() => {
        if (!dead)
          sub = liveQuery(() => db.read()).subscribe({
            next: setState,
            error: (e) => setError(`Could not read your data: ${String(e)}`),
          });
      })
      .catch((e) =>
        setError(
          `Could not open your workout data: ${String(e)}. Your existing data has not been reset.`,
        ),
      );
    return () => {
      dead = true;
      sub?.unsubscribe();
    };
  }, []);
  async function change(fn: (s: State) => void, allowUndo = true) {
    if (lock.current) return false;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      let before!: State;
      let after!: State;
      await db.transaction("rw", db.tables, async () => {
        before = await db.read();
        after = structuredClone(before);
        fn(after);
        await db.replace(after);
      });
      setState(after);
      setUndo(allowUndo ? { before, after: JSON.stringify(after) } : null);
      return true;
    } catch (e) {
      setError(
        `Could not save. Your change was not applied. ${e instanceof Error ? e.message : String(e)}`,
      );
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function undoChange() {
    if (!undo) return;
    await change((s) => {
      if (JSON.stringify(s) !== undo.after)
        throw new Error(
          "Data changed since that action. Please edit the record directly.",
        );
      Object.assign(s, undo.before);
    }, false);
  }
  return {
    state,
    error,
    setError,
    busy,
    change,
    undoKey: undo?.after,
    undo: undo ? undoChange : null,
  };
}
export type Change = (
  fn: (s: State) => void,
  allowUndo?: boolean,
) => Promise<boolean>;
