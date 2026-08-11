import { interpretTranscript } from "./transcriptInterpreter";

describe("interpretTranscript", () => {
  it("turns direct task speech and session corrections into typed operations", () => {
    expect(
      interpretTranscript(
        "Call Rahul tomorrow at 5. Reply to the client tomorrow at 4. Actually make the first one 3 PM. Delete the second one. Undo that.",
      ),
    ).toEqual([
      { ref: "1", task: { dueDate: "tomorrow", dueTime: "5 PM", title: "Call Rahul" }, type: "create" },
      { ref: "2", task: { dueDate: "tomorrow", dueTime: "4 PM", title: "Reply to the client" }, type: "create" },
      { patch: { dueTime: "3 PM" }, ref: "1", type: "update" },
      { ref: "2", type: "delete" },
      { type: "undo" },
    ]);
  });

  it("keeps clear and undo as explicit session operations", () => {
    expect(interpretTranscript("Clear everything. Undo that.")).toEqual([
      { type: "clear" },
      { type: "undo" },
    ]);
  });

  it("does not turn a natural finish phrase into a task", () => {
    expect(interpretTranscript("Buy milk tomorrow. That's all.")).toEqual([
      { ref: "1", task: { dueDate: "tomorrow", title: "Buy milk" }, type: "create" },
    ]);
  });
});
