import AsyncStorage from "@react-native-async-storage/async-storage";
import { z } from "zod";

import type { Task } from "@/src/domain/types";

const taskStorageKey = "crisp.tasks.v1";

const storedTaskSchema = z.object({
  bucket: z.enum(["today", "later"]),
  createdAt: z.string().datetime(),
  dueDate: z.string().optional(),
  dueTime: z.string().optional(),
  id: z.string().min(1),
  sourceSessionId: z.string().min(1).optional(),
  status: z.enum(["open", "completed"]),
  title: z.string().min(1).max(280),
  updatedAt: z.string().datetime().optional(),
});

const storedTasksSchema = z.array(storedTaskSchema);

export type KeyValueStorage = Pick<typeof AsyncStorage, "getItem" | "setItem">;

export class TaskStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TaskStorageError";
  }
}

export function createTaskStore(storage: KeyValueStorage) {
  return {
    async load(): Promise<Task[] | null> {
      let value: string | null;
      try {
        value = await storage.getItem(taskStorageKey);
      } catch {
        throw new TaskStorageError("Crisp could not load tasks from this device.");
      }
      if (value === null) return null;

      try {
        return storedTasksSchema.parse(JSON.parse(value));
      } catch {
        throw new TaskStorageError("Crisp could not read saved tasks on this device.");
      }
    },
    async save(tasks: Task[]): Promise<void> {
      try {
        const value = JSON.stringify(storedTasksSchema.parse(tasks));
        await storage.setItem(taskStorageKey, value);
      } catch {
        throw new TaskStorageError("Crisp could not save tasks on this device.");
      }
    },
  };
}

export const taskStore = createTaskStore(AsyncStorage);
