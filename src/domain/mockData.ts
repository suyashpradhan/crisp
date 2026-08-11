import type { Task } from "./types";

export const initialTasks: Task[] = [
  {
    id: "task-brief",
    title: "Send the product brief",
    dueTime: "10:00 AM",
    status: "open",
    createdAt: "2026-08-11T08:00:00.000Z",
    bucket: "today",
  },
  {
    id: "task-run",
    title: "Go for a run",
    dueTime: "6:30 PM",
    status: "open",
    createdAt: "2026-08-11T08:01:00.000Z",
    bucket: "today",
  },
  {
    id: "task-rahul",
    title: "Call Rahul",
    dueDate: "Tomorrow",
    dueTime: "3:00 PM",
    status: "open",
    createdAt: "2026-08-11T08:02:00.000Z",
    bucket: "later",
  },
  {
    id: "task-receipt",
    title: "Submit the travel receipt",
    dueDate: "Wednesday",
    status: "completed",
    createdAt: "2026-08-11T08:03:00.000Z",
    bucket: "today",
  },
];
