import { useCallback, useEffect, useRef, useState } from "react";

import type { VoiceSessionDraft } from "@/src/domain/sessionOperations";

import { pcm16ToBase64, Pcm16Resampler } from "./audioPcm";
import type { LiveAudioChunk } from "./liveVoiceCapture.types";
import { useLiveVoiceCapture } from "./useLiveVoiceCapture";
import { isLiveVoiceStreamConfigured, voiceStreamAccessToken, voiceStreamEndpoint } from "./voiceStreamAuth";
import { createVoiceStreamClient, LiveVoiceStreamError } from "./voiceStreamClient";
import { streamSessionFromDraft, type VoiceStreamServerEvent, type VoiceStreamSession } from "./voiceStreamProtocol";

export type LiveVoiceStreamFailure = {
  message: string;
  retryable: boolean;
};

export function useLiveVoiceStream({
  onFailure,
  onTurn,
}: {
  onFailure: (failure: LiveVoiceStreamFailure) => void;
  onTurn: (turn: Extract<VoiceStreamServerEvent, { type: "turn" }>) => void;
}) {
  const [connecting, setConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<LiveVoiceStreamFailure | null>(null);
  const connectionRef = useRef<ReturnType<typeof createVoiceStreamClient> | null>(null);
  const onFailureRef = useRef(onFailure);
  const onTurnRef = useRef(onTurn);
  const resamplerRef = useRef(new Pcm16Resampler());

  useEffect(() => {
    onFailureRef.current = onFailure;
  }, [onFailure]);

  useEffect(() => {
    onTurnRef.current = onTurn;
  }, [onTurn]);

  const sendChunk = useCallback((chunk: LiveAudioChunk) => {
    const resampled = resamplerRef.current.resample(chunk.samples, chunk.sampleRate);
    if (resampled.length === 0) return;
    try {
      connectionRef.current?.sendAudio(pcm16ToBase64(resampled));
    } catch (error) {
      const failure = failureFor(error);
      setConnectionError(failure);
      onFailureRef.current(failure);
    }
  }, []);
  const capture = useLiveVoiceCapture(sendChunk);
  const {
    error: captureError,
    hasMetering,
    isStreaming,
    metering,
    start: startCapture,
    stop: stopCapture,
  } = capture;
  const available = isLiveVoiceStreamConfigured();

  const close = useCallback(() => {
    stopCapture();
    connectionRef.current?.close();
    connectionRef.current = null;
    resamplerRef.current.reset();
    setConnecting(false);
  }, [stopCapture]);

  useEffect(() => close, [close]);

  const start = useCallback(async (session: VoiceStreamSession) => {
    const endpoint = voiceStreamEndpoint();
    if (!endpoint) {
      const failure = { message: "Connect Supabase before enabling live transcription.", retryable: false };
      setConnectionError(failure);
      return { error: failure, ok: false as const };
    }
    setConnecting(true);
    setConnectionError(null);
    try {
      const accessToken = await voiceStreamAccessToken();
      const client = createVoiceStreamClient({
        accessToken,
        endpoint,
        onEvent: (event) => {
          if (event.type === "turn") onTurnRef.current(event);
          if (event.type === "error") {
            const failure = event.error;
            setConnectionError(failure);
            onFailureRef.current(failure);
          }
        },
      });
      connectionRef.current = client;
      await client.open(session);
      resamplerRef.current.reset();
      const microphone = await startCapture();
      if (!microphone.ok) {
        client.close();
        connectionRef.current = null;
        const failure = { message: microphone.error.message, retryable: false };
        setConnectionError(failure);
        return { error: failure, ok: false as const };
      }
      return { ok: true as const };
    } catch (error) {
      const failure = failureFor(error);
      connectionRef.current?.close();
      connectionRef.current = null;
      setConnectionError(failure);
      return { error: failure, ok: false as const };
    } finally {
      setConnecting(false);
    }
  }, [startCapture]);

  const updateSession = useCallback((session: VoiceSessionDraft) => {
    try {
      connectionRef.current?.updateSession(streamSessionFromDraft(session));
    } catch (error) {
      const failure = failureFor(error);
      setConnectionError(failure);
      onFailureRef.current(failure);
    }
  }, []);

  return {
    available,
    connecting,
    error: connectionError ?? captureError,
    hasMetering,
    isStreaming,
    metering,
    start,
    stop: close,
    updateSession,
  };
}

function failureFor(error: unknown): LiveVoiceStreamFailure {
  if (error instanceof LiveVoiceStreamError) {
    return { message: error.message, retryable: error.retryable };
  }
  return { message: "Crisp couldn’t start live transcription. Try again.", retryable: true };
}
