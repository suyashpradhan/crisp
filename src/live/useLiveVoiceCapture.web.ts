import { useCallback, useEffect, useRef, useState } from "react";

import { floatToPcm16, pcm16Level } from "./audioPcm";
import type { LiveAudioChunk, LiveVoiceCaptureError, LiveVoiceCaptureStart } from "./liveVoiceCapture.types";

type WebAudioGraph = {
  context: AudioContext;
  microphone: MediaStream;
  processor: ScriptProcessorNode;
  source: MediaStreamAudioSourceNode;
  silentGain: GainNode;
};

export function useLiveVoiceCapture(onChunk: (chunk: LiveAudioChunk) => void) {
  const [error, setError] = useState<LiveVoiceCaptureError | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [metering, setMetering] = useState(0);
  const graphRef = useRef<WebAudioGraph | null>(null);
  const onChunkRef = useRef(onChunk);

  useEffect(() => {
    onChunkRef.current = onChunk;
  }, [onChunk]);

  const stop = useCallback(() => {
    const graph = graphRef.current;
    if (!graph) return;
    graph.processor.disconnect();
    graph.source.disconnect();
    graph.silentGain.disconnect();
    graph.microphone.getTracks().forEach((track) => track.stop());
    void graph.context.close();
    graphRef.current = null;
    setMetering(0);
    setIsStreaming(false);
  }, []);

  useEffect(() => stop, [stop]);

  const start = useCallback(async (): Promise<LiveVoiceCaptureStart> => {
    if (!navigator.mediaDevices?.getUserMedia) {
      const nextError: LiveVoiceCaptureError = {
        code: "recording_unavailable",
        message: "This browser does not support live microphone capture.",
        title: "Crisp can’t start live listening",
      };
      setError(nextError);
      return { error: nextError, ok: false };
    }

    try {
      const microphone = await navigator.mediaDevices.getUserMedia({
        audio: { autoGainControl: true, channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      const context = new AudioContext();
      const source = context.createMediaStreamSource(microphone);
      const processor = context.createScriptProcessor(2048, 1, 1);
      const silentGain = context.createGain();
      silentGain.gain.value = 0;

      processor.onaudioprocess = (event) => {
        const samples = floatToPcm16(event.inputBuffer.getChannelData(0));
        const level = pcm16Level(samples);
        setMetering(level);
        onChunkRef.current({ level, samples, sampleRate: context.sampleRate });
      };
      source.connect(processor);
      processor.connect(silentGain);
      silentGain.connect(context.destination);
      await context.resume();

      graphRef.current = { context, microphone, processor, silentGain, source };
      setError(null);
      setIsStreaming(true);
      return { ok: true };
    } catch {
      const nextError: LiveVoiceCaptureError = {
        actionLabel: "Open Settings",
        code: "permission_denied",
        message: "Allow microphone access to capture a spoken task.",
        title: "Crisp can’t hear you",
      };
      setError(nextError);
      return { error: nextError, ok: false };
    }
  }, []);

  return { error, hasMetering: true, isStreaming, metering, start, stop };
}
