import { z } from "zod";

const referenceSchema = z.string().trim().min(1).max(40);
const taskPatchSchema = z.object({
  dueDate: z.string().trim().min(1).nullable().optional(),
  dueTime: z.string().trim().min(1).nullable().optional(),
  title: z.string().trim().min(1).max(280).optional(),
}).refine((patch) => Object.keys(patch).length > 0, "An update needs at least one changed field.");

export const sessionOperationSchema = z.discriminatedUnion("type", [
  z.object({
    ref: referenceSchema,
    task: z.object({
      dueDate: z.string().trim().min(1).optional(),
      dueTime: z.string().trim().min(1).optional(),
      title: z.string().trim().min(1).max(280),
    }),
    type: z.literal("create"),
  }),
  z.object({ ref: referenceSchema, patch: taskPatchSchema, type: z.literal("update") }),
  z.object({ ref: referenceSchema, type: z.literal("delete") }),
  z.object({ type: z.literal("clear") }),
  z.object({ type: z.literal("undo") }),
]);

export const sessionOperationsSchema = z.array(sessionOperationSchema).max(50);

export type SessionOperation = z.infer<typeof sessionOperationSchema>;

export type SessionDraftTask = {
  dueDate?: string;
  dueTime?: string;
  id: string;
  reference: string;
  title: string;
};

export type VoiceSessionDraft = {
  draftTasks: SessionDraftTask[];
  history: SessionDraftTask[][];
  id: string;
  operations: SessionOperation[];
  startedAt: string;
  transcript?: string;
};

export type SessionOperationError = {
  code: "duplicate_reference" | "invalid_date" | "invalid_time" | "missing_reference" | "nothing_to_undo";
  message: string;
};

export type ApplySessionOperationResult = {
  error?: SessionOperationError;
  session: VoiceSessionDraft;
};

export function createVoiceSession(id: string, startedAt: number): VoiceSessionDraft {
  return {
    draftTasks: [],
    history: [],
    id,
    operations: [],
    startedAt: new Date(startedAt).toISOString(),
  };
}

export function parseSessionOperations(value: unknown): SessionOperation[] {
  return sessionOperationsSchema.parse(value);
}

export function applySessionOperation(
  session: VoiceSessionDraft,
  operation: SessionOperation,
  now = new Date(),
): ApplySessionOperationResult {
  if (operation.type === "undo") {
    const previous = session.history.at(-1);
    if (!previous) return failed(session, "nothing_to_undo", "There is no session change to undo.");
    return {
      session: {
        ...session,
        draftTasks: cloneTasks(previous),
        history: session.history.slice(0, -1),
        operations: [...session.operations, operation],
      },
    };
  }

  const priorTasks = cloneTasks(session.draftTasks);
  let nextTasks: SessionDraftTask[];

  if (operation.type === "create") {
    if (session.draftTasks.some((task) => task.reference === operation.ref)) {
      return failed(session, "duplicate_reference", `Item ${operation.ref} already exists in this session.`);
    }
    const due = normalizeDueFields(operation.task, now);
    if ("error" in due) return { session, error: due.error };
    nextTasks = [
      ...session.draftTasks,
      {
        ...due.value,
        id: `draft-${session.id}-${operation.ref}`,
        reference: operation.ref,
        title: operation.task.title.trim(),
      },
    ];
  } else if (operation.type === "update") {
    const current = session.draftTasks.find((task) => task.reference === operation.ref);
    if (!current) return failed(session, "missing_reference", `Item ${operation.ref} is not in this session.`);
    const due = normalizeDueFields(operation.patch, now);
    if ("error" in due) return { session, error: due.error };
    nextTasks = session.draftTasks.map((task) =>
      task.reference === operation.ref
        ? {
            ...task,
            ...due.value,
            ...(operation.patch.title ? { title: operation.patch.title.trim() } : {}),
          }
        : task,
    );
  } else if (operation.type === "delete") {
    if (!session.draftTasks.some((task) => task.reference === operation.ref)) {
      return failed(session, "missing_reference", `Item ${operation.ref} is not in this session.`);
    }
    nextTasks = session.draftTasks.filter((task) => task.reference !== operation.ref);
  } else {
    nextTasks = [];
  }

  return {
    session: {
      ...session,
      draftTasks: nextTasks,
      history: [...session.history, priorTasks],
      operations: [...session.operations, operation],
    },
  };
}

function normalizeDueFields(
  fields: { dueDate?: string | null; dueTime?: string | null },
  now: Date,
): { value: Pick<SessionDraftTask, "dueDate" | "dueTime"> } | { error: SessionOperationError } {
  const result: Pick<SessionDraftTask, "dueDate" | "dueTime"> = {};
  if (fields.dueDate !== undefined) {
    if (fields.dueDate === null) result.dueDate = undefined;
    else {
      const date = normalizeDate(fields.dueDate, now);
      if (!date) return { error: { code: "invalid_date", message: "Use an ISO date, today, tomorrow, or a weekday." } };
      result.dueDate = date;
    }
  }
  if (fields.dueTime !== undefined) {
    if (fields.dueTime === null) result.dueTime = undefined;
    else {
      const time = normalizeTime(fields.dueTime);
      if (!time) return { error: { code: "invalid_time", message: "Use a time such as 3 PM or 15:00." } };
      result.dueTime = time;
    }
  }
  return { value: result };
}

function normalizeDate(value: string, now: Date): string | null {
  const normalized = value.trim().toLowerCase();
  if (normalized === "today") return toIsoDate(now);
  if (normalized === "tomorrow") return toIsoDate(addDays(now, 1));
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    const [year = Number.NaN, month = Number.NaN, day = Number.NaN] = normalized.split("-").map(Number);
    const parsed = new Date(year, month - 1, day);
    return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day ? normalized : null;
  }
  const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const target = weekdays.indexOf(normalized);
  if (target < 0) return null;
  const daysUntil = (target - now.getDay() + 7) % 7 || 7;
  return toIsoDate(addDays(now, daysUntil));
}

function normalizeTime(value: string): string | null {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, "");
  const twentyFourHour = /^(?:[01]\d|2[0-3]):[0-5]\d$/.exec(normalized);
  if (twentyFourHour) return normalized;
  const twelveHour = /^(1[0-2]|0?[1-9])(?::([0-5]\d))?(am|pm)$/.exec(normalized);
  if (!twelveHour) return null;
  const hour = Number(twelveHour[1]);
  const minute = twelveHour[2] ?? "00";
  const convertedHour = twelveHour[3] === "pm" ? (hour % 12) + 12 : hour % 12;
  return `${String(convertedHour).padStart(2, "0")}:${minute}`;
}

function toIsoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function cloneTasks(tasks: SessionDraftTask[]) {
  return tasks.map((task) => ({ ...task }));
}

function failed(
  session: VoiceSessionDraft,
  code: SessionOperationError["code"],
  message: string,
): ApplySessionOperationResult {
  return { error: { code, message }, session };
}
