import Dexie, { type Table } from "dexie";
import {
  type State,
  type Exercise,
  type Template,
  type Session,
  stateSchema,
} from "./model";
import { initialState } from "./seed";
export class RepDB extends Dexie {
  exercises!: Table<Exercise, string>;
  templates!: Table<Template, string>;
  sessions!: Table<Session, string>;
  meta!: Table<{ key: string; value: unknown }, string>;
  constructor(name = "reptrack-mom") {
    super(name);
    this.version(1).stores({
      exercises: "id",
      templates: "id",
      sessions: "id,startedAt",
      meta: "key",
    });
    this.version(2)
      .stores({
        exercises: "id",
        templates: "id",
        sessions: "id,startedAt,updatedAt",
        meta: "key",
      })
      .upgrade(async (tx) => {
        await tx
          .table("sessions")
          .toCollection()
          .modify((s) => {
            s.updatedAt ??= s.finishedAt ?? s.startedAt;
            s.focus ??= s.exercises?.[0]?.id ?? null;
            s.restUntil ??= null;
          });
      });
  }
  async read(): Promise<State> {
    return this.transaction("r", this.tables, async () => {
      const order = (await this.meta.get("order"))?.value as
        | { exercises: string[]; templates: string[]; sessions: string[] }
        | undefined;
      const defaults = initialState();
      const sort = <T extends { id: string }>(items: T[], ids: string[]) =>
        items.sort((a, b) => {
          const ai = ids.indexOf(a.id),
            bi = ids.indexOf(b.id);
          return (ai < 0 ? 1e9 : ai) - (bi < 0 ? 1e9 : bi);
        });
      return stateSchema.parse({
        exercises: sort(
          await this.exercises.toArray(),
          order?.exercises ?? defaults.exercises.map((x) => x.id),
        ),
        templates: sort(
          await this.templates.toArray(),
          order?.templates ?? ["full-body"],
        ),
        sessions: sort(await this.sessions.toArray(), order?.sessions ?? []),
        settings: (await this.meta.get("settings"))?.value,
      });
    });
  }
  async initialize() {
    await this.transaction("rw", this.tables, async () => {
      if (await this.meta.get("initialized")) return;
      if (
        (await this.exercises.count()) ||
        (await this.sessions.count()) ||
        (await this.templates.count())
      )
        throw new Error(
          "Existing data needs recovery. Defaults were not written.",
        );
      await this.replace(initialState());
      await this.meta.put({ key: "initialized", value: true });
    });
    return this.read();
  }
  async replace(state: State) {
    const s = validateState(state);
    await this.transaction("rw", this.tables, async () => {
      await Promise.all([
        this.exercises.clear(),
        this.templates.clear(),
        this.sessions.clear(),
      ]);
      await this.exercises.bulkPut(s.exercises);
      await this.templates.bulkPut(s.templates);
      await this.sessions.bulkPut(s.sessions);
      await this.meta.put({
        key: "order",
        value: {
          exercises: s.exercises.map((x) => x.id),
          templates: s.templates.map((x) => x.id),
          sessions: s.sessions.map((x) => x.id),
        },
      });
      await this.meta.put({ key: "settings", value: s.settings });
      await this.meta.put({ key: "initialized", value: true });
    });
  }
}
export function validateState(value: unknown): State {
  const s = stateSchema.parse(value);
  for (const list of [s.exercises, s.templates, s.sessions])
    if (new Set(list.map((x) => x.id)).size !== list.length)
      throw new Error("Duplicate record IDs");
  const ids = new Set(s.exercises.map((e) => e.id));
  for (const t of s.templates) {
    if (
      new Set(t.exerciseIds).size !== t.exerciseIds.length ||
      t.exerciseIds.some((id) => !ids.has(id))
    )
      throw new Error("Invalid template exercise references");
  }
  if (s.sessions.filter((x) => !x.finishedAt).length > 1)
    throw new Error("Backup contains multiple active workouts");
  for (const session of s.sessions) {
    if (
      new Set(session.exercises.map((e) => e.id)).size !==
      session.exercises.length
    )
      throw new Error("Duplicate session exercise IDs");
    for (const e of session.exercises) {
      if (
        !ids.has(e.exerciseId) ||
        new Set(e.sets.map((x) => x.id)).size !== e.sets.length
      )
        throw new Error("Invalid workout records");
    }
  }
  return s;
}
export const db = new RepDB();
