import { createTranscriptionClient, TranscriptionClientError } from "./client";

const recording = {
  createdAt: "2026-08-11T09:00:00.000Z",
  durationMs: 1000,
  fileName: "crisp-recording.m4a",
  mimeType: "audio/m4a" as const,
  uri: "file:///recording.m4a",
};

const session = {
  draftTasks: [],
  history: [],
  id: "session-1",
  operations: [],
  startedAt: "2026-08-11T09:00:00.000Z",
};

describe("transcription client", () => {
  it("sends retained audio to the server route and validates the response", async () => {
    const fetcher = jest.fn().mockResolvedValue(Response.json({
      languageCode: "en-IN",
      operations: [],
      providerRequestId: "request-1",
      transcript: "Call Rahul tomorrow at 3 PM.",
      translation: "Call Rahul tomorrow at 3 PM.",
    }));
    const client = createTranscriptionClient(fetcher, async () => new Blob(["audio"], { type: "audio/m4a" }), "/api/transcribe");

    await expect(client(recording, session)).resolves.toEqual(expect.objectContaining({ transcript: "Call Rahul tomorrow at 3 PM." }));
    expect(fetcher).toHaveBeenCalledWith("/api/transcribe", expect.objectContaining({ method: "POST" }));
  });

  it("keeps retry guidance from the server error contract", async () => {
    const fetcher = jest.fn().mockResolvedValue(Response.json({
      error: { code: "rate_limited", message: "Transcription is busy. Try again shortly.", retryable: true },
    }, { status: 429 }));
    const client = createTranscriptionClient(fetcher, async () => new Blob(["audio"], { type: "audio/m4a" }), "/api/transcribe");

    await expect(client(recording, session)).rejects.toEqual(
      expect.objectContaining<Partial<TranscriptionClientError>>({ retryable: true }),
    );
  });

  it("reports a missing native server URL before attempting an upload", async () => {
    const client = createTranscriptionClient(
      jest.fn(),
      async () => new Blob(["audio"], { type: "audio/m4a" }),
      undefined,
    );

    await expect(client(recording, session)).rejects.toEqual(
      expect.objectContaining<Partial<TranscriptionClientError>>({ retryable: false }),
    );
  });
});
