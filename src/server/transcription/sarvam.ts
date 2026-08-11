import { z } from "zod";

import {
  TranscriptionError,
  sarvamTranscriptionResultSchema,
  type TranscriptionInput,
  type SarvamTranscriptionResult,
} from "./contracts";
import { getSarvamApiKey } from "./env";

const sarvamResponseSchema = z.object({
  language_code: z.string().nullable().optional(),
  request_id: z.string().nullable().optional(),
  transcript: z.string(),
});

type FetchLike = typeof fetch;

export function createSarvamTranscriber(
  fetcher: FetchLike = fetch,
  getApiKey: () => string = getSarvamApiKey,
) {
  return async function transcribe(input: TranscriptionInput & { mode?: "transcribe" | "translate" | "codemix" }): Promise<SarvamTranscriptionResult> {
    const formData = new FormData();
    const audioBytes = new Uint8Array(input.audio.byteLength);
    audioBytes.set(input.audio);
    const audio = new Blob([audioBytes.buffer], { type: input.contentType });
    formData.append("file", audio, input.fileName);
    formData.append("model", "saaras:v3");
    formData.append("mode", input.mode ?? "transcribe");
    formData.append("language_code", input.languageCode);
    const apiKey = getApiKey();

    let response: Response;
    try {
      response = await fetcher("https://api.sarvam.ai/speech-to-text", {
        body: formData,
        headers: { "api-subscription-key": apiKey },
        method: "POST",
      });
    } catch {
      throw new TranscriptionError(
        "provider_unavailable",
        "Transcription is temporarily unavailable. Try again.",
      );
    }

    if (!response.ok) {
      throw providerError(response);
    }

    const body = await response.json().catch(() => undefined);
    const parsed = sarvamResponseSchema.safeParse(body);
    if (!parsed.success) {
      throw new TranscriptionError(
        "transcription_failed",
        "Crisp could not read the transcription response.",
      );
    }

    return sarvamTranscriptionResultSchema.parse({
      languageCode: parsed.data.language_code ?? null,
      providerRequestId: parsed.data.request_id ?? null,
      transcript: parsed.data.transcript,
    });
  };
}

function providerError(response: Response): TranscriptionError {
  if (response.status === 429) {
    return new TranscriptionError(
      "rate_limited",
      "Transcription is busy. Try again shortly.",
      retryAfterSeconds(response.headers.get("retry-after")),
    );
  }

  if (response.status >= 500 || response.status === 503) {
    return new TranscriptionError(
      "provider_unavailable",
      "Transcription is temporarily unavailable. Try again.",
    );
  }

  return new TranscriptionError(
    "transcription_failed",
    "Crisp could not transcribe this recording. Try again.",
  );
}

function retryAfterSeconds(value: string | null): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : undefined;
}
