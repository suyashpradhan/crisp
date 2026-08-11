import {
  applySessionOperation,
  createVoiceSession,
  parseSessionOperations,
} from "./sessionOperations";

const now = new Date(2026, 7, 11, 9, 0, 0);

describe("session operations", () => {
  it("validates and normalizes created session tasks", () => {
    const [operation] = parseSessionOperations([
      { ref: "1", task: { dueDate: "tomorrow", dueTime: "3 PM", title: "Call Rahul" }, type: "create" },
    ]);
    const result = applySessionOperation(createVoiceSession("session-1", now.getTime()), operation!, now);

    expect(result.error).toBeUndefined();
    expect(result.session.draftTasks).toEqual([
      {
        dueDate: "2026-08-12",
        dueTime: "15:00",
        id: "draft-session-1-1",
        reference: "1",
        title: "Call Rahul",
      },
    ]);
  });

  it("handles update, delete, clear, and undo inside one temporary session", () => {
    let session = createVoiceSession("session-1", now.getTime());
    const operations = parseSessionOperations([
      { ref: "1", task: { title: "Call Rahul" }, type: "create" },
      { ref: "2", task: { title: "Reply to client" }, type: "create" },
      { patch: { dueTime: "4 PM" }, ref: "1", type: "update" },
      { ref: "2", type: "delete" },
      { type: "undo" },
      { type: "clear" },
      { type: "undo" },
    ]);

    for (const operation of operations) {
      const result = applySessionOperation(session, operation, now);
      expect(result.error).toBeUndefined();
      session = result.session;
    }

    expect(session.draftTasks).toEqual([
      expect.objectContaining({ dueTime: "16:00", reference: "1" }),
      expect.objectContaining({ reference: "2", title: "Reply to client" }),
    ]);
  });

  it("rejects unknown references without modifying the draft", () => {
    const session = createVoiceSession("session-1", now.getTime());
    const operation = parseSessionOperations([{ ref: "yesterday-task", type: "delete" }])[0]!;
    const result = applySessionOperation(session, operation, now);

    expect(result.error).toEqual({ code: "missing_reference", message: "Item yesterday-task is not in this session." });
    expect(result.session).toEqual(session);
  });
});
