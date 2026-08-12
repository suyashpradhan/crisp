import { getSupabaseClient } from "@/src/sync/supabase";

import { LiveVoiceStreamError } from "./voiceStreamClient";

export function voiceStreamEndpoint() {
  const endpoint = process.env.EXPO_PUBLIC_VOICE_STREAM_URL?.trim();
  return endpoint && endpoint.startsWith("wss://") ? endpoint : null;
}

export function isLiveVoiceStreamConfigured() {
  return voiceStreamEndpoint() !== null && getSupabaseClient() !== null;
}

/**
 * Anonymous Supabase Auth gives first-use capture a real, revocable identity
 * without showing an account wall. The WebSocket relay verifies its token
 * before spending Sarvam credits.
 */
export async function voiceStreamAccessToken() {
  const client = getSupabaseClient();
  if (!client) {
    throw new LiveVoiceStreamError("Connect Supabase before enabling live transcription.", false);
  }

  const existing = await client.auth.getSession();
  if (existing.data.session?.access_token) return existing.data.session.access_token;

  const anonymous = await client.auth.signInAnonymously();
  if (anonymous.error || !anonymous.data.session?.access_token) {
    throw new LiveVoiceStreamError(
      "Enable Anonymous Sign-Ins in Supabase before enabling live transcription.",
      false,
    );
  }
  return anonymous.data.session.access_token;
}
