import { createVoiceStreamClient } from "./voiceStreamClient";

class FakeSocket {
  onclose: ((event: unknown) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onopen: (() => void) | null = null;
  readyState = 0;
  sent: string[] = [];

  close() {
    this.readyState = 3;
    this.onclose?.({});
  }

  send(data: string) {
    this.sent.push(data);
  }

  open() {
    this.readyState = 1;
    this.onopen?.();
  }

  receive(value: unknown) {
    this.onmessage?.({ data: JSON.stringify(value) });
  }
}

describe("live voice stream client", () => {
  it("authenticates the socket and forwards validated final turns", async () => {
    const socket = new FakeSocket();
    const onEvent = jest.fn();
    const socketFactory = jest.fn(() => socket);
    const client = createVoiceStreamClient({
      accessToken: "access-token", endpoint: "wss://project.functions.supabase.co/voice-stream", onEvent,
      socketFactory,
    });

    const open = client.open({ draftTasks: [], id: "session-1" });
    expect(socketFactory).toHaveBeenCalledWith(
      "wss://project.functions.supabase.co/voice-stream",
      ["crisp.access-token"],
    );
    socket.open();
    expect(socket.sent).toEqual([JSON.stringify({ session: { draftTasks: [], id: "session-1" }, type: "configure" })]);
    socket.receive({ sessionId: "session-1", type: "ready" });
    await expect(open).resolves.toBeUndefined();

    client.sendAudio("AAE=");
    socket.receive({
      languageCode: "en-IN", operations: [{ ref: "1", task: { title: "Buy groceries" }, type: "create" }],
      providerRequestId: "provider-1", transcript: "Buy groceries", translation: "Buy groceries", type: "turn",
    });

    expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "turn" }));
  });
});
