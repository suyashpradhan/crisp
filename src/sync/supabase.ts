import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

const configurationSchema = z.object({
  key: z.string().min(1),
  url: z.string().url(),
});

let cachedClient: SupabaseClient | null | undefined;

export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient !== undefined) return cachedClient;
  const configuration = configurationSchema.safeParse({
    key: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    url: process.env.EXPO_PUBLIC_SUPABASE_URL,
  });
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
