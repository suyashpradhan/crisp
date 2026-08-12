const base64Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** Convert browser float PCM into the signed little-endian format Sarvam accepts. */
export function floatToPcm16(samples: Float32Array): Int16Array {
  const output = new Int16Array(samples.length);
  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index] ?? 0));
    output[index] = sample < 0 ? Math.round(sample * 0x8000) : Math.round(sample * 0x7fff);
  }
  return output;
}

export function pcm16Level(samples: Int16Array): number {
  if (samples.length === 0) return 0;
  let sum = 0;
  for (const sample of samples) {
    const normalized = sample / 0x8000;
    sum += normalized * normalized;
  }
  return Math.min(1, Math.sqrt(sum / samples.length) * 2.4);
}

/**
 * Maintains phase across microphone chunks so 44.1/48 kHz browser audio can
 * reach Sarvam as continuous 16 kHz PCM without audible chunk seams.
 */
export class Pcm16Resampler {
  private lastSample: number | null = null;
  private position = 0;
  private sourceRate: number | null = null;

  constructor(private readonly targetRate = 16000) {}

  reset() {
    this.lastSample = null;
    this.position = 0;
    this.sourceRate = null;
  }

  resample(samples: Int16Array, sourceRate: number): Int16Array {
    if (samples.length === 0) return samples;
    if (sourceRate === this.targetRate) return samples;
    if (this.sourceRate !== sourceRate) this.reset();
    this.sourceRate = sourceRate;

    const input = this.lastSample === null
      ? samples
      : joinPcm(this.lastSample, samples);
    const step = sourceRate / this.targetRate;
    const output: number[] = [];

    while (this.position + 1 < input.length) {
      const lower = Math.floor(this.position);
      const fraction = this.position - lower;
      const first = input[lower] ?? 0;
      const second = input[lower + 1] ?? first;
      output.push(Math.round(first + (second - first) * fraction));
      this.position += step;
    }

    this.position -= Math.max(0, input.length - 1);
    this.lastSample = input[input.length - 1] ?? null;
    return Int16Array.from(output);
  }
}

/** Small dependency-free Base64 encoder that works in native Hermes and web. */
export function pcm16ToBase64(samples: Int16Array): string {
  const bytes = new Uint8Array(samples.buffer, samples.byteOffset, samples.byteLength);
  let output = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index] ?? 0;
    const second = bytes[index + 1];
    const third = bytes[index + 2];
    output += base64Alphabet[first >> 2];
    output += base64Alphabet[((first & 0x03) << 4) | ((second ?? 0) >> 4)];
    output += second === undefined ? "=" : base64Alphabet[((second & 0x0f) << 2) | ((third ?? 0) >> 6)];
    output += third === undefined ? "=" : base64Alphabet[third & 0x3f];
  }
  return output;
}

function joinPcm(first: number, rest: Int16Array) {
  const joined = new Int16Array(rest.length + 1);
  joined[0] = first;
  joined.set(rest, 1);
  return joined;
}
