import { canCreateSupabaseClient, supabaseConfiguration } from "./supabase";

describe("Supabase public configuration", () => {
  it("accepts the original Crisp public-key name during the migration", () => {
    expect(supabaseConfiguration({
      EXPO_PUBLIC_SUPABASE_KEY: "legacy-publishable-key",
      EXPO_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
    }).success).toBe(true);
  });

  it("prefers the explicit publishable-key name when both are present", () => {
    const result = supabaseConfiguration({
      EXPO_PUBLIC_SUPABASE_KEY: "legacy-key",
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "current-key",
      EXPO_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
    });

    expect(result.success && result.data.key).toBe("current-key");
  });

  it("defers browser storage initialization during server rendering", () => {
    expect(canCreateSupabaseClient({ hasWindow: false, platform: "web" })).toBe(false);
    expect(canCreateSupabaseClient({ hasWindow: true, platform: "web" })).toBe(true);
    expect(canCreateSupabaseClient({ hasWindow: false, platform: "ios" })).toBe(true);
  });
});
