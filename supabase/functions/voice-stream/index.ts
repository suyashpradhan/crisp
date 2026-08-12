import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";
import { z } from "zod";

const sarvamWebSocketUrl = "wss://api.sarvam.ai/speech-to-text/ws";
const maxAudioBase64Length = 64_000;

const draftTaskSchema = z.object({
  dueDate: z.string().trim().min(1).optional(),
  dueTime: z.string().trim().min(1).optional(),
  reference: z.string().trim().min(1).max(40),
  title: z.string().trim().min(1).max(280),
});
const createOperationSchema = z.object({
  ref: z.string().trim().min(1).max(40),
  task: z.object({
    dueDate: z.string().trim().min(1).optional(),
    dueTime: z.string().trim().min(1).optional(),
    title: z.string().trim().min(1).max(280),
  }),
  type: z.literal("create"),
});
const updateOperationSchema = z.object({
  patch: z
    .object({
      dueDate: z.string().trim().min(1).nullable().optional(),
      dueTime: z.string().trim().min(1).nullable().optional(),
      title: z.string().trim().min(1).max(280).optional(),
    })
    .refine((patch) => Object.keys(patch).length > 0),
  ref: z.string().trim().min(1).max(40),
  type: z.literal("update"),
});
const sessionOperationSchema = z.discriminatedUnion("type", [
  createOperationSchema,
  updateOperationSchema,
  z.object({
    ref: z.string().trim().min(1).max(40),
    type: z.literal("delete"),
  }),
  z.object({ type: z.literal("clear") }),
  z.object({ type: z.literal("undo") }),
]);
const operationsSchema = z.array(sessionOperationSchema).max(50);
const sessionSchema = z.object({
  draftTasks: z.array(draftTaskSchema).max(50),
  id: z.string().trim().min(1).max(120),
});
const clientMessageSchema = z.discriminatedUnion("type", [
  z.object({
    audio: z.string().min(1).max(maxAudioBase64Length),
    encoding: z.literal("pcm_s16le"),
    sampleRate: z.literal(16000),
    type: z.literal("audio"),
  }),
  z.object({ session: sessionSchema, type: z.literal("configure") }),
]);
const sarvamChatResponseSchema = z.object({
  choices: z
    .array(z.object({ message: z.object({ content: z.string().nullable() }) }))
    .min(1),
});

type DraftTask = z.infer<typeof draftTaskSchema>;
type SessionOperation = z.infer<typeof sessionOperationSchema>;
type Session = z.infer<typeof sessionSchema>;
type SarvamMode = "transcribe" | "translate";

Deno.serve(async (request) => {
  const unauthorized = await authenticateRequest(request);
  if (unauthorized instanceof Response) return unauthorized;

  if (request.headers.get("upgrade")?.toLowerCase() !== "websocket") {
    return Response.json(
      { error: "A WebSocket upgrade is required." },
      { status: 400 },
    );
  }

  const sarvamKey = Deno.env.get("SARVAM_API_KEY")?.trim();
  if (!sarvamKey) {
    return Response.json(
      { error: "Live transcription is not configured." },
      { status: 503 },
    );
  }

  const { response, socket: client } = Deno.upgradeWebSocket(request, {
    protocol: request.headers.get("sec-websocket-protocol") ?? undefined,
  });
  let originalSocket: WebSocket | null = null;
  let translationSocket: WebSocket | null = null;
  let session: Session | null = null;
  let upstreamReady = false;
  let closed = false;
  const originalTurns: SarvamTurn[] = [];
  const translationTurns: SarvamTurn[] = [];
  const sessionHistory: DraftTask[][] = [];
  const processedRequestIds = new Set<string>();
  let interpretationQueue = Promise.resolve();

  const close = () => {
    if (closed) return;
    closed = true;
    originalSocket?.close();
    translationSocket?.close();
    if (client.readyState === WebSocket.OPEN) client.close();
  };
  const send = (message: unknown) => {
    if (!closed && client.readyState === WebSocket.OPEN)
      client.send(JSON.stringify(message));
  };
  const fail = (message: string, retryable: boolean) => {
    send({
      error: {
        code: retryable ? "provider_unavailable" : "stream_invalid",
        message,
        retryable,
      },
      type: "error",
    });
  };
  const announceReady = () => {
    if (session && upstreamReady)
      send({ sessionId: session.id, type: "ready" });
  };

  client.onopen = async () => {
    try {
      originalSocket = await openSarvamSocket(
        "transcribe",
        sarvamKey,
        (turn) => {
          originalTurns.push(turn);
          void processPairs();
        },
        reportUpstreamFormatError,
      );
      translationSocket = await openSarvamSocket(
        "translate",
        sarvamKey,
        (turn) => {
          translationTurns.push(turn);
          void processPairs();
        },
        reportUpstreamFormatError,
      );
      if (closed) {
        originalSocket.close();
        translationSocket.close();
        return;
      }
      originalSocket.on("error", () => {
        fail("Crisp lost live transcription. Try again.", true);
        close();
      });
      translationSocket.on("error", () => {
        fail("Crisp lost live transcription. Try again.", true);
        close();
      });
      upstreamReady = true;
      announceReady();
    } catch {
      fail("Crisp couldn’t connect to live transcription. Try again.", true);
      close();
    }
  };

  client.onmessage = ({ data }) => {
    const message = clientMessageSchema.safeParse(parseJson(data));
    if (!message.success) {
      fail("Crisp received an invalid live-audio message.", false);
      return;
    }
    if (message.data.type === "configure") {
      if (!session || session.id !== message.data.session.id)
        sessionHistory.length = 0;
      session = message.data.session;
      announceReady();
      return;
    }
    if (!session) {
      fail("Crisp’s live session was not initialized.", false);
      return;
    }
    if (
      !originalSocket ||
      !translationSocket ||
      originalSocket.readyState !== WebSocket.OPEN ||
      translationSocket.readyState !== WebSocket.OPEN
    ) {
      fail("Live transcription is reconnecting. Try again.", true);
      return;
    }
    const payload = JSON.stringify({
      audio: {
        data: message.data.audio,
        // Sarvam's stream contract uses this message-level label even when
        // `input_audio_codec=pcm_s16le` declares raw PCM in the handshake.
        encoding: "audio/wav",
        sample_rate: 16000,
      },
    });
    originalSocket.send(payload);
    translationSocket.send(payload);
  };
  client.onerror = () => close();
  client.onclose = () => close();

  function reportUpstreamFormatError() {
    fail("Live transcription rejected the audio stream. Update the relay and try again.", false);
    close();
  }

  async function processPairs() {
    while (originalTurns.length > 0 && translationTurns.length > 0) {
      const original = originalTurns.shift()!;
      const translation = translationTurns.shift()!;
      if (processedRequestIds.has(original.requestId)) continue;
      processedRequestIds.add(original.requestId);
      if (processedRequestIds.size > 100)
        processedRequestIds.delete(processedRequestIds.values().next().value!);

      interpretationQueue = interpretationQueue
        .then(async () => {
          if (!session || closed) return;
          const operations = await interpretTurn(
            {
              context: session.draftTasks,
              originalTranscript: original.transcript,
              translatedTranscript: translation.transcript,
            },
            sarvamKey,
          );
          session = {
            ...session,
            draftTasks: applyForContext(
              session.draftTasks,
              operations,
              sessionHistory,
            ),
          };
          send({
            languageCode: original.languageCode,
            operations,
            providerRequestId: original.requestId,
            transcript: original.transcript,
            translation: translation.transcript,
            type: "turn",
          });
        })
        .catch(() =>
          fail(
            "Crisp couldn’t understand that spoken thought. Keep talking or try again.",
            true,
          ),
        );
    }
  }

  // An upgraded WebSocket response does not keep an Edge isolate alive on its
  // own. This promise is intentionally resolved only when the client leaves.
  EdgeRuntime.waitUntil(
    new Promise<void>((resolve) => {
      client.addEventListener("close", () => resolve(), { once: true });
    }),
  );
  return response;
});

async function authenticateRequest(request: Request): Promise<Response | true> {
  const protocol = request.headers.get("sec-websocket-protocol") ?? "";
  const token = protocol.startsWith("crisp.")
    ? protocol.slice("crisp.".length)
    : null;
  if (!token)
    return Response.json(
      { error: "A live session token is required." },
      { status: 401 },
    );

  try {
    const client = createClient(
      Deno.env.get("SUPABASE_URL")!,
      supabaseSecretKey(),
      {
        auth: { autoRefreshToken: false, persistSession: false },
      },
    );
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user)
      return Response.json(
        { error: "The live session token is invalid." },
        { status: 401 },
      );
    return true;
  } catch {
    return Response.json(
      { error: "Live session authentication is unavailable." },
      { status: 503 },
    );
  }
}

function supabaseSecretKey() {
  const configured = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (configured) {
    const key = JSON.parse(configured).default;
    if (typeof key === "string" && key) return key;
  }
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;
  throw new Error("A Supabase secret key is not available to the function.");
}

function openSarvamSocket(
  mode: SarvamMode,
  apiKey: string,
  onTurn: (turn: SarvamTurn) => void,
  onStreamError: () => void,
) {
  return new Promise<WebSocket>((resolve, reject) => {
    const url = new URL(sarvamWebSocketUrl);
    url.searchParams.set("input_audio_codec", "pcm_s16le");
    url.searchParams.set("language_code", "unknown");
    url.searchParams.set("mode", mode);
    url.searchParams.set("model", "saaras:v4");
    url.searchParams.set("sample_rate", "16000");
    url.searchParams.set("high_vad_sensitivity", "true");
    url.searchParams.set("vad_signals", "true");
    const socket = new WebSocket(url, {
      headers: { "api-subscription-key": apiKey },
    });
    socket.once("open", () => resolve(socket));
    socket.once("error", reject);
    socket.on("message", (data) => {
      const message = data.toString();
      if (isSarvamStreamError(message)) {
        onStreamError();
        return;
      }
      const turn = readSarvamTurn(message);
      if (turn) onTurn(turn);
    });
  });
}

function isSarvamStreamError(value: string) {
  const parsed = parseJson(value) as { type?: unknown } | undefined;
  return parsed?.type === "error";
}

type SarvamTurn = {
  languageCode: string | null;
  requestId: string;
  transcript: string;
};

function readSarvamTurn(value: string): SarvamTurn | null {
  const parsed = parseJson(value) as
    | {
        data?: {
          language_code?: unknown;
          request_id?: unknown;
          transcript?: unknown;
          translation?: unknown;
        };
        type?: unknown;
      }
    | undefined;
  const text =
    typeof parsed?.data?.transcript === "string"
      ? parsed.data.transcript
      : typeof parsed?.data?.translation === "string"
        ? parsed.data.translation
        : null;
  if (parsed?.type !== "data" || !text?.trim()) return null;
  return {
    languageCode:
      typeof parsed.data.language_code === "string"
        ? parsed.data.language_code
        : null,
    requestId:
      typeof parsed.data.request_id === "string"
        ? parsed.data.request_id
        : crypto.randomUUID(),
    transcript: text.trim(),
  };
}

async function interpretTurn(
  input: {
    context: DraftTask[];
    originalTranscript: string;
    translatedTranscript: string;
  },
  apiKey: string,
): Promise<SessionOperation[]> {
  const response = await fetch("https://api.sarvam.ai/v1/chat/completions", {
    body: JSON.stringify({
      max_tokens: 1000,
      messages: [
        { content: interpretationPrompt(input.context), role: "system" },
        {
          content: `Original transcript:\n${input.originalTranscript}\n\nEnglish meaning (use only for intent):\n${input.translatedTranscript}`,
          role: "user",
        },
      ],
      model: "sarvam-105b",
      reasoning_effort: null,
      response_format: { type: "json_object" },
      temperature: 0,
    }),
    headers: {
      "api-subscription-key": apiKey,
      "content-type": "application/json",
    },
    method: "POST",
  });
  if (!response.ok) throw new Error("Sarvam operation interpretation failed.");
  const completion = sarvamChatResponseSchema.parse(await response.json());
  const rawContent = completion.choices[0]!.message.content;
  if (!rawContent) return fallbackCreate(input.originalTranscript, input.context);
  const content = JSON.parse(rawContent) as {
    operations?: unknown;
  };
  const operations = operationsSchema.parse(
    Array.isArray(content.operations) ? content.operations : [],
  );
  return operations.length > 0
    ? operations
    : fallbackCreate(input.originalTranscript, input.context);
}

function interpretationPrompt(context: DraftTask[]) {
  const drafts = context.length
    ? context.map((task) => `#${task.reference}: ${task.title}`).join("\n")
    : "(none)";
  return `You convert a continuous voice-capture turn into JSON only: {"operations": SessionOperation[]}.
Current temporary tasks (never permanent tasks):\n${drafts}
Rules:
- Create one operation for every distinct task, including multiple tasks in one sentence.
- Treat any non-empty task-like thought as a task even if wording is incomplete.
- A correction or delete may only target one current temporary task; never target a permanent task.
- Preserve the original transcript language and script for created titles. English meaning is only for intent and time/date resolution.
- New references are sequential numeric strings after the largest current reference.
- Supported shapes only: create {"type":"create","ref":"1","task":{"title":"Call Raju","dueTime":"5 PM"}}, update {"type":"update","ref":"1","patch":{"title":"Call Rakesh"}}, delete {"type":"delete","ref":"1"}, clear, undo.
- Return an empty array only for pure acknowledgement or filler.`;
}

function fallbackCreate(
  transcript: string,
  drafts: DraftTask[],
): SessionOperation[] {
  if (
    /^(?:ok(?:ay)?|yeah|yes|no|hmm|um|uh|thanks?|thank you|that(?:'s| is) all|done|stop)[.!\s]*$/i.test(
      transcript,
    )
  )
    return [];
  let next = largestReference(drafts) + 1;
  const phrases = transcript
    .split(/[.!?\n]+/)
    .flatMap((sentence) =>
      sentence.split(
        /(?:[,;]\s*(?:(?:and|then|also)\s+)?|\b(?:and|then|also)\s+)(?=(?:call|buy|get|book|schedule|send|email|message|reply|pay|bring|remind|plan|finish|prepare|review|update|check|order|meet|write|submit|make)\b)/i,
      ),
    )
    .map((phrase) => phrase.trim())
    .filter(Boolean);
  return operationsSchema.parse(
    phrases.map((title) => ({
      ref: String(next++),
      task: { title },
      type: "create",
    })),
  );
}

function applyForContext(
  current: DraftTask[],
  operations: SessionOperation[],
  history: DraftTask[][],
) {
  let drafts = current.map((task) => ({ ...task }));
  for (const operation of operations) {
    if (operation.type === "undo") {
      drafts = history.pop() ?? drafts;
      continue;
    }
    history.push(drafts.map((task) => ({ ...task })));
    if (
      operation.type === "create" &&
      !drafts.some((task) => task.reference === operation.ref)
    ) {
      drafts = [...drafts, { ...operation.task, reference: operation.ref }];
    } else if (operation.type === "update") {
      drafts = drafts.map((task) =>
        task.reference === operation.ref
          ? applyTaskPatch(task, operation.patch)
          : task,
      );
    } else if (operation.type === "delete") {
      drafts = drafts.filter((task) => task.reference !== operation.ref);
    } else if (operation.type === "clear") {
      drafts = [];
    }
  }
  return drafts;
}

function applyTaskPatch(
  task: DraftTask,
  patch: z.infer<typeof updateOperationSchema>["patch"],
): DraftTask {
  const next = { ...task };
  if (patch.title) next.title = patch.title;
  if (patch.dueDate === null) delete next.dueDate;
  else if (patch.dueDate) next.dueDate = patch.dueDate;
  if (patch.dueTime === null) delete next.dueTime;
  else if (patch.dueTime) next.dueTime = patch.dueTime;
  return next;
}

function largestReference(tasks: DraftTask[]) {
  return tasks.reduce((largest, task) => {
    const reference = Number(task.reference);
    return Number.isSafeInteger(reference) && reference > largest
      ? reference
      : largest;
  }, 0);
}

function parseJson(value: unknown): unknown {
  if (typeof value !== "string") return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}
