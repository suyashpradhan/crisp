import {
  AccessibilityInfo,
  Keyboard,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import {
  InstrumentSans_400Regular,
  InstrumentSans_500Medium,
} from "@expo-google-fonts/instrument-sans";
import { InstrumentSerif_400Regular } from "@expo-google-fonts/instrument-serif";
import { JetBrainsMono_400Regular } from "@expo-google-fonts/jetbrains-mono";
import { useFonts } from "expo-font";
import Animated, { FadeIn, FadeInUp, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { discardRetainedRecording, useVoiceRecorder } from "@/src/audio/useVoiceRecorder";
import { useSilenceMonitor } from "@/src/audio/silenceMonitor";
import { AudioMeter } from "@/src/components/AudioMeter";
import { RecordingButton } from "@/src/components/RecordingButton";
import { TaskRow } from "@/src/components/TaskRow";
import { colors, fontFamily, layout } from "@/src/design/tokens";
import { recordingStarted, recordingStopped, sessionCommitted, taskCompletionChanged } from "@/src/haptics/feedback";
import { initialTasks } from "@/src/domain/mockData";
import type { AppView, Task } from "@/src/domain/types";
import type { SessionDraftTask } from "@/src/domain/sessionOperations";
import { appReducer, createInitialState } from "@/src/state/appReducer";
import { taskStore } from "@/src/storage/taskStore";
import { sessionStore } from "@/src/storage/sessionStore";
import { TranscriptionClientError, transcribeRecording } from "@/src/transcription/client";
import { useTaskSync } from "@/src/sync/useTaskSync";
import { useLiveVoiceStream } from "@/src/live/useLiveVoiceStream";

const navItems: { label: string; view: AppView }[] = [
  { label: "Today", view: "today" },
  { label: "Later", view: "later" },
  { label: "Done", view: "completed" },
];

const captureExamples = ["Buy groceries", "Call someone at 5 PM", "Send the meeting notes", "Book the dentist"];

export function CrispApp() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [state, dispatch] = useReducer(appReducer, initialTasks, createInitialState);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [captureBusy, setCaptureBusy] = useState(false);
  const processingInFlight = useRef(false);
  const voiceRecorderRef = useRef<ReturnType<typeof useVoiceRecorder> | null>(null);
  const beginOrStopRecordingRef = useRef<() => void>(() => undefined);
  const stopRecordingRef = useRef<() => void>(() => undefined);
  const voiceRecorder = useVoiceRecorder();
  const liveVoice = useLiveVoiceStream({
    onFailure: (failure) => dispatch({ message: failure.message, type: "recordingFailed" }),
    onTurn: (turn) => dispatch({ operations: turn.operations, transcript: turn.transcript, type: "turnProcessed" }),
  });
  const [fontsLoaded] = useFonts({
    InstrumentSans_400Regular,
    InstrumentSans_500Medium,
    InstrumentSerif_400Regular,
    JetBrainsMono_400Regular,
  });

  const isRecording = state.sessionStatus === "recording";
  const isProcessing = state.sessionStatus === "processing";
  const inSession = isRecording || isProcessing || (state.sessionStatus === "failed" && state.session !== null);
  const isDesktop = width >= layout.desktopBreakpoint;
  const isTablet = width >= layout.tabletBreakpoint && !isDesktop;
  const contentGutter = isDesktop
    ? layout.desktopGutter
    : isTablet
      ? layout.tabletGutter
      : layout.mobileGutter;
  const usingLiveVoice = liveVoice.available;
  const { isStreaming: isLiveStreaming, stop: stopLiveVoice, updateSession: updateLiveSession } = liveVoice;
  const activeMetering = usingLiveVoice ? liveVoice.metering : voiceRecorder.metering;
  const hasActiveMetering = usingLiveVoice ? liveVoice.hasMetering : voiceRecorder.hasMetering;
  const activeCaptureError = usingLiveVoice ? liveVoice.error : voiceRecorder.error;
  const captureActionLabel = activeCaptureError && "actionLabel" in activeCaptureError
    ? activeCaptureError.actionLabel
    : undefined;
  const silence = useSilenceMonitor({
    active: isRecording,
    hasMetering: hasActiveMetering,
    level: activeMetering,
    onAutoStop: () => { void commitAfterIdle(); },
    onTurnBoundary: usingLiveVoice ? () => undefined : () => { void stopCurrentTurn(); },
  });
  useTaskSync(state.tasks, (tasks) => dispatch({ tasks, type: "replaceTasks" }));

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const listener = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => listener.remove();
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable || ["INPUT", "SELECT", "TEXTAREA"].includes(target?.tagName ?? "")) return;
      if (event.code === "Space") {
        event.preventDefault();
        if (!isRecording) beginOrStopRecordingRef.current();
      }
      if (event.code === "Escape" && isRecording) {
        event.preventDefault();
        stopRecordingRef.current();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isRecording]);

  useEffect(() => {
    voiceRecorderRef.current = voiceRecorder;
  }, [voiceRecorder]);

  useEffect(() => {
    if (isRecording && state.session && isLiveStreaming) {
      updateLiveSession(state.session);
    }
  }, [isLiveStreaming, isRecording, state.session, updateLiveSession]);

  useEffect(() => {
    if (state.sessionStatus === "failed" && isLiveStreaming) stopLiveVoice();
  }, [isLiveStreaming, state.sessionStatus, stopLiveVoice]);

  useEffect(() => {
    let active = true;
    void Promise.all([taskStore.load(), sessionStore.load().catch(() => null)])
      .then(([tasks, recovered]) => {
        if (active) {
          dispatch({ tasks: tasks ?? [], type: "hydrate" });
          if (recovered) dispatch({ ...recovered, type: "restoreSession" });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          dispatch({
            message: error instanceof Error ? error.message : "Crisp could not load tasks from this device.",
            type: "hydrateFailed",
          });
        }
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!state.isHydrated) return;
    void taskStore.save(state.tasks).catch((error: unknown) => {
      dispatch({
        message: error instanceof Error ? error.message : "Crisp could not save tasks on this device.",
        type: "persistenceFailed",
      });
    });
  }, [state.isHydrated, state.tasks]);

  useEffect(() => {
    if (!state.isHydrated) return;
    const recoverable = state.session && state.lastRecording
      && (state.sessionStatus === "processing" || state.sessionStatus === "failed")
      ? { recording: state.lastRecording, session: state.session }
      : null;
    const update = recoverable ? sessionStore.save(recoverable) : sessionStore.clear();
    void update.catch(() => undefined);
  }, [state.isHydrated, state.lastRecording, state.session, state.sessionStatus]);

  useEffect(() => {
    if (!isProcessing || processingInFlight.current || !state.session || !state.lastRecording) return;

    let active = true;
    const recording = state.lastRecording;
    processingInFlight.current = true;
    void transcribeRecording(recording, state.session)
      .then(async (result) => {
        if (!active) return;
        const nextTurn = await voiceRecorderRef.current!.start();
        if (!nextTurn.ok) {
          dispatch({ message: nextTurn.error.message, type: "recordingFailed" });
          return;
        }
        recordingStarted();
        dispatch({
          operations: result.operations,
          transcript: result.transcript,
          type: "turnProcessed",
        });
        discardRetainedRecording(recording);
      })
      .catch((error: unknown) => {
        if (!active) return;
        dispatch({
          message: error instanceof Error ? error.message : "Crisp could not transcribe this recording. Try again.",
          retryable: error instanceof TranscriptionClientError ? error.retryable : true,
          type: "processingFailed",
        });
      })
      .finally(() => {
        processingInFlight.current = false;
      });

    return () => { active = false; };
  }, [isProcessing, state.lastRecording, state.session]);

  useEffect(() => {
    if (state.savedCount === null) return;
    sessionCommitted();
    const timeout = setTimeout(() => dispatch({ type: "dismissSaved" }), 2200);
    return () => clearTimeout(timeout);
  }, [state.savedCount]);

  const visibleTasks = useMemo(() => {
    if (state.activeView === "completed") {
      return state.tasks.filter((task) => task.status === "completed");
    }
    if (state.activeView === "today") {
      return state.tasks.filter((task) => task.status === "open");
    }
    return state.tasks.filter(
      (task) => task.status === "open" && task.bucket === state.activeView,
    );
  }, [state.activeView, state.tasks]);

  async function stopCurrentTurn() {
    if (captureBusy || !isRecording) return;
    setCaptureBusy(true);
    const result = await voiceRecorder.stop();
    if (result.ok) {
      recordingStopped();
      dispatch({ type: "recordingStopped", recording: result.recording });
    } else {
      dispatch({ message: result.error.message, type: "recordingFailed" });
    }
    setCaptureBusy(false);
  }

  async function commitAfterIdle() {
    if (captureBusy || !isRecording) return;
    setCaptureBusy(true);
    if (usingLiveVoice) {
      liveVoice.stop();
      dispatch({ committedAt: Date.now(), type: "commitLiveSession" });
      setCaptureBusy(false);
      return;
    }
    const result = await voiceRecorder.stop();
    if (result.ok) {
      discardRetainedRecording(result.recording);
      dispatch({ committedAt: Date.now(), type: "commitLiveSession" });
    } else {
      dispatch({ message: result.error.message, type: "recordingFailed" });
    }
    setCaptureBusy(false);
  }

  async function beginRecording() {
    if (captureBusy || isProcessing) return;
    Keyboard.dismiss();
    if (state.lastRecording) discardRetainedRecording(state.lastRecording);
    setCaptureBusy(true);
    const id = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    if (usingLiveVoice) {
      const result = await liveVoice.start({ draftTasks: [], id });
      if (result.ok) {
        recordingStarted();
        dispatch({ id, startedAt: Date.now(), type: "startSession" });
      } else {
        dispatch({ message: result.error.message, type: "recordingFailed" });
      }
      setCaptureBusy(false);
      return;
    }
    const result = await voiceRecorder.start();
    if (result.ok) {
      recordingStarted();
      dispatch({
        id,
        startedAt: Date.now(),
        type: "startSession",
      });
    } else {
      dispatch({ message: result.error.message, type: "recordingFailed" });
    }
    setCaptureBusy(false);
  }

  function toggleTask(id: string) {
    taskCompletionChanged();
    dispatch({ type: "toggleTask", id });
  }

  function startFreshAfterFailure() {
    liveVoice.stop();
    if (state.lastRecording) discardRetainedRecording(state.lastRecording);
    dispatch({ type: "discardSession" });
    void beginRecording();
  }

  useEffect(() => {
    beginOrStopRecordingRef.current = () => { void beginRecording(); };
    stopRecordingRef.current = () => { void commitAfterIdle(); };
  });

  if (!fontsLoaded || !state.isHydrated) {
    return <View style={styles.loading} />;
  }

  // Recording is a focused action, not a different product. The workspace stays
  // visually stable so people can keep their place while they talk.
  const appBackground = colors.surfaceLight;
  const canvasBackground = colors.canvasLight;
  const workspaceWidth = layout.workspaceWidth;

  return (
    <View style={[styles.canvas, { backgroundColor: canvasBackground }]}> 
      <StatusBar style="dark" />
      {isDesktop ? (
        <DesktopRail
          activeView={state.activeView}
          onSelect={(view) => dispatch({ type: "selectView", view })}
        />
      ) : null}
      <View
        style={[
          styles.workspace,
          {
            backgroundColor: appBackground,
            marginLeft: isDesktop ? layout.desktopRail : 0,
            maxWidth: isDesktop || isTablet ? workspaceWidth : undefined,
          },
        ]}
      >
        {!isDesktop ? (
          <MobileHeader
            activeView={state.activeView}
            disabled={false}
            onToggleCompleted={() =>
              dispatch({ type: "selectView", view: state.activeView === "completed" ? "today" : "completed" })
            }
            topInset={insets.top}
          />
        ) : null}
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: isDesktop ? 210 : 220 + insets.bottom,
              paddingHorizontal: contentGutter,
              paddingTop: isDesktop ? 34 : 64 + insets.top,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <SessionBoard
            draftTasks={state.session?.draftTasks ?? []}
            failureMessage={state.processingError?.message ?? state.recordingError}
            hasFailure={state.sessionStatus === "failed"}
            isProcessing={isProcessing}
            reduceMotion={reduceMotion}
            wide={isDesktop || isTablet}
          />
          <TaskSurface
            activeView={state.activeView}
            onOpenTask={setSelectedTask}
            onToggleTask={toggleTask}
            recessed={false}
            reduceMotion={reduceMotion}
            suppressEmpty={inSession && (state.session?.draftTasks.length ?? 0) > 0}
            tasks={visibleTasks}
            web={isDesktop}
          />
        </ScrollView>
        <LinearGradient
          colors={["transparent", colors.surfaceLight]}
          style={[
            styles.dockGradient,
            { paddingBottom: Math.max(insets.bottom, isDesktop ? 32 : 30), paddingHorizontal: contentGutter, pointerEvents: "box-none" },
          ]}
        >
          {state.savedCount !== null ? (
            <Animated.View entering={FadeInUp.duration(320)} style={styles.toast}>
              <Text style={styles.toastText}>{state.savedCount === 0 ? "Saved" : `${state.savedCount} added`}</Text>
            </Animated.View>
          ) : null}
          {!inSession && (state.recordingError || state.processingError || state.persistenceError) ? (
            <View accessibilityRole="alert" style={styles.captureError}>
              <View style={styles.captureErrorCopy}>
                <Text style={styles.captureErrorTitle}>
                  {state.processingError?.message.includes("not configured")
                    ? "Connect Sarvam to save spoken tasks"
                    : state.processingError ? "This recording needs attention" : state.persistenceError ? "Crisp could not save tasks" : "Crisp couldn’t start listening"}
                </Text>
                <Text style={styles.captureErrorMessage}>
                  {state.processingError?.message ?? state.persistenceError ?? state.recordingError}
                </Text>
              </View>
              {state.processingError?.retryable ? (
                <Pressable onPress={() => dispatch({ type: "retryProcessing" })} style={styles.captureErrorAction}>
                  <Text style={styles.captureErrorActionText}>Try again</Text>
                </Pressable>
              ) : captureActionLabel ? (
                <Pressable onPress={() => void Linking.openSettings()} style={styles.captureErrorAction}>
                  <Text style={styles.captureErrorActionText}>{captureActionLabel}</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
          <View style={[styles.captureDock, isDesktop && styles.webCaptureDock]}>
            {inSession ? (
              <AudioMeter
                active={isRecording}
                level={activeMetering}
                prominent
                reduceMotion={reduceMotion}
              />
            ) : null}
            <RecordingButton
              level={activeMetering}
              onPress={state.sessionStatus === "failed"
                ? startFreshAfterFailure
                : isRecording
                  ? () => void commitAfterIdle()
                  : beginRecording}
              pendingCount={state.session?.draftTasks.length ?? 0}
              quiet={silence.quiet}
              reduceMotion={reduceMotion}
              status={state.sessionStatus}
              web={isDesktop}
            />
          </View>
        </LinearGradient>
      </View>
      {selectedTask ? <EditSheet onClose={() => setSelectedTask(null)} task={selectedTask} /> : null}
    </View>
  );
}

function DesktopRail({ activeView, onSelect }: { activeView: AppView; onSelect: (view: AppView) => void }) {
  return (
    <View style={styles.rail}>
      <Text style={styles.wordmark}>crisp</Text>
      <View accessibilityRole="tablist" style={styles.railNav}>
        {navItems.map((item) => (
          <NavButton
            active={activeView === item.view}
            disabled={false}
            key={item.view}
            label={item.label}
            onPress={() => onSelect(item.view)}
          />
        ))}
      </View>
    </View>
  );
}

type SessionBoardProps = {
  draftTasks: SessionDraftTask[];
  failureMessage: string | null;
  hasFailure: boolean;
  isProcessing: boolean;
  reduceMotion: boolean;
  wide: boolean;
};

function SessionBoard({
  draftTasks,
  failureMessage,
  hasFailure,
  isProcessing,
  reduceMotion,
  wide,
}: SessionBoardProps) {
  if (!draftTasks.length && !hasFailure && !isProcessing) return null;

  return (
    <View accessibilityLiveRegion="polite" style={[styles.sessionBoard, wide && styles.sessionBoardWide]}>
      {hasFailure && failureMessage ? (
        <Text accessibilityRole="alert" style={styles.sessionBoardError}>{failureMessage}</Text>
      ) : null}
      <View style={[styles.sessionBoardCards, wide && styles.sessionBoardCardsWide]}>
        {draftTasks.map((task, index) => (
          <Animated.View
            entering={reduceMotion ? FadeIn.duration(100) : FadeInUp.delay(index * 70).duration(320)}
            key={task.id}
            style={[wide && styles.sessionBoardCardWide, zigZagStyle(index, wide)]}
          >
            <FloatingSessionCard index={index} reduceMotion={reduceMotion} task={task} />
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

function ExampleCarousel({ reduceMotion }: { reduceMotion: boolean }) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (reduceMotion) return;
    const interval = setInterval(() => setActiveIndex((index) => (index + 1) % captureExamples.length), 2600);
    return () => clearInterval(interval);
  }, [reduceMotion]);

  return (
    <Animated.View entering={FadeIn.duration(280)} key={activeIndex} style={styles.exampleCarousel}>
      <Text style={styles.exampleCarouselText}>{captureExamples[activeIndex]}</Text>
    </Animated.View>
  );
}

function FloatingSessionCard({ index, reduceMotion, task }: { index: number; reduceMotion: boolean; task: SessionDraftTask }) {
  const lift = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      lift.value = 0;
      return;
    }
    lift.value = withDelay(
      index * 170,
      withRepeat(
        withSequence(withTiming(1, { duration: 1600 + (index % 3) * 220 }), withTiming(0, { duration: 1600 + (index % 3) * 220 })),
        -1,
        false,
      ),
    );
  }, [index, lift, reduceMotion]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -lift.value * 7 }, { rotate: `${(index % 2 === 0 ? -1 : 1) * lift.value * 0.5}deg` }],
  }));
  const haloStyle = useAnimatedStyle(() => ({ opacity: 0.08 + lift.value * 0.1, transform: [{ scale: 0.94 + lift.value * 0.12 }] }));

  return (
    <View style={styles.floatingCardWrap}>
      <Animated.View style={[styles.floatingCardHalo, haloStyle, { pointerEvents: "none" }]} />
      <Animated.View style={cardStyle}><VoiceSessionCard task={task} /></Animated.View>
    </View>
  );
}

function VoiceSessionCard({ task }: { task: SessionDraftTask }) {
  const due = [task.dueDate, task.dueTime].filter(Boolean).join(" · ");
  return (
    <View accessibilityLabel={`Session item ${task.reference}, ${task.title}`} style={styles.voiceSessionCard}>
      <View style={styles.voiceSessionCheckbox} />
      <View style={styles.voiceSessionCopy}>
        <Text style={styles.voiceSessionTitle}>{task.title}</Text>
        {due ? <Text style={styles.voiceSessionDue}>{due}</Text> : null}
      </View>
      <Text style={styles.voiceSessionRef}>{task.reference.padStart(2, "0")}</Text>
    </View>
  );
}

function zigZagStyle(index: number, wide: boolean) {
  const direction = index % 2 === 0 ? -1 : 1;
  return {
    transform: [
      { translateX: wide ? direction * (26 + (index % 3) * 8) : direction * 11 },
      { translateY: wide ? (index % 3 - 1) * 10 : 0 },
    ],
  };
}

type MobileHeaderProps = {
  activeView: AppView;
  disabled: boolean;
  onToggleCompleted: () => void;
  topInset: number;
};

function MobileHeader({ activeView, disabled, onToggleCompleted, topInset }: MobileHeaderProps) {
  return (
    <View
      style={[styles.mobileHeader, { opacity: disabled ? 0 : 1, paddingTop: topInset + 10, pointerEvents: disabled ? "none" : "auto" }]}
    >
      <Text style={styles.mobileWordmark}>crisp</Text>
      <Pressable accessibilityRole="button" disabled={disabled} onPress={onToggleCompleted} style={styles.mobileDoneButton}>
        <Text style={styles.mobileDoneText}>{activeView === "completed" ? "Back" : "Done"}</Text>
      </Pressable>
    </View>
  );
}

type NavButtonProps = {
  active: boolean;
  disabled: boolean;
  label: string;
  onPress: () => void;
};

function NavButton({ active, disabled, label, onPress }: NavButtonProps) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ disabled, selected: active }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.navButton, active && styles.navButtonActive]}
    >
      <Text style={[styles.navLabel, active && styles.navLabelActive]}>{label}</Text>
    </Pressable>
  );
}

type TaskSurfaceProps = {
  activeView: AppView;
  onOpenTask: (task: Task) => void;
  onToggleTask: (id: string) => void;
  recessed: boolean;
  reduceMotion: boolean;
  suppressEmpty: boolean;
  tasks: Task[];
  web: boolean;
};

function TaskSurface({ activeView, onOpenTask, onToggleTask, recessed, reduceMotion, suppressEmpty, tasks, web }: TaskSurfaceProps) {
  const emptyTitle = activeView === "completed" ? "Nothing finished yet today." : "Nothing here yet.";

  if (tasks.length === 0) {
    if (suppressEmpty) return null;
    return (
      <View style={[styles.emptyState, recessed && styles.recessedSurface]}>
        <EmptyStatePulse />
        <Text style={[styles.emptyHeadline, web && styles.webEmptyHeadline]}>{emptyTitle}</Text>
        {activeView !== "completed" ? <ExampleCarousel reduceMotion={reduceMotion} /> : null}
      </View>
    );
  }

  const todayTasks = tasks.filter((task) => task.bucket === "today");
  const laterTasks = tasks.filter((task) => task.bucket === "later");
  const groups = activeView === "today"
    ? [
        { label: "TODAY", tasks: todayTasks },
        { label: "LATER", tasks: laterTasks },
      ].filter((group) => group.tasks.length > 0)
    : [{ label: activeView === "completed" ? "COMPLETED TODAY" : "LATER", tasks }];

  return (
    <View style={recessed ? styles.recessedSurface : undefined}>
      {groups.map((group, groupIndex) => (
        <View key={group.label} style={groupIndex > 0 ? styles.sectionGap : undefined}>
          <Text accessibilityRole="header" style={[styles.sectionLabel, web && styles.webSectionLabel]}>{group.label}</Text>
          {group.tasks.map((task) => (
            <TaskRow
              key={task.id}
              onOpen={() => onOpenTask(task)}
              onToggle={() => onToggleTask(task.id)}
              recessed={recessed}
              task={task}
              web={web}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

function EmptyStatePulse() {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(withTiming(1, { duration: 1500 }), withTiming(0, { duration: 1500 })),
      -1,
      false,
    );
  }, [pulse]);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.12 + pulse.value * 0.16,
    transform: [{ scale: 0.88 + pulse.value * 0.18 }],
  }));

  return (
    <View accessibilityElementsHidden style={styles.emptyPulse}>
      <Animated.View style={[styles.emptyPulseHalo, haloStyle]} />
      <View style={styles.emptyPulseDot} />
      <View style={[styles.emptyPulseDot, styles.emptyPulseDotSmall]} />
    </View>
  );
}

function EditSheet({ onClose, task }: { onClose: () => void; task: Task }) {
  return (
    <View accessibilityViewIsModal style={styles.sheetLayer}>
      <Pressable accessibilityLabel="Close edit task" onPress={onClose} style={styles.scrim} />
      <View style={styles.sheet}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetLabel}>EDIT TASK</Text>
          <Pressable accessibilityRole="button" onPress={onClose}><Text style={styles.doneText}>Done</Text></Pressable>
        </View>
        <Text style={styles.sheetTitle}>{task.title}</Text>
        <View style={styles.chipRow}>
          {["No time", "9:00 AM", "11:00 AM", "3:00 PM", "Tomorrow", "Wednesday"].map((label) => (
            <View key={label} style={styles.chip}><Text style={styles.chipText}>{label}</Text></View>
          ))}
        </View>
        <Text style={styles.deleteText}>Delete task</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: { flex: 1 },
  captureError: { alignItems: "center", backgroundColor: colors.surfaceRaisedLight, borderColor: colors.borderLight, borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 12, marginBottom: 12, paddingHorizontal: 14, paddingVertical: 12 },
  captureErrorAction: { minHeight: 36, justifyContent: "center", paddingHorizontal: 4 },
  captureErrorActionText: { color: colors.textPrimaryLight, fontFamily: fontFamily.sansMedium, fontSize: 13 },
  captureErrorActionTextRecording: { color: colors.textPrimaryRecording },
  captureErrorCopy: { flex: 1, gap: 2 },
  captureErrorMessage: { color: colors.textSecondaryLight, fontFamily: fontFamily.sans, fontSize: 12.5, lineHeight: 17 },
  captureErrorMessageRecording: { color: colors.textSecondaryRecording },
  captureErrorRecording: { backgroundColor: colors.surfaceRaisedRecording, borderColor: colors.borderRecording },
  captureErrorTitle: { color: colors.textPrimaryLight, fontFamily: fontFamily.sansMedium, fontSize: 13 },
  captureErrorTitleRecording: { color: colors.textPrimaryRecording },
  captureControls: { alignItems: "center", flexDirection: "row", gap: 10 },
  captureCopy: { flex: 1, gap: 3, paddingRight: 10 },
  captureDescription: { color: colors.textSecondaryLight, fontFamily: fontFamily.sans, fontSize: 13, lineHeight: 18, maxWidth: 280 },
  capturePanel: { alignItems: "center", backgroundColor: colors.surfaceRaisedLight, borderColor: colors.borderLight, borderRadius: 18, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 13 },
  captureStatus: { alignItems: "center", flexDirection: "row", gap: 7, justifyContent: "center", marginTop: 9 },
  captureStatusText: { color: colors.textSecondaryLight, fontFamily: fontFamily.sans, fontSize: 12.5 },
  captureTitle: { color: colors.textPrimaryLight, fontFamily: fontFamily.sansMedium, fontSize: 15 },
  chip: { borderColor: colors.borderLight, borderRadius: 9999, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 22 },
  chipText: { color: colors.textPrimaryLight, fontFamily: fontFamily.sansMedium, fontSize: 13 },
  deleteText: { color: colors.textSecondaryLight, fontFamily: fontFamily.sans, fontSize: 15, marginTop: 28 },
  captureDock: { alignItems: "center", flexDirection: "row", gap: 20, justifyContent: "center", minHeight: 56 },
  dock: { alignItems: "center", gap: 10, justifyContent: "center" },
  dockGradient: { bottom: 0, left: 0, paddingTop: 70, position: "absolute", right: 0 },
  doneText: { color: colors.textPrimaryLight, fontFamily: fontFamily.sansMedium, fontSize: 15 },
  emptyBody: { color: colors.textSecondaryLight, fontFamily: fontFamily.sans, fontSize: 16, lineHeight: 23, marginTop: 12, maxWidth: 250, textAlign: "center" },
  emptyHeadline: { color: colors.textPrimaryLight, fontFamily: fontFamily.serif, fontSize: 37, lineHeight: 40, textAlign: "center" },
  emptyPulse: { alignItems: "center", height: 58, justifyContent: "center", marginBottom: 20, width: 58 },
  emptyPulseDot: { backgroundColor: colors.ember, borderRadius: 9999, height: 10, width: 10 },
  emptyPulseDotSmall: { backgroundColor: colors.textTertiaryLight, height: 5, marginLeft: 24, marginTop: -2, width: 5 },
  emptyPulseHalo: { backgroundColor: colors.ember, borderRadius: 9999, height: 46, position: "absolute", width: 46 },
  emptyState: { alignItems: "center", justifyContent: "center", minHeight: 520, paddingBottom: 60 },
  exampleCarousel: { alignItems: "center", backgroundColor: "rgba(232,137,76,0.09)", borderRadius: 9999, marginTop: 22, paddingHorizontal: 19, paddingVertical: 10 },
  exampleCarouselText: { color: colors.emberLight, fontFamily: fontFamily.sansMedium, fontSize: 15.5, letterSpacing: -0.18 },
  floatingCardHalo: { backgroundColor: colors.ember, borderRadius: 20, bottom: -8, left: 16, opacity: 0.12, position: "absolute", right: 16, top: 8 },
  floatingCardWrap: { position: "relative" },
  finishButton: { alignItems: "center", backgroundColor: colors.textPrimaryLight, borderRadius: 9999, justifyContent: "center", minHeight: 46, paddingHorizontal: 17 },
  finishButtonText: { color: colors.surfaceRaisedLight, fontFamily: fontFamily.sansMedium, fontSize: 13.5 },
  keyboardHint: { color: colors.textTertiaryLight, fontFamily: fontFamily.mono, fontSize: 10, letterSpacing: 1.2, marginTop: 10, textAlign: "center" },
  listeningHint: { color: colors.textSecondaryRecording, fontFamily: fontFamily.sans, fontSize: 14.5, lineHeight: 20, marginBottom: 16, textAlign: "center" },
  loading: { backgroundColor: colors.surfaceLight, flex: 1 },
  liveSessionLabel: { color: colors.textTertiaryLight, fontFamily: fontFamily.mono, fontSize: 9.5, letterSpacing: 1.25, marginBottom: 8, textAlign: "center" },
  liveSessionScroll: { maxHeight: 158 },
  liveSessionStack: { alignSelf: "center", marginBottom: 10, maxHeight: 178, maxWidth: 570, width: "100%" },
  mobileHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", left: 0, paddingHorizontal: 24, position: "absolute", right: 0, top: 0, zIndex: 4 },
  mobileDoneButton: { minHeight: 44, justifyContent: "center", paddingHorizontal: 4 },
  mobileDoneText: { color: colors.textPrimaryLight, fontFamily: fontFamily.sansMedium, fontSize: 14.5 },
  mobileWordmark: { color: colors.textPrimaryLight, fontFamily: fontFamily.serif, fontSize: 21, letterSpacing: -0.2 },
  navButton: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9 },
  navButtonActive: { backgroundColor: "rgba(33,30,27,0.05)" },
  navLabel: { color: colors.textSecondaryLight, fontFamily: fontFamily.sans, fontSize: 15 },
  navLabelActive: { color: colors.textPrimaryLight, fontFamily: fontFamily.sansMedium },
  rail: { borderRightColor: "rgba(0,0,0,0.06)", borderRightWidth: 1, bottom: 0, left: 0, paddingHorizontal: 26, paddingTop: 30, position: "absolute", top: 0, width: layout.desktopRail, zIndex: 3 },
  railHidden: { opacity: 0 },
  railNav: { gap: 4, marginTop: 42 },
  recordingDock: { backgroundColor: colors.surfaceRaisedRecording, borderColor: colors.borderRecording, borderWidth: 1, borderRadius: 9999, paddingHorizontal: 16, paddingVertical: 10 },
  recordingKeyboardHint: { color: colors.textTertiaryRecording },
  recordingStatusText: { color: colors.textSecondaryRecording },
  recordingBoard: { position: "absolute", zIndex: 2 },
  recessedSurface: { opacity: 0.05, transform: [{ scale: 0.985 }, { translateY: -10 }] },
  scrim: { backgroundColor: "rgba(24,20,16,0.26)", bottom: 0, left: 0, position: "absolute", right: 0, top: 0 },
  scrollContent: { flexGrow: 1 },
  sessionBoard: { alignSelf: "center", marginBottom: 30, maxWidth: 480, width: "100%" },
  sessionBoardCardWide: { flexBasis: "47%", flexGrow: 1, maxWidth: 360 },
  sessionBoardCards: { gap: 16, width: "100%" },
  sessionBoardCardsWide: { flexDirection: "row", flexWrap: "wrap", gap: 22, maxWidth: 620 },
  sessionBoardError: { color: colors.textSecondaryLight, fontFamily: fontFamily.sans, fontSize: 13, lineHeight: 19, marginBottom: 14, textAlign: "center" },
  sessionBoardWide: { maxWidth: 620 },
  sectionGap: { marginTop: 26 },
  sectionLabel: { color: colors.textTertiaryLight, fontFamily: fontFamily.mono, fontSize: 10, letterSpacing: 1.5, lineHeight: 12, marginBottom: 9 },
  sheet: { backgroundColor: colors.surfaceRaisedLight, borderTopLeftRadius: 26, borderTopRightRadius: 26, bottom: 0, left: 0, paddingBottom: 46, paddingHorizontal: 24, paddingTop: 22, position: "absolute", right: 0 },
  sheetHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  sheetLabel: { color: colors.textTertiaryLight, fontFamily: fontFamily.mono, fontSize: 10, letterSpacing: 1.5 },
  sheetLayer: { bottom: 0, left: 0, position: "absolute", right: 0, top: 0, zIndex: 10 },
  sheetTitle: { borderBottomColor: colors.borderLight, borderBottomWidth: 1, color: colors.textPrimaryLight, fontFamily: fontFamily.sans, fontSize: 22, lineHeight: 30, marginTop: 28, paddingBottom: 12 },
  statusBlock: { alignItems: "center", flexDirection: "row", gap: 7, minHeight: 17 },
  statusDot: { backgroundColor: colors.ember, borderRadius: 9999, height: 6, width: 6 },
  statusDotProcessing: { backgroundColor: colors.textTertiaryLight },
  statusText: { color: colors.textSecondaryLight, fontFamily: fontFamily.sans, fontSize: 13, letterSpacing: -0.05 },
  timer: { color: colors.textTertiaryRecording, fontFamily: fontFamily.mono, fontSize: 12.5, fontVariant: ["tabular-nums"] },
  toast: { backgroundColor: colors.textPrimaryLight, borderRadius: 9999, marginBottom: 12, paddingHorizontal: 16, paddingVertical: 10 },
  toastText: { color: "#FDFBF7", fontFamily: fontFamily.sans, fontSize: 13.5 },
  webDock: { alignSelf: "center", backgroundColor: colors.surfaceRaisedLight, borderColor: "#E2DACF", borderRadius: 9999, borderWidth: 1, flexDirection: "row", gap: 13, paddingHorizontal: 14, paddingVertical: 9 },
  webCaptureDock: { alignSelf: "center" },
  webCapturePanel: { alignSelf: "center", maxWidth: 570, width: "100%" },
  webEmptyHeadline: { fontSize: 46, lineHeight: 49 },
  webListeningHint: { fontSize: 14.5, marginBottom: 20 },
  webSectionLabel: { fontSize: 10.5, marginBottom: 12 },
  wordmark: { color: colors.textPrimaryLight, fontFamily: fontFamily.serif, fontSize: 24, letterSpacing: -0.25 },
  voiceSessionCard: { alignItems: "flex-start", backgroundColor: "rgba(255,253,249,0.94)", borderColor: "rgba(129,98,75,0.16)", borderRadius: 15, borderWidth: 1, boxShadow: "0px 9px 18px rgba(96, 64, 45, 0.06)", flexDirection: "row", gap: 13, minHeight: 72, paddingHorizontal: 16, paddingVertical: 15 },
  voiceSessionCheckbox: { borderColor: "#A89A8B", borderRadius: 9999, borderWidth: 1.2, height: 20, marginTop: 3, width: 20 },
  voiceSessionCopy: { flex: 1, gap: 4 },
  voiceSessionDue: { color: colors.emberLight, fontFamily: fontFamily.sansMedium, fontSize: 12.5 },
  voiceSessionRef: { color: colors.textTertiaryLight, fontFamily: fontFamily.mono, fontSize: 10.5, letterSpacing: 0.8, marginTop: 4 },
  voiceSessionTitle: { color: colors.textPrimaryLight, fontFamily: fontFamily.sans, fontSize: 16.5, letterSpacing: -0.18, lineHeight: 22 },
  voiceStage: { backgroundColor: "#FFF7F0", flex: 1 },
  voiceStageBrand: { color: colors.textPrimaryLight, fontFamily: fontFamily.serif, fontSize: 22, letterSpacing: -0.35 },
  voiceStageBusyDot: { backgroundColor: colors.textTertiaryLight, transform: [{ scale: 0.82 }] },
  voiceStageCardWide: { flexBasis: "48.5%", flexGrow: 1, maxWidth: 420 },
  voiceStageCards: { alignSelf: "center", gap: 20, marginTop: 46, maxWidth: 460, width: "100%" },
  voiceStageCardsWide: { flexDirection: "row", flexWrap: "wrap", gap: 28, marginTop: 56, maxWidth: 830 },
  voiceStageControls: { alignItems: "center", backgroundColor: "rgba(255,247,240,0.88)", bottom: 0, left: 0, paddingHorizontal: 24, paddingTop: 12, position: "absolute", right: 0 },
  voiceStageControlsWide: { alignItems: "center", backgroundColor: "transparent", bottom: 30, left: undefined, maxWidth: 600, paddingHorizontal: 0, paddingTop: 0, position: "absolute", right: undefined, width: "100%" },
  voiceStageEmptyCard: { alignItems: "center", borderColor: "rgba(129,98,75,0.18)", borderRadius: 15, borderStyle: "dashed", borderWidth: 1, minHeight: 72, paddingHorizontal: 22, paddingVertical: 16 },
  voiceStageEmptyRing: { borderColor: colors.ember, borderRadius: 9999, borderWidth: 1.3, height: 15, marginBottom: 8, opacity: 0.7, width: 15 },
  voiceStageEmptyText: { color: colors.textSecondaryLight, fontFamily: fontFamily.sans, fontSize: 13, textAlign: "center" },
  voiceStageError: { alignItems: "center", backgroundColor: "#FFFDF9", borderColor: "rgba(173,80,44,0.28)", borderRadius: 12, borderWidth: 1, flexDirection: "row", gap: 12, marginBottom: 12, paddingHorizontal: 14, paddingVertical: 10, width: "100%" },
  voiceStageErrorText: { color: colors.textSecondaryLight, flex: 1, fontFamily: fontFamily.sans, fontSize: 12.5, lineHeight: 17 },
  voiceStageEyebrow: { color: colors.emberLight, fontFamily: fontFamily.mono, fontSize: 10, letterSpacing: 1.5, marginTop: 28 },
  voiceStageFooter: { color: colors.textSecondaryLight, fontFamily: fontFamily.sans, fontSize: 12.5, marginTop: 8, textAlign: "center" },
  voiceStageFailure: { color: colors.textSecondaryLight, fontFamily: fontFamily.sans, fontSize: 13, lineHeight: 19, marginTop: 12, maxWidth: 330, textAlign: "center" },
  voiceStageHint: { color: colors.textSecondaryLight, fontFamily: fontFamily.mono, fontSize: 10.5, letterSpacing: 1.1, textTransform: "uppercase" },
  voiceStageIntro: { alignItems: "center", alignSelf: "center", maxWidth: 760, paddingHorizontal: 16 },
  voiceStageLiveDot: { backgroundColor: colors.ember, borderRadius: 9999, height: 10, marginLeft: 14, width: 10 },
  voiceStageMeterRow: { alignItems: "center", flexDirection: "row", justifyContent: "center", width: "100%" },
  voiceStageRetry: { color: colors.emberLight, fontFamily: fontFamily.sansMedium, fontSize: 13 },
  voiceStageScroll: { flexGrow: 1, paddingBottom: 118, paddingHorizontal: 24, paddingTop: 146 },
  voiceStageScrollWide: { paddingBottom: 130, paddingTop: 154 },
  voiceStageTimer: { color: colors.textPrimaryLight, fontFamily: fontFamily.mono, fontSize: 14, fontVariant: ["tabular-nums"], marginRight: 14 },
  voiceStageTitle: { color: colors.textPrimaryLight, fontFamily: fontFamily.sansMedium, fontSize: 32, letterSpacing: -0.8, lineHeight: 38 },
  voiceStageTopbar: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", left: 0, paddingHorizontal: 24, paddingTop: 22, position: "absolute", right: 0, top: 0, zIndex: 2 },
  voiceStageTopbarWide: { alignSelf: "center", maxWidth: 1230, paddingHorizontal: 34, width: "100%" },
  voiceStageTranscript: { color: colors.emberLight, fontFamily: fontFamily.sansMedium, fontSize: 22, letterSpacing: -0.45, lineHeight: 30, marginTop: 10, textAlign: "center" },
  workspace: { alignSelf: "center", flex: 1, width: "100%" },
});
