import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import { Platform } from "react-native";

import { getSupabaseClient } from "./supabase";

WebBrowser.maybeCompleteAuthSession();

export class SyncAuthenticationError extends Error {}

/** Opens Supabase's configured Google provider. It is optional: local use remains complete without it. */
export async function signInWithGoogle() {
  const client = getSupabaseClient();
  if (!client) throw new SyncAuthenticationError("Sync is not configured for this Crisp build.");

  const redirectTo = makeRedirectUri({ path: "auth/callback", scheme: "crisp" });
  const { data, error } = await client.auth.signInWithOAuth({
    options: { redirectTo, skipBrowserRedirect: Platform.OS !== "web" },
    provider: "google",
  });
  if (error || !data.url) throw new SyncAuthenticationError(error?.message ?? "Crisp could not start Google sign-in.");

  if (Platform.OS === "web") return;
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== "success") throw new SyncAuthenticationError("Google sign-in was not completed.");
  const code = new URL(result.url).searchParams.get("code");
  if (!code) throw new SyncAuthenticationError("Crisp did not receive a sign-in code.");
  const { error: exchangeError } = await client.auth.exchangeCodeForSession(code);
  if (exchangeError) throw new SyncAuthenticationError(exchangeError.message);
}
