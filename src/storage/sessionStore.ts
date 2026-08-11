import AsyncStorage from "@react-native-async-storage/async-storage";
import { z } from "zod";

import { sessionOperationSchema, type VoiceSessionDraft } from "@/src/domain/sessionOperations";
import type { RetainedRecording } from "@/src/domain/types";

const sessionStorageKey = "crisp.recoverable-session.v1";

const draftTaskSchema = z.object({
  dueDate: z.string().optional(),
  dueTime: z.string().optional(),
  id: z.string().min(1),
  reference: z.string().min(1),
  title: z.string().min(1).max(280),
});

const sessionSchema = z.object({
  draftTasks: z.array(draftTaskSchema),
  history: z.array(z.array(draftTaskSchema)),
  id: z.string().min(1),
  operations: z.array(sessionOperationSchema),
  startedAt: z.string().datetime(),
  transcript: z.string().optional(),
});

const recordingSchema = z.object({
  createdAt: z.string().datetime(),
  durationMs: z.number().nonnegative(),
  fileName: z.string().min(1),
  mimeType: z.enum(["audio/m4a", "audio/webm"]),
  uri: z.string().min(1),
});

const recoverableSessionSchema = z.object({ recording: recordingSchema, session: sessionSchema });

export type RecoverableSession = {
  recording: RetainedRecording;
  session: VoiceSessionDraft;
};

type SessionStorage = Pick<typeof AsyncStorage, "getItem" | "removeItem" | "setItem">;

export function createSessionStore(storage: SessionStorage) {
  return {
    async clear() {
      await storage.removeItem(sessionStorageKey);
    },
    async load(): Promise<RecoverableSession | null> {
      const value = await storage.getItem(sessionStorageKey);
      if (value === null) return null;
      return recoverableSessionSchema.parse(JSON.parse(value));
    },
    async save(session: RecoverableSession) {
      await storage.setItem(sessionStorageKey, JSON.stringify(recoverableSessionSchema.parse(session)));
    },
  };
}

export const sessionStore = createSessionStore(AsyncStorage);
