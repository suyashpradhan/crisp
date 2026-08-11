import {
  maxTranscriptionBytes,
  TranscriptionError,
  transcriptionRequestSchema,
} from "./contracts";
import { getSarvamApiKey } from "./env";
import { createSarvamTranscriber } from "./sarvam";

const input = {
  audio: new Uint8Array([1, 2, 3]),
  contentType: "audio/webm" as const,
  fileName: "session.webm",
  languageCode: "en-IN" as const,
};

describe("Sarvam transcription boundary", () => {
  it("uses server-only configuration and English transcription defaults", async () => {
    const fetcher = jest.fn(async () =>
      new Response(
        JSON.stringify({
          language_code: "en-IN",
          request_id: "sarvam-request-1",
          transcript: "Call Rahul tomorrow at five.",
        }),
        { status: 200 },
      ),
    );
    const transcribe = createSarvamTranscriber(fetcher as unknown as typeof fetch, () => "server-secret");

    await expect(transcribe(input)).resolves.toEqual({
      languageCode: "en-IN",
      providerRequestId: "sarvam-request-1",
      transcript: "Call Rahul tomorrow at five.",
    });
    expect(fetcher).toHaveBeenCalledWith(
      "https://api.sarvam.ai/speech-to-text",
      expect.objectContaining({
        headers: { "api-subscription-key": "server-secret" },
        method: "POST",
      }),
    );
  });

  it("turns rate limiting into retryable guidance", async () => {
    const fetcher = jest.fn(async () =>
      new Response("busy", { headers: { "retry-after": "4" }, status: 429 }),
    );
    const transcribe = createSarvamTranscriber(fetcher as unknown as typeof fetch, () => "server-secret");

    await expect(transcribe(input)).rejects.toMatchObject({
      code: "rate_limited",
      retryAfterSeconds: 4,
      retryable: true,
    } satisfies Partial<TranscriptionError>);
  });

  it("does not send a request when the server key is missing", () => {
    try {
      getSarvamApiKey({});
      throw new Error("Expected missing configuration to throw");
    } catch (error) {
      expect(error).toMatchObject({ code: "service_misconfigured" });
    }
  });

  it("accepts only the short-session audio contract", () => {
    expect(transcriptionRequestSchema.safeParse({
      contentType: "audio/webm",
      fileName: "session.webm",
      languageCode: "en-IN",
    }).success).toBe(true);
    expect(transcriptionRequestSchema.safeParse({
      contentType: "text/plain",
      fileName: "notes.txt",
      languageCode: "en-IN",
    }).success).toBe(false);
    expect(maxTranscriptionBytes).toBe(10 * 1024 * 1024);
  });
});
