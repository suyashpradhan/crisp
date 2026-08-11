export type TaskStatus = "open" | "completed";
export type TaskBucket = "today" | "later";

export type Task = {
  id: string;
  title: string;
  dueDate?: string;
  dueTime?: string;
  status: TaskStatus;
  createdAt: string;
  sourceSessionId?: string;
  bucket: TaskBucket;
};

export type VoiceSessionStatus = "idle" | "recording" | "processing";

export type SessionTask = Pick<Task, "id" | "title" | "dueDate" | "dueTime"> & {
  reference: number;
};

export type AppView = "today" | "later" | "completed";
