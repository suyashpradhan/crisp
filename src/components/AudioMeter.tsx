import { View } from "react-native";

import { colors } from "@/src/design/tokens";

type AudioMeterProps = {
  active: boolean;
};

const mockLevels = [0.18, 0.42, 0.72, 0.48, 0.88, 0.56, 0.34, 0.64, 0.25];

export function AudioMeter({ active }: AudioMeterProps) {
  return (
    <View accessibilityElementsHidden={!active} accessibilityLabel="Mock audio level meter" style={styles.meter}>
      {mockLevels.map((level, index) => {
        const height = active ? 4 + level * 26 : 4;
        const opacity = active ? 0.3 + level * 0.7 : 0;

        return (
          <View
            key={index}
            style={[styles.bar, { height, opacity }]}
          />
        );
      })}
    </View>
  );
}

const styles = {
  meter: {
    alignItems: "center" as const,
    flexDirection: "row" as const,
    gap: 5,
    height: 30,
    justifyContent: "center" as const,
  },
  bar: {
    backgroundColor: colors.ember,
    borderRadius: 9999,
    width: 4.5,
  },
};
