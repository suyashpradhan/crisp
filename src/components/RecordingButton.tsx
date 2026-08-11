import { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { colors } from "@/src/design/tokens";
import type { VoiceSessionStatus } from "@/src/domain/types";

type RecordingButtonProps = {
  onPress: () => void;
  pendingCount: number;
  quiet?: boolean;
  reduceMotion?: boolean;
  status: VoiceSessionStatus;
  level?: number;
  web: boolean;
};

export function RecordingButton({
  level = 0,
  onPress,
  pendingCount,
  quiet = false,
  reduceMotion = false,
  status,
  web,
}: RecordingButtonProps) {
  const active = status === "recording" || status === "processing";
  const size = web ? 48 : 52;
  const breath = useSharedValue(0);
  const clampedLevel = Math.max(0, Math.min(1, level));

  useEffect(() => {
    if (!active || !quiet) {
      breath.value = withTiming(0, { duration: reduceMotion ? 120 : 180 });
      return;
    }
    if (reduceMotion) {
      breath.value = withTiming(0.34, { duration: 120 });
      return;
    }
    breath.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2100 }),
        withTiming(0, { duration: 2100 }),
      ),
      -1,
      false,
    );
  }, [active, breath, quiet, reduceMotion]);

  const breathStyle = useAnimatedStyle(() => ({
    opacity: quiet ? 0.14 + breath.value * 0.2 : 0,
    transform: [{ scale: 1 + breath.value * 0.1 }],
  }));
  const label = active
    ? `Stop recording, ${pendingCount} items pending`
    : "Start recording";

  return (
    <View style={styles.well}>
      {active ? <View style={[styles.halo, { opacity: 0.06 + clampedLevel * 0.32, pointerEvents: "none", transform: [{ scale: 1 + clampedLevel * 0.34 }] }]} /> : null}
      <Animated.View style={[styles.breath, breathStyle, { pointerEvents: "none" }]} />
      <Pressable
        accessibilityHint={active ? "Stops and retains the current recording" : "Starts recording spoken tasks"}
        accessibilityLabel={label}
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: active ? colors.ember : colors.textPrimaryLight,
            height: size,
            transform: [{ scale: pressed ? 0.94 : 1 }],
            width: size,
          },
        ]}
      >
        {active ? <View style={styles.stopGlyph} /> : <MicGlyph />}
      </Pressable>
    </View>
  );
}

function MicGlyph() {
  return (
    <View style={styles.micWrap}>
      <View style={styles.micCapsule} />
      <View style={styles.micStem} />
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: 9999,
    justifyContent: "center",
    boxShadow: "0px 6px 9px rgba(40, 28, 20, 0.22)",
  },
  breath: {
    borderColor: colors.ember,
    borderRadius: 9999,
    borderWidth: 1,
    height: 62,
    position: "absolute",
    width: 62,
  },
  halo: {
    backgroundColor: "rgba(232,137,76,0.26)",
    borderRadius: 9999,
    height: 68,
    position: "absolute",
    width: 68,
  },
  micCapsule: {
    backgroundColor: "#FDFBF7",
    borderRadius: 5,
    height: 17,
    width: 9,
  },
  micStem: {
    borderBottomColor: "#FDFBF7",
    borderBottomLeftRadius: 9,
    borderBottomRightRadius: 9,
    borderBottomWidth: 1.6,
    borderLeftColor: "#FDFBF7",
    borderLeftWidth: 1.6,
    borderRightColor: "#FDFBF7",
    borderRightWidth: 1.6,
    height: 7,
    marginTop: -1,
    width: 15,
  },
  micWrap: {
    alignItems: "center",
  },
  stopGlyph: {
    backgroundColor: colors.surfaceRecording,
    borderRadius: 4,
    height: 17,
    width: 17,
  },
  well: { alignItems: "center", height: 54, justifyContent: "center", width: 54 },
});
