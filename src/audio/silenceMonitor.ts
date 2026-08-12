import { useEffect, useRef, useState } from "react";

export const lowInputAfterMs = 4200;
export const turnBoundaryAfterMs = 1100;
// A session is intentionally patient: people should be able to think between
// spoken tasks without rushing to a Finish control.
export const autoStopAfterMs = 30000;
export const maxTurnDurationMs = 12000;

// Browser and device microphones have very different resting meter values. A
// fixed threshold made quiet rooms work but let ordinary ambient noise keep a
// turn open forever. We calibrate against the first small slice of a recording
// and then look for a meaningful change above that floor.
const calibrationDurationMs = 600;
const minimumSpeechDelta = 0.055;
const maximumSpeechThreshold = 0.9;

export function silenceDurationMs(active: boolean, lastAudibleAt: number, now: number) {
  return active ? Math.max(0, now - lastAudibleAt) : 0;
}

export function speechThreshold(noiseFloor: number) {
  return Math.min(maximumSpeechThreshold, Math.max(minimumSpeechDelta, noiseFloor + minimumSpeechDelta));
}

export function isSpeechLevel(level: number, noiseFloor: number) {
  return level >= speechThreshold(noiseFloor);
}

export function useSilenceMonitor({
  active,
  hasMetering,
  level,
  onAutoStop,
  onTurnBoundary,
}: {
  active: boolean;
  hasMetering: boolean;
  level: number;
  onAutoStop: () => void;
  onTurnBoundary: () => void;
}) {
  const [quiet, setQuiet] = useState(false);
  const lastAudibleAt = useRef(0);
  const levelRef = useRef(level);
  const hasMeteringRef = useRef(hasMetering);
  const onAutoStopRef = useRef(onAutoStop);
  const onTurnBoundaryRef = useRef(onTurnBoundary);
  const autoStopped = useRef(false);
  const heardSpeech = useRef(false);
  const turnEnded = useRef(false);
  const recordingStartedAt = useRef(0);
  const noiseFloor = useRef(0);
  const calibrationTotal = useRef(0);
  const calibrationSamples = useRef(0);

  useEffect(() => {
    levelRef.current = level;
    hasMeteringRef.current = hasMetering;
    onAutoStopRef.current = onAutoStop;
    onTurnBoundaryRef.current = onTurnBoundary;
  }, [hasMetering, level, onAutoStop, onTurnBoundary]);

  useEffect(() => {
    if (!active) {
      lastAudibleAt.current = Date.now();
      autoStopped.current = false;
      heardSpeech.current = false;
      turnEnded.current = false;
      recordingStartedAt.current = Date.now();
      noiseFloor.current = 0;
      calibrationTotal.current = 0;
      calibrationSamples.current = 0;
      return;
    }

    const startedAt = Date.now();
    lastAudibleAt.current = startedAt;
    recordingStartedAt.current = startedAt;
    noiseFloor.current = 0;
    calibrationTotal.current = 0;
    calibrationSamples.current = 0;
    autoStopped.current = false;
    const interval = setInterval(() => {
      const now = Date.now();
      const levelNow = Math.max(0, levelRef.current);
      const elapsed = now - recordingStartedAt.current;

      if (hasMeteringRef.current && elapsed < calibrationDurationMs) {
        calibrationTotal.current += levelNow;
        calibrationSamples.current += 1;
        return;
      }

      if (calibrationSamples.current > 0) {
        noiseFloor.current = calibrationTotal.current / calibrationSamples.current;
        calibrationSamples.current = 0;
      }

      // Some devices record correctly but do not expose live metering. Do not
      // mistake that absence for silence and discard a spoken turn; upload the
      // bounded turn instead.
      if (!hasMeteringRef.current) {
        if (elapsed >= maxTurnDurationMs && !turnEnded.current) {
          turnEnded.current = true;
          onTurnBoundaryRef.current();
        }
        return;
      }

      // A continuous thought should still reach the server. This protects the
      // core flow when a browser/device does not expose stable metering.
      if (elapsed >= maxTurnDurationMs && !turnEnded.current) {
        turnEnded.current = true;
        onTurnBoundaryRef.current();
        return;
      }

      if (isSpeechLevel(levelNow, noiseFloor.current)) {
        lastAudibleAt.current = now;
        autoStopped.current = false;
        heardSpeech.current = true;
        turnEnded.current = false;
        setQuiet(false);
        return;
      }

      // Let the floor drift down gently during actual quiet, never up during
      // speech. That keeps soft voices detectable after a noisy opening.
      noiseFloor.current = Math.min(noiseFloor.current, noiseFloor.current * 0.96 + levelNow * 0.04);

      const duration = silenceDurationMs(true, lastAudibleAt.current, now);
      setQuiet(duration >= lowInputAfterMs);
      if (heardSpeech.current && duration >= turnBoundaryAfterMs && !turnEnded.current) {
        turnEnded.current = true;
        onTurnBoundaryRef.current();
        return;
      }
      if (duration >= autoStopAfterMs && !autoStopped.current) {
        autoStopped.current = true;
        onAutoStopRef.current();
      }
    }, 250);

    return () => clearInterval(interval);
  }, [active]);

  return { quiet };
}
