import { z } from "zod";
const number = z.number().finite().min(0).max(100000);
const id = z.string().min(1).max(200);
const date = z.string().datetime();
export const exerciseSchema = z
  .object({
    id,
    name: z.string().min(1).max(150),
    equipment: z.string().max(100),
    image: z
      .string()
      .max(4000000)
      .refine(
        (s) =>
          /^\/exercises\/[\w-]+\.svg$/.test(s) ||
          /^data:image\/(png|jpeg|webp);base64,/.test(s),
      ),
    weight: number.nullable(),
    sets: z.number().int().min(1).max(20),
    min: z.number().int().min(1).max(100),
    max: z.number().int().min(1).max(100),
    increment: number.nullable(),
    weights: z.array(number).max(200),
    convention: z.enum([
      "unconfirmed",
      "total",
      "per dumbbell",
      "plates per side",
    ]),
    cues: z.array(z.string().max(300)).max(20),
    mistakes: z.array(z.string().max(300)).max(20),
    legacy: z
      .object({
        summary: z.string(),
        date: date.nullable(),
        weight: number.nullable().optional(),
      })
      .nullable(),
    weightHistory: z.array(z.object({ date, weight: number.nullable() })),
    updatedAt: date,
  })
  .refine((e) => e.min <= e.max, "Minimum reps must not exceed maximum reps");
export type Exercise = z.infer<typeof exerciseSchema>;
export const setSchema = z.object({
  id,
  weight: number.nullable(),
  reps: z.number().int().min(0).max(100),
  done: z.boolean(),
  warmup: z.boolean(),
  issue: z.boolean(),
});
export type SetLog = z.infer<typeof setSchema>;
export const sessionExerciseSchema = z.object({
  id,
  exerciseId: id,
  name: z.string(),
  target: z.object({
    sets: z.number().int().min(1).max(20),
    min: number,
    max: number,
    weight: number.nullable(),
  }),
  sets: z.array(setSchema).max(50),
  skipped: z.boolean(),
});
export type SessionExercise = z.infer<typeof sessionExerciseSchema>;
export const sessionSchema = z.object({
  id,
  templateId: id,
  name: z.string(),
  startedAt: date,
  finishedAt: date.nullable(),
  exercises: z.array(sessionExerciseSchema).max(100),
  focus: z.string().nullable(),
  restUntil: z.number().nullable(),
  updatedAt: date,
});
export type Session = z.infer<typeof sessionSchema>;
export const templateSchema = z.object({
  id,
  name: z.string().min(1).max(100),
  subtitle: z.string().max(200),
  exerciseIds: z.array(id).max(100),
  updatedAt: date,
});
export type Template = z.infer<typeof templateSchema>;
export const settingsSchema = z.object({
  unit: z.enum(["kg", "lb"]),
  restSeconds: z.number().int().min(0).max(600),
  rotation: z.boolean(),
  rotationIndex: z.number().int().min(0).max(7),
  lastExport: date.nullable(),
});
export type Settings = z.infer<typeof settingsSchema>;
export const stateSchema = z.object({
  exercises: z.array(exerciseSchema).max(1000),
  templates: z.array(templateSchema).max(100),
  sessions: z.array(sessionSchema).max(100000),
  settings: settingsSchema,
});
export type State = z.infer<typeof stateSchema>;
export const uid = () => crypto.randomUUID();
export const now = () => new Date().toISOString();
export const rotation = [
  "push",
  "pull",
  "push",
  "legs",
  "pull",
  "push",
  "pull",
  "legs",
];
// Use the latest completed workout in which this exercise was actually logged.
// Match working-set positions so warm-ups and unfinished sets do not shift reps.
export function previousReps(
  exerciseId: string,
  sessions: Session[],
): (number | undefined)[] {
  const previous = [...sessions]
    .filter((s) => s.finishedAt)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .flatMap((s) => s.exercises.filter((e) => e.exerciseId === exerciseId))
    .find((e) => !e.skipped && e.sets.some((set) => set.done && !set.warmup));
  return (
    previous?.sets
      .filter((set) => !set.warmup)
      .map((set) => (set.done ? set.reps : undefined)) ?? []
  );
}
export function newSet(e: Exercise, reps = e.max): SetLog {
  return {
    id: uid(),
    weight: e.weight,
    reps,
    done: false,
    warmup: false,
    issue: false,
  };
}
export function newSession(
  t: Template,
  exercises: Exercise[],
  sessions: Session[] = [],
): Session {
  const items = t.exerciseIds
    .map((id) => exercises.find((e) => e.id === id))
    .filter((e): e is Exercise => !!e)
    .map((e) => ({
      id: uid(),
      exerciseId: e.id,
      name: e.name,
      target: { sets: e.sets, min: e.min, max: e.max, weight: e.weight },
      sets: Array.from({ length: e.sets }, (_, i) =>
        newSet(e, previousReps(e.id, sessions)[i]),
      ),
      skipped: false,
    }));
  return {
    id: uid(),
    templateId: t.id,
    name: t.name,
    startedAt: now(),
    finishedAt: null,
    exercises: items,
    focus: items[0]?.id ?? null,
    restUntil: null,
    updatedAt: now(),
  };
}
export function ready(e: SessionExercise) {
  const work = e.sets.filter((s) => !s.warmup);
  return (
    !e.skipped &&
    work.length >= e.target.sets &&
    work.every(
      (s) =>
        s.done &&
        !s.issue &&
        s.weight !== null &&
        s.weight === e.target.weight &&
        s.reps >= e.target.max,
    )
  );
}
export function nextWeight(e: Exercise) {
  if (e.weight === null) return null;
  if (e.weights.length)
    return (
      [...e.weights].sort((a, b) => a - b).find((w) => w > e.weight!) ?? null
    );
  return e.increment && e.increment > 0
    ? Math.round((e.weight + e.increment) * 1000) / 1000
    : null;
}
export const finishedExercise = (e: SessionExercise) =>
  e.skipped || (e.sets.length > 0 && e.sets.every((s) => s.done));
export const displayWeight = (kg: number | null, unit: Settings["unit"]) =>
  kg === null
    ? "—"
    : Number((kg * (unit === "lb" ? 2.2046226218 : 1)).toFixed(2)).toString();
export const toKg = (value: number, unit: Settings["unit"]) =>
  value / (unit === "lb" ? 2.2046226218 : 1);
