import { z } from "zod";

import { sessionOperationsSchema, type VoiceSessionDraft } from "@/src/domain/sessionOperations";

const draftTaskSchema = z.object({
  dueDate: z.string().optional(),
  dueTime: z.string().optional(),
  reference: z.string().min(1).max(40),
  title: z.string().min(1).max(280),
});

export const voiceStreamSessionSchema = z.object({
  draftTasks: z.array(draftTaskSchema).max(50),
  id: z.string().min(1).max(120),
});

export const voiceStreamServerEventSchema = z.discriminatedUnion("type", [
  z.object({ sessionId: z.string(), type: z.literal("ready") }),
  z.object({
    languageCode: z.string().nullable(),
    operations: sessionOperationsSchema,
    providerRequestId: z.string().nullable(),
    transcript: z.string(),
    translation: z.string(),
    type: z.literal("turn"),
  }),
  z.object({
    error: z.object({ code: z.string(), message: z.string(), retryable: z.boolean() }),
    type: z.literal("error"),
  }),
]);

export type VoiceStreamSession = z.infer<typeof voiceStreamSessionSchema>;
export type VoiceStreamServerEvent = z.infer<typeof voiceStreamServerEventSchema>;

export function streamSessionFromDraft(session: VoiceSessionDraft): VoiceStreamSession {
  return {
    draftTasks: session.draftTasks.map(({ dueDate, dueTime, reference, title }) => ({
      ...(dueDate ? { dueDate } : {}),
      ...(dueTime ? { dueTime } : {}),
      reference,
      title,
    })),
    id: session.id,
  };
}

export function voiceStreamProtocol(accessToken: string) {
  // The browser WebSocket API cannot attach authorization headers. A protocol
  // is preferable to a query string because URL logs should never contain a
  // user credential. The relay validates this short-lived token before upgrade.
  return `crisp.${accessToken}`;
}
