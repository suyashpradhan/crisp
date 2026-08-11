/** Converts Expo Audio's decibel metering value into a stable UI range. */
export function meteringToLevel(metering: number | undefined): number {
  if (!Number.isFinite(metering)) return 0;
  const clamped = Math.max(-60, Math.min(0, metering ?? -60));
  return (clamped + 60) / 60;
}
