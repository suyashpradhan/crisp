import * as Haptics from "expo-haptics";

function safely(effect: Promise<void>) {
  void effect.catch(() => undefined);
}

export function recordingStarted() {
  safely(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

export function recordingStopped() {
  safely(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

export function taskCompletionChanged() {
  safely(Haptics.selectionAsync());
}

export function sessionCommitted() {
  safely(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}
