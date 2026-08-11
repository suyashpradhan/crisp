import {
  AccessibilityInfo,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useEffect, useMemo, useReducer, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import {
  InstrumentSans_400Regular,
  InstrumentSans_500Medium,
} from "@expo-google-fonts/instrument-sans";
import { InstrumentSerif_400Regular } from "@expo-google-fonts/instrument-serif";
import { JetBrainsMono_400Regular } from "@expo-google-fonts/jetbrains-mono";
import { useFonts } from "expo-font";
import Animated, { FadeInDown, FadeInUp, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AudioMeter } from "@/src/components/AudioMeter";
import { RecordingButton } from "@/src/components/RecordingButton";
import { SessionTask } from "@/src/components/SessionTask";
import { TaskRow } from "@/src/components/TaskRow";
import { colors, fontFamily, layout } from "@/src/design/tokens";
import { initialTasks } from "@/src/domain/mockData";
import type { AppView, Task } from "@/src/domain/types";
import { appReducer, createInitialState } from "@/src/state/appReducer";

const navItems: { label: string; view: AppView }[] = [
  { label: "Today", view: "today" },
  { label: "Later", view: "later" },
  { label: "Done", view: "completed" },
];

export function CrispApp() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [state, dispatch] = useReducer(appReducer, initialTasks, createInitialState);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [fontsLoaded] = useFonts({
    InstrumentSans_400Regular,
    InstrumentSans_500Medium,
    InstrumentSerif_400Regular,
    JetBrainsMono_400Regular,
  });

  const isRecording = state.sessionStatus === "recording";
  const isProcessing = state.sessionStatus === "processing";
  const inSession = isRecording || isProcessing;
  const isDesktop = width >= layout.desktopBreakpoint;
  const isTablet = width >= layout.tabletBreakpoint && !isDesktop;
  const contentGutter = isDesktop
    ? inSession
      ? layout.desktopRecordingGutter
      : layout.desktopGutter
    : isTablet
      ? layout.tabletGutter
      : layout.mobileGutter;
  const elapsedSeconds = state.sessionStartedAt
    ? Math.max(0, Math.floor((now - state.sessionStartedAt) / 1000))
    : 0;

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const listener = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => listener.remove();
  }, []);

  useEffect(() => {
    if (!isRecording) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [isRecording]);

  useEffect(() => {
    if (!isProcessing) return;
    const timeout = setTimeout(
      () => dispatch({ type: "finishProcessing" }),
      reduceMotion ? 120 : 460,
    );
    return () => clearTimeout(timeout);
  }, [isProcessing, reduceMotion]);

  useEffect(() => {
    if (state.savedCount === null) return;
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

  function beginOrStopRecording() {
    if (state.sessionStatus === "idle") {
      dispatch({ type: "startSession", startedAt: Date.now() });
      return;
    }
    if (state.sessionStatus === "recording") dispatch({ type: "stopSession" });
  }

  if (!fontsLoaded) {
    return <View style={styles.loading} />;
  }

  const appBackground = inSession ? colors.surfaceRecording : colors.surfaceLight;
  const canvasBackground = inSession ? colors.canvasRecording : colors.canvasLight;
  const workspaceWidth = inSession ? layout.recordingWorkspaceWidth : layout.workspaceWidth;

  return (
    <View style={[styles.canvas, { backgroundColor: canvasBackground }]}> 
      <StatusBar style={inSession ? "light" : "dark"} />
      {isDesktop ? (
        <Rail
          activeView={state.activeView}
          disabled={inSession}
          hidden={inSession}
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
            disabled={inSession}
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
          scrollEnabled={!inSession}
          showsVerticalScrollIndicator={false}
        >
          <TaskSurface
            activeView={state.activeView}
            onOpenTask={setSelectedTask}
            onToggleTask={(id) => dispatch({ type: "toggleTask", id })}
            recessed={inSession}
            tasks={visibleTasks}
            web={isDesktop}
          />
        </ScrollView>
        {inSession ? (
          <View
            accessibilityViewIsModal
            style={[
              styles.recordingBoard,
              {
                bottom: isDesktop ? 142 : 196 + insets.bottom,
                left: contentGutter - 2,
                right: contentGutter - 2,
                top: isDesktop ? 28 : 52 + insets.top,
              },
            ]}
          >
            {isRecording ? (
              <Text style={[styles.listeningHint, isDesktop && styles.webListeningHint]}>
                Listening. Say anything — one thing or ten.
              </Text>
            ) : null}
            <ScrollView showsVerticalScrollIndicator={false}>
              {state.sessionTasks.map((task, index) => (
                <Animated.View
                  entering={reduceMotion ? FadeInUp.duration(120) : FadeInDown.duration(440)}
                  exiting={FadeOut.duration(reduceMotion ? 120 : 300)}
                  key={task.id}
                >
                  <SessionTask index={index} task={task} web={isDesktop} />
                </Animated.View>
              ))}
            </ScrollView>
          </View>
        ) : null}
        <LinearGradient
          colors={
            inSession
              ? ["transparent", colors.surfaceRecording]
              : ["transparent", colors.surfaceLight]
          }
          pointerEvents="box-none"
          style={[
            styles.dockGradient,
            { paddingBottom: Math.max(insets.bottom, isDesktop ? 32 : 30), paddingHorizontal: contentGutter },
          ]}
        >
          {state.savedCount !== null ? (
            <Animated.View entering={FadeInUp.duration(320)} style={styles.toast}>
              <Text style={styles.toastText}>{state.savedCount} added</Text>
            </Animated.View>
          ) : null}
          <View style={[styles.dock, isDesktop && styles.webDock, inSession && styles.recordingDock]}>
            <View style={styles.statusBlock}>
              <Text style={[styles.statusText, inSession && styles.recordingStatusText]}>
                {isProcessing ? "Saving" : isRecording ? "Listening…" : "Tap to talk"}
              </Text>
              {inSession ? <View style={styles.statusDot} /> : null}
              {inSession ? (
                <Text style={styles.timer}>{formatTime(elapsedSeconds)}</Text>
              ) : null}
            </View>
            <AudioMeter active={isRecording} />
            <RecordingButton
              onPress={beginOrStopRecording}
              pendingCount={state.sessionTasks.length}
              status={state.sessionStatus}
              web={isDesktop}
            />
          </View>
          {isDesktop ? (
            <Text style={[styles.keyboardHint, inSession && styles.recordingKeyboardHint]}>
              {inSession ? "ESC TO STOP · NOTHING IS SAVED UNTIL YOU DO" : "PRESS SPACE TO START"}
            </Text>
          ) : null}
        </LinearGradient>
      </View>
      {selectedTask ? <EditSheet onClose={() => setSelectedTask(null)} task={selectedTask} /> : null}
    </View>
  );
}

type RailProps = {
  activeView: AppView;
  disabled: boolean;
  hidden: boolean;
  onSelect: (view: AppView) => void;
};

function Rail({ activeView, disabled, hidden, onSelect }: RailProps) {
  return (
    <View pointerEvents={disabled ? "none" : "auto"} style={[styles.rail, hidden && styles.railHidden]}>
      <Text style={styles.wordmark}>crisp</Text>
      <View style={styles.railNav}>
        {navItems.map((item) => (
          <NavButton
            active={activeView === item.view}
            disabled={disabled}
            key={item.view}
            label={item.label}
            onPress={() => onSelect(item.view)}
          />
        ))}
      </View>
    </View>
  );
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
      pointerEvents={disabled ? "none" : "auto"}
      style={[styles.mobileHeader, { opacity: disabled ? 0 : 1, paddingTop: topInset + 10 }]}
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
  tasks: Task[];
  web: boolean;
};

function TaskSurface({ activeView, onOpenTask, onToggleTask, recessed, tasks, web }: TaskSurfaceProps) {
  const emptyTitle = activeView === "completed" ? "Nothing finished yet today." : "Nothing here yet.";
  const emptyBody = activeView === "completed" ? undefined : "Tap and say one thing. Or ten.";

  if (tasks.length === 0) {
    return (
      <View style={[styles.emptyState, recessed && styles.recessedSurface]}>
        <Text style={[styles.emptyHeadline, web && styles.webEmptyHeadline]}>{emptyTitle}</Text>
        {emptyBody ? <Text style={styles.emptyBody}>{emptyBody}</Text> : null}
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

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

const styles = StyleSheet.create({
  canvas: { flex: 1 },
  chip: { borderColor: colors.borderLight, borderRadius: 9999, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 22 },
  chipText: { color: colors.textPrimaryLight, fontFamily: fontFamily.sansMedium, fontSize: 13 },
  deleteText: { color: colors.textSecondaryLight, fontFamily: fontFamily.sans, fontSize: 15, marginTop: 28 },
  dock: { alignItems: "center", gap: 10, justifyContent: "center" },
  dockGradient: { bottom: 0, left: 0, paddingTop: 70, position: "absolute", right: 0 },
  doneText: { color: colors.textPrimaryLight, fontFamily: fontFamily.sansMedium, fontSize: 15 },
  emptyBody: { color: colors.textSecondaryLight, fontFamily: fontFamily.sans, fontSize: 16, lineHeight: 23, marginTop: 12, maxWidth: 250, textAlign: "center" },
  emptyHeadline: { color: colors.textPrimaryLight, fontFamily: fontFamily.serif, fontSize: 37, lineHeight: 40, textAlign: "center" },
  emptyState: { alignItems: "center", justifyContent: "center", minHeight: 520, paddingBottom: 60 },
  keyboardHint: { color: colors.textTertiaryLight, fontFamily: fontFamily.mono, fontSize: 10, letterSpacing: 1.2, marginTop: 10, textAlign: "center" },
  listeningHint: { color: colors.textSecondaryRecording, fontFamily: fontFamily.sans, fontSize: 14.5, lineHeight: 20, marginBottom: 16, textAlign: "center" },
  loading: { backgroundColor: colors.surfaceLight, flex: 1 },
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
  sectionGap: { marginTop: 26 },
  sectionLabel: { color: colors.textTertiaryLight, fontFamily: fontFamily.mono, fontSize: 10, letterSpacing: 1.5, lineHeight: 12, marginBottom: 9 },
  sheet: { backgroundColor: colors.surfaceRaisedLight, borderTopLeftRadius: 26, borderTopRightRadius: 26, bottom: 0, left: 0, paddingBottom: 46, paddingHorizontal: 24, paddingTop: 22, position: "absolute", right: 0 },
  sheetHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  sheetLabel: { color: colors.textTertiaryLight, fontFamily: fontFamily.mono, fontSize: 10, letterSpacing: 1.5 },
  sheetLayer: { bottom: 0, left: 0, position: "absolute", right: 0, top: 0, zIndex: 10 },
  sheetTitle: { borderBottomColor: colors.borderLight, borderBottomWidth: 1, color: colors.textPrimaryLight, fontFamily: fontFamily.sans, fontSize: 22, lineHeight: 30, marginTop: 28, paddingBottom: 12 },
  statusBlock: { alignItems: "center", flexDirection: "row", gap: 7, minHeight: 17 },
  statusDot: { backgroundColor: colors.textTertiaryRecording, borderRadius: 9999, height: 3, width: 3 },
  statusText: { color: colors.textSecondaryLight, fontFamily: fontFamily.sans, fontSize: 13, letterSpacing: -0.05 },
  timer: { color: colors.textTertiaryRecording, fontFamily: fontFamily.mono, fontSize: 12.5, fontVariant: ["tabular-nums"] },
  toast: { backgroundColor: colors.textPrimaryLight, borderRadius: 9999, marginBottom: 12, paddingHorizontal: 16, paddingVertical: 10 },
  toastText: { color: "#FDFBF7", fontFamily: fontFamily.sans, fontSize: 13.5 },
  webDock: { alignSelf: "center", backgroundColor: colors.surfaceRaisedLight, borderColor: "#E2DACF", borderRadius: 9999, borderWidth: 1, flexDirection: "row", gap: 13, paddingHorizontal: 14, paddingVertical: 9 },
  webEmptyHeadline: { fontSize: 46, lineHeight: 49 },
  webListeningHint: { fontSize: 14.5, marginBottom: 20 },
  webSectionLabel: { fontSize: 10.5, marginBottom: 12 },
  wordmark: { color: colors.textPrimaryLight, fontFamily: fontFamily.serif, fontSize: 24, letterSpacing: -0.25 },
  workspace: { alignSelf: "center", flex: 1, width: "100%" },
});
