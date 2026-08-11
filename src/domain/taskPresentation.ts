import type { Task } from "./types";

export function formatTaskMetadata(task: Task, now = new Date()): string | undefined {
  if (task.dueTime) return formatTime(task.dueTime);
  if (task.dueDate) return formatDate(task.dueDate, now);
  return undefined;
}

function formatTime(value: string): string {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return value;
  const hour = Number(match[1]);
  const minute = match[2];
  const suffix = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${minute} ${suffix}`;
}

function formatDate(value: string, now: Date): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return capitalize(value);
  const today = localIsoDate(now);
  const tomorrow = localIsoDate(addDays(now, 1));
  if (value === today) return "Today";
  if (value === tomorrow) return "Tomorrow";
  return value;
}

function localIsoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function capitalize(value: string) {
  return value ? `${value[0]!.toUpperCase()}${value.slice(1)}` : value;
}
