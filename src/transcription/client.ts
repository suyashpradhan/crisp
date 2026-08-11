import { File } from "expo-file-system";
import { Platform } from "react-native";
import { z } from "zod";

import { transcriptionResultSchema, type TranscriptionResult } from "@/src/server/transcription/contracts";
import type { RetainedRecording } from "@/src/domain/types";
import type { VoiceSessionDraft } from "@/src/domain/sessionOperations";

const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    retryable: z.boolean(),
  }),
});

export class TranscriptionClientError extends Error {
  constructor(
    message: string,
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = "TranscriptionClientError";
  }
}

type ReadRecording = (recording: RetainedRecording) => Promise<Blob>;

export function createTranscriptionClient(
  fetcher: typeof fetch = fetch,
  readRecording: ReadRecording = readRetainedRecording,
  endpoint = transcriptionEndpoint(),
) {
  return async function transcribe(recording: RetainedRecording, session: VoiceSessionDraft): Promise<TranscriptionResult> {
    if (!endpoint) {
      throw new TranscriptionClientError(
        "This mobile build needs a deployed transcription URL before spoken tasks can be saved.",
        false,
      );
    }
    let audio: Blob;
    try {
      audio = await readRecording(recording);
    } catch {
      throw new TranscriptionClientError("Crisp could not prepare this recording. Record again and try once more.", false);
    }

    const formData = new FormData();
    formData.append("audio", audio, recording.fileName);
    formData.append("languageCode", "unknown");
    formData.append("session", JSON.stringify({
      draftTasks: session.draftTasks.map(({ dueDate, dueTime, reference, title }) => ({
        ...(dueDate ? { dueDate } : {}),
        ...(dueTime ? { dueTime } : {}),
        reference,
        title,
      })),
    }));

    let response: Response;
    try {
      response = await fetcher(endpoint, { body: formData, method: "POST" });
    } catch {
      throw new TranscriptionClientError("Transcription is temporarily unavailable. Try again.", true);
    }

    const body = await response.json().catch(() => undefined);
    if (!response.ok) {
      const error = errorResponseSchema.safeParse(body);
      throw new TranscriptionClientError(
        error.success ? error.data.error.message : "Crisp could not transcribe this recording. Try again.",
        error.success ? error.data.error.retryable : response.status >= 500,
      );
    }

    const parsed = transcriptionResultSchema.safeParse(body);
    if (!parsed.success) {
      throw new TranscriptionClientError("Crisp could not read the transcription response. Try again.", true);
    }
    return parsed.data;
  };
}

export const transcribeRecording = createTranscriptionClient();

function transcriptionEndpoint() {
  const configured = process.env.EXPO_PUBLIC_TRANSCRIPTION_API_URL?.trim();
  if (configured) return configured;
  // Expo Router API routes share the browser origin in web development. Native apps
  // do not host API routes in the app bundle and must use a deployed HTTPS endpoint.
  return Platform.OS === "web" ? "/api/transcribe" : undefined;
}

async function readRetainedRecording(recording: RetainedRecording): Promise<Blob> {
  if (Platform.OS !== "web") return new File(recording.uri);
  const response = await fetch(recording.uri);
  if (!response.ok) throw new Error("The browser recording URI is unavailable.");
  return response.blob();
}
