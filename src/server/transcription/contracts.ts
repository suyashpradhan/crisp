import { z } from "zod";

import { sessionOperationsSchema } from "@/src/domain/sessionOperations";

export const supportedAudioMimeTypes = [
  "audio/aac",
  "audio/flac",
  "audio/m4a",
  "audio/mp4",
  "audio/mpeg",
  "audio/ogg",
  "audio/opus",
  "audio/wav",
  "audio/webm",
  "audio/x-m4a",
] as const;

export const maxTranscriptionBytes = 10 * 1024 * 1024;

export const transcriptionRequestSchema = z.object({
  contentType: z.enum(supportedAudioMimeTypes),
  fileName: z.string().min(1).max(120),
  languageCode: z.string().trim().min(1).max(16).default("unknown"),
});

export const sarvamTranscriptionResultSchema = z.object({
  languageCode: z.string().nullable(),
  providerRequestId: z.string().nullable(),
  transcript: z.string(),
});

export const transcriptionResultSchema = sarvamTranscriptionResultSchema.extend({
  operations: sessionOperationsSchema,
  translation: z.string(),
});

export type TranscriptionInput = z.infer<typeof transcriptionRequestSchema> & {
  audio: Uint8Array;
};

export type TranscriptionResult = z.infer<typeof transcriptionResultSchema>;
export type SarvamTranscriptionResult = z.infer<typeof sarvamTranscriptionResultSchema>;

export const sessionContextSchema = z.object({
  draftTasks: z.array(z.object({
    dueDate: z.string().optional(),
    dueTime: z.string().optional(),
    reference: z.string().trim().min(1).max(40),
    title: z.string().trim().min(1).max(280),
  })).max(50),
});

export type SessionContext = z.infer<typeof sessionContextSchema>;

export type TranscriptionErrorCode =
  | "audio_empty"
  | "audio_too_large"
  | "audio_type_unsupported"
  | "invalid_request"
  | "provider_unavailable"
  | "rate_limited"
  | "service_misconfigured"
  | "transcription_failed";

export class TranscriptionError extends Error {
  constructor(
    public readonly code: TranscriptionErrorCode,
    message: string,
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "TranscriptionError";
  }

  get retryable() {
    return this.code === "provider_unavailable" || this.code === "rate_limited";
  }
}
