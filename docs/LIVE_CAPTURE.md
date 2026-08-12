# Live Voice Capture

Crisp’s live path keeps the microphone open while you speak. It sends 16 kHz mono PCM chunks to a Supabase Edge Function, which holds `SARVAM_API_KEY`, relays them to Sarvam streaming STT, and returns only finalized transcript turns plus validated `SessionOperation[]`. Audio is not written to the database or Storage by this relay.

## One-time Supabase setup

1. Create a Supabase account and a new blank project. Record the **Project URL**, **publishable key**, and project reference from **Settings → API**. These are client values; do not share a secret or service-role key.
2. In **Authentication**, enable **Anonymous Sign-Ins**. Crisp silently creates a per-device anonymous session so first use has no account wall, while the relay can reject untrusted WebSocket connections.
3. Copy `.env.example` to `.env` and supply only:

   ```dotenv
   EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   # Optional: Crisp derives this from EXPO_PUBLIC_SUPABASE_URL by default.
   EXPO_PUBLIC_VOICE_STREAM_URL=wss://YOUR_PROJECT_REF.supabase.co/functions/v1/voice-stream
   ```

4. Authenticate and link the Supabase CLI, then add the Sarvam key as an Edge Function secret and deploy the relay:

   ```sh
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase secrets set SARVAM_API_KEY=your_sarvam_key
   npx supabase functions deploy voice-stream --no-verify-jwt
   ```

The `--no-verify-jwt` switch is intentional: browser WebSockets cannot send an authorization header. [`supabase/functions/voice-stream`](../supabase/functions/voice-stream/) validates the anonymous session token during the WebSocket upgrade instead. Do not weaken that validation or make the function publicly usable.

## Behaviour and safety

Sarvam detects speech boundaries. A normal pause finalizes a thought and creates or changes temporary cards while the microphone stays open. Thirty seconds of quiet still commits the session. The relay serializes final turns and updates its temporary-reference context after each validated operation; it never receives permanent tasks or writes task data.

The app asks Sarvam for an original-language transcription and an English-intent stream. Titles retain the original transcript; English interpretation is only used for intent and dates. The server validates model output before returning it, and the app’s deterministic reducer remains the only task-state mutator.

## Development notes

This project uses Expo SDK 57 for the native PCM stream API. Restart Metro after pulling the change (`npx expo start --clear`); make a fresh native development build if an existing installed build predates the SDK upgrade. Web uses Web Audio capture because Expo’s PCM hook is native-only there. A configured `EXPO_PUBLIC_SUPABASE_URL` now derives the standard Supabase Edge Function WebSocket URL; use `EXPO_PUBLIC_VOICE_STREAM_URL` only for a deliberate override.

Without all three public `EXPO_PUBLIC_*` values, Crisp deliberately uses the existing file-based transcription flow. Keep `SARVAM_API_KEY`, Supabase secret/service-role keys, and `supabase/functions/.env` out of Git and out of the app bundle.
