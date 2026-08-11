import { Pressable, StyleSheet, View } from "react-native";

import { colors } from "@/src/design/tokens";
import type { VoiceSessionStatus } from "@/src/domain/types";

type RecordingButtonProps = {
  onPress: () => void;
  pendingCount: number;
  status: VoiceSessionStatus;
  web: boolean;
};

export function RecordingButton({ onPress, pendingCount, status, web }: RecordingButtonProps) {
  const active = status !== "idle";
  const size = web ? 54 : active ? 80 : 72;
  const label = active
    ? `Stop recording, ${pendingCount} items pending`
    : "Start recording";

  return (
    <Pressable
      accessibilityHint={active ? "Stops and saves the mocked recording session" : "Starts a mocked recording session"}
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
    shadowColor: "#281C14",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 9,
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
});
