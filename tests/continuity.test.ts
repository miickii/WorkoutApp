import { describe, expect, it } from "vitest";
import { initialState } from "../src/seed";
import { newSession, newSet, previousReps } from "../src/model";

function fixture() {
  const state = initialState();
  const e = state.exercises[0];
  const template = { ...state.templates[0], exerciseIds: [e.id] };
  const old = newSession(template, state.exercises);
  old.startedAt = "2026-01-01T10:00:00.000Z";
  old.finishedAt = "2026-01-01T11:00:00.000Z";
  old.exercises[0].sets.forEach((s, i) => {
    s.reps = [11, 9, 7][i];
    s.done = true;
    s.issue = true;
  });
  return { state, e, template, old };
}
describe("rep continuity", () => {
  it("prefills each set from the latest exercise performance across workout types, without copying completion or weight", () => {
    const { state, e, template, old } = fixture();
    const recent = structuredClone(old);
    recent.startedAt = "2026-02-01T10:00:00.000Z";
    recent.finishedAt = "2026-02-01T11:00:00.000Z";
    recent.templateId = "another-routine";
    recent.exercises[0].sets[1].reps = 10;
    const before = JSON.stringify([old, recent]);
    const next = newSession(template, state.exercises, [recent, old]);
    expect(next.exercises[0].sets.map((s) => s.reps)).toEqual([11, 10, 7]);
    expect(
      next.exercises[0].sets.every(
        (s) => !s.done && !s.warmup && !s.issue && s.weight === e.weight,
      ),
    ).toBe(true);
    expect(next.exercises[0].sets[0].id).not.toBe(
      recent.exercises[0].sets[0].id,
    );
    expect(JSON.stringify([old, recent])).toBe(before);
  });
  it("ignores active, skipped and entirely unlogged appearances", () => {
    const { e, old } = fixture();
    const active = structuredClone(old);
    active.finishedAt = null;
    const skipped = structuredClone(old);
    skipped.exercises[0].skipped = true;
    const unlogged = structuredClone(old);
    unlogged.exercises[0].sets.forEach((s) => (s.done = false));
    for (const s of [active, skipped, unlogged])
      s.startedAt = "2026-03-01T10:00:00.000Z";
    expect(previousReps(e.id, [active, skipped, unlogged, old])).toEqual([
      11, 9, 7,
    ]);
  });
  it("ignores warmups and uses targets for unfinished or additional set positions", () => {
    const { state, e, template, old } = fixture();
    old.exercises[0].sets.unshift({
      ...newSet(e, 30),
      warmup: true,
      done: true,
    });
    old.exercises[0].sets[2].done = false;
    e.sets = 4;
    expect(
      newSession(template, state.exercises, [old]).exercises[0].sets.map(
        (s) => s.reps,
      ),
    ).toEqual([11, e.max, 7, e.max]);
    expect(
      newSession(template, state.exercises).exercises[0].sets.map(
        (s) => s.reps,
      ),
    ).toEqual([e.max, e.max, e.max, e.max]);
  });
  it("uses history corrections and falls back after deletion", () => {
    const { state, e, template, old } = fixture();
    old.exercises[0].sets[0].reps = 6;
    expect(
      newSession(template, state.exercises, [old]).exercises[0].sets[0].reps,
    ).toBe(6);
    expect(
      newSession(template, state.exercises, []).exercises[0].sets[0].reps,
    ).toBe(e.max);
  });
});
