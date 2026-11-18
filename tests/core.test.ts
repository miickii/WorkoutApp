import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { initialState } from "../src/seed";
import { RepDB, validateState } from "../src/db";
import { newSession } from "../src/model";
import { makeBackup, parseBackup } from "../src/backup";
describe("separate full-body edition", () => {
  it("includes all 27 illustrated exercises without inherited workouts or weights", () => {
    const s = initialState();
    expect(s.exercises).toHaveLength(27);
    expect(new Set(s.exercises.map((e) => e.name)).size).toBe(27);
    for (const e of s.exercises) {
      expect(existsSync(`public${e.image}`)).toBe(true);
      expect(e.legacy).toBeNull();
      expect(e.weight === null || e.weight === 0).toBe(true);
    }
    expect(s.templates).toHaveLength(1);
    expect(s.settings.rotation).toBe(false);
    expect(s.sessions).toHaveLength(0);
    expect(validateState(s)).toEqual(s);
  });
  it("creates a session containing only selected exercises, in selection order", () => {
    const s = initialState();
    const ids = [s.exercises[4].id, s.exercises[0].id];
    const session = newSession(
      { ...s.templates[0], exerciseIds: ids },
      s.exercises,
    );
    expect(session.exercises.map((e) => e.exerciseId)).toEqual(ids);
  });
  it("uses an independent database and backup identity", async () => {
    const db = new RepDB();
    expect(db.name).toBe("reptrack-mom");
    await db.initialize();
    expect((await db.read()).exercises).toHaveLength(27);
    const backup = makeBackup(initialState());
    expect(parseBackup(backup).exercises).toHaveLength(27);
    expect(() =>
      parseBackup(backup.replace("RepTrack Mom", "RepTrack")),
    ).toThrow();
    await db.delete();
  });
});
