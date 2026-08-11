import { parseSessionOperations, type SessionOperation } from "./sessionOperations";

const ordinalReferences: Record<string, string> = {
  first: "1",
  second: "2",
  third: "3",
  fourth: "4",
  fifth: "5",
};

const weekdayPattern = "sunday|monday|tuesday|wednesday|thursday|friday|saturday";
const timePattern = "(?:[01]?\\d|2[0-3])(?::[0-5]\\d)?(?:\\s?(?:am|pm))?";

export class TranscriptInterpretationError extends Error {}

type DraftTaskReference = {
  reference: string;
  title: string;
};

const taskStarterPattern = "call|buy|get|book|schedule|send|email|message|reply|pay|pick(?:\\s+up)?|bring|remind|plan|finish|prepare|review|update|check|order|meet|write|submit|make";
const taskBoundaryPattern = new RegExp(
  `(?:[,;]\\s*(?:(?:and|then|also)\\s+)?|\\b(?:and|then|also)\\s+)(?=(?:please\\s+)?(?:${taskStarterPattern})\\b)`,
  "i",
);

/**
 * A deliberately narrow V0 interpreter for direct task phrases. Its output still goes
 * through Zod before it can reach the session reducer, so a future model adapter can
 * replace this function without changing the safety boundary.
 */
export function interpretTranscript(
  transcript: string,
  firstReference = 1,
  draftTasks: readonly DraftTaskReference[] = [],
): SessionOperation[] {
  const utterances = splitTaskPhrases(transcript);
  const operations: unknown[] = [];
  let nextReference = firstReference;

  for (const utterance of utterances) {
    const normalized = utterance.toLowerCase().replace(/^actually\s+/, "").trim();
    // A natural end-of-capture phrase is control language, never a task.
    if (/^(?:that(?:'s| is) all|that(?:'s| is) it|i(?:'m| am) done|done)$/.test(normalized)) {
      continue;
    }
    if (/^(?:clear|remove) (?:everything|all(?: of)? (?:that|them))$/.test(normalized)) {
      operations.push({ type: "clear" });
      continue;
    }
    if (/^(?:undo|undo that|never mind)$/.test(normalized)) {
      operations.push({ type: "undo" });
      continue;
    }

    const deletion = normalized.match(/^(?:delete|remove) (?:the )?(.+?)(?: (?:one|item|task))?$/);
    if (deletion) {
      operations.push({ ref: referenceFor(deletion[1]!, draftTasks), type: "delete" });
      continue;
    }

    const replacement = utterance.match(/^(?:ok(?:ay)?[,.\s]+)?replace\s+(?:the\s+)?(.+?)\s+with\s+(.+)$/i);
    if (replacement) {
      operations.push({
        patch: { title: replacement[2]!.trim() },
        ref: referenceFor(replacement[1]!, draftTasks),
        type: "update",
      });
      continue;
    }

    const update = normalized.match(/^(?:make|change|move|set) (?:the )?(.+?)(?: (?:one|item|task))? (?:to |at )?(.+)$/);
    if (update) {
      operations.push({ patch: patchFor(update[2]!), ref: referenceFor(update[1]!, draftTasks), type: "update" });
      continue;
    }

    operations.push({
      ref: String(nextReference++),
      task: taskFor(utterance),
      type: "create",
    });
  }

  if (operations.length === 0) throw new TranscriptInterpretationError("There was no spoken task to interpret.");
  return parseSessionOperations(operations);
}

function splitTaskPhrases(transcript: string) {
  return transcript
    .split(/[.!?\n]+/)
    .flatMap((sentence) => sentence.split(taskBoundaryPattern))
    .map((utterance) => utterance.trim())
    .filter(Boolean);
}

function referenceFor(value: string, draftTasks: readonly DraftTaskReference[]): string {
  const normalized = value.trim().toLowerCase();
  const ordinal = ordinalReferences[normalized] ?? normalized.replace(/^number\s+/, "");
  if (ordinal !== normalized || /^\d+$/.test(ordinal)) return ordinal;
  const matchingTask = draftTasks.find((task) => {
    const title = task.title.trim().toLowerCase();
    return title === normalized || title.includes(normalized);
  });
  return matchingTask?.reference ?? ordinal;
}

function patchFor(value: string): { dueDate?: string; dueTime?: string; title?: string } {
  const task = taskFor(value, false);
  if (task.dueDate || task.dueTime) {
    return {
      ...(task.dueDate ? { dueDate: task.dueDate } : {}),
      ...(task.dueTime ? { dueTime: task.dueTime } : {}),
    };
  }
  if (!task.title) throw new TranscriptInterpretationError("That session update needs a task detail.");
  return { title: task.title };
}

function taskFor(utterance: string, requireTitle = true): { dueDate?: string; dueTime?: string; title: string } {
  let remainder = utterance.trim();
  const task: { dueDate?: string; dueTime?: string; title: string } = { title: "" };
  const date = remainder.match(new RegExp(`\\b(today|tomorrow|${weekdayPattern})\\b`, "i"));
  if (date) {
    task.dueDate = date[1]!.toLowerCase();
    remainder = remainder.replace(date[0], " ");
  }
  const time = remainder.match(new RegExp(`\\b(?:at\\s+)?(${timePattern})\\b`, "i"));
  if (time && /(am|pm|:|\bat\s)/i.test(time[0])) {
    task.dueTime = normalizeSpokenTime(time[1]!);
    remainder = remainder.replace(time[0], " ");
  }
  task.title = remainder.replace(/\s+/g, " ").trim();
  if (requireTitle && !task.title) throw new TranscriptInterpretationError("A created task needs a title.");
  return task;
}

function normalizeSpokenTime(value: string): string {
  const normalized = value.replace(/\s+/g, " ").replace(/(am|pm)$/i, (suffix) => suffix.toUpperCase());
  if (!/^\d{1,2}$/.test(normalized)) return normalized;
  const hour = Number(normalized);
  if (hour > 12) return `${String(hour).padStart(2, "0")}:00`;
  // Crisp treats an unqualified "at 5" task phrase as the common evening reminder.
  return `${hour} PM`;
}
