import { initialTasks } from "@/src/domain/mockData";
import {
  applySessionOperation,
  createVoiceSession,
  parseSessionOperations,
  type VoiceSessionDraft,
} from "@/src/domain/sessionOperations";
import { interpretTranscript } from "@/src/domain/transcriptInterpreter";
import type { AppView, RetainedRecording, Task, VoiceSessionStatus } from "@/src/domain/types";

export type AppState = {
  activeView: AppView;
  isHydrated: boolean;
  lastRecording: RetainedRecording | null;
  persistenceError: string | null;
  processingError: { message: string; retryable: boolean } | null;
  recordingError: string | null;
  savedCount: number | null;
  session: VoiceSessionDraft | null;
  sessionError: string | null;
  sessionStatus: VoiceSessionStatus;
  tasks: Task[];
};

export type AppAction =
  | { tasks: Task[]; type: "hydrate" }
  | { message: string; type: "hydrateFailed" }
  | { message: string; type: "persistenceFailed" }
  | { recording: RetainedRecording; session: VoiceSessionDraft; type: "restoreSession" }
  | { tasks: Task[]; type: "replaceTasks" }
  | { type: "selectView"; view: AppView }
  | { id: string; startedAt: number; type: "startSession" }
  | { recording: RetainedRecording; type: "recordingStopped" }
  | { message: string; type: "recordingFailed" }
  | { message: string; retryable: boolean; type: "processingFailed" }
  | { type: "retryProcessing" }
  | { type: "discardSession" }
  | { committedAt: number; receivedAt?: Date; transcript: string; type: "transcriptionSucceeded" }
  | { operations: unknown; receivedAt?: Date; transcript: string; type: "turnProcessed" }
  | { committedAt: number; type: "commitLiveSession" }
  | { operations: unknown; receivedAt?: Date; type: "applySessionOperations" }
  | { receivedAt?: Date; transcript: string; type: "applyTranscript" }
  | { type: "toggleTask"; id: string }
  | { type: "dismissSaved" };

export function createInitialState(tasks: Task[] = initialTasks): AppState {
  return {
    activeView: "today",
    isHydrated: false,
    lastRecording: null,
    persistenceError: null,
    processingError: null,
    recordingError: null,
    savedCount: null,
    session: null,
    sessionError: null,
    sessionStatus: "idle",
    tasks,
  };
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "hydrate":
      return { ...state, isHydrated: true, persistenceError: null, tasks: action.tasks };
    case "hydrateFailed":
      return { ...state, isHydrated: true, persistenceError: action.message };
    case "persistenceFailed":
      return { ...state, persistenceError: action.message };
    case "restoreSession":
      return {
        ...state,
        lastRecording: action.recording,
        processingError: { message: "Crisp saved this recording. Continue when you’re ready.", retryable: true },
        session: action.session,
        sessionStatus: "failed",
      };
    case "replaceTasks":
      return { ...state, tasks: action.tasks };
    case "selectView":
      return { ...state, activeView: action.view, savedCount: null };
    case "startSession":
      return {
        ...state,
        lastRecording: null,
        recordingError: null,
        processingError: null,
        savedCount: null,
        session: createVoiceSession(action.id, action.startedAt),
        sessionError: null,
        sessionStatus: "recording",
      };
    case "recordingStopped":
      return state.sessionStatus === "recording"
        ? { ...state, lastRecording: action.recording, processingError: null, sessionStatus: "processing" }
        : state;
    case "recordingFailed":
      return { ...state, recordingError: action.message, sessionStatus: "failed" };
    case "processingFailed":
      return state.session && state.lastRecording
        ? { ...state, processingError: { message: action.message, retryable: action.retryable }, sessionStatus: "failed" }
        : state;
    case "retryProcessing":
      return state.sessionStatus === "failed" && state.session && state.lastRecording
        ? { ...state, processingError: null, sessionError: null, sessionStatus: "processing" }
        : state;
    case "discardSession":
      return {
        ...state,
        lastRecording: null,
        processingError: null,
        recordingError: null,
        session: null,
        sessionError: null,
        sessionStatus: "idle",
      };
    case "transcriptionSucceeded":
      return resolveTranscript(state, action.transcript, action.receivedAt, action.committedAt);
    case "turnProcessed":
      return resolveTurn(state, action.operations, action.transcript, action.receivedAt);
    case "commitLiveSession":
      return commitSession(state, action.committedAt);
    case "applySessionOperations":
      return applyOperations(state, action.operations, action.receivedAt);
    case "applyTranscript":
      return applyTranscript(state, action.transcript, action.receivedAt);
    case "toggleTask":
      return {
        ...state,
        tasks: state.tasks.map((task) =>
          task.id === action.id
            ? { ...task, status: task.status === "open" ? "completed" : "open", updatedAt: new Date().toISOString() }
            : task,
        ),
      };
    case "dismissSaved":
      return { ...state, savedCount: null };
    default:
      return state;
  }
}

function resolveTranscript(state: AppState, transcript: string, receivedAt: Date | undefined, committedAt: number): AppState {
  const applied = applyTranscript(state, transcript, receivedAt);
  if (applied.sessionError || applied.sessionStatus !== "processing" || !applied.session) {
    return {
      ...applied,
      processingError: { message: applied.sessionError ?? "Crisp could not understand that recording.", retryable: false },
      sessionStatus: "failed",
    };
  }
  return commitSession(applied, committedAt);
}

function resolveTurn(state: AppState, operations: unknown, transcript: string, receivedAt: Date | undefined): AppState {
  const applied = applyOperations(state, operations, receivedAt, transcript);
  if (applied.sessionError || applied.sessionStatus !== "processing" || !applied.session) {
    return {
      ...applied,
      processingError: { message: applied.sessionError ?? "Crisp could not understand that spoken thought.", retryable: false },
      sessionStatus: "failed",
    };
  }
  return {
    ...applied,
    lastRecording: null,
    processingError: null,
    sessionStatus: "recording",
  };
}

function commitSession(state: AppState, committedAt: number): AppState {
  if ((state.sessionStatus !== "recording" && state.sessionStatus !== "processing") || !state.session) return state;

  const committedAtIso = new Date(committedAt).toISOString();
  const tasks = state.session.draftTasks.map((draft) => ({
    ...(draft.dueDate ? { dueDate: draft.dueDate } : {}),
    ...(draft.dueTime ? { dueTime: draft.dueTime } : {}),
    bucket: bucketFor(draft.dueDate, committedAt),
    createdAt: committedAtIso,
    id: `task-${state.session!.id}-${draft.reference}`,
    sourceSessionId: state.session!.id,
    status: "open" as const,
    title: draft.title,
    updatedAt: committedAtIso,
  }));

  return {
    ...state,
    lastRecording: null,
    processingError: null,
    savedCount: tasks.length,
    session: null,
    sessionError: null,
    sessionStatus: "idle",
    tasks: [...state.tasks, ...tasks],
  };
}

function bucketFor(dueDate: string | undefined, now: number): "today" | "later" {
  if (!dueDate || dueDate <= localIsoDate(new Date(now))) return "today";
  return "later";
}

function localIsoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function applyTranscript(state: AppState, transcript: string, receivedAt?: Date): AppState {
  try {
    return applyOperations(state, interpretTranscript(transcript), receivedAt, transcript);
  } catch {
    return { ...state, sessionError: "Crisp could not understand that session change." };
  }
}

function applyOperations(state: AppState, input: unknown, receivedAt = new Date(), transcript?: string): AppState {
  if ((state.sessionStatus !== "recording" && state.sessionStatus !== "processing") || !state.session) return state;

  try {
    const operations = parseSessionOperations(input);
    let session = state.session;
    for (const operation of operations) {
      const result = applySessionOperation(session, operation, receivedAt);
      if (result.error) return { ...state, sessionError: result.error.message };
      session = result.session;
    }
    return { ...state, session: transcript ? { ...session, transcript } : session, sessionError: null };
  } catch {
    return { ...state, sessionError: "Crisp could not understand that session change." };
  }
}
