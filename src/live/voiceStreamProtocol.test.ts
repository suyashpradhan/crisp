import { streamSessionFromDraft, voiceStreamProtocol, voiceStreamServerEventSchema } from "./voiceStreamProtocol";

describe("voice stream protocol", () => {
  it("sends only temporary task references to the relay", () => {
    expect(streamSessionFromDraft({
      draftTasks: [{ id: "draft-1", reference: "1", title: "Call Raju" }],
      history: [], id: "session-1", operations: [], startedAt: "2026-08-12T00:00:00.000Z",
    })).toEqual({ draftTasks: [{ reference: "1", title: "Call Raju" }], id: "session-1" });
  });

  it("validates a safe, structured task turn from the relay", () => {
    expect(voiceStreamServerEventSchema.parse({
      languageCode: "en-IN", operations: [{ ref: "1", task: { title: "Call Raju" }, type: "create" }],
      providerRequestId: "sarvam-1", transcript: "Call Raju", translation: "Call Raju", type: "turn",
    })).toEqual(expect.objectContaining({ type: "turn" }));
  });

  it("keeps the short-lived credential out of the endpoint URL", () => {
    expect(voiceStreamProtocol("header.payload.signature")).toBe("crisp.header.payload.signature");
  });
});
