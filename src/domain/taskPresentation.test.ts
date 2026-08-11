import { formatTaskMetadata } from "./taskPresentation";

describe("formatTaskMetadata", () => {
  const now = new Date(2026, 7, 11, 9);

  it("formats normalized times for the task row", () => {
    expect(formatTaskMetadata({
      bucket: "today", createdAt: "2026-08-11T09:00:00.000Z", dueTime: "15:00", id: "task-1", status: "open", title: "Call Rahul",
    }, now)).toBe("3:00 PM");
  });

  it("keeps date metadata calm and relative when possible", () => {
    expect(formatTaskMetadata({
      bucket: "later", createdAt: "2026-08-11T09:00:00.000Z", dueDate: "2026-08-12", id: "task-1", status: "open", title: "Call Rahul",
    }, now)).toBe("Tomorrow");
  });
});
