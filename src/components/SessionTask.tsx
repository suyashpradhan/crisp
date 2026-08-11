import { StyleSheet, Text, View } from "react-native";

import { colors, fontFamily } from "@/src/design/tokens";
import type { SessionTask as SessionTaskModel } from "@/src/domain/types";

type SessionTaskProps = {
  count: number;
  task: SessionTaskModel;
  web: boolean;
};

export function SessionTask({ count, task, web }: SessionTaskProps) {
  const metadata = [task.dueDate, task.dueTime].filter(Boolean).join(" · ");

  return (
    <View
      accessibilityLabel={`Item ${task.reference} of ${count}, ${task.title}${metadata ? `, ${metadata}` : ""}`}
      style={[
        styles.card,
        web && styles.webCard,
        { transform: [{ translateX: 0 }] },
      ]}
    >
      <View style={[styles.reference, web && styles.webReference]}>
        <Text style={[styles.referenceText, web && styles.webReferenceText]}>{task.reference}</Text>
      </View>
      <View style={styles.copy}>
        <Text style={[styles.title, web && styles.webTitle]}>{task.title}</Text>
        {metadata ? <Text style={[styles.meta, web && styles.webMeta]}>{metadata}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "flex-start",
    backgroundColor: colors.surfaceRaisedLight,
    borderColor: colors.borderLight,
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: "row",
    gap: 13,
    marginBottom: 11,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  copy: { flex: 1, gap: 2 },
  meta: {
    color: colors.textSecondaryLight,
    fontFamily: fontFamily.sans,
    fontSize: 13,
    letterSpacing: 0.05,
    lineHeight: 18,
  },
  reference: {
    alignItems: "center",
    borderColor: colors.borderLight,
    borderRadius: 9999,
    borderWidth: 1,
    height: 21,
    justifyContent: "center",
    marginTop: 2,
    width: 21,
  },
  referenceText: {
    color: colors.textTertiaryLight,
    fontFamily: fontFamily.mono,
    fontSize: 10.5,
  },
  title: {
    color: colors.textPrimaryLight,
    fontFamily: fontFamily.sans,
    fontSize: 16.5,
    letterSpacing: -0.18,
    lineHeight: 21,
  },
  webCard: { borderRadius: 16, gap: 16, marginBottom: 12, paddingHorizontal: 20, paddingVertical: 17 },
  webMeta: { fontSize: 14, lineHeight: 19 },
  webReference: { height: 23, width: 23 },
  webReferenceText: { fontSize: 11 },
  webTitle: { fontSize: 18, lineHeight: 23 },
});
