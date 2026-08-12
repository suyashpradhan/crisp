import type { VoiceStreamSession, VoiceStreamServerEvent } from "./voiceStreamProtocol";
import { voiceStreamProtocol, voiceStreamServerEventSchema } from "./voiceStreamProtocol";

export type VoiceStreamSocket = {
  close: () => void;
  onclose: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onmessage: ((event: any) => void) | null;
  onopen: ((event: any) => void) | null;
  readyState: number;
  send: (data: string) => void;
};

type SocketFactory = (url: string, protocols: string[]) => VoiceStreamSocket;

export class LiveVoiceStreamError extends Error {
  constructor(message: string, public readonly retryable: boolean) {
    super(message);
    this.name = "LiveVoiceStreamError";
  }
}

export function createVoiceStreamClient({
  accessToken,
  endpoint,
  onEvent,
  socketFactory = (url, protocols) => new WebSocket(url, protocols),
}: {
  accessToken: string;
  endpoint: string;
  onEvent: (event: VoiceStreamServerEvent) => void;
  socketFactory?: SocketFactory;
}) {
  let socket: VoiceStreamSocket | null = null;
  let closedByClient = false;

  const send = (message: object) => {
    if (!socket || socket.readyState !== 1) {
      throw new LiveVoiceStreamError("Crisp’s live voice connection is not ready. Try again.", true);
    }
    socket.send(JSON.stringify(message));
  };

  return {
    open: (session: VoiceStreamSession) => new Promise<void>((resolve, reject) => {
      closedByClient = false;
      let settled = false;
      const settle = (result: () => void) => {
        if (settled) return;
        settled = true;
        result();
      };
      try {
        socket = socketFactory(endpoint, [voiceStreamProtocol(accessToken)]);
      } catch {
        reject(new LiveVoiceStreamError("Crisp couldn’t open live transcription. Try again.", true));
        return;
      }

      socket.onopen = () => {
        try {
          send({ session, type: "configure" });
        } catch (error) {
          settle(() => reject(error));
        }
      };
      socket.onmessage = ({ data }: { data: string }) => {
        const parsed = voiceStreamServerEventSchema.safeParse(parseMessage(data));
        if (!parsed.success) return;
        if (parsed.data.type === "ready") {
          settle(resolve);
          return;
        }
        if (parsed.data.type === "error") {
          const error = new LiveVoiceStreamError(parsed.data.error.message, parsed.data.error.retryable);
          onEvent(parsed.data);
          settle(() => reject(error));
          return;
        }
        onEvent(parsed.data);
      };
      socket.onerror = () => {
        settle(() => reject(new LiveVoiceStreamError("Crisp couldn’t reach live transcription. Try again.", true)));
      };
      socket.onclose = () => {
        if (!closedByClient) {
          settle(() => reject(new LiveVoiceStreamError("Live transcription was interrupted. Try again.", true)));
        }
      };
    }),
    sendAudio: (audio: string) => send({ audio, encoding: "pcm_s16le", sampleRate: 16000, type: "audio" }),
    updateSession: (session: VoiceStreamSession) => send({ session, type: "configure" }),
    close: () => {
      closedByClient = true;
      socket?.close();
      socket = null;
    },
  };
}

function parseMessage(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}
