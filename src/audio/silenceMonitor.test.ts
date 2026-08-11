import {
  autoStopAfterMs,
  isSpeechLevel,
  lowInputAfterMs,
  maxTurnDurationMs,
  silenceDurationMs,
  speechThreshold,
} from "./silenceMonitor";

describe("silenceDurationMs", () => {
  it("keeps short pauses inside the same recording session", () => {
    expect(silenceDurationMs(true, 1000, 1000 + lowInputAfterMs - 1)).toBe(lowInputAfterMs - 1);
  });

  it("keeps a session open for thirty seconds of quiet without a countdown", () => {
    expect(silenceDurationMs(true, 1000, 1000 + autoStopAfterMs)).toBe(autoStopAfterMs);
    expect(silenceDurationMs(false, 1000, 1000 + autoStopAfterMs)).toBe(0);
    expect(autoStopAfterMs).toBe(30000);
  });

  it("calibrates speech above ambient input instead of using one fixed meter value", () => {
    expect(speechThreshold(0.16)).toBeCloseTo(0.215);
    expect(isSpeechLevel(0.2, 0.16)).toBe(false);
    expect(isSpeechLevel(0.29, 0.16)).toBe(true);
  });

  it("has a bounded live-turn duration so a request cannot wait forever for silence", () => {
    expect(maxTurnDurationMs).toBe(12000);
  });
});
