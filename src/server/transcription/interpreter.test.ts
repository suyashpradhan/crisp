import { createSarvamOperationInterpreter } from "./interpreter";

describe("Sarvam operation interpreter", () => {
  it("validates structured task operations before they can reach the reducer", async () => {
    const fetcher = jest.fn(async () => new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify({
        operations: [
          { ref: "1", task: { dueTime: "4 PM", title: "कॉल राजू" }, type: "create" },
          { ref: "2", task: { dueTime: "3 PM", title: "कॉल अभिषेक" }, type: "create" },
          { ref: "3", task: { title: "घर जाते समय किराने का सामान लाना" }, type: "create" },
        ],
      }) } }],
    }), { status: 200 }));
    const interpret = createSarvamOperationInterpreter(fetcher as unknown as typeof fetch, () => "server-secret");

    await expect(interpret({
      context: { draftTasks: [] },
      now: new Date("2026-08-11T00:00:00.000Z"),
      originalTranscript: "राजू को चार बजे कॉल करो, अभिषेक को तीन बजे कॉल करो, घर जाते समय किराने का सामान लाना",
      translatedTranscript: "Call Raju at four, call Abhishek at three, bring groceries on the way home.",
    })).resolves.toEqual([
      { ref: "1", task: { dueTime: "4 PM", title: "कॉल राजू" }, type: "create" },
      { ref: "2", task: { dueTime: "3 PM", title: "कॉल अभिषेक" }, type: "create" },
      { ref: "3", task: { title: "घर जाते समय किराने का सामान लाना" }, type: "create" },
    ]);
    expect(fetcher).toHaveBeenCalledWith(
      "https://api.sarvam.ai/v1/chat/completions",
      expect.objectContaining({ headers: expect.objectContaining({ "api-subscription-key": "server-secret" }) }),
    );
  });

  it("normalizes Sarvam's older flat create spelling before validation", async () => {
    const fetcher = jest.fn(async () => new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify({
        operations: [{ dueTime: "15:00", reference: "1", title: "Call Raju", type: "create" }],
      }) } }],
    }), { status: 200 }));
    const interpret = createSarvamOperationInterpreter(fetcher as unknown as typeof fetch, () => "server-secret");

    await expect(interpret({
      context: { draftTasks: [] },
      now: new Date("2026-08-11T00:00:00.000Z"),
      originalTranscript: "Call Raju at 3 PM.",
      translatedTranscript: "Call Raju at 3 PM.",
    })).resolves.toEqual([
      { ref: "1", task: { dueTime: "15:00", title: "Call Raju" }, type: "create" },
    ]);
  });
});
