import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import { z } from "zod";

const configurationSchema = z.object({
  key: z.string().min(1),
  url: z.string().url(),
});

let cachedClient: SupabaseClient | null | undefined;

type PublicEnvironment = Record<string, string | undefined>;

/**
 * `EXPO_PUBLIC_SUPABASE_KEY` was used in the first Crisp setup. Accept it as
 * a compatibility alias so an existing local project can opt into live capture
 * without copying a credential to a differently named variable.
 */
export function supabaseConfiguration(environment: PublicEnvironment = process.env) {
  return configurationSchema.safeParse({
    key: environment.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
      || environment.EXPO_PUBLIC_SUPABASE_KEY?.trim(),
    url: environment.EXPO_PUBLIC_SUPABASE_URL?.trim(),
  });
}

export function canCreateSupabaseClient({
  hasWindow = typeof window !== "undefined",
  platform = Platform.OS,
}: {
  hasWindow?: boolean;
  platform?: string;
} = {}) {
  return platform !== "web" || hasWindow;
}

export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient !== undefined) return cachedClient;
  // Expo Router pre-renders web routes in Node. AsyncStorage and Supabase auth
  // expect a browser there, so defer initialization until client hydration.
  if (!canCreateSupabaseClient()) return null;
  const configuration = supabaseConfiguration();
  if (!configuration.success) {
    cachedClient = null;
    return cachedClient;
  }

  cachedClient = createClient(configuration.data.url, configuration.data.key, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: false,
      persistSession: true,
      storage: AsyncStorage,
    },
  });
  return cachedClient;
}

export function isSupabaseConfigured() {
  return getSupabaseClient() !== null;
}
