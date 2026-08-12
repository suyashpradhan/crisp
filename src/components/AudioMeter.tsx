import { useEffect, useRef, useState } from "react";
import { View } from "react-native";

import { colors } from "@/src/design/tokens";

type AudioMeterProps = {
  active: boolean;
  level: number;
  prominent?: boolean;
  reduceMotion?: boolean;
};

const barWeights = [0.22, 0.34, 0.48, 0.62, 0.76, 0.9, 0.7, 0.52, 0.38, 0.62, 1, 0.78, 0.56, 0.38, 0.72, 0.9, 0.6, 0.45, 0.3];

export function AudioMeter({ active, level, prominent = false, reduceMotion = false }: AudioMeterProps) {
  const clampedLevel = useSmoothedLevel(active, level, reduceMotion);

  return (
    <View accessibilityElementsHidden={!active} accessibilityLabel="Live audio level meter" style={styles.meter}>
      {barWeights.map((weight, index) => {
        const response = clampedLevel * weight;
        const height = active ? (prominent ? 7 : 4) + response * (prominent ? 18 : 26) : 4;
        const opacity = active ? 0.28 + response * 0.72 : 0;

        return (
          <View
            key={index}
            style={[styles.bar, prominent && styles.prominentBar, { height, opacity }]}
          />
        );
      })}
    </View>
  );
}

function useSmoothedLevel(active: boolean, level: number, reduceMotion: boolean) {
  const [current, setCurrent] = useState(0);
  const target = useRef(0);
  useEffect(() => {
    target.current = Math.max(0, Math.min(1, level));
  }, [level]);

  useEffect(() => {
    if (!active) {
      return;
    }

    let frame = 0;
    let lastUpdate = 0;
    const tick = (now: number) => {
      if (reduceMotion && now - lastUpdate < 250) {
        frame = requestAnimationFrame(tick);
        return;
      }
      lastUpdate = now;
      setCurrent((value) => {
        const ratio = target.current > value ? 0.5 : 0.085;
        const next = value + (target.current - value) * ratio;
        return Math.abs(next - value) < 0.002 ? target.current : next;
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, reduceMotion]);

  return current;
}

const styles = {
  meter: {
    alignItems: "center" as const,
    flexDirection: "row" as const,
    gap: 4,
    height: 30,
    justifyContent: "center" as const,
  },
  bar: {
    backgroundColor: colors.ember,
    borderRadius: 9999,
    width: 4,
  },
  prominentBar: { width: 5 },
};
