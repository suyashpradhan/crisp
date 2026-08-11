import { mockedSessionTasks } from "@/src/domain/mockData";
import type { AppView, SessionTask, Task, VoiceSessionStatus } from "@/src/domain/types";

export type AppState = {
  activeView: AppView;
  sessionStatus: VoiceSessionStatus;
  sessionTasks: SessionTask[];
  tasks: Task[];
  sessionStartedAt?: number;
  savedCount: number | null;
};

export type AppAction =
  | { type: "selectView"; view: AppView }
  | { type: "startSession"; startedAt: number }
  | { type: "stopSession" }
  | { type: "finishProcessing" }
  | { type: "toggleTask"; id: string }
  | { type: "dismissSaved" };

export function createInitialState(tasks: Task[]): AppState {
  return {
    activeView: "today",
    sessionStatus: "idle",
    sessionTasks: [],
    tasks,
    savedCount: null,
  };
}

function draftToTask(draft: SessionTask): Task {
  const isLater = draft.dueDate === "Tomorrow" || draft.dueDate === "Wednesday";

  return {
    id: `task-${draft.id}`,
    title: draft.title,
    dueDate: draft.dueDate,
    dueTime: draft.dueTime,
    status: "open",
    createdAt: "2026-08-11T09:00:00.000Z",
    sourceSessionId: "mock-session",
    bucket: isLater ? "later" : "today",
  };
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "selectView":
      return { ...state, activeView: action.view, savedCount: null };
    case "startSession":
      return {
        ...state,
        sessionStatus: "recording",
        sessionStartedAt: action.startedAt,
        sessionTasks: mockedSessionTasks,
        savedCount: null,
      };
    case "stopSession":
      return state.sessionStatus === "recording"
        ? { ...state, sessionStatus: "processing" }
        : state;
    case "finishProcessing": {
      const committedTasks = state.sessionTasks.map(draftToTask);
      return {
        ...state,
        sessionStatus: "idle",
        sessionTasks: [],
        sessionStartedAt: undefined,
        tasks: [...committedTasks, ...state.tasks],
        savedCount: committedTasks.length,
      };
    }
    case "toggleTask":
      return {
        ...state,
        tasks: state.tasks.map((task) =>
          task.id === action.id
            ? { ...task, status: task.status === "open" ? "completed" : "open" }
            : task,
        ),
      };
    case "dismissSaved":
      return { ...state, savedCount: null };
    default:
      return state;
  }
}
