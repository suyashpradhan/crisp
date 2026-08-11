import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Task } from "@/src/domain/types";

const remoteTaskSchema = z.object({
  bucket: z.enum(["today", "later"]),
  created_at: z.string().datetime(),
  due_date: z.string().nullable(),
  due_time: z.string().nullable(),
  id: z.string().min(1),
  source_session_id: z.string().nullable(),
  status: z.enum(["open", "completed"]),
  title: z.string().min(1).max(280),
  updated_at: z.string().datetime(),
  user_id: z.string().min(1),
});

export class TaskSyncError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TaskSyncError";
  }
}

export function mergeTasks(localTasks: Task[], remoteTasks: Task[]): Task[] {
  const merged = new Map(localTasks.map((task) => [task.id, task]));
  for (const remote of remoteTasks) {
    const local = merged.get(remote.id);
    if (!local || timestampFor(remote) > timestampFor(local)) merged.set(remote.id, remote);
  }
  return [...merged.values()].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

export function createSupabaseTaskSync(client: SupabaseClient) {
  return {
    async sync(userId: string, localTasks: Task[]): Promise<Task[]> {
      const uploaded = localTasks.map((task) => remoteTaskFor(task, userId));
      if (uploaded.length > 0) {
        const { error } = await client.rpc("upsert_tasks", { task_rows: uploaded });
        if (error) throw new TaskSyncError("Crisp could not sync tasks right now.");
      }

      const { data, error } = await client
        .from("tasks")
        .select("id,title,due_date,due_time,status,created_at,updated_at,source_session_id,bucket,user_id")
        .eq("user_id", userId);
      if (error) throw new TaskSyncError("Crisp could not load synced tasks right now.");

      const remoteTasks = z.array(remoteTaskSchema).safeParse(data);
      if (!remoteTasks.success) throw new TaskSyncError("Crisp received an invalid task sync response.");
      return mergeTasks(localTasks, remoteTasks.data.map(taskFromRemote));
    },
  };
}

function remoteTaskFor(task: Task, userId: string) {
  return {
    bucket: task.bucket,
    created_at: task.createdAt,
    due_date: task.dueDate ?? null,
    due_time: task.dueTime ?? null,
    id: task.id,
    source_session_id: task.sourceSessionId ?? null,
    status: task.status,
    title: task.title,
    updated_at: timestampFor(task),
    user_id: userId,
  };
}

function taskFromRemote(task: z.infer<typeof remoteTaskSchema>): Task {
  return {
    bucket: task.bucket,
    createdAt: task.created_at,
    ...(task.due_date ? { dueDate: task.due_date } : {}),
    ...(task.due_time ? { dueTime: task.due_time } : {}),
    id: task.id,
    ...(task.source_session_id ? { sourceSessionId: task.source_session_id } : {}),
    status: task.status,
    title: task.title,
    updatedAt: task.updated_at,
  };
}

function timestampFor(task: Task) {
  return task.updatedAt ?? task.createdAt;
}
