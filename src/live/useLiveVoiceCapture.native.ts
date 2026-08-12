import { AudioModule, setAudioModeAsync, useAudioStream, type AudioStreamBuffer } from "expo-audio";
import { useCallback, useEffect, useRef, useState } from "react";

import { pcm16Level } from "./audioPcm";
import type { LiveAudioChunk, LiveVoiceCaptureError, LiveVoiceCaptureStart } from "./liveVoiceCapture.types";

export function useLiveVoiceCapture(onChunk: (chunk: LiveAudioChunk) => void) {
  const [error, setError] = useState<LiveVoiceCaptureError | null>(null);
  const [metering, setMetering] = useState(0);
  const onChunkRef = useRef(onChunk);

  useEffect(() => {
    onChunkRef.current = onChunk;
  }, [onChunk]);

  const handleBuffer = useCallback((buffer: AudioStreamBuffer) => {
    const samples = new Int16Array(buffer.data.slice(0));
    setMetering(pcm16Level(samples));
    onChunkRef.current({ level: pcm16Level(samples), samples, sampleRate: buffer.sampleRate });
  }, []);

  const { isStreaming, stream } = useAudioStream({
    channels: 1,
    encoding: "int16",
    onBuffer: handleBuffer,
    sampleRate: 16000,
  });

  const start = useCallback(async (): Promise<LiveVoiceCaptureStart> => {
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        const nextError: LiveVoiceCaptureError = {
          actionLabel: "Open Settings",
          code: "permission_denied",
          message: "Allow microphone access to capture a spoken task.",
          title: "Crisp can’t hear you",
        };
        setError(nextError);
        return { error: nextError, ok: false };
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await stream.start();
      setMetering(0);
      setError(null);
      return { ok: true };
    } catch {
      const nextError: LiveVoiceCaptureError = {
        code: "recording_failed",
        message: "Crisp couldn’t begin live listening. Try again.",
        title: "Crisp couldn’t start listening",
      };
      setError(nextError);
      return { error: nextError, ok: false };
    }
  }, [stream]);

  const stop = useCallback(() => {
    stream.stop();
    setMetering(0);
  }, [stream]);

  return { error, hasMetering: true, isStreaming, metering, start, stop };
}
