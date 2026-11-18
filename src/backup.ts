import { z } from "zod";
import { stateSchema, type State, now } from "./model";
import { validateState } from "./db";
const schema = z.object({
  app: z.literal("RepTrack Mom"),
  version: z.literal(1),
  exportedAt: z.string().datetime(),
  data: stateSchema,
});
export const makeBackup = (data: State) =>
  JSON.stringify(
    {
      app: "RepTrack Mom",
      version: 1,
      exportedAt: now(),
      data: validateState(data),
    },
    null,
    2,
  );
export function parseBackup(text: string) {
  if (text.length > 30_000_000) throw new Error("Backup exceeds 30 MB");
  return validateState(schema.parse(JSON.parse(text)).data);
}
export function mergeBackup(current: State, incoming: State): State {
  const merge = <T extends { id: string }>(a: T[], b: T[]) => [
    ...a,
    ...b.filter((x) => !a.some((y) => y.id === x.id)),
  ];
  const result = {
    exercises: merge(current.exercises, incoming.exercises),
    templates: merge(current.templates, incoming.templates),
    sessions: merge(current.sessions, incoming.sessions),
    settings: current.settings,
  };
  return validateState(result);
}
