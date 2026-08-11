import { z } from "zod";

import { sessionOperationsSchema, type SessionOperation } from "@/src/domain/sessionOperations";
import { interpretTranscript } from "@/src/domain/transcriptInterpreter";

import { TranscriptionError, type SessionContext } from "./contracts";
import { getSarvamApiKey } from "./env";

const completionSchema = z.object({
  choices: z.array(z.object({
    message: z.object({ content: z.string() }),
  })).min(1),
});

type FetchLike = typeof fetch;

/**
 * Converts a spoken turn into a tiny, validated command list. This service never
 * touches persistence; the universal reducer remains the only state mutator.
 */
export function createSarvamOperationInterpreter(
  fetcher: FetchLike = fetch,
  getApiKey: () => string = getSarvamApiKey,
) {
  return async function interpretTurn(input: {
    context: SessionContext;
    originalTranscript: string;
    translatedTranscript: string;
    now: Date;
  }): Promise<SessionOperation[]> {
    let response: Response;
    try {
      response = await fetcher("https://api.sarvam.ai/v1/chat/completions", {
        body: JSON.stringify({
          max_tokens: 1000,
          messages: [
            { content: systemPrompt(input.context, input.now), role: "system" },
            {
              content: `Original transcript:\n${input.originalTranscript}\n\nEnglish meaning (use only to understand intent):\n${input.translatedTranscript}`,
              role: "user",
            },
          ],
          // Sarvam's current generally available structured-output model.
          model: "sarvam-105b",
          response_format: { type: "json_object" },
          temperature: 0,
        }),
        headers: {
          "api-subscription-key": getApiKey(),
          "content-type": "application/json",
        },
        method: "POST",
      });
    } catch {
      throw new TranscriptionError("provider_unavailable", "Crisp could not understand that spoken thought. Try again.");
    }

    if (!response.ok) {
      if (response.status === 429) {
        throw new TranscriptionError("rate_limited", "Crisp is briefly busy understanding speech. Try again shortly.");
      }
      throw new TranscriptionError("provider_unavailable", "Crisp could not understand that spoken thought. Try again.");
    }

    const parsed = completionSchema.safeParse(await response.json().catch(() => undefined));
    if (!parsed.success) {
      throw new TranscriptionError("transcription_failed", "Crisp could not read the task interpretation.");
    }

    try {
      const content = JSON.parse(parsed.data.choices[0]!.message.content) as { operations?: unknown };
      const operations = Array.isArray(content.operations)
        ? content.operations.map(normalizeOperation)
        : content.operations;
      const validated = sessionOperationsSchema.parse(operations ?? []);
      return validated.length > 0 ? validated : fallbackOperations(input);
    } catch {
      throw new TranscriptionError("transcription_failed", "Crisp could not safely interpret that spoken thought.");
    }
  };
}

function systemPrompt(context: SessionContext, now: Date) {
  const drafts = context.draftTasks.length
    ? context.draftTasks.map((task) => `#${task.reference}: ${task.title}`).join("\n")
    : "(none)";

  return `You turn one voice-capture turn into task operations. Return JSON only: {"operations": SessionOperation[]}.
Today is ${isoDate(now)}. Existing draft tasks, and only those tasks, may be updated or deleted:\n${drafts}

Rules:
- Make one create operation for every distinct task, even when several are spoken in one breath.
- A non-empty task-like thought must produce an operation. Never return an empty array merely because wording is incomplete, informal, or grammatically imperfect.
- A correction such as “replace Raju with Rakesh” updates the referenced or clearly matching existing draft task; never create a duplicate.
- Keep a created task's title in the original language and script from the original transcript. Do not translate it to English.
- Use the English meaning only for intent, dates, times, and resolving corrections.
- New references are sequential numeric strings after the largest existing reference.
- Supported types are create, update, delete, clear, and undo. Never refer to permanent tasks.
- Exact create shape: {"type":"create","ref":"1","task":{"title":"Call Raju","dueDate":"today","dueTime":"5 PM"}}. Never put reference, title, dueDate, or dueTime at the top level of a create operation.
- Exact update shape: {"type":"update","ref":"1","patch":{"title":"Call Rakesh"}}.
- Output an empty array for filler or acknowledgement only.
- Use dueDate as today, tomorrow, weekday name, or YYYY-MM-DD; dueTime as 3 PM or 15:00. Do not invent details.`;
}

/**
 * Sarvam's task interpreter is the primary path. This narrow fallback prevents
 * a successful transcription from becoming an invisible no-op when the model
 * returns an empty array for a plainly task-like utterance. Its output goes
 * through the same Zod schema as model output and is still applied only by the
 * client-side session reducer.
 */
function fallbackOperations(input: {
  context: SessionContext;
  originalTranscript: string;
}): SessionOperation[] {
  const transcript = input.originalTranscript.trim();
  if (!transcript || isAcknowledgement(transcript)) return [];

  try {
    return interpretTranscript(transcript, nextReference(input.context), input.context.draftTasks);
  } catch {
    return [];
  }
}

function isAcknowledgement(transcript: string) {
  return /^(?:ok(?:ay)?|yeah|yes|no|hmm|um|uh|thanks?|thank you|that(?:'s| is) all|that(?:'s| is) it|done|stop|finish|end)[.!\s]*$/i.test(transcript);
}

function nextReference(context: SessionContext) {
  const largest = context.draftTasks.reduce((maximum, task) => {
    const reference = Number(task.reference);
    return Number.isSafeInteger(reference) && reference > maximum ? reference : maximum;
  }, 0);
  return largest + 1;
}

/** Accept a narrowly known legacy model spelling, then validate the canonical form. */
function normalizeOperation(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const operation = value as Record<string, unknown>;
  if (operation.type === "create" && !operation.task) {
    const task = compact({
      dueDate: asString(operation.dueDate),
      dueTime: asString(operation.dueTime),
      title: asString(operation.title),
    });
    return {
      ref: asString(operation.ref) ?? asString(operation.reference),
      task,
      type: "create",
    };
  }
  if ((operation.type === "update" || operation.type === "delete") && !operation.ref && operation.reference) {
    return { ...operation, ref: operation.reference };
  }
  return operation;
}

function compact(value: Record<string, string | undefined>) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
}

function asString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function isoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
