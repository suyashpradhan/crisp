import { createTranscriptionRoute, POST } from "@/app/api/transcribe+api";

async function readError(response: Response) {
  return (await response.json()) as {
    error: { code: string; retryable: boolean };
  };
}

describe("POST /api/transcribe", () => {
  it("runs both transcripts through interpretation and returns validated task operations", async () => {
    const transcribe = jest.fn()
      .mockResolvedValueOnce({ languageCode: "en-IN", providerRequestId: "request-1", transcript: "Call Raju at 5 PM and buy milk." })
      .mockResolvedValueOnce({ languageCode: "en-IN", providerRequestId: "request-2", transcript: "Call Raju at 5 PM and buy milk." });
    const interpret = jest.fn().mockResolvedValue([
      { ref: "1", task: { dueTime: "5 PM", title: "Call Raju" }, type: "create" },
      { ref: "2", task: { title: "Buy milk" }, type: "create" },
    ]);
    const handler = createTranscriptionRoute({ interpret, transcribe });
    const formData = new FormData();
    formData.append("audio", new Blob([new Uint8Array([1, 2, 3, 4])], { type: "audio/webm" }), "session.webm");
    formData.append("languageCode", "unknown");
    formData.append("session", JSON.stringify({ draftTasks: [] }));

    const response = await handler(new Request("http://localhost/api/transcribe", {
      body: formData,
      method: "POST",
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      operations: [
        expect.objectContaining({ ref: "1", task: expect.objectContaining({ title: "Call Raju" }) }),
        expect.objectContaining({ ref: "2", task: expect.objectContaining({ title: "Buy milk" }) }),
      ],
      transcript: "Call Raju at 5 PM and buy milk.",
    });
    expect(transcribe).toHaveBeenCalledTimes(2);
    expect(transcribe.mock.calls.map(([input]) => input.mode)).toEqual(["transcribe", "translate"]);
    expect(interpret).toHaveBeenCalledWith(expect.objectContaining({
      originalTranscript: "Call Raju at 5 PM and buy milk.",
      translatedTranscript: "Call Raju at 5 PM and buy milk.",
    }));
  });

  it("rejects an empty recording before contacting Sarvam", async () => {
    const formData = new FormData();
    formData.append("audio", new Blob([], { type: "audio/webm" }), "empty.webm");

    const response = await POST(new Request("http://localhost/api/transcribe", {
      body: formData,
      method: "POST",
    }));

    expect(response.status).toBe(400);
    await expect(readError(response)).resolves.toMatchObject({
      error: { code: "audio_empty", retryable: false },
    });
  });

  it("reports a missing server key without exposing a provider credential", async () => {
    const formData = new FormData();
    formData.append("audio", new Blob([new Uint8Array([1, 2, 3])], { type: "audio/webm" }), "session.webm");
    formData.append("session", JSON.stringify({ draftTasks: [] }));

    const response = await POST(new Request("http://localhost/api/transcribe", {
      body: formData,
      method: "POST",
    }));

    expect(response.status).toBe(503);
    await expect(readError(response)).resolves.toMatchObject({
      error: { code: "service_misconfigured", retryable: false },
    });
  });
});
