import {
  maxTranscriptionBytes,
  sessionContextSchema,
  supportedAudioMimeTypes,
  transcriptionRequestSchema,
  TranscriptionError,
} from "@/src/server/transcription/contracts";
import { createSarvamTranscriber } from "@/src/server/transcription/sarvam";
import { createSarvamOperationInterpreter } from "@/src/server/transcription/interpreter";

type Transcriber = ReturnType<typeof createSarvamTranscriber>;
type Interpreter = ReturnType<typeof createSarvamOperationInterpreter>;

/**
 * This factory keeps the HTTP boundary independently testable. The real route
 * uses Sarvam; tests pass fakes and prove that a valid recording becomes a
 * validated operation response without making a network request.
 */
export function createTranscriptionRoute({
  interpret = createSarvamOperationInterpreter(),
  transcribe = createSarvamTranscriber(),
}: {
  interpret?: Interpreter;
  transcribe?: Transcriber;
} = {}) {
  return async function postTranscription(request: Request) {
    try {
    const formData = await request.formData() as unknown as {
      get: (name: string) => FormDataEntryValue | null;
    };
    const audio = formData.get("audio");
    const languageCode = formData.get("languageCode") ?? "unknown";
    const session = formData.get("session");

    if (!(audio instanceof Blob)) {
      throw new TranscriptionError("invalid_request", "Send a recording as the audio form field.");
    }

    if (audio.size === 0) {
      throw new TranscriptionError("audio_empty", "The recording is empty. Record again and try once more.");
    }

    if (audio.size > maxTranscriptionBytes) {
      throw new TranscriptionError("audio_too_large", "This recording is too large to transcribe in one session.");
    }

    const contentType = audio.type.toLowerCase();
    if (!supportedAudioMimeTypes.includes(contentType as (typeof supportedAudioMimeTypes)[number])) {
      throw new TranscriptionError("audio_type_unsupported", "This recording format is not supported.");
    }

    const parsed = transcriptionRequestSchema.safeParse({
      contentType,
      fileName: fileNameFor(audio),
      languageCode,
    });
    if (!parsed.success) {
      throw new TranscriptionError("invalid_request", "This transcription request is invalid.");
    }

    if (typeof session !== "string") {
      throw new TranscriptionError("invalid_request", "Send the active recording session with this audio.");
    }
    const sessionContext = sessionContextSchema.safeParse(JSON.parse(session));
    if (!sessionContext.success) {
      throw new TranscriptionError("invalid_request", "This recording session is invalid.");
    }

    const original = await transcribe({
      ...parsed.data,
      audio: new Uint8Array(await audio.arrayBuffer()),
      mode: "transcribe",
    });
    const translation = await transcribe({
      ...parsed.data,
      audio: new Uint8Array(await audio.arrayBuffer()),
      mode: "translate",
    });
    const operations = await interpret({
      context: sessionContext.data,
      now: new Date(),
      originalTranscript: original.transcript,
      translatedTranscript: translation.transcript,
    });

      return Response.json({
        languageCode: original.languageCode,
        operations,
        providerRequestId: original.providerRequestId,
        transcript: original.transcript,
        translation: translation.transcript,
      }, { status: 200 });
    } catch (error) {
      return errorResponse(error);
    }
  };
}

export const POST = createTranscriptionRoute();

function fileNameFor(audio: Blob) {
  const name = (audio as Blob & { name?: unknown }).name;
  return typeof name === "string" && name.length > 0 ? name : "crisp-recording.webm";
}

function errorResponse(error: unknown) {
  const known = error instanceof TranscriptionError
    ? error
    : new TranscriptionError("transcription_failed", "Crisp could not transcribe this recording. Try again.");
  const status = statusFor(known.code);
  const headers = known.retryAfterSeconds ? { "retry-after": String(known.retryAfterSeconds) } : undefined;

  return Response.json(
    {
      error: {
        code: known.code,
        message: known.message,
        retryable: known.retryable,
      },
    },
    { headers, status },
  );
}

function statusFor(code: TranscriptionError["code"]) {
  switch (code) {
    case "audio_empty":
    case "audio_too_large":
    case "audio_type_unsupported":
    case "invalid_request":
      return 400;
    case "service_misconfigured":
      return 503;
    case "rate_limited":
      return 429;
    default:
      return 502;
  }
}
