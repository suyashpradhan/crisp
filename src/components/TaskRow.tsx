import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, fontFamily } from "@/src/design/tokens";
import type { Task } from "@/src/domain/types";

type TaskRowProps = {
  onOpen: () => void;
  onToggle: () => void;
  recessed: boolean;
  task: Task;
  web: boolean;
};

export function TaskRow({ onOpen, onToggle, recessed, task, web }: TaskRowProps) {
  const completed = task.status === "completed";
  const metadata = task.dueTime ?? task.dueDate;

  return (
    <View style={[styles.row, web && styles.webRow, recessed && styles.recessed, completed && styles.completed]}>
      <Pressable
        accessibilityLabel={`${completed ? "Mark incomplete" : "Mark complete"}, ${task.title}`}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: completed }}
        hitSlop={12}
        onPress={onToggle}
        style={[styles.ring, completed && styles.ringCompleted]}
      >
        {completed ? <View style={styles.ringDot} /> : null}
      </Pressable>
      <Pressable
        accessibilityLabel={`${task.title}${metadata ? `, ${metadata}` : ""}`}
        accessibilityRole="button"
        onPress={onOpen}
        style={styles.copy}
      >
        <Text style={[styles.title, web && styles.webTitle, completed && styles.completedTitle]}>{task.title}</Text>
        {metadata ? <Text style={[styles.meta, web && styles.webMeta]}>{metadata}</Text> : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  completed: { opacity: 0.58 },
  completedTitle: { color: colors.textSecondaryLight, textDecorationLine: "line-through" },
  copy: { flex: 1, gap: 2 },
  meta: {
    color: colors.textTertiaryLight,
    fontFamily: fontFamily.sans,
    fontSize: 13,
    lineHeight: 18,
  },
  recessed: { opacity: 0.05, transform: [{ scale: 0.985 }, { translateY: -10 }] },
  ring: {
    alignItems: "center",
    borderColor: colors.textTertiaryLight,
    borderRadius: 9999,
    borderWidth: 1.4,
    height: 21,
    justifyContent: "center",
    marginTop: 2,
    width: 21,
  },
  ringCompleted: { backgroundColor: colors.textPrimaryLight, borderColor: colors.textPrimaryLight },
  ringDot: { backgroundColor: colors.surfaceLight, borderRadius: 9999, height: 8, width: 8 },
  row: { alignItems: "flex-start", flexDirection: "row", gap: 13, paddingVertical: 11 },
  title: {
    color: colors.textPrimaryLight,
    fontFamily: fontFamily.sans,
    fontSize: 16.5,
    letterSpacing: -0.18,
    lineHeight: 21,
  },
  webMeta: { fontSize: 14, lineHeight: 19 },
  webRow: { gap: 16, paddingVertical: 12 },
  webTitle: { fontSize: 18, lineHeight: 23 },
});
