import { floatToPcm16, pcm16Level, pcm16ToBase64, Pcm16Resampler } from "./audioPcm";

describe("live PCM helpers", () => {
  it("converts and encodes signed PCM deterministically", () => {
    const samples = floatToPcm16(new Float32Array([-1, 0, 1]));

    expect([...samples]).toEqual([-32768, 0, 32767]);
    expect(pcm16ToBase64(new Int16Array([1, 2]))).toBe("AQACAA==");
    expect(pcm16Level(samples)).toBeGreaterThan(0.5);
  });

  it("keeps a continuous resampling phase across audio chunks", () => {
    const resampler = new Pcm16Resampler(16000);

    const first = resampler.resample(Int16Array.from([0, 1000, 2000, 3000]), 32000);
    const second = resampler.resample(Int16Array.from([4000, 5000, 6000, 7000]), 32000);

    expect([...first, ...second]).toEqual([0, 2000, 4000, 6000]);
  });
});
