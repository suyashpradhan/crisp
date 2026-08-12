import { voiceStreamEndpoint } from "./voiceStreamAuth";

describe("live voice stream endpoint", () => {
  it("derives the standard Supabase Edge Function WebSocket endpoint", () => {
    expect(voiceStreamEndpoint({
      EXPO_PUBLIC_SUPABASE_URL: "https://project-ref.supabase.co",
    })).toBe("wss://project-ref.supabase.co/functions/v1/voice-stream");
  });

  it("keeps an explicit secure override for a custom deployment", () => {
    expect(voiceStreamEndpoint({
      EXPO_PUBLIC_SUPABASE_URL: "https://project-ref.supabase.co",
      EXPO_PUBLIC_VOICE_STREAM_URL: "wss://voice.example.com/crisp",
    })).toBe("wss://voice.example.com/crisp");
  });

  it("does not accept insecure or unrelated URLs", () => {
    expect(voiceStreamEndpoint({ EXPO_PUBLIC_SUPABASE_URL: "http://project.supabase.co" })).toBeNull();
  });
});
