import { TranscriptionError } from "./contracts";

type ServerEnvironment = Record<string, string | undefined>;

export function getSarvamApiKey(environment: ServerEnvironment = process.env): string {
  const apiKey = environment.SARVAM_API_KEY?.trim();

  if (!apiKey) {
    throw new TranscriptionError(
      "service_misconfigured",
      "Transcription is not configured on this server.",
    );
  }

  return apiKey;
}
