import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { File, Paths } from "expo-file-system";
import { Platform } from "react-native";
import { useEffect, useState } from "react";

import { meteringToLevel } from "@/src/audio/metering";
import type { RetainedRecording } from "@/src/domain/types";

const recordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  isMeteringEnabled: true,
};

export type VoiceCaptureError = {
  actionLabel?: "Open Settings";
  code: "permission_denied" | "recording_failed" | "recording_unavailable";
  message: string;
  title: string;
};

export function useVoiceRecorder() {
  const recorder = useAudioRecorder(recordingOptions);
  const recorderState = useAudioRecorderState(recorder, 100);
  const [error, setError] = useState<VoiceCaptureError | null>(null);

  useEffect(() => {
    if (recorderState.mediaServicesDidReset) {
      const timeout = setTimeout(() => {
        setError({
          code: "recording_unavailable",
          message: "The microphone was interrupted. Start a new recording when you’re ready.",
          title: "Crisp stopped listening",
        });
      }, 0);
      return () => clearTimeout(timeout);
    }
  }, [recorderState.mediaServicesDidReset]);

  async function start() {
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        const nextError: VoiceCaptureError = {
          actionLabel: "Open Settings",
          code: "permission_denied",
          message: "Allow microphone access to capture a spoken task.",
          title: "Crisp can’t hear you",
        };
        setError(nextError);
        return { error: nextError, ok: false as const };
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setError(null);
      return { ok: true as const };
    } catch {
      const nextError: VoiceCaptureError = {
        code: "recording_failed",
        message: "Try starting the recording again.",
        title: "Crisp couldn’t start listening",
      };
      setError(nextError);
      return { error: nextError, ok: false as const };
    }
  }

  async function stop(): Promise<{ error: VoiceCaptureError; ok: false } | { ok: true; recording: RetainedRecording }> {
    try {
      await recorder.stop();
      const status = recorder.getStatus();
      const capturedUri = recorder.uri ?? status.url;
      if (!capturedUri) throw new Error("The recorder did not retain a file URI.");
      const extension = Platform.OS === "web" ? "webm" : "m4a";
      const uri = retainRecording(capturedUri, extension);
      return {
        ok: true,
        recording: {
          createdAt: new Date().toISOString(),
          durationMs: Math.round(status.durationMillis),
          fileName: `crisp-${Date.now()}.${extension}`,
          mimeType: Platform.OS === "web" ? "audio/webm" : "audio/m4a",
          uri,
        },
      };
    } catch {
      const nextError: VoiceCaptureError = {
        code: "recording_failed",
        message: "Your recording could not be retained. Try once more.",
        title: "Crisp couldn’t save that recording",
      };
      setError(nextError);
      return { error: nextError, ok: false };
    }
  }

  return {
    durationMs: recorderState.durationMillis,
    error,
    hasMetering: Number.isFinite(recorderState.metering),
    isRecording: recorderState.isRecording,
    metering: meteringToLevel(recorderState.metering),
    start,
    stop,
  };
}

export function discardRetainedRecording(recording: RetainedRecording) {
  if (Platform.OS === "web") {
    URL.revokeObjectURL(recording.uri);
    return;
  }
  try {
    new File(recording.uri).delete();
  } catch {
    // A failed cleanup must not change the already-committed task result.
  }
}

function retainRecording(capturedUri: string, extension: string): string {
  // Web recording URIs are browser-managed blobs. Native files are copied out of cache.
  if (Platform.OS === "web") return capturedUri;
  const retainedFile = new File(Paths.document, `crisp-${Date.now()}.${extension}`);
  new File(capturedUri).copy(retainedFile);
  return retainedFile.uri;
}
