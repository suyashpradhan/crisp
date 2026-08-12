import { getSupabaseClient } from "@/src/sync/supabase";

import { LiveVoiceStreamError } from "./voiceStreamClient";

type PublicEnvironment = Record<string, string | undefined>;

export function voiceStreamEndpoint(environment: PublicEnvironment = process.env) {
  const configured = environment.EXPO_PUBLIC_VOICE_STREAM_URL?.trim();
  if (configured?.startsWith("wss://")) return configured;

  // Supabase functions are served from the project URL. Deriving this default
  // prevents a stale, custom `*.functions.supabase.co` URL from silently
  // keeping Crisp on the gap-filled file-recording fallback.
  const projectUrl = environment.EXPO_PUBLIC_SUPABASE_URL?.trim();
  if (!projectUrl) return null;

  try {
    const endpoint = new URL(projectUrl);
    if (endpoint.protocol !== "https:" || !endpoint.hostname.endsWith(".supabase.co")) return null;
    endpoint.protocol = "wss:";
    endpoint.pathname = "/functions/v1/voice-stream";
    endpoint.search = "";
    endpoint.hash = "";
    return endpoint.toString();
  } catch {
    return null;
  }
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
