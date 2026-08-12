export type LiveAudioChunk = {
  level: number;
  samples: Int16Array;
  sampleRate: number;
};

export type LiveVoiceCaptureError = {
  actionLabel?: "Open Settings";
  code: "permission_denied" | "recording_failed" | "recording_unavailable";
  message: string;
  title: string;
};

export type LiveVoiceCaptureStart =
  | { ok: true }
  | { error: LiveVoiceCaptureError; ok: false };
