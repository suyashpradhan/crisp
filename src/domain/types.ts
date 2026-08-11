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
  updatedAt?: string;
  bucket: TaskBucket;
};

export type VoiceSessionStatus = "idle" | "recording" | "processing" | "failed";

export type RetainedRecording = {
  createdAt: string;
  durationMs: number;
  fileName: string;
  mimeType: "audio/m4a" | "audio/webm";
  uri: string;
};

export type SessionTask = Pick<Task, "id" | "title" | "dueDate" | "dueTime"> & {
  reference: string;
};

export type AppView = "today" | "later" | "completed";
